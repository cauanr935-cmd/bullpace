/// <reference types="jest" />
/**
 * CT mapping: (CT0X -> RN0X)
 * CT01 -> RN01: listar() retorna lista de operadores com sucesso (Arrange/Act/Assert)
 * CT02 -> RN02: listar() propaga erro quando repository falha (Arrange/Act/Assert)
 * CT03 -> RN03: buscarPorLogin() retorna operador quando encontrado (Arrange/Act/Assert)
 * CT04 -> RN04: buscarPorLogin() retorna null quando não existe (Arrange/Act/Assert)
 * CT05 -> RN05: buscarPorLogin() propaga erro quando repository falha (Arrange/Act/Assert)
 * CT06 -> RN06: listarPermissoes() retorna objeto de permissoes corretamente (Arrange/Act/Assert)
 */

import { OperadorService } from '../../src/Service/OperadorService';

// Mocks must be declared before jest.mock to avoid hoisting issues
const listarMock = jest.fn();
const buscarPorLoginMock = jest.fn();
const criarMock = jest.fn();

jest.mock('../../src/Repository/OperadorRepository', () => {
  return {
    OperadorRepository: jest.fn().mockImplementation(() => ({
      listar: listarMock,
      buscarPorLogin: buscarPorLoginMock,
      criar: criarMock
    }))
  };
});

describe('OperadorService (White-box Unit Tests)', () => {
  let service: OperadorService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OperadorService();
  });

  it('CT01 -> RN01: listar() retorna lista de operadores com sucesso', async () => {
    // Arrange
    const data = [ { id_operador: 1, nome: 'Op1', login: 'op1', senha: '123', id_sessao_operacional: null } ];
    listarMock.mockResolvedValue(data);

    // Act
    const res = await service.listar();

    // Assert
    expect(listarMock).toHaveBeenCalledTimes(1);
    expect(res).toEqual(data);
  });

  it('CT02 -> RN02: listar() propaga erro quando repository falha', async () => {
    // Arrange
    listarMock.mockRejectedValue(new Error('DB fail'));

    // Act & Assert
    await expect(service.listar()).rejects.toThrow('DB fail');
    expect(listarMock).toHaveBeenCalled();
  });

  it('CT03 -> RN03: buscarPorLogin() retorna operador quando encontrado', async () => {
    // Arrange
    const op = { id_operador: 2, nome: 'Op2', login: 'op2', senha: '123', id_sessao_operacional: null };
    buscarPorLoginMock.mockResolvedValue(op);

    // Act
    const res = await service.buscarPorLogin('op2');

    // Assert
    expect(buscarPorLoginMock).toHaveBeenCalledWith('op2');
    expect(res).toEqual(op);
  });

  it('CT04 -> RN04: buscarPorLogin() retorna null quando não existe', async () => {
    // Arrange
    buscarPorLoginMock.mockResolvedValue(null);

    // Act
    const res = await service.buscarPorLogin('missing');

    // Assert
    expect(res).toBeNull();
  });

  it('CT05 -> RN05: buscarPorLogin() propaga erro quando repository falha', async () => {
    // Arrange
    buscarPorLoginMock.mockRejectedValue(new Error('Query fail'));

    // Act & Assert
    await expect(service.buscarPorLogin('any')).rejects.toThrow('Query fail');
  });

  it('CT06 -> RN06: listarPermissoes() retorna objeto de permissoes corretamente', () => {
    // Arrange
    const id = '5';

    // Act
    const perms = service.listarPermissoes(id);

    // Assert
    expect(perms).toEqual({
      id_operador: 5,
      papel: 'operador',
      pode_exportar: false,
      pode_pausar_prova: false,
      pode_finalizar_prova: false
    });
  });
});
