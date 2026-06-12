/// <reference types="jest" />
/**
 * CT mapping: (CT0X -> RN0X)
 * CT01 -> RN01: listar retorna lista de administradores (White-box)
 * CT02 -> RN02: listar retorna array vazio (White-box)
 * CT03 -> RN03: listar lança erro ao consultar banco (White-box - exceção)
 * CT04 -> RN04: buscarPorLogin encontra admin existente (White-box)
 * CT05 -> RN05: buscarPorLogin retorna null quando não existe (White-box)
 * CT06 -> RN06: buscarPorLogin lança erro ao consultar banco (White-box - exceção)
 * CT07 -> RN07: autenticar valida credenciais com sucesso (White-box)
 * CT08 -> RN08: autenticar retorna null com credenciais inválidas (White-box)
 * CT09 -> RN09: autenticar lança erro ao consultar banco (White-box - exceção)
 * CT10 -> RN10: criar novo administrador com sucesso (White-box)
 * CT11 -> RN11: criar administrador com idEvento (White-box)
 * CT12 -> RN12: criar lança erro ao inserir (White-box - exceção)
 */

import { AdministradorService } from '../../src/Service/AdministradorService';

// Mocks expostos globalmente para compartilhamento entre testes
const mockedListar = jest.fn();
const mockedBuscarPorLogin = jest.fn();
const mockedAutenticar = jest.fn();
const mockedCriar = jest.fn();

jest.mock('../../src/Repository/AdministradorRepository', () => {
  return {
    AdministradorRepository: jest.fn().mockImplementation(() => ({
      listar: mockedListar,
      buscarPorLogin: mockedBuscarPorLogin,
      autenticar: mockedAutenticar,
      criar: mockedCriar
    }))
  };
});

describe('AdministradorService (unit)', () => {
  const sampleAdmins = [
    { id_admin: 1, id_evento: null, nome: 'Admin 1', login: 'admin1', senha: 'hash1' },
    { id_admin: 2, id_evento: 10, nome: 'Admin 2', login: 'admin2', senha: 'hash2' }
  ];

  beforeEach(() => {
    mockedListar.mockReset();
    mockedBuscarPorLogin.mockReset();
    mockedAutenticar.mockReset();
    mockedCriar.mockReset();
  });

  describe('listar()', () => {
    it('CT01 -> RN01: listar retorna lista de administradores', async () => {
      // Arrange
      mockedListar.mockResolvedValue(sampleAdmins);
      const svc = new AdministradorService();

      // Act
      const res = await svc.listar();

      // Assert
      expect(res).toEqual(sampleAdmins);
      expect(mockedListar).toHaveBeenCalled();
    });

    it('CT02 -> RN02: listar retorna array vazio quando não há admins', async () => {
      // Arrange
      mockedListar.mockResolvedValue([]);
      const svc = new AdministradorService();

      // Act
      const res = await svc.listar();

      // Assert
      expect(Array.isArray(res)).toBe(true);
      expect(res).toHaveLength(0);
    });

    it('CT03 -> RN03: listar lança erro ao consultar banco (exceção)', async () => {
      // Arrange
      const error = new Error('[AdministradorRepository.listar] Connection failed');
      mockedListar.mockRejectedValue(error);
      const svc = new AdministradorService();

      // Act & Assert
      await expect(svc.listar()).rejects.toThrow('Connection failed');
    });
  });

  describe('buscarPorLogin()', () => {
    it('CT04 -> RN04: buscarPorLogin encontra admin existente', async () => {
      // Arrange
      const adminEncontrado = sampleAdmins[0];
      mockedBuscarPorLogin.mockResolvedValue(adminEncontrado);
      const svc = new AdministradorService();

      // Act
      const res = await svc.buscarPorLogin('admin1');

      // Assert
      expect(res).toEqual(adminEncontrado);
      expect(mockedBuscarPorLogin).toHaveBeenCalledWith('admin1');
    });

    it('CT05 -> RN05: buscarPorLogin retorna null quando admin não existe', async () => {
      // Arrange
      mockedBuscarPorLogin.mockResolvedValue(null);
      const svc = new AdministradorService();

      // Act
      const res = await svc.buscarPorLogin('inexistente');

      // Assert
      expect(res).toBeNull();
    });

    it('CT06 -> RN06: buscarPorLogin lança erro ao consultar banco (exceção)', async () => {
      // Arrange
      const error = new Error('[AdministradorRepository.buscarPorLogin] Database error');
      mockedBuscarPorLogin.mockRejectedValue(error);
      const svc = new AdministradorService();

      // Act & Assert
      await expect(svc.buscarPorLogin('admin1')).rejects.toThrow('Database error');
    });
  });

  describe('autenticar()', () => {
    it('CT07 -> RN07: autenticar valida credenciais com sucesso', async () => {
      // Arrange
      const adminAutenticado = sampleAdmins[0];
      mockedAutenticar.mockResolvedValue(adminAutenticado);
      const svc = new AdministradorService();

      // Act
      const res = await svc.autenticar('admin1', 'hash1');

      // Assert
      expect(res).toEqual(adminAutenticado);
      expect(mockedAutenticar).toHaveBeenCalledWith('admin1', 'hash1');
    });

    it('CT08 -> RN08: autenticar retorna null com credenciais inválidas', async () => {
      // Arrange
      mockedAutenticar.mockResolvedValue(null);
      const svc = new AdministradorService();

      // Act
      const res = await svc.autenticar('admin1', 'senhaErrada');

      // Assert
      expect(res).toBeNull();
    });

    it('CT09 -> RN09: autenticar lança erro ao consultar banco (exceção)', async () => {
      // Arrange
      const error = new Error('[AdministradorRepository.autenticar] Auth service unavailable');
      mockedAutenticar.mockRejectedValue(error);
      const svc = new AdministradorService();

      // Act & Assert
      await expect(svc.autenticar('admin1', 'hash1')).rejects.toThrow('Auth service unavailable');
    });
  });

  describe('criar()', () => {
    it('CT10 -> RN10: criar novo administrador com sucesso', async () => {
      // Arrange
      const novoAdmin = {
        id_admin: 3,
        id_evento: null,
        nome: 'Admin 3',
        login: 'admin3',
        senha: 'hash3'
      };
      mockedCriar.mockResolvedValue(novoAdmin);
      const svc = new AdministradorService();

      // Act
      const res = await svc.criar('Admin 3', 'admin3', 'hash3');

      // Assert
      expect(res).toEqual(novoAdmin);
      expect(mockedCriar).toHaveBeenCalledWith('Admin 3', 'admin3', 'hash3', undefined);
    });

    it('CT11 -> RN11: criar administrador com idEvento especificado', async () => {
      // Arrange
      const novoAdmin = {
        id_admin: 4,
        id_evento: 5,
        nome: 'Admin 4',
        login: 'admin4',
        senha: 'hash4'
      };
      mockedCriar.mockResolvedValue(novoAdmin);
      const svc = new AdministradorService();

      // Act
      const res = await svc.criar('Admin 4', 'admin4', 'hash4', 5);

      // Assert
      expect(res).toEqual(novoAdmin);
      expect(mockedCriar).toHaveBeenCalledWith('Admin 4', 'admin4', 'hash4', 5);
    });

    it('CT12 -> RN12: criar lança erro ao inserir no banco (exceção)', async () => {
      // Arrange
      const error = new Error('[AdministradorRepository.criar] Duplicate key violation');
      mockedCriar.mockRejectedValue(error);
      const svc = new AdministradorService();

      // Act & Assert
      await expect(svc.criar('Admin', 'duplicado', 'hash')).rejects.toThrow('Duplicate key violation');
    });
  });
});
