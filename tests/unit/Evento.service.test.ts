/// <reference types="jest" />
/**
 * CT mapping: (CT0X -> RN0X)
 * CT01 -> RN01: listar retorna eventos (sucesso)
 * CT02 -> RN02: listar retorna vazio
 * CT03 -> RN03: listar lança exceção
 * CT04 -> RN04: buscarAtivo retorna evento ativo
 * CT05 -> RN05: buscarAtivo retorna null (nenhum ativo)
 * CT06 -> RN06: buscarAtivo lança exceção
 * CT07 -> RN07: atualizarStatus executa com sucesso
 * CT08 -> RN08: atualizarStatus repassa erro quando falha
 */

// Mocks declarados antes de jest.mock
const mockedListar: any = jest.fn();
const mockedBuscarAtivo: any = jest.fn();
const mockedAtualizarStatus: any = jest.fn();

jest.mock('../../src/Repository/EventoRepository', () => {
  return {
    EventoRepository: jest.fn().mockImplementation(() => ({
      listar: mockedListar,
      buscarAtivo: mockedBuscarAtivo,
      atualizarStatus: mockedAtualizarStatus
    }))
  };
});

import { EventoService } from '../../src/Service/EventoService';
import { EventoDB } from '../../src/Repository/EventoRepository';

describe('EventoService (White-box Unit Tests)', () => {
  let service: EventoService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedListar.mockReset();
    mockedBuscarAtivo.mockReset();
    mockedAtualizarStatus.mockReset();
    service = new EventoService();
  });

  // listar()
  describe('listar()', () => {
    // CT01 -> RN01: listar retorna eventos (sucesso)
    // Arrange: mock retorna lista com eventos
    // Act: chama service.listar()
    // Assert: verifica retorno e chamadas
    it('CT01 -> RN01: retorna lista de eventos', async () => {
      const data: EventoDB[] = [
        { id_evento: 1, nome: 'Ev A', cidade: 'C1', estado: 'E1', data_inicio: '2026-01-01', data_fim: '2026-01-02', status: 'ativo' }
      ];
      mockedListar.mockResolvedValue(data);

      const result = await service.listar();

      expect(mockedListar).toHaveBeenCalledTimes(1);
      expect(result).toEqual(data);
    });

    // CT02 -> RN02: listar retorna vazio
    it('CT02 -> RN02: retorna array vazio quando nenhum evento', async () => {
      mockedListar.mockResolvedValue([]);
      const result = await service.listar();
      expect(result).toEqual([]);
      expect(mockedListar).toHaveBeenCalledTimes(1);
    });

    // CT03 -> RN03: listar lança exceção
    it('CT03 -> RN03: lança erro quando repository falha', async () => {
      mockedListar.mockRejectedValue(new Error('DB error'));
      await expect(service.listar()).rejects.toThrow('DB error');
      expect(mockedListar).toHaveBeenCalledTimes(1);
    });
  });

  // buscarAtivo()
  describe('buscarAtivo()', () => {
    // CT04 -> RN04: buscarAtivo retorna evento ativo
    it('CT04 -> RN04: retorna evento ativo quando presente', async () => {
      const ev: EventoDB = { id_evento: 10, nome: 'Ativo', cidade: 'X', estado: 'Y', data_inicio: '2026-05-01', data_fim: '2026-05-02', status: 'ativo' };
      mockedBuscarAtivo.mockResolvedValue(ev);

      const result = await service.buscarAtivo();
      expect(result).toEqual(ev);
      expect(mockedBuscarAtivo).toHaveBeenCalledTimes(1);
    });

    // CT05 -> RN05: buscarAtivo retorna null
    it('CT05 -> RN05: retorna null quando não há evento ativo', async () => {
      mockedBuscarAtivo.mockResolvedValue(null);
      const result = await service.buscarAtivo();
      expect(result).toBeNull();
      expect(mockedBuscarAtivo).toHaveBeenCalledTimes(1);
    });

    // CT06 -> RN06: buscarAtivo lança exceção
    it('CT06 -> RN06: lança erro quando repository falha na busca', async () => {
      mockedBuscarAtivo.mockRejectedValue(new Error('Search fail'));
      await expect(service.buscarAtivo()).rejects.toThrow('Search fail');
      expect(mockedBuscarAtivo).toHaveBeenCalledTimes(1);
    });
  });

  // atualizarStatus()
  describe('atualizarStatus()', () => {
    // CT07 -> RN07: atualizarStatus executa com sucesso
    it('CT07 -> RN07: atualiza status sem erros', async () => {
      mockedAtualizarStatus.mockResolvedValue(undefined);
      await expect(service.atualizarStatus(1, 'encerrado')).resolves.toBeUndefined();
      expect(mockedAtualizarStatus).toHaveBeenCalledWith(1, 'encerrado');
    });

    // CT08 -> RN08: atualizarStatus repassa erro quando falha
    it('CT08 -> RN08: lança erro quando repository falha ao atualizar', async () => {
      mockedAtualizarStatus.mockRejectedValue(new Error('Update fail'));
      await expect(service.atualizarStatus(2, 'ativo')).rejects.toThrow('Update fail');
      expect(mockedAtualizarStatus).toHaveBeenCalledWith(2, 'ativo');
    });
  });
});
