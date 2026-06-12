/// <reference types="jest" />
/**
 * CT mapping: (CT0X -> RN0X)
 * CT01 -> RN01: listar retorna lista com dados
 * CT02 -> RN02: listar retorna lista vazia
 * CT03 -> RN03: listar com erro/exceção
 * CT04 -> RN04: autenticar com credenciais válidas
 * CT05 -> RN05: autenticar com credenciais inválidas (retorna null)
 * CT06 -> RN06: autenticar com erro/exceção
 * CT07 -> RN07: autenticarAdmin com credenciais válidas
 * CT08 -> RN08: autenticarAdmin com credenciais inválidas (retorna null)
 * CT09 -> RN09: autenticarAdmin com erro/exceção
 */

// Mocks globais criados antes de jest.mock
const mockedListar: any = jest.fn();
const mockedAutenticar: any = jest.fn();
const mockedAutenticarAdmin: any = jest.fn();

jest.mock('../../src/Repository/CoordenadorRepository', () => {
  return {
    CoordenadorRepository: jest.fn().mockImplementation(() => ({
      listar: mockedListar,
      autenticar: mockedAutenticar,
      autenticarAdmin: mockedAutenticarAdmin
    }))
  };
});

import { CoordenadorService } from '../../src/Service/CoordenadorService';
import { CoordenadorDB, AdminPrincipalDB } from '../../src/Repository/CoordenadorRepository';

describe('CoordenadorService (White-box Unit Tests)', () => {

  let service: CoordenadorService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedListar.mockReset();
    mockedAutenticar.mockReset();
    mockedAutenticarAdmin.mockReset();
    service = new CoordenadorService();
  });

  // ==================== listar() ====================
  describe('listar()', () => {

    // CT01 -> RN01: listar retorna lista com dados
    // Arrange: Mock retorna array com 2 coordenadores
    // Act: Chama service.listar()
    // Assert: Verifica se retorna lista não-vazia com dados corretos
    it('CT01 -> RN01: retorna lista com dados', async () => {
      const mockData: CoordenadorDB[] = [
        { id_coordenador: 1, nome: 'João Silva', login: 'joao_silva', senha: 'hash123', id_sessao_operacional: 1 },
        { id_coordenador: 2, nome: 'Maria Santos', login: 'maria_santos', senha: 'hash456', id_sessao_operacional: 2 }
      ];

      mockedListar.mockResolvedValue(mockData);

      const result = await service.listar();

      expect(mockedListar).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockData);
      expect(result).toHaveLength(2);
      expect(result[0].nome).toBe('João Silva');
    });

    // CT02 -> RN02: listar retorna lista vazia
    it('CT02 -> RN02: retorna lista vazia quando não há coordenadores', async () => {
      mockedListar.mockResolvedValue([]);

      const result = await service.listar();

      expect(mockedListar).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    // CT03 -> RN03: listar com erro/exceção
    it('CT03 -> RN03: lança erro quando falha consulta no banco', async () => {
      const dbError = new Error('Database connection failed');
      mockedListar.mockRejectedValue(dbError);

      await expect(service.listar()).rejects.toThrow('Database connection failed');
      expect(mockedListar).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== autenticar() ====================
  describe('autenticar()', () => {

    // CT04 -> RN04: autenticar com credenciais válidas
    it('CT04 -> RN04: autentica coordenador com credenciais válidas', async () => {
      const mockCoord: CoordenadorDB = {
        id_coordenador: 10,
        nome: 'Pedro Costa',
        login: 'pedro_costa',
        senha: 'hash789',
        id_sessao_operacional: 5
      };

      mockedAutenticar.mockResolvedValue(mockCoord);

      const result = await service.autenticar('pedro_costa', 'senha123');

      expect(mockedAutenticar).toHaveBeenCalledWith('pedro_costa', 'senha123');
      expect(mockedAutenticar).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockCoord);
      expect(result?.nome).toBe('Pedro Costa');
      expect(result?.id_coordenador).toBe(10);
    });

    // CT05 -> RN05: autenticar com credenciais inválidas (retorna null)
    it('CT05 -> RN05: retorna null quando credenciais são inválidas', async () => {
      mockedAutenticar.mockResolvedValue(null);

      const result = await service.autenticar('invalido_user', 'senhaErrada');

      expect(mockedAutenticar).toHaveBeenCalledWith('invalido_user', 'senhaErrada');
      expect(mockedAutenticar).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    // CT06 -> RN06: autenticar com erro/exceção
    it('CT06 -> RN06: lança erro quando falha processo de autenticação', async () => {
      const authError = new Error('Authentication service unavailable');
      mockedAutenticar.mockRejectedValue(authError);

      await expect(service.autenticar('user_login', 'pass')).rejects.toThrow('Authentication service unavailable');
      expect(mockedAutenticar).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== autenticarAdmin() ====================
  describe('autenticarAdmin()', () => {

    // CT07 -> RN07: autenticarAdmin com credenciais válidas
    it('CT07 -> RN07: autentica admin com credenciais válidas', async () => {
      const mockAdmin: AdminPrincipalDB = {
        id_admin: 1,
        nome: 'Admin Principal',
        login: 'admin_principal',
        senha: 'hash_admin_123',
        id_evento: 1
      };

      mockedAutenticarAdmin.mockResolvedValue(mockAdmin);

      const result = await service.autenticarAdmin('admin_principal', 'senha_admin');

      expect(mockedAutenticarAdmin).toHaveBeenCalledWith('admin_principal', 'senha_admin');
      expect(mockedAutenticarAdmin).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockAdmin);
      expect(result?.nome).toBe('Admin Principal');
      expect(result?.id_admin).toBe(1);
    });

    // CT08 -> RN08: autenticarAdmin com credenciais inválidas (retorna null)
    it('CT08 -> RN08: retorna null quando credenciais admin são inválidas', async () => {
      mockedAutenticarAdmin.mockResolvedValue(null);

      const result = await service.autenticarAdmin('fake_admin', 'fakePass');

      expect(mockedAutenticarAdmin).toHaveBeenCalledWith('fake_admin', 'fakePass');
      expect(mockedAutenticarAdmin).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    // CT09 -> RN09: autenticarAdmin com erro/exceção
    it('CT09 -> RN09: lança erro quando falha autenticação admin', async () => {
      const authError = new Error('Admin authentication failed');
      mockedAutenticarAdmin.mockRejectedValue(authError);

      await expect(service.autenticarAdmin('admin_login', 'pass')).rejects.toThrow('Admin authentication failed');
      expect(mockedAutenticarAdmin).toHaveBeenCalledTimes(1);
    });
  });
});
