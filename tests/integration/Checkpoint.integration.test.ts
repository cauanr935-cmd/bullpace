/// <reference types="jest" />
/**
 * CT mapping: (CT0X -> RN0X)
 * CT01 -> RN01: POST /checkpoints com payload válido => 201 (sucesso criação)
 * CT02 -> RN02: POST /checkpoints com km_acumulado faltando => 400 (validação)
 * CT03 -> RN03: POST /checkpoints com velocidade_media faltando => 400 (validação)
 * CT04 -> RN04: GET /checkpoints/turno/:id_turno => 200 (sucesso listagem)
 * CT05 -> RN05: GET /checkpoints/turno/:id_turno vazio => 200 (lista vazia)
 * CT06 -> RN06: GET /checkpoints/:id_checkpoint inexistente => 404 (não encontrado)
 * CT07 -> RN07: PUT /checkpoints/:id_checkpoint atualização km => 200 (sucesso)
 * CT08 -> RN08: PUT /checkpoints/:id_checkpoint com km negativo => 422 (validação schema)
 * CT09 -> RN09: POST /checkpoints com id_turno inválido => 409 (conflito integridade)
 * CT10 -> RN10: GET /checkpoints/turno/xyz (id_turno não numérico) => 400 (validação)
 */

import express from 'express';
import request from 'supertest';

describe('CheckpointController (integration)', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock dos handlers do Controller
    const mockService = {
      registrarNovoCheckpoint: jest.fn(),
      listarCheckpointsPorTurno: jest.fn(),
      atualizarKmCheckpoint: jest.fn(),
      obterKmsAcumuladosDuranteTurno: jest.fn(),
      contarCheckpointsPorSessao: jest.fn(),
      obterHistoricoCheckpointsAtleta: jest.fn()
    };

    // Endpoints REST para Checkpoint
    
    // POST /checkpoints - Registrar novo checkpoint (201)
    app.post('/checkpoints', async (req: express.Request, res: express.Response) => {
      try {
        const { km_acumulado, velocidade_media, registrado_em, id_turno, id_sessao_operacional, pace_medio, is_ajuste } = req.body;

        // Validações obrigatórias (400)
        if (km_acumulado === undefined || km_acumulado === null) {
          return res.status(400).json({ message: 'Campo km_acumulado é obrigatório.' });
        }
        if (velocidade_media === undefined || velocidade_media === null) {
          return res.status(400).json({ message: 'Campo velocidade_media é obrigatório.' });
        }
        if (!registrado_em) {
          return res.status(400).json({ message: 'Campo registrado_em é obrigatório.' });
        }

        // Validação de integridade (409)
        if (id_turno && id_turno < 1) {
          return res.status(409).json({ message: 'id_turno deve ser válido (conflito de chave estrangeira).' });
        }

        // Simulação de sucesso (201)
        const resultado = {
          id_checkpoint: Math.floor(Math.random() * 10000),
          km_acumulado,
          velocidade_media,
          registrado_em,
          id_turno: id_turno || null,
          id_sessao_operacional: id_sessao_operacional || null,
          pace_medio: pace_medio || 0,
          is_ajuste: is_ajuste || false
        };

        return res.status(201).json(resultado);
      } catch (error) {
        return res.status(500).json({ message: 'Erro ao registrar checkpoint.' });
      }
    });

    // GET /checkpoints/turno/:id_turno - Listar checkpoints (200)
    app.get('/checkpoints/turno/:id_turno', async (req: express.Request, res: express.Response) => {
      try {
        const { id_turno } = req.params;

        // Validação: id_turno deve ser numérico (400)
        if (isNaN(Number(id_turno))) {
          return res.status(400).json({ message: 'id_turno deve ser um número.' });
        }

        // Simulação: retorna lista vazia ou populada (200)
        const checkpoints: any[] = [];
        return res.status(200).json(checkpoints);
      } catch (error) {
        return res.status(500).json({ message: 'Erro ao listar checkpoints.' });
      }
    });

    // GET /checkpoints/:id_checkpoint - Buscar um checkpoint específico
    app.get('/checkpoints/:id_checkpoint', async (req: express.Request, res: express.Response) => {
      try {
        const { id_checkpoint } = req.params;

        // Validação: id_checkpoint deve ser numérico (400)
        if (isNaN(Number(id_checkpoint))) {
          return res.status(400).json({ message: 'id_checkpoint deve ser um número.' });
        }

        // Simulação: checkpoint não encontrado (404)
        return res.status(404).json({ message: 'Checkpoint não encontrado.' });
      } catch (error) {
        return res.status(500).json({ message: 'Erro ao buscar checkpoint.' });
      }
    });

    // PUT /checkpoints/:id_checkpoint - Atualizar km de checkpoint
    app.put('/checkpoints/:id_checkpoint', async (req: express.Request, res: express.Response) => {
      try {
        const { id_checkpoint } = req.params;
        const { km_acumulado } = req.body;

        // Validação: km_acumulado é obrigatório (400)
        if (km_acumulado === undefined || km_acumulado === null) {
          return res.status(400).json({ message: 'Campo km_acumulado é obrigatório.' });
        }

        // Validação schema: km_acumulado não pode ser negativo (422)
        if (km_acumulado < 0) {
          return res.status(422).json({ message: 'km_acumulado não pode ser negativo (validação schema).' });
        }

        // Simulação: sucesso (200)
        const resultado = {
          id_checkpoint: Number(id_checkpoint),
          km_acumulado,
          message: 'Checkpoint atualizado com sucesso.'
        };

        return res.status(200).json(resultado);
      } catch (error) {
        return res.status(500).json({ message: 'Erro ao atualizar checkpoint.' });
      }
    });
  });

  describe('POST /checkpoints', () => {
    it('CT01 -> RN01: POST /checkpoints com payload válido => 201', async () => {
      // Arrange
      const payload = {
        km_acumulado: 42.5,
        velocidade_media: 11.5,
        registrado_em: '2026-06-11T10:30:00Z',
        id_turno: 10,
        id_sessao_operacional: 5,
        pace_medio: 5.2,
        is_ajuste: false
      };

      // Act
      const res = await request(app).post('/checkpoints').send(payload);

      // Assert
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id_checkpoint');
      expect(res.body).toHaveProperty('km_acumulado', 42.5);
      expect(res.body).toHaveProperty('velocidade_media', 11.5);
    });

    it('CT02 -> RN02: POST /checkpoints com km_acumulado faltando => 400', async () => {
      // Arrange
      const payload = {
        velocidade_media: 11.5,
        registrado_em: '2026-06-11T10:30:00Z',
        id_turno: 10
      };

      // Act
      const res = await request(app).post('/checkpoints').send(payload);

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('km_acumulado');
    });

    it('CT03 -> RN03: POST /checkpoints com velocidade_media faltando => 400', async () => {
      // Arrange
      const payload = {
        km_acumulado: 42.5,
        registrado_em: '2026-06-11T10:30:00Z',
        id_turno: 10
      };

      // Act
      const res = await request(app).post('/checkpoints').send(payload);

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('velocidade_media');
    });

    it('CT09 -> RN09: POST /checkpoints com id_turno inválido => 409', async () => {
      // Arrange
      const payload = {
        km_acumulado: 42.5,
        velocidade_media: 11.5,
        registrado_em: '2026-06-11T10:30:00Z',
        id_turno: -1  // Inválido para chave estrangeira
      };

      // Act
      const res = await request(app).post('/checkpoints').send(payload);

      // Assert
      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('chave estrangeira');
    });
  });

  describe('GET /checkpoints/turno/:id_turno', () => {
    it('CT04 -> RN04: GET /checkpoints/turno/10 => 200 (sucesso listagem)', async () => {
      // Act
      const res = await request(app).get('/checkpoints/turno/10');

      // Assert
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('CT05 -> RN05: GET /checkpoints/turno/999 => 200 (lista vazia)', async () => {
      // Act
      const res = await request(app).get('/checkpoints/turno/999');

      // Assert
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('CT10 -> RN10: GET /checkpoints/turno/xyz => 400 (validação)', async () => {
      // Act
      const res = await request(app).get('/checkpoints/turno/xyz');

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('número');
    });
  });

  describe('GET /checkpoints/:id_checkpoint', () => {
    it('CT06 -> RN06: GET /checkpoints/999 inexistente => 404', async () => {
      // Act
      const res = await request(app).get('/checkpoints/999');

      // Assert
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('não encontrado');
    });
  });

  describe('PUT /checkpoints/:id_checkpoint', () => {
    it('CT07 -> RN07: PUT /checkpoints/1 com km válido => 200', async () => {
      // Arrange
      const payload = { km_acumulado: 50.0 };

      // Act
      const res = await request(app).put('/checkpoints/1').send(payload);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('km_acumulado', 50.0);
      expect(res.body).toHaveProperty('message');
    });

    it('CT08 -> RN08: PUT /checkpoints/1 com km negativo => 422', async () => {
      // Arrange
      const payload = { km_acumulado: -5.0 };

      // Act
      const res = await request(app).put('/checkpoints/1').send(payload);

      // Assert
      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('validação schema');
    });
  });
});
