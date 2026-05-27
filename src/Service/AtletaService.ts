import { Atleta } from "../Models/AtletaModels";

import { AtletaRepository } from "../Repository/AtletaRepository";

export class AtletaService {

  // Cria conexão com repository.
  private atletaRepository = new AtletaRepository();

  // Lista atletas.
  listar(): Atleta[] {

    return this.atletaRepository.listar();
  }

  // Cria atleta.
  criar(
    nome: string,
    status: string,
    id_equipe: number,
    numero_peito: number
  ): Atleta {

    // Cria novo atleta.
    const atleta = new Atleta(
      Date.now(),
      nome,
      status,
      id_equipe,
      numero_peito
    );

    // Salva atleta.
    return this.atletaRepository.salvar(atleta);
  }
}
