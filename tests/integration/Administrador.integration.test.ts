/// <reference types="jest" />
/**
 * CT mapping: (CT0X -> RN0X)
 * CT01 -> RN01: POST /login sem credencial => 400 (validação)
 * CT02 -> RN02: POST /login sem senha => 400 (validação)
 * CT03 -> RN03: POST /login com credenciais válidas => 200 (sucesso)
 * CT04 -> RN04: POST /login com credenciais inválidas => 401 (não autenticado)
 * CT05 -> RN05: POST /login com erro no serviço => 500 (erro interno)
 *
 * Notas:
 * - O Controller atual não emite 201, 409, 422, 404.
 * - 401 é usado para credenciais inválidas (equivalente a falha de negócio).
 * - Black-box: testes não conhecem detalhes internos, testam apenas I/O HTTP.
 */

import express from 'express';
import request from 'supertest';
import { AdministradorController } from '../../src/Controller/AdministradorController';

describe('AdministradorController (integration)', () => {
  let app: express.Express;
  let controller: AdministradorController;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    controller = new AdministradorController();

    // Mock do serviço interno para tornar o teste determinístico
    const mockService = {
      listar: jest.fn(),
      buscarPorLogin: jest.fn(),
      autenticar: jest.fn(),
      criar: jest.fn()
    } as any;

    // Injetar mock mesmo sendo private
    (controller as any).administradorService = mockService;

    // Rota de login
    app.post('/login', (req, res) => controller.login(req, res));
  });

  describe('POST /login', () => {
    it('CT01 -> RN01: POST /login sem credencial => 400 (validação)', async () => {
      // Arrange
      const payload = { senha: 'senhaQualquer' };

      // Act
      const res = await request(app).post('/login').send(payload);

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('obrigatórios');
    });

    it('CT02 -> RN02: POST /login sem senha => 400 (validação)', async () => {
      // Arrange
      const payload = { login: 'admin' };

      // Act
      const res = await request(app).post('/login').send(payload);

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('obrigatórios');
    });

    it('CT03 -> RN03: POST /login com credenciais válidas => 200 (sucesso)', async () => {
      // Arrange
      const adminAutenticado = {
        id_admin: 1,
        nome: 'Admin Principal',
        login: 'admin_principal',
        senha: 'hash123'
      };
      (controller as any).administradorService.autenticar.mockResolvedValue(adminAutenticado);
      const payload = { login: 'admin_principal', senha: 'hash123' };

      // Act
      const res = await request(app).post('/login').send(payload);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('autenticado', true);
      expect(res.body).toHaveProperty('nome', 'Admin Principal');
      expect(res.body).toHaveProperty('papel', 'administrador_geral');
    });

    it('CT04 -> RN04: POST /login com email e senha válida => 200', async () => {
      // Arrange
      const adminAutenticado = {
        id_admin: 2,
        nome: 'Admin Via Email',
        login: 'admin@email.com',
        senha: 'hash456'
      };
      (controller as any).administradorService.autenticar.mockResolvedValue(adminAutenticado);
      const payload = { email: 'admin@email.com', senha: 'hash456' };

      // Act
      const res = await request(app).post('/login').send(payload);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.autenticado).toBe(true);
    });

    it('CT05 -> RN05: POST /login com credenciais inválidas => 401 (falha autenticação)', async () => {
      // Arrange
      (controller as any).administradorService.autenticar.mockResolvedValue(null);
      const payload = { login: 'admin', senha: 'senhaErrada' };

      // Act
      const res = await request(app).post('/login').send(payload);

      // Assert
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('autenticado', false);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('inválidas');
    });

    it('CT06 -> RN06: POST /login com erro no serviço => 500 (erro interno)', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      (controller as any).administradorService.autenticar.mockRejectedValue(error);
      const payload = { login: 'admin', senha: 'hash123' };

      // Act
      const res = await request(app).post('/login').send(payload);

      // Assert
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('autenticação');
    });

    it('CT07 -> RN07: POST /login com campo "administrador" como credencial => 200', async () => {
      // Arrange
      const adminAutenticado = {
        id_admin: 3,
        nome: 'Admin Alternativo',
        login: 'admin_alt',
        senha: 'hashAlt'
      };
      (controller as any).administradorService.autenticar.mockResolvedValue(adminAutenticado);
      const payload = { administrador: 'admin_alt', senha: 'hashAlt' };

      // Act
      const res = await request(app).post('/login').send(payload);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.autenticado).toBe(true);
    });

    it('CT08 -> RN08: POST /login sem nenhum campo => 400 (validação completa)', async () => {
      // Arrange
      const payload = {};

      // Act
      const res = await request(app).post('/login').send(payload);

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });
  });
});
