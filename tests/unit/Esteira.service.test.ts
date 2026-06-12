/// <reference types="jest" />
/**
 * CT mapping: (CT0X -> RN0X)
 * CT01 -> RN01: listar retorna lista com dados
 * CT02 -> RN02: listar retorna lista vazia
 * CT03 -> RN03: listar lança exceção
 * CT04 -> RN04: buscarPorModelo retorna esteira encontrada
 * CT05 -> RN05: buscarPorModelo retorna null quando não encontrada
 * CT06 -> RN06: buscarPorModelo lança exceção
 */

// Mocks declarados antes de jest.mock para evitar hoisting issues
const mockedListar: any = jest.fn();
const mockedBuscarPorModelo: any = jest.fn();

jest.mock('../../src/Repository/EsteiraRepository', () => {
  return {
    EsteiraRepository: jest.fn().mockImplementation(() => ({
      listar: mockedListar,
      buscarPorModelo: mockedBuscarPorModelo
    }))
  };
});

import { EsteiraService } from '../../src/Service/EsteiraService';
import { EsteiraDB } from '../../src/Repository/EsteiraRepository';

describe('EsteiraService (White-box Unit Tests)', () => {
  let service: EsteiraService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedListar.mockReset();
    mockedBuscarPorModelo.mockReset();
    service = new EsteiraService();
  });

  // ==================== listar() ====================
  describe('listar()', () => {

    // CT01 -> RN01: listar retorna lista com dados
    // Arrange: mock retorna array com duas esteiras
    // Act: chama service.listar()
    // Assert: verifica retorno e chamados do repository
    it('CT01 -> RN01: retorna lista com dados', async () => {
      const data: EsteiraDB[] = [
        { id_esteira: 1, id_equipe: null, id_evento: 1, marca: 'MarcaA', modelo: 'M1', numero_serie: 'SN123', status: 'ok', delet_at: false },
        { id_esteira: 2, id_equipe: 2, id_evento: null, marca: 'MarcaB', modelo: 'M2', numero_serie: 'SN456', status: 'manutencao', delet_at: false }
      ];

      mockedListar.mockResolvedValue(data);

      const result = await service.listar();

      expect(mockedListar).toHaveBeenCalledTimes(1);
      expect(result).toEqual(data);
      expect(result[0].marca).toBe('MarcaA');
    });

    // CT02 -> RN02: listar retorna lista vazia
    // Arrange: mock retorna array vazio
    // Act: chama service.listar()
    // Assert: verifica array vazio
    it('CT02 -> RN02: retorna array vazio quando não há registros', async () => {
      mockedListar.mockResolvedValue([]);

      const result = await service.listar();

      expect(mockedListar).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    // CT03 -> RN03: listar lança exceção
    // Arrange: mock rejeita com erro
    // Act: chama service.listar() e espera rejeição
    // Assert: verifica exceção
    it('CT03 -> RN03: lança erro quando repository falha', async () => {
      const err = new Error('DB failure');
      mockedListar.mockRejectedValue(err);

      await expect(service.listar()).rejects.toThrow('DB failure');
      expect(mockedListar).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== buscarPorModelo() ====================
  describe('buscarPorModelo()', () => {

    // CT04 -> RN04: buscarPorModelo retorna esteira encontrada
    // Arrange: mock retorna um objeto EsteiraDB
    // Act: chama service.buscarPorModelo('M1')
    // Assert: verifica retorno correto
    it("CT04 -> RN04: retorna esteira ao buscar por modelo existente", async () => {
      const found: EsteiraDB = { id_esteira: 10, id_equipe: 1, id_evento: 2, marca: 'MarcaX', modelo: 'M1', numero_serie: 'SN999', status: 'ok', delet_at: false };

      mockedBuscarPorModelo.mockResolvedValue(found);

      const result = await service.buscarPorModelo('M1');

      expect(mockedBuscarPorModelo).toHaveBeenCalledWith('M1');
      expect(result).toEqual(found);
      expect(result?.numero_serie).toBe('SN999');
    });

    // CT05 -> RN05: buscarPorModelo retorna null quando não encontrada
    // Arrange: mock retorna null
    // Act: chama service.buscarPorModelo('X')
    // Assert: verifica retorno null
    it('CT05 -> RN05: retorna null quando modelo não encontrado', async () => {
      mockedBuscarPorModelo.mockResolvedValue(null);

      const result = await service.buscarPorModelo('NAO_EXISTE');

      expect(mockedBuscarPorModelo).toHaveBeenCalledWith('NAO_EXISTE');
      expect(result).toBeNull();
    });

    // CT06 -> RN06: buscarPorModelo lança exceção
    // Arrange: mock rejeita com erro
    // Act: chama service.buscarPorModelo e espera exceção
    // Assert: verifica exceção propagada
    it('CT06 -> RN06: lança erro quando repository falha na busca por modelo', async () => {
      mockedBuscarPorModelo.mockRejectedValue(new Error('Search failed'));

      await expect(service.buscarPorModelo('M1')).rejects.toThrow('Search failed');
      expect(mockedBuscarPorModelo).toHaveBeenCalledTimes(1);
    });
  });
});
