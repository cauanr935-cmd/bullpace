/// <reference types="jest" />
/**
 * CT mapping: (CT0X -> RN0X)
 * CT01 -> RN01: listarPorEquipe retorna lista de atletas
 * CT02 -> RN02: listarPorEquipe retorna array vazio
 * CT03 -> RN03: buscarPorNome retorna atleta existente
 * CT04 -> RN04: buscarPorNome retorna null quando não existe
 */

import { AtletaService } from '../../src/Service/AtletaService';

// mocks expostos para usar nas especificações dos testes
const mockedListar = jest.fn();
const mockedBuscar = jest.fn();

jest.mock('../../src/Repository/AtletaRepository', () => {
  return {
    AtletaRepository: jest.fn().mockImplementation(() => ({
      listarPorEquipe: mockedListar,
      buscarPorNome: mockedBuscar
    }))
  };
});

describe('AtletaService (unit)', () => {
  const sampleAtletas = [
    { id_atleta: 1, id_equipe: 10, nome: 'Fulano', status: 'ativo' },
    { id_atleta: 2, id_equipe: 10, nome: 'Ciclano', status: 'ativo' }
  ];

  it('CT01 -> RN01: listarPorEquipe retorna lista de atletas (200)', async () => {
    mockedListar.mockResolvedValue(sampleAtletas);
    const svc = new AtletaService();
    const res = await svc.listarPorEquipe(10);
    expect(res).toEqual(sampleAtletas);
    expect(mockedListar).toHaveBeenCalledWith(10);
  });

  it('CT02 -> RN02: listarPorEquipe retorna array vazio quando nenhum atleta (200)', async () => {
    mockedListar.mockResolvedValue([]);
    const svc = new AtletaService();
    const res = await svc.listarPorEquipe(999);
    expect(Array.isArray(res)).toBe(true);
    expect(res).toHaveLength(0);
  });

  it('CT03 -> RN03: buscarPorNome retorna atleta existente (200)', async () => {
    const atleta = { id_atleta: 1, id_equipe: 10, nome: 'Fulano', status: 'ativo' };
    mockedBuscar.mockResolvedValue(atleta);
    const svc = new AtletaService();
    const res = await svc.buscarPorNome('Fulano', 10);
    expect(res).toEqual(atleta);
    expect(mockedBuscar).toHaveBeenCalledWith('Fulano', 10);
  });

  it('CT04 -> RN04: buscarPorNome retorna null quando não encontrado (404 equivalente)', async () => {
    mockedBuscar.mockResolvedValue(null);
    const svc = new AtletaService();
    const res = await svc.buscarPorNome('Inexistente', 10);
    expect(res).toBeNull();
  });
});
