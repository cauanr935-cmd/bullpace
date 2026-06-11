import { AdministradorDB, AdministradorRepository } from '../Repository/AdministradorRepository';

export class AdministradorService {

  private administradorRepository = new AdministradorRepository();

  async listar(): Promise<AdministradorDB[]> {
    return this.administradorRepository.listar();
  }

  async buscarPorLogin(login: string): Promise<AdministradorDB | null> {
    return this.administradorRepository.buscarPorLogin(login);
  }

  async autenticar(login: string, senha: string): Promise<AdministradorDB | null> {
    return this.administradorRepository.autenticar(login, senha);
  }

  async criar(nome: string, login: string, senha: string, idEvento?: number | null): Promise<AdministradorDB> {
    return this.administradorRepository.criar(nome, login, senha, idEvento);
  }
}
