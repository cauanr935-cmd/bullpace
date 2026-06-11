/// <reference types="jest" />
/**
 * CT mapping: (CT0X -> RN0X)
 * CT01 -> RN01: GET /atletas sem id_equipe => 400
 * CT02 -> RN02: GET /atletas com id_equipe válido => 200
 * CT03 -> RN03: POST /atletas/buscar sem payload obrigatório => 400
 * CT04 -> RN04: POST /atletas/buscar com atleta existente => 200
 * CT05 -> RN05: POST /atletas/buscar com atleta inexistente => 404
 *
 * Observação: o Controller atual não gera respostas 201/409/422 — portanto não há testes para esses códigos.
 */

import express from 'express';
import request from 'supertest';
import { AtletaController } from '../../src/Controller/AtletaController';

describe('AtletaController (integration)', () => {
  let app: express.Express;
  let controller: AtletaController;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    controller = new AtletaController();

    // Substitui o serviço interno por um mock para tornar o teste determinístico
    const mockService = {
      listarPorEquipe: jest.fn(),
      buscarPorNome: jest.fn()
    } as any;

    // Forçar injeção mesmo sendo private
    (controller as any).atletaService = mockService;

    app.get('/atletas', (req, res) => controller.listarAtletas(req, res));
    app.post('/atletas/buscar', (req, res) => controller.buscarAtleta(req, res));
  });

  it('CT01 -> RN01: GET /atletas sem id_equipe devolve 400', async () => {
    const res = await request(app).get('/atletas');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
  });

  it('CT02 -> RN02: GET /atletas com id_equipe devolve 200 e lista', async () => {
    const atletas = [{ id_atleta: 1, id_equipe: 5, nome: 'A', status: 'ativo' }];
    (controller as any).atletaService.listarPorEquipe.mockResolvedValue(atletas);

    const res = await request(app).get('/atletas').query({ id_equipe: '5' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(atletas);
  });

  it('CT03 -> RN03: POST /atletas/buscar sem nome/id_equipe devolve 400', async () => {
    const res = await request(app).post('/atletas/buscar').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
  });

  it('CT04 -> RN04: POST /atletas/buscar com atleta existente devolve 200', async () => {
    const atleta = { id_atleta: 2, id_equipe: 5, nome: 'B', status: 'ativo' };
    (controller as any).atletaService.buscarPorNome.mockResolvedValue(atleta);

    const res = await request(app).post('/atletas/buscar').send({ nome: 'B', id_equipe: 5 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(atleta);
  });

  it('CT05 -> RN05: POST /atletas/buscar com atleta inexistente devolve 404', async () => {
    (controller as any).atletaService.buscarPorNome.mockResolvedValue(null);

    const res = await request(app).post('/atletas/buscar').send({ nome: 'X', id_equipe: 5 });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message');
  });
});
