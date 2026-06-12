/// <reference types="jest" />
/**
 * CT mapping: (CT0X -> RN0X)
 * CT01 -> RN01: obterPlacarGeralDoEvento() retorna placar quando obterDadosPlacar succeed (Arrange/Act/Assert)
 * CT02 -> RN02: obterPlacarGeralDoEvento() repassa erro quando obterDadosPlacar throw (Arrange/Act/Assert)
 */

import { PlacarService } from '../../src/Service/PlacarService';

// Create mock via factory so jest hoisting doesn't break references
jest.mock('../../src/Controller/PlacarController', () => ({
  obterDadosPlacar: jest.fn()
}));

const getObterDadosPlacarMock = () => (require('../../src/Controller/PlacarController') as any).obterDadosPlacar as jest.Mock;

describe('PlacarService (White-box Unit Tests)', () => {
  let service: PlacarService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlacarService();
    // rebind mock reference (factory-created mock)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const obterDadosPlacarMock = getObterDadosPlacarMock();
  });

  it('CT01 -> RN01: obterPlacarGeralDoEvento() retorna placar quando obterDadosPlacar succeed', async () => {
    // Arrange
    const fake = {
      id_evento: 10,
      modo_tv_bloqueado: false,
      atualizado_em: new Date().toISOString(),
      classificacao: [{ id_esteira: 1, km_total: 12.34 }]
    };
    const obterDadosPlacarMock = getObterDadosPlacarMock();
    obterDadosPlacarMock.mockResolvedValue(fake);

    // Act
    const res = await service.obterPlacarGeralDoEvento(10);

    // Assert
    expect(obterDadosPlacarMock).toHaveBeenCalledWith(10);
    expect(res).toEqual(fake);
  });

  it('CT02 -> RN02: obterPlacarGeralDoEvento() repassa erro quando obterDadosPlacar throw', async () => {
    // Arrange
    const obterDadosPlacarMock = getObterDadosPlacarMock();
    obterDadosPlacarMock.mockRejectedValue(new Error('Supabase fail'));

    // Act & Assert
    await expect(service.obterPlacarGeralDoEvento(5)).rejects.toThrow('Supabase fail');
    expect(obterDadosPlacarMock).toHaveBeenCalledWith(5);
  });
});
