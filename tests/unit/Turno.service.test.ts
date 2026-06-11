/// <reference types="jest" />
/**
 * CT mapping: (CT0X -> RN0X)
 * CT01 -> RN01: iniciarNovoTurno() retorna novo turno quando iniciarTurno succeed (Arrange/Act/Assert)
 * CT02 -> RN02: iniciarNovoTurno() propaga erro quando iniciarTurno falha (Arrange/Act/Assert)
 * CT03 -> RN03: finalizarTurnoExistente() retorna turno encerrado quando finalizarTurno succeed (Arrange/Act/Assert)
 * CT04 -> RN04: finalizarTurnoExistente() propaga erro quando finalizarTurno falha (Arrange/Act/Assert)
 * CT05 -> RN05: contarTurnosAtivos() retorna contagem quando repository resolve (Arrange/Act/Assert)
 * CT06 -> RN06: contarTurnosAtivos() propaga erro quando repository falha (Arrange/Act/Assert)
 */

import { TurnoService } from '../../src/Service/TurnoService';

// Mock controller functions and repository class via factories to avoid hoisting issues
jest.mock('../../src/Controller/TurnoController', () => ({
  iniciarTurno: jest.fn(),
  finalizarTurno: jest.fn()
}));

jest.mock('../../src/Repository/TurnoRepository', () => ({
  TurnoRepository: jest.fn().mockImplementation(() => ({
    contarTurnosAtivos: jest.fn()
  }))
}));

const getControllerMocks = () => require('../../src/Controller/TurnoController') as any;
const getRepoMocks = () => require('../../src/Repository/TurnoRepository') as any;

describe('TurnoService (White-box Unit Tests)', () => {
  let service: TurnoService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TurnoService();
  });

  it('CT01 -> RN01: iniciarNovoTurno() retorna novo turno quando iniciarTurno succeed', async () => {
    // Arrange
    const ctrl = getControllerMocks();
    const input = { id_atleta: 1, id_esteira: 2, id_sessao_operacional: 3, horario_inicio: new Date().toISOString() };
    const retorno = { id_turno: 9, ...input, status: 'em_andamento', km_turno: 0 };
    ctrl.iniciarTurno.mockResolvedValue(retorno);

    // Act
    const res = await service.iniciarNovoTurno(input as any);

    // Assert
    expect(ctrl.iniciarTurno).toHaveBeenCalledWith(input);
    expect(res).toEqual(retorno);
  });

  it('CT02 -> RN02: iniciarNovoTurno() propaga erro quando iniciarTurno falha', async () => {
    // Arrange
    const ctrl = getControllerMocks();
    ctrl.iniciarTurno.mockRejectedValue(new Error('Insert fail'));

    // Act & Assert
    await expect(service.iniciarNovoTurno({ id_atleta: 1, id_esteira: 2, id_sessao_operacional: 3, horario_inicio: new Date() } as any)).rejects.toThrow('Insert fail');
  });

  it('CT03 -> RN03: finalizarTurnoExistente() retorna turno encerrado quando finalizarTurno succeed', async () => {
    // Arrange
    const ctrl = getControllerMocks();
    const retorno = { id_turno: 7, id_atleta: 1, id_esteira: 2, id_sessao_operacional: 3, horario_inicio: new Date().toISOString(), horario_fim: new Date().toISOString(), status: 'encerrado', km_turno: 12.3 };
    ctrl.finalizarTurno.mockResolvedValue(retorno);

    // Act
    const res = await service.finalizarTurnoExistente(7, 12.3);

    // Assert
    expect(ctrl.finalizarTurno).toHaveBeenCalledWith(7, 12.3);
    expect(res).toEqual(retorno);
  });

  it('CT04 -> RN04: finalizarTurnoExistente() propaga erro quando finalizarTurno falha', async () => {
    // Arrange
    const ctrl = getControllerMocks();
    ctrl.finalizarTurno.mockRejectedValue(new Error('Update fail'));

    // Act & Assert
    await expect(service.finalizarTurnoExistente(99, 5)).rejects.toThrow('Update fail');
  });

  it('CT05 -> RN05: contarTurnosAtivos() retorna contagem quando repository resolve', async () => {
    // Arrange
    // Replace internal instance with a controlled mock
    const fakeInstance = { contarTurnosAtivos: jest.fn().mockResolvedValue(4) };
    (service as any).turnoRepositoryInstance = fakeInstance;

    // Act
    const res = await service.contarTurnosAtivos(2);

    // Assert
    expect(fakeInstance.contarTurnosAtivos).toHaveBeenCalledWith(2);
    expect(res).toBe(4);
  });

  it('CT06 -> RN06: contarTurnosAtivos() propaga erro quando repository falha', async () => {
    // Arrange
    const fakeInstance = { contarTurnosAtivos: jest.fn().mockRejectedValue(new Error('Count fail')) };
    (service as any).turnoRepositoryInstance = fakeInstance;

    // Act & Assert
    await expect(service.contarTurnosAtivos(3)).rejects.toThrow('Count fail');
  });
});
