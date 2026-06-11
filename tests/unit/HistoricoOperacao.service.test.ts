/// <reference types="jest" />
/**
 * CT mapping: (CT0X -> RN0X)
 * CT01 -> RN01: registrar retorna objeto historico quando inserção bem-sucedida
 * CT02 -> RN02: registrar retorna null ou propaga erro quando insert falha
 * CT03 -> RN03: listar retorna array de registros
 * CT04 -> RN04: listar retorna vazio
 * CT05 -> RN05: listar propaga erro quando repository falha
 */

// Mocks declarados antes do jest.mock para evitar hoisting issues
const mockedInsert: any = jest.fn();
const mockedListar: any = jest.fn();

jest.mock('../../src/Repository/HistoricoOperacaoRepository', () => {
  return {
    HistoricoOperacaoRepository: jest.fn().mockImplementation(() => ({
      insert: mockedInsert,
      listar: mockedListar
    }))
  };
});

import { HistoricoOperacaoService } from '../../src/Service/HistoricoOperacaoService';
import { CriarHistoricoOperacaoInput, HistoricoOperacao } from '../../src/Models/HistoricoOperacaoModels';

describe('HistoricoOperacaoService (White-box Unit Tests)', () => {
  let service: HistoricoOperacaoService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedInsert.mockReset();
    mockedListar.mockReset();
    service = new HistoricoOperacaoService();
  });

  // ==================== registrar() ====================
  describe('registrar()', () => {
    // CT01 -> RN01: registrar retorna objeto historico quando inserção bem-sucedida
    // Arrange: mock insert retorna objeto HistoricoOperacao
    // Act: chama service.registrar()
    // Assert: verifica retorno e chamada
    it('CT01 -> RN01: retorna historico quando insert bem-sucedido', async () => {
      const input: CriarHistoricoOperacaoInput = {
        nome_usuario: 'Operador1',
        perfil_usuario: 'operador',
        tipo_operacao: 'registrar_checkpoint',
        entidade: 'checkpoint',
        entidade_id: '10',
        valor_anterior: null,
        valor_novo: { km_acumulado: 10 },
        motivo: null
      } as any;

      const retorno: HistoricoOperacao = {
        id: 123,
        usuario_id: 'sess1',
        nome_usuario: 'Operador1',
        perfil_usuario: 'operador',
        tipo_operacao: 'registrar_checkpoint',
        entidade: 'checkpoint',
        entidade_id: '10',
        valor_anterior: null,
        valor_novo: { km_acumulado: 10 },
        motivo: null,
        data_hora: new Date().toISOString()
      };

      mockedInsert.mockResolvedValue(retorno);

      const result = await service.registrar(input);

      expect(mockedInsert).toHaveBeenCalledWith(input);
      expect(result).toEqual(retorno);
    });

    // CT02 -> RN02: registrar retorna null ou propaga erro quando insert falha
    // Arrange: mock insert rejeita
    // Act: chama service.registrar() e espera exceção
    // Assert: verifica exceção
    it('CT02 -> RN02: propaga erro quando insert falha', async () => {
      const input: CriarHistoricoOperacaoInput = {
        nome_usuario: 'X', perfil_usuario: 'operador', tipo_operacao: 't', entidade: 'e', entidade_id: '1', valor_anterior: null, valor_novo: {}, motivo: null
      } as any;

      mockedInsert.mockRejectedValue(new Error('Insert failed'));

      await expect(service.registrar(input)).rejects.toThrow('Insert failed');
      expect(mockedInsert).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== listar() ====================
  describe('listar()', () => {
    // CT03 -> RN03: listar retorna array de registros
    // Arrange: mock listar retorna array
    // Act: chama service.listar()
    // Assert: verifica retorno e chamado com filtros
    it('CT03 -> RN03: retorna array de historicos', async () => {
      const itens: HistoricoOperacao[] = [
        { id: 1, usuario_id: 'u1', nome_usuario: 'U1', perfil_usuario: 'operador', tipo_operacao: 't', entidade: 'e', entidade_id: '1', valor_anterior: null, valor_novo: {}, motivo: null, data_hora: new Date().toISOString() }
      ];

      mockedListar.mockResolvedValue(itens);

      const result = await service.listar({});

      expect(result).toEqual(itens);
      expect(mockedListar).toHaveBeenCalledWith({});
    });

    // CT04 -> RN04: listar retorna vazio
    it('CT04 -> RN04: retorna array vazio quando não há registros', async () => {
      mockedListar.mockResolvedValue([]);
      const result = await service.listar({});
      expect(result).toEqual([]);
    });

    // CT05 -> RN05: listar propaga erro quando repository falha
    it('CT05 -> RN05: propaga erro quando listar falha', async () => {
      mockedListar.mockRejectedValue(new Error('List failed'));
      await expect(service.listar({})).rejects.toThrow('List failed');
      expect(mockedListar).toHaveBeenCalledTimes(1);
    });
  });
});
