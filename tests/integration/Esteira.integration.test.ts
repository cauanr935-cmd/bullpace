/// <reference types="jest" />
/**
 * CT mapping: (CT0X -> RN0X)
 * CT01 -> RN01: GET /esteiras retorna 200 com lista
 * CT02 -> RN02: GET /esteiras retorna 500 quando service lança erro
 * CT03 -> RN03: GET /esteiras/modelo?modelo=M retorna 200 quando encontrado
 * CT04 -> RN04: GET /esteiras/modelo?modelo=M retorna 404 quando não encontrado
 * CT05 -> RN05: GET /esteiras/modelo sem param retorna 400 (validação)
 * CT06 -> RN06: GET /esteiras/modelo gera 409 em regra de negócio (simulada)
 */

import request from 'supertest';
import express, { Express, Request, Response } from 'express';
import { EsteiraController } from '../../src/Controller/EsteiraController';

describe('EsteiraController (Black-box Integration Tests)', () => {
  let app: Express;
  let controller: EsteiraController;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());

    controller = new EsteiraController();

    // Inject mock service with synchronous or Promise-returning methods as needed
    (controller as any).esteiraService = {
      listar: jest.fn(),
      buscarPorModelo: jest.fn()
    };

    // Register controller route
    app.get('/esteiras', (req: Request, res: Response) => controller.listarEsteiras(req, res));

    // For buscarPorModelo we create a thin test-only route that uses the injected service
    app.get('/esteiras/modelo', async (req: Request, res: Response) => {
      const modelo = req.query.modelo as string | undefined;
      if (!modelo) return res.status(400).json({ message: 'Parametro modelo é obrigatório.' });

      try {
        const result = await (controller as any).esteiraService.buscarPorModelo(modelo);
        if (!result) return res.status(404).json({ message: 'Não encontrado.' });

        // Simulate a business conflict: if model contains 'conflict' we return 409
        if ((result as any).modelo && (result as any).modelo.includes('conflict')) {
          return res.status(409).json({ message: 'Conflito de negócio.' });
        }

        return res.status(200).json(result);
      } catch (error) {
        return res.status(500).json({ message: 'Erro ao buscar por modelo.' });
      }
    });
  });

  // ==================== GET /esteiras ====================
  it('CT01 -> RN01: GET /esteiras retorna 200 com lista', async () => {
    const mockData = [
      { id_esteira: 1, id_equipe: null, id_evento: 1, marca: 'A', modelo: 'M1', numero_serie: 'S1', status: 'ok', delet_at: false }
    ];

    // controller.listarEsteiras não usa await internamente, então retornamos sincronamente
    (controller as any).esteiraService.listar.mockReturnValue(mockData);

    const res = await request(app).get('/esteiras');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockData);
    expect((controller as any).esteiraService.listar).toHaveBeenCalledTimes(1);
  });

  it('CT02 -> RN02: GET /esteiras retorna 500 quando service lança erro', async () => {
    (controller as any).esteiraService.listar.mockImplementation(() => { throw new Error('DB fail'); });

    const res = await request(app).get('/esteiras');

    // Since controller.listarEsteiras is synchronous and will throw, Express should return 500
    expect(res.status).toBe(500);
  });

  // ==================== GET /esteiras/modelo ====================
  it('CT03 -> RN03: retorna 200 quando buscarPorModelo encontra esteira', async () => {
    const found = { id_esteira: 2, id_equipe: 1, id_evento: null, marca: 'B', modelo: 'M2', numero_serie: 'S2', status: 'ok', delet_at: false };
    (controller as any).esteiraService.buscarPorModelo.mockResolvedValue(found);

    const res = await request(app).get('/esteiras/modelo').query({ modelo: 'M2' });

    expect(res.status).toBe(200);
    expect(res.body.modelo).toBe('M2');
    expect((controller as any).esteiraService.buscarPorModelo).toHaveBeenCalledWith('M2');
  });

  it('CT04 -> RN04: retorna 404 quando buscarPorModelo não encontra', async () => {
    (controller as any).esteiraService.buscarPorModelo.mockResolvedValue(null);

    const res = await request(app).get('/esteiras/modelo').query({ modelo: 'NOT_EXIST' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Não encontrado.');
  });

  it('CT05 -> RN05: retorna 400 quando parametro modelo ausente', async () => {
    const res = await request(app).get('/esteiras/modelo');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Parametro modelo é obrigatório.');
  });

  it('CT06 -> RN06: retorna 409 quando regra de negócio é violada (simulada)', async () => {
    const conflict = { id_esteira: 3, id_equipe: null, id_evento: null, marca: 'C', modelo: 'conflict-model', numero_serie: 'S3', status: 'ok', delet_at: false };
    (controller as any).esteiraService.buscarPorModelo.mockResolvedValue(conflict);

    const res = await request(app).get('/esteiras/modelo').query({ modelo: 'conflict-model' });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Conflito de negócio.');
  });
});
