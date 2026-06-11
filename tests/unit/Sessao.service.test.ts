/// <reference types="jest" />
/**
 * CT mapping: (CT0X -> RN0X)
 * CT01 -> RN01: iniciarNovaSessao() retorna nova sessao quando abrirSessao succeed (Arrange/Act/Assert)
 * CT02 -> RN02: iniciarNovaSessao() propaga erro quando abrirSessao falha (Arrange/Act/Assert)
 * CT03 -> RN03: encerrarSessaoExistente() retorna sessao finalizada quando encerrarSessao succeed (Arrange/Act/Assert)
 * CT04 -> RN04: encerrarSessaoExistente() propaga erro quando encerrarSessao falha (Arrange/Act/Assert)
 */

import { SessaoService } from '../../src/Service/SessaoService';

// Avoid hoisting issues by mocking with factory
jest.mock('../../src/Controller/SessaoController', () => ({
  abrirSessao: jest.fn(),
  encerrarSessao: jest.fn()
}));

const getMocks = () => {
  const mod = require('../../src/Controller/SessaoController') as any;
  return { abrirSessao: mod.abrirSessao as jest.Mock, encerrarSessao: mod.encerrarSessao as jest.Mock };
};

describe('SessaoService (White-box Unit Tests)', () => {
  let service: SessaoService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SessaoService();
  });

  it('CT01 -> RN01: iniciarNovaSessao() retorna nova sessao quando abrirSessao succeed', async () => {
    // Arrange
    const mock = getMocks();
    const input = { id_evento: 1, id_funcao: 2, inicio_em: new Date().toISOString() };
    const retorno = { id_sessao_operacional: 10, ...input, status: 'ativa' };
    mock.abrirSessao.mockResolvedValue(retorno);

    // Act
    const res = await service.iniciarNovaSessao(input as any);

    // Assert
    expect(mock.abrirSessao).toHaveBeenCalledWith(input);
    expect(res).toEqual(retorno);
  });

  it('CT02 -> RN02: iniciarNovaSessao() propaga erro quando abrirSessao falha', async () => {
    // Arrange
    const mock = getMocks();
    mock.abrirSessao.mockRejectedValue(new Error('Insert fail'));

    // Act & Assert
    await expect(service.iniciarNovaSessao({ id_evento: 1, id_funcao: 2, inicio_em: new Date() } as any)).rejects.toThrow('Insert fail');
    expect(mock.abrirSessao).toHaveBeenCalled();
  });

  it('CT03 -> RN03: encerrarSessaoExistente() retorna sessao finalizada quando encerrarSessao succeed', async () => {
    // Arrange
    const mock = getMocks();
    const retorno = { id_sessao_operacional: 5, id_evento: 1, id_funcao: 2, inicio_em: new Date().toISOString(), fim_em: new Date().toISOString(), status: 'encerrada' };
    mock.encerrarSessao.mockResolvedValue(retorno);

    // Act
    const res = await service.encerrarSessaoExistente(5);

    // Assert
    expect(mock.encerrarSessao).toHaveBeenCalledWith(5);
    expect(res).toEqual(retorno);
  });

  it('CT04 -> RN04: encerrarSessaoExistente() propaga erro quando encerrarSessao falha', async () => {
    // Arrange
    const mock = getMocks();
    mock.encerrarSessao.mockRejectedValue(new Error('Update fail'));

    // Act & Assert
    await expect(service.encerrarSessaoExistente(99)).rejects.toThrow('Update fail');
    expect(mock.encerrarSessao).toHaveBeenCalledWith(99);
  });
});
