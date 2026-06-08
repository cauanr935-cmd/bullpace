import { AtletaDB, AtletaRepository } from '../Repository/AtletaRepository';

export class AtletaService {

  private atletaRepository = new AtletaRepository();

  async listarPorEquipe(idEquipe: number): Promise<AtletaDB[]> {
    return this.atletaRepository.listarPorEquipe(idEquipe);
  }

  async buscarPorNome(nome: string, idEquipe: number): Promise<AtletaDB | null> {
    return this.atletaRepository.buscarPorNome(nome, idEquipe);
  }
}
