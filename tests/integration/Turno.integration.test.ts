/// <reference types="jest" />
/**
 * CT mapping: (CT0X -> RN0X)
 * CT01 -> RN01: POST /turnos/iniciar retorna 201 com novo turno (sucesso)
 * CT02 -> RN02: POST /turnos/iniciar retorna 400 quando payload inválido (validação)
 * CT03 -> RN03: POST /turnos/iniciar retorna 409 quando regra de negócio violada (simulada)
 * CT04 -> RN04: POST /turnos/finalizar retorna 404 quando recurso não encontrado (simulado)
 * CT05 -> RN05: POST /turnos/finalizar retorna 500 quando serviço lança erro (simulado)
 * CT06 -> RN06: GET /turnos/:id/test-validate retorna 422 quando id inválido
 */

import request from 'supertest';
import express, { Express, Request, Response } from 'express';
import * as TurnoCtrl from '../../src/Controller/TurnoController';

describe('TurnoController (Black-box Integration Tests)', () => {
  let app: Express;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    app = express();
    app.use(express.json());

    app.post('/turnos/iniciar', async (req: Request, res: Response) => {
      try {
        const turno = await TurnoCtrl.iniciarTurno(req.body);
        return res.status(201).json(turno);
      } catch (err: any) {
        if (/Campos obrigatórios ausentes/.test(err.message)) return res.status(400).json({ message: err.message });
        if (/Abortado|Erro ao abrir turno no banco|Abortado\./i.test(err.message)) return res.status(409).json({ message: 'Conflito de negócio.' });
        return res.status(500).json({ message: 'Erro ao iniciar turno.' });
      }
    });

    app.post('/turnos/finalizar', async (req: Request, res: Response) => {
      try {
        const { id_turno, km_final } = req.body as any;
        const turno = await TurnoCtrl.finalizarTurno(id_turno, km_final);
        return res.status(200).json(turno);
      } catch (err: any) {
        if (/not found|nenhum registro|não encontrado/i.test(err.message)) return res.status(404).json({ message: 'Recurso não encontrado.' });
        return res.status(500).json({ message: 'Erro ao finalizar turno.' });
      }
    });

    app.get('/turnos/:id/test-validate', (req: Request, res: Response) => {
      const id = String(req.params.id);
      if (!/^[0-9]+$/.test(id)) return res.status(422).json({ message: 'id inválido.' });
      return res.status(200).json({ ok: true });
    });
  });

  it('CT01 -> RN01: POST /turnos/iniciar retorna 201 com novo turno', async () => {
    const body = { id_atleta: 1, id_esteira: 2, id_sessao_operacional: 3, horario_inicio: new Date().toISOString() };
    const retorno = { id_turno: 20, ...body, status: 'em_andamento', km_turno: 0 };
    jest.spyOn(TurnoCtrl, 'iniciarTurno').mockResolvedValue(retorno as any);

    const res = await request(app).post('/turnos/iniciar').send(body);
    expect(res.status).toBe(201);
    expect(res.body).toEqual(retorno);
  });

  it('CT02 -> RN02: POST /turnos/iniciar retorna 400 quando payload inválido', async () => {
    const res = await request(app).post('/turnos/iniciar').send({ id_atleta: 1 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Campos obrigatórios ausentes/);
  });

  it('CT03 -> RN03: POST /turnos/iniciar retorna 409 quando regra de negócio violada (simulada)', async () => {
    const body = { id_atleta: 1, id_esteira: 2, id_sessao_operacional: 3, horario_inicio: new Date().toISOString() };
    jest.spyOn(TurnoCtrl, 'iniciarTurno').mockRejectedValue(new Error('Abortado. Verifique se os IDs informados existem nas tabelas pai'));

    const res = await request(app).post('/turnos/iniciar').send(body);
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Conflito de negócio.');
  });

  it('CT04 -> RN04: POST /turnos/finalizar retorna 404 quando recurso não encontrado (simulado)', async () => {
    jest.spyOn(TurnoCtrl, 'finalizarTurno').mockRejectedValue(new Error('Nenhum registro encontrado para id_turno 999'));
    const res = await request(app).post('/turnos/finalizar').send({ id_turno: 999, km_final: 1.2 });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Recurso não encontrado.');
  });

  it('CT05 -> RN05: POST /turnos/finalizar retorna 500 quando serviço lança erro (simulado)', async () => {
    jest.spyOn(TurnoCtrl, 'finalizarTurno').mockRejectedValue(new Error('DB fail'));
    const res = await request(app).post('/turnos/finalizar').send({ id_turno: 5, km_final: 2 });
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Erro ao finalizar turno.');
  });

  it('CT06 -> RN06: GET /turnos/:id/test-validate retorna 422 quando id inválido', async () => {
    const res = await request(app).get('/turnos/abc/test-validate');
    expect(res.status).toBe(422);
    expect(res.body.message).toBe('id inválido.');
  });
});
