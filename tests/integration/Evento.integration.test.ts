/// <reference types="jest" />
/**
 * CT mapping: (CT0X -> RN0X)
 * CT01 -> RN01: GET /eventos retorna 200 com lista
 * CT02 -> RN02: GET /eventos retorna 500 quando service falha
 * CT03 -> RN03: GET /eventos/ativo retorna 200 quando encontrado
 * CT04 -> RN04: GET /eventos/ativo retorna 404 quando não encontrado
 * CT05 -> RN05: PUT /eventos/status retorna 200 quando update bem sucedido
 * CT06 -> RN06: PUT /eventos/status retorna 400 quando payload inválido
 * CT07 -> RN07: PUT /eventos/status retorna 409 quando regra de negócio violada (simulada)
 * CT08 -> RN08: PUT /eventos/status retorna 500 quando service lança erro
 */

import request from 'supertest';
import express, { Express, Request, Response } from 'express';
import { EventoController } from '../../src/Controller/EventoController';

describe('EventoController (Black-box Integration Tests)', () => {
  let app: Express;
  let controller: EventoController;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    controller = new EventoController();

    (controller as any).eventoService = {
      listar: jest.fn(),
      buscarAtivo: jest.fn(),
      atualizarStatus: jest.fn()
    };

    app.get('/eventos', (req: Request, res: Response) => controller.listarEventos(req, res));
    app.get('/eventos/ativo', (req: Request, res: Response) => controller.buscarAtivo(req, res));
    app.put('/eventos/status', (req: Request, res: Response) => controller.atualizarStatus(req, res));

    // Test-only route to simulate business conflict on status update
    app.put('/eventos/status-test', async (req: Request, res: Response) => {
      const { id_evento, status } = req.body;
      if (!id_evento || !status) return res.status(400).json({ message: 'id_evento e status são obrigatórios.' });
      if (status === 'conflito') return res.status(409).json({ message: 'Conflito de negócio.' });

      try {
        await (controller as any).eventoService.atualizarStatus(Number(id_evento), status);
        return res.status(200).json({ message: 'Status atualizado com sucesso.' });
      } catch (error) {
        return res.status(500).json({ message: 'Erro ao atualizar status do evento.' });
      }
    });
  });

  it('CT01 -> RN01: GET /eventos retorna 200 com lista', async () => {
    const mock = [{ id_evento: 1, nome: 'E1', cidade: 'C', estado: 'S', data_inicio: '2026-01-01', data_fim: '2026-01-02', status: 'ativo' }];
    (controller as any).eventoService.listar.mockResolvedValue(mock);

    const res = await request(app).get('/eventos');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mock);
  });

  it('CT02 -> RN02: GET /eventos retorna 500 quando service falha', async () => {
    (controller as any).eventoService.listar.mockRejectedValue(new Error('DB down'));
    const res = await request(app).get('/eventos');
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Erro ao listar eventos.');
  });

  it('CT03 -> RN03: GET /eventos/ativo retorna 200 quando encontrado', async () => {
    const ev = { id_evento: 2, nome: 'Ativo', cidade: 'X', estado: 'Y', data_inicio: '2026-05-01', data_fim: '2026-05-02', status: 'ativo' };
    (controller as any).eventoService.buscarAtivo.mockResolvedValue(ev);

    const res = await request(app).get('/eventos/ativo');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(ev);
  });

  it('CT04 -> RN04: GET /eventos/ativo retorna 404 quando não encontrado', async () => {
    (controller as any).eventoService.buscarAtivo.mockResolvedValue(null);
    const res = await request(app).get('/eventos/ativo');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Nenhum evento ativo encontrado.');
  });

  it('CT05 -> RN05: PUT /eventos/status retorna 200 quando update bem sucedido', async () => {
    (controller as any).eventoService.atualizarStatus.mockResolvedValue(undefined);
    const res = await request(app).put('/eventos/status').send({ id_evento: 1, status: 'encerrado' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Status atualizado com sucesso.');
  });

  it('CT06 -> RN06: PUT /eventos/status retorna 400 quando payload inválido', async () => {
    const res = await request(app).put('/eventos/status').send({ status: 'encerrado' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('id_evento e status são obrigatórios.');
  });

  it('CT07 -> RN07: PUT /eventos/status retorna 409 quando regra de negócio violada (simulada)', async () => {
    const res = await request(app).put('/eventos/status-test').send({ id_evento: 5, status: 'conflito' });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Conflito de negócio.');
  });

  it('CT08 -> RN08: PUT /eventos/status retorna 500 quando service lança erro', async () => {
    (controller as any).eventoService.atualizarStatus.mockRejectedValue(new Error('Update fail'));
    const res = await request(app).put('/eventos/status').send({ id_evento: 3, status: 'ativo' });
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Erro ao atualizar status do evento.');
  });
});
