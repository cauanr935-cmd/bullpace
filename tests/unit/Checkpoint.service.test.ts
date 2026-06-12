/// <reference types="jest" />
/**
 * CT mapping: (CT0X -> RN0X)
 * CT01 -> RN01: registrarNovoCheckpoint com sucesso
 * CT02 -> RN02: registrarNovoCheckpoint com erro no banco
 * CT03 -> RN03: listarCheckpointsPorTurno retorna lista
 * CT04 -> RN04: listarCheckpointsPorTurno retorna vazio
 * CT05 -> RN05: listarCheckpointsPorTurno com erro
 * CT06 -> RN06: atualizarKmCheckpoint com sucesso
 * CT07 -> RN07: atualizarKmCheckpoint com erro
 * CT08 -> RN08: obterKmsAcumuladosDuranteTurno soma corretamente
 * CT09 -> RN09: obterKmsAcumuladosDuranteTurno com erro
 * CT10 -> RN10: contarCheckpointsPorSessao retorna contagem
 * CT11 -> RN11: contarCheckpointsPorSessao com erro
 * CT12 -> RN12: obterHistoricoCheckpointsAtleta retorna histórico
 * CT13 -> RN13: obterHistoricoCheckpointsAtleta com erro
 */

// Declarar mocks como any para evitar referência circular com jest.mock
const mockedInsert: any = jest.fn();
const mockedFindByTurno: any = jest.fn();
const mockedUpdateKm: any = jest.fn();
const mockedSumKms: any = jest.fn();
const mockedCountBySessao: any = jest.fn();
const mockedFindByAtletaDuranteTurno: any = jest.fn();
const mockedRegistrarCheckpoint: any = jest.fn();
const mockedBuscarCheckpointsPorTurno: any = jest.fn();

jest.mock('../../src/Repository/CheckpointRepository', () => {
  return {
    CheckpointRepository: jest.fn().mockImplementation(() => ({
      insert: mockedInsert,
      findByTurno: mockedFindByTurno,
      updateKm: mockedUpdateKm,
      sumKmsPorEquipeDuranteTurno: mockedSumKms,
      countBySessao: mockedCountBySessao,
      findByAtletaDuranteTurno: mockedFindByAtletaDuranteTurno
    }))
  };
});

jest.mock('../../src/Controller/CheckpointController', () => ({
  registrarCheckpoint: mockedRegistrarCheckpoint,
  buscarCheckpointsPorTurno: mockedBuscarCheckpointsPorTurno
}));

import { CheckpointService } from '../../src/Service/CheckpointService';

describe('CheckpointService (unit)', () => {
  const sampleCheckpoint = {
    id_checkpoint: 1,
    id_turno: 10,
    id_sessao_operacional: 5,
    km_acumulado: 42.5,
    pace_medio: 5.2,
    velocidade_media: 11.5,
    registrado_em: '2026-06-11T10:30:00Z',
    is_ajuste: false
  };

  const sampleCheckpoints = [
    sampleCheckpoint,
    {
      id_checkpoint: 2,
      id_turno: 10,
      id_sessao_operacional: 5,
      km_acumulado: 45.0,
      pace_medio: 5.3,
      velocidade_media: 11.7,
      registrado_em: '2026-06-11T10:35:00Z',
      is_ajuste: false
    }
  ];

  beforeEach(() => {
    mockedInsert.mockReset();
    mockedFindByTurno.mockReset();
    mockedUpdateKm.mockReset();
    mockedSumKms.mockReset();
    mockedCountBySessao.mockReset();
    mockedFindByAtletaDuranteTurno.mockReset();
    mockedRegistrarCheckpoint.mockReset();
    mockedBuscarCheckpointsPorTurno.mockReset();
  });

  describe('registrarNovoCheckpoint()', () => {
    it('CT01 -> RN01: registrarNovoCheckpoint com sucesso', async () => {
      // Arrange
      const input = { ...sampleCheckpoint, id_checkpoint: undefined };
      const resultado = sampleCheckpoint;
      mockedRegistrarCheckpoint.mockResolvedValue(resultado);
      const svc = new CheckpointService();

      // Act
      const res = await svc.registrarNovoCheckpoint(input as any);

      // Assert
      expect(res).toEqual(resultado);
      expect(mockedRegistrarCheckpoint).toHaveBeenCalledWith(input);
    });

    it('CT02 -> RN02: registrarNovoCheckpoint com erro no banco', async () => {
      // Arrange
      const input = { ...sampleCheckpoint, id_checkpoint: undefined };
      const erro = new Error('[CheckpointService] Erro ao registrar novo checkpoint');
      mockedRegistrarCheckpoint.mockRejectedValue(erro);
      const svc = new CheckpointService();

      // Act & Assert
      await expect(svc.registrarNovoCheckpoint(input as any)).rejects.toThrow('Erro ao registrar novo checkpoint');
    });
  });

  describe('listarCheckpointsPorTurno()', () => {
    it('CT03 -> RN03: listarCheckpointsPorTurno retorna lista', async () => {
      const svc = new CheckpointService();
      mockedBuscarCheckpointsPorTurno.mockResolvedValue(sampleCheckpoints);

      const result = await svc.listarCheckpointsPorTurno(10);

      expect(result).toEqual(sampleCheckpoints);
      expect(mockedBuscarCheckpointsPorTurno).toHaveBeenCalledWith(10);
    });

    it('CT05 -> RN05: listarCheckpointsPorTurno com erro', async () => {
      const svc = new CheckpointService();
      mockedBuscarCheckpointsPorTurno.mockRejectedValue(new Error('DB fail'));

      await expect(svc.listarCheckpointsPorTurno(10)).rejects.toThrow('DB fail');
    });
  });

  describe('atualizarKmCheckpoint()', () => {
    it('CT06 -> RN06: atualizarKmCheckpoint com sucesso', async () => {
      const svc = new CheckpointService();
      mockedUpdateKm.mockResolvedValue(sampleCheckpoint);

      const result = await svc.atualizarKmCheckpoint(1, 50.0);

      expect(result).toEqual(sampleCheckpoint);
      expect(mockedUpdateKm).toHaveBeenCalledWith(1, 50.0);
    });

    it('CT07 -> RN07: atualizarKmCheckpoint com erro', async () => {
      const svc = new CheckpointService();
      mockedUpdateKm.mockRejectedValue(new Error('Update fail'));

      await expect(svc.atualizarKmCheckpoint(1, 50.0)).rejects.toThrow('Update fail');
    });
  });

  describe('obterKmsAcumuladosDuranteTurno()', () => {
    it('CT08 -> RN08: obterKmsAcumuladosDuranteTurno soma corretamente', async () => {
      const svc = new CheckpointService();
      mockedSumKms.mockResolvedValue(123.45);

      const result = await svc.obterKmsAcumuladosDuranteTurno(10);

      expect(result).toBe(123.45);
      expect(mockedSumKms).toHaveBeenCalledWith(10);
    });

    it('CT09 -> RN09: obterKmsAcumuladosDuranteTurno com erro', async () => {
      const svc = new CheckpointService();
      mockedSumKms.mockRejectedValue(new Error('Sum fail'));

      await expect(svc.obterKmsAcumuladosDuranteTurno(10)).rejects.toThrow('Sum fail');
    });
  });

  describe('contarCheckpointsPorSessao()', () => {
    it('CT10 -> RN10: contarCheckpointsPorSessao retorna contagem', async () => {
      const svc = new CheckpointService();
      mockedCountBySessao.mockResolvedValue(7);

      const result = await svc.contarCheckpointsPorSessao(5);

      expect(result).toBe(7);
      expect(mockedCountBySessao).toHaveBeenCalledWith(5);
    });

    it('CT11 -> RN11: contarCheckpointsPorSessao com erro', async () => {
      const svc = new CheckpointService();
      mockedCountBySessao.mockRejectedValue(new Error('Count fail'));

      await expect(svc.contarCheckpointsPorSessao(5)).rejects.toThrow('Count fail');
    });
  });

  describe('obterHistoricoCheckpointsAtleta()', () => {
    it('CT12 -> RN12: obterHistoricoCheckpointsAtleta retorna histórico', async () => {
      const svc = new CheckpointService();
      mockedFindByAtletaDuranteTurno.mockResolvedValue(sampleCheckpoints);

      const result = await svc.obterHistoricoCheckpointsAtleta(1, 10);

      expect(result).toEqual(sampleCheckpoints);
      expect(mockedFindByAtletaDuranteTurno).toHaveBeenCalledWith(1, 10);
    });

    it('CT13 -> RN13: obterHistoricoCheckpointsAtleta com erro', async () => {
      const svc = new CheckpointService();
      mockedFindByAtletaDuranteTurno.mockRejectedValue(new Error('History fail'));

      await expect(svc.obterHistoricoCheckpointsAtleta(1, 10)).rejects.toThrow('History fail');
    });
  });
});
