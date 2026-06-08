import { CoordenadorDB, AdminPrincipalDB, CoordenadorRepository } from '../Repository/CoordenadorRepository';

export class CoordenadorService {

  private coordenadorRepository = new CoordenadorRepository();

  async listar(): Promise<CoordenadorDB[]> {
    return this.coordenadorRepository.listar();
  }

  async autenticar(login: string, senha: string): Promise<CoordenadorDB | null> {
    return this.coordenadorRepository.autenticar(login, senha);
  }

  async autenticarAdmin(login: string, senha: string): Promise<AdminPrincipalDB | null> {
    return this.coordenadorRepository.autenticarAdmin(login, senha);
  }
}
