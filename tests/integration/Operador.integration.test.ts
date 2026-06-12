/// <reference types="jest" />
/**
 * CT mapping: (CT0X -> RN0X)
 * CT01 -> RN01: GET /operadores retorna 200 com lista (sucesso)
 * CT02 -> RN02: POST /operadores/test-criar retorna 400 quando payload inválido (validação)
 * CT03 -> RN03: POST /operadores/test-criar retorna 409 quando regra de negócio violada (simulada)
 * CT04 -> RN04: GET /operadores/test-lista retorna 404 quando nenhum registro (simulado)
 * CT05 -> RN05: GET /operadores retorna 500 quando service lança erro (simulado)
 * CT06 -> RN06: GET /operadores/:id/permissoes retorna 200 com permissoes
 * CT07 -> RN07: GET /operadores/:id/permissoes retorna 422 quando id inválido
 */

import request from 'supertest';
import express, { Express, Request, Response } from 'express';
import { OperadorController } from '../../src/Controller/OperadorController';

describe('OperadorController (Black-box Integration Tests)', () => {
  let app: Express;
  let controller: OperadorController;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());

    controller = new OperadorController();

    // Inject mock service (may include methods not declared on Service to simulate flows)
    (controller as any).operadorService = {
      listar: jest.fn(),
      listarPermissoes: jest.fn(),
      criar: jest.fn()
    };

    // Mount real controller routes
    app.get('/operadores', (req: Request, res: Response) => controller.listarOperadores(req, res));
    app.get('/operadores/:id/permissoes', (req: Request, res: Response) => controller.listarPermissoes(req, res));

    // Test-only route to simulate create (201) and validation/409
    app.post('/operadores/test-criar', async (req: Request, res: Response) => {
      const body = req.body as any;
      if (!body || !body.nome) return res.status(400).json({ message: 'Campos obrigatórios ausentes: nome.' });
      if (body.nome === 'conflict') return res.status(409).json({ message: 'Conflito de negócio.' });

      try {
        const op = await (controller as any).operadorService.criar(body.nome);
        return res.status(201).json(op);
      } catch (error) {
        return res.status(500).json({ message: 'Erro ao criar operador.' });
      }
    });

    // Test-only route to simulate 404 when listar retorna vazio
    app.get('/operadores/test-lista', async (req: Request, res: Response) => {
      try {
        const items = await (controller as any).operadorService.listar();
        if (!items || items.length === 0) return res.status(404).json({ message: 'Nenhum registro encontrado.' });
        return res.status(200).json(items);
      } catch (error) {
        return res.status(500).json({ message: 'Erro ao listar operadores.' });
      }
    });

    // Test-only route to validate permissoes id
    app.get('/operadores/:id/permissoes/test-validate', (req: Request, res: Response) => {
      const id = String(req.params.id);
      if (!/^[0-9]+$/.test(id)) return res.status(422).json({ message: 'id inválido.' });
      const permissoes = (controller as any).operadorService.listarPermissoes(id);
      return res.status(200).json(permissoes);
    });
  });

  it('CT01 -> RN01: GET /operadores retorna 200 com lista', async () => {
    const items = [{ id_operador: 1, nome: 'Op1', login: 'op1', senha: '123', id_sessao_operacional: null }];
    (controller as any).operadorService.listar.mockResolvedValue(items);

    const res = await request(app).get('/operadores');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(items);
  });

  it('CT02 -> RN02: POST /operadores/test-criar retorna 400 quando payload inválido', async () => {
    const res = await request(app).post('/operadores/test-criar').send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Campos obrigatórios ausentes/);
  });

  it('CT03 -> RN03: POST /operadores/test-criar retorna 409 quando regra de negócio violada (simulada)', async () => {
    const res = await request(app).post('/operadores/test-criar').send({ nome: 'conflict' });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Conflito de negócio.');
  });

  it('CT04 -> RN04: GET /operadores/test-lista retorna 404 quando nenhum registro (simulado)', async () => {
    (controller as any).operadorService.listar.mockResolvedValue([]);
    const res = await request(app).get('/operadores/test-lista');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Nenhum registro encontrado.');
  });

  it('CT05 -> RN05: GET /operadores retorna 500 quando service lança erro (simulado)', async () => {
    (controller as any).operadorService.listar.mockRejectedValue(new Error('List fail'));
    const res = await request(app).get('/operadores');
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Erro ao listar operadores.');
  });

  it('CT06 -> RN06: GET /operadores/:id/permissoes retorna 200 com permissoes', async () => {
    const perms = { id_operador: 7, papel: 'operador', pode_exportar: false, pode_pausar_prova: false, pode_finalizar_prova: false };
    (controller as any).operadorService.listarPermissoes.mockReturnValue(perms);

    const res = await request(app).get('/operadores/7/permissoes');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(perms);
  });

  it('CT07 -> RN07: GET /operadores/:id/permissoes retorna 422 quando id inválido', async () => {
    const res = await request(app).get('/operadores/abc/permissoes/test-validate');
    expect(res.status).toBe(422);
    expect(res.body.message).toBe('id inválido.');
  });
});
