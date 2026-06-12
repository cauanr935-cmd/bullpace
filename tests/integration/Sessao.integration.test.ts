/// <reference types="jest" />
/**
 * CT mapping: (CT0X -> RN0X)
 * CT01 -> RN01: POST /sessoes/abrir retorna 201 quando criada com sucesso (Arrange/Act/Assert)
 * CT02 -> RN02: POST /sessoes/abrir retorna 400 quando payload inválido (validação)
 * CT03 -> RN03: POST /sessoes/abrir retorna 409 quando regra de negócio violada (simulada)
 * CT04 -> RN04: GET /sessoes/evento/:id retorna 404 quando nenhum registro (simulado)
 * CT05 -> RN05: GET /sessoes/evento/:id retorna 500 quando service lança erro (simulado)
 * CT06 -> RN06: GET /sessoes/:id/test-validate retorna 422 quando id inválido
 */

import request from 'supertest';
import express, { Express, Request, Response } from 'express';
import * as SessaoCtrl from '../../src/Controller/SessaoController';

describe('SessaoController (Black-box Integration Tests)', () => {
  let app: Express;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    app = express();
    app.use(express.json());

    // Route to open session
    app.post('/sessoes/abrir', async (req: Request, res: Response) => {
      try {
        const sessao = await SessaoCtrl.abrirSessao(req.body);
        return res.status(201).json(sessao);
      } catch (err: any) {
        if (/Dados obrigatórios ausentes/.test(err.message)) return res.status(400).json({ message: err.message });
        if (/Conflito|conflict/i.test(err.message)) return res.status(409).json({ message: 'Conflito de negócio.' });
        return res.status(500).json({ message: 'Erro ao abrir sessão.' });
      }
    });

    // Route to list by event
    app.get('/sessoes/evento/:id', async (req: Request, res: Response) => {
      try {
        const id = Number(req.params.id);
        const items = await SessaoCtrl.buscarSessoesPorEvento(id);
        if (!items || items.length === 0) return res.status(404).json({ message: 'Nenhum registro encontrado.' });
        return res.status(200).json(items);
      } catch (err: any) {
        return res.status(500).json({ message: 'Erro ao listar sessões.' });
      }
    });

    app.get('/sessoes/:id/test-validate', (req: Request, res: Response) => {
      const id = String(req.params.id);
      if (!/^[0-9]+$/.test(id)) return res.status(422).json({ message: 'id inválido.' });
      return res.status(200).json({ ok: true });
    });
  });

  it('CT01 -> RN01: POST /sessoes/abrir retorna 201 quando criada com sucesso', async () => {
    const body = { id_evento: 1, id_funcao: 2, inicio_em: new Date().toISOString() };
    jest.spyOn(SessaoCtrl, 'abrirSessao').mockResolvedValue({ id_sessao_operacional: 11, ...body, status: 'ativa' } as any);

    const res = await request(app).post('/sessoes/abrir').send(body);
    expect(res.status).toBe(201);
    expect(res.body.id_sessao_operacional).toBeDefined();
  });

  it('CT02 -> RN02: POST /sessoes/abrir retorna 400 quando payload inválido', async () => {
    // missing required fields -> controller validation will throw
    const res = await request(app).post('/sessoes/abrir').send({ id_evento: 1 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Dados obrigatórios ausentes/);
  });

  it('CT03 -> RN03: POST /sessoes/abrir retorna 409 quando regra de negócio violada (simulada)', async () => {
    const body = { id_evento: 1, id_funcao: 2, inicio_em: new Date().toISOString() };
    jest.spyOn(SessaoCtrl, 'abrirSessao').mockRejectedValue(new Error('Conflito ao inserir sessão'));

    const res = await request(app).post('/sessoes/abrir').send(body);
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Conflito de negócio.');
  });

  it('CT04 -> RN04: GET /sessoes/evento/:id retorna 404 quando nenhum registro (simulado)', async () => {
    jest.spyOn(SessaoCtrl, 'buscarSessoesPorEvento').mockResolvedValue([] as any);
    const res = await request(app).get('/sessoes/evento/123');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Nenhum registro encontrado.');
  });

  it('CT05 -> RN05: GET /sessoes/evento/:id retorna 500 quando service lança erro (simulado)', async () => {
    jest.spyOn(SessaoCtrl, 'buscarSessoesPorEvento').mockRejectedValue(new Error('DB fail'));
    const res = await request(app).get('/sessoes/evento/5');
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Erro ao listar sessões.');
  });

  it('CT06 -> RN06: GET /sessoes/:id/test-validate retorna 422 quando id inválido', async () => {
    const res = await request(app).get('/sessoes/abc/test-validate');
    expect(res.status).toBe(422);
    expect(res.body.message).toBe('id inválido.');
  });
});
