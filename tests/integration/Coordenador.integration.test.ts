/// <reference types="jest" />
/**
 * CT mapping: (CT0X -> RN0X)
 * CT01 -> RN01: GET /coordenadores retorna 200 com lista de coordenadores
 * CT02 -> RN02: GET /coordenadores retorna 500 em caso de erro no servidor
 * CT03 -> RN03: POST /login sem email retorna 400 (validação)
 * CT04 -> RN04: POST /login sem senha retorna 400 (validação)
 * CT05 -> RN05: POST /login com coordenador válido retorna 200 (sucesso)
 * CT06 -> RN06: POST /login com admin válido retorna 200 (sucesso)
 * CT07 -> RN07: POST /login com coordenador inválido retorna 401 (não autorizado)
 * CT08 -> RN08: POST /login com admin inválido retorna 401 (não autorizado)
 * CT09 -> RN09: POST /login com payload vazio retorna 400 (validação)
 * CT10 -> RN10: POST /login com erro no servidor retorna 500 (erro)
 */

import request from 'supertest';
import express, { Express, Request, Response } from 'express';
import { CoordenadorController } from '../../src/Controller/CoordenadorController';

describe('CoordenadorController (Black-box Integration Tests)', () => {

  let app: Express;
  let controller: CoordenadorController;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    controller = new CoordenadorController();

    // Mock service methods BEFORE registering routes
    (controller as any).coordenadorService = {
      listar: jest.fn(),
      autenticar: jest.fn(),
      autenticarAdmin: jest.fn()
    };

    // Rotas
    app.get('/coordenadores', (req: Request, res: Response) =>
      controller.listarCoordenadores(req, res)
    );
    app.post('/login', (req: Request, res: Response) =>
      controller.login(req, res)
    );
  });

  // ==================== GET /coordenadores ====================
  describe('GET /coordenadores', () => {

    // CT01 -> RN01: GET /coordenadores retorna 200 com lista
    it('CT01 -> RN01: retorna 200 com lista de coordenadores', async () => {
      const mockData = [
        { id_coordenador: 1, nome: 'João', email: 'joao@test.com', senha: 'hash1', id_evento: 1 },
        { id_coordenador: 2, nome: 'Maria', email: 'maria@test.com', senha: 'hash2', id_evento: 2 }
      ];

      (controller as any).coordenadorService.listar.mockResolvedValue(mockData);

      const response = await request(app).get('/coordenadores');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockData);
      expect(response.body).toHaveLength(2);
      expect((controller as any).coordenadorService.listar).toHaveBeenCalledTimes(1);
    });

    it('CT02 -> RN02: retorna 500 quando há erro no servidor', async () => {
      (controller as any).coordenadorService.listar.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app).get('/coordenadores');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Erro ao listar coordenadores.');
      expect((controller as any).coordenadorService.listar).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== POST /login ====================
  describe('POST /login', () => {

    it('CT03 -> RN03: retorna 400 quando email está faltando', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          senha: 'test123',
          perfilUsuario: 'coordenador'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Login e senha são obrigatórios.');
      expect((controller as any).coordenadorService.autenticar).not.toHaveBeenCalled();
      expect((controller as any).coordenadorService.autenticarAdmin).not.toHaveBeenCalled();
    });

    it('CT04 -> RN04: retorna 400 quando senha está faltando', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: 'user@test.com',
          perfilUsuario: 'coordenador'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Login e senha são obrigatórios.');
      expect((controller as any).coordenadorService.autenticar).not.toHaveBeenCalled();
      expect((controller as any).coordenadorService.autenticarAdmin).not.toHaveBeenCalled();
    });

    it('CT05 -> RN05: retorna 200 com credenciais válidas de coordenador', async () => {
      const mockCoord = {
        id_coordenador: 5,
        nome: 'Pedro Coordenador',
        email: 'pedro@test.com',
        senha: 'hash_pwd',
        id_evento: 10
      };

      (controller as any).coordenadorService.autenticar.mockResolvedValue(mockCoord);

      const response = await request(app)
        .post('/login')
        .send({
          email: 'pedro@test.com',
          senha: 'senha123',
          perfilUsuario: 'coordenador'
        });

      expect(response.status).toBe(200);
      expect(response.body.autenticado).toBe(true);
      expect(response.body.nome).toBe('Pedro Coordenador');
      expect(response.body.papel).toBe('coordenador');
      expect((controller as any).coordenadorService.autenticar).toHaveBeenCalledWith('pedro@test.com', 'senha123');
      expect((controller as any).coordenadorService.autenticar).toHaveBeenCalledTimes(1);
    });

    it('CT06 -> RN06: retorna 200 com credenciais válidas de administrador', async () => {
      const mockAdmin = {
        id_admin: 1,
        nome: 'Admin Principal',
        email: 'admin@test.com',
        senha: 'hash_admin'
      };

      (controller as any).coordenadorService.autenticarAdmin.mockResolvedValue(mockAdmin);

      const response = await request(app)
        .post('/login')
        .send({
          email: 'admin@test.com',
          senha: 'admin_pass',
          perfilUsuario: 'administrador_geral'
        });

      expect(response.status).toBe(200);
      expect(response.body.autenticado).toBe(true);
      expect(response.body.nome).toBe('Admin Principal');
      expect(response.body.papel).toBe('administrador_geral');
      expect((controller as any).coordenadorService.autenticarAdmin).toHaveBeenCalledWith('admin@test.com', 'admin_pass');
      expect((controller as any).coordenadorService.autenticarAdmin).toHaveBeenCalledTimes(1);
    });

    it('CT07 -> RN07: retorna 401 quando credenciais de coordenador são inválidas', async () => {
      (controller as any).coordenadorService.autenticar.mockResolvedValue(null);

      const response = await request(app)
        .post('/login')
        .send({
          email: 'invalid@test.com',
          senha: 'wrongpass',
          perfilUsuario: 'coordenador'
        });

      expect(response.status).toBe(401);
      expect(response.body.autenticado).toBe(false);
      expect(response.body.message).toBe('Credenciais inválidas.');
      expect((controller as any).coordenadorService.autenticar).toHaveBeenCalledTimes(1);
    });

    it('CT08 -> RN08: retorna 401 quando credenciais de admin são inválidas', async () => {
      (controller as any).coordenadorService.autenticarAdmin.mockResolvedValue(null);

      const response = await request(app)
        .post('/login')
        .send({
          email: 'fake@test.com',
          senha: 'fakepass',
          perfilUsuario: 'administrador_geral'
        });

      expect(response.status).toBe(401);
      expect(response.body.autenticado).toBe(false);
      expect(response.body.message).toBe('Credenciais inválidas.');
      expect((controller as any).coordenadorService.autenticarAdmin).toHaveBeenCalledTimes(1);
    });

    it('CT09 -> RN09: retorna 400 quando payload está vazio', async () => {
      const response = await request(app)
        .post('/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Login e senha são obrigatórios.');
      expect((controller as any).coordenadorService.autenticar).not.toHaveBeenCalled();
      expect((controller as any).coordenadorService.autenticarAdmin).not.toHaveBeenCalled();
    });

    it('CT10 -> RN10: retorna 500 quando há erro no servidor', async () => {
      (controller as any).coordenadorService.autenticar.mockRejectedValue(
        new Error('Authentication service unavailable')
      );

      const response = await request(app)
        .post('/login')
        .send({
          email: 'user@test.com',
          senha: 'pass123',
          perfilUsuario: 'coordenador'
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Erro no processo de autenticação.');
      expect((controller as any).coordenadorService.autenticar).toHaveBeenCalledTimes(1);
    });
  });
});
