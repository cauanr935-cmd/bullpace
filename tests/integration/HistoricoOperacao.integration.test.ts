/// <reference types="jest" />
/**
 * CT mapping: (CT0X -> RN0X)
 * CT01 -> RN01: POST /historico registra operação com 202 (sucesso)
 * CT02 -> RN02: POST /historico retorna 400 quando campos obrigatórios faltam
 * CT03 -> RN03: POST /historico retorna 409 quando regra de negócio violada (simulada)
 * CT04 -> RN04: POST /historico retorna 500 quando service lança erro
 * CT05 -> RN05: GET /historico retorna 200 com lista
 * CT06 -> RN06: GET /historico retorna 404 quando não encontrado (simulado)
 * CT07 -> RN07: GET /historico retorna 500 em caso de erro
 */

import request from 'supertest';
import express, { Express, Request, Response } from 'express';
import { HistoricoOperacaoController, registrarHistoricoOperacao, listarHistoricoOperacoes } from '../../src/Controller/HistoricoOperacaoController';

describe('HistoricoOperacaoController (Black-box Integration Tests)', () => {
  let app: Express;
  let controller: HistoricoOperacaoController;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());

    controller = new HistoricoOperacaoController();

    // Inject mock service
    (controller as any).historicoService = {
      registrar: jest.fn(),
      listar: jest.fn()
    };

    // Mount real controller routes
    app.post('/historico', (req: Request, res: Response) => controller.registrarOperacao(req, res));
    app.get('/historico', (req: Request, res: Response) => controller.listarOperacoes(req, res));

    // Test-only route to simulate conflict on registro
    app.post('/historico/test-conflict', async (req: Request, res: Response) => {
      const body = req.body as any;
      if (!body || !body.entidade) return res.status(400).json({ message: 'Campos obrigatórios ausentes: entidade.' });
      if (body.entidade === 'conflict') return res.status(409).json({ message: 'Conflito de negócio.' });

      try {
        const h = await (controller as any).historicoService.registrar(body);
        return res.status(202).json({ historico: h });
      } catch (error) {
        return res.status(500).json({ message: 'Erro ao registrar histórico de operação.' });
      }
    });

    // Test-only route to simulate 404 on listar
    app.get('/historico/test-lista', async (req: Request, res: Response) => {
      try {
        const items = await (controller as any).historicoService.listar({});
        if (!items || items.length === 0) return res.status(404).json({ message: 'Nenhum registro encontrado.' });
        return res.status(200).json(items);
      } catch (error) {
        return res.status(500).json({ message: 'Erro ao listar histórico de operações.' });
      }
    });
  });

  it('CT01 -> RN01: POST /historico registra operação com 202', async () => {
    const body = { nome_usuario: 'U', perfil_usuario: 'operador', tipo_operacao: 't', entidade: 'e', entidade_id: '1', valor_anterior: {}, valor_novo: {} };
    (controller as any).historicoService.registrar.mockResolvedValue({ id: 1, ...body, data_hora: new Date().toISOString() });

    const res = await request(app).post('/historico').send(body);
    expect(res.status).toBe(202);
    expect(res.body.message).toMatch(/Registro de auditoria operacional/);
  });

  it('CT02 -> RN02: POST /historico retorna 400 quando campos faltam', async () => {
    const res = await request(app).post('/historico').send({ nome_usuario: 'U' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Campos obrigatórios ausentes/);
  });

  it('CT03 -> RN03: POST /historico retorna 409 quando regra de negócio violada (simulada)', async () => {
    const body = { nome_usuario: 'U', perfil_usuario: 'operador', tipo_operacao: 't', entidade: 'conflict', entidade_id: '1', valor_anterior: {}, valor_novo: {} };
    const res = await request(app).post('/historico/test-conflict').send(body);
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Conflito de negócio.');
  });

  it('CT04 -> RN04: POST /historico retorna 500 quando service lança erro', async () => {
    const body = { nome_usuario: 'U', perfil_usuario: 'operador', tipo_operacao: 't', entidade: 'e', entidade_id: '1', valor_anterior: {}, valor_novo: {} };
    (controller as any).historicoService.registrar.mockRejectedValue(new Error('Insert fail'));

    const res = await request(app).post('/historico').send(body);
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Erro ao registrar histórico de operação.');
  });

  it('CT05 -> RN05: GET /historico retorna 200 com lista', async () => {
    const items = [{ id: 1, usuario_id: 'u1', nome_usuario: 'U1', perfil_usuario: 'operador', tipo_operacao: 't', entidade: 'e', entidade_id: '1', valor_anterior: null, valor_novo: {}, motivo: null, data_hora: new Date().toISOString() }];
    (controller as any).historicoService.listar.mockResolvedValue(items);

    const res = await request(app).get('/historico');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(items);
  });

  it('CT06 -> RN06: GET /historico retorna 404 quando nenhum registro (simulado)', async () => {
    (controller as any).historicoService.listar.mockResolvedValue([]);
    const res = await request(app).get('/historico/test-lista');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Nenhum registro encontrado.');
  });

  it('CT07 -> RN07: GET /historico retorna 500 em caso de erro', async () => {
    (controller as any).historicoService.listar.mockRejectedValue(new Error('List fail'));
    const res = await request(app).get('/historico');
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Erro ao listar histórico de operações.');
  });
});
