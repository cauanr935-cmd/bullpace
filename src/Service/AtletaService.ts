import { Atleta } from "../Models/AtletaModels";

import { AtletaRepository } from "../Repository/AtletaRepository";

export class AtletaService {

  // Cria conexão com repository.
  private atletaRepository = new AtletaRepository();

  // Lista atletas.
  listar(): Atleta[] {

    return this.atletaRepository.listar();
  }

  listarAtletas(): Atleta[] {

    return this.listar();
  }

  // Cria atleta.
  criar(
    nome: string,
    status: string,
    id_equipe: number,
    numero_peito: number
  ): Atleta {

    // Cria novo atleta.
    const atleta: Atleta = {
      id_atleta: Date.now(),
      id_equipe,
      nome,
      status
    };

    // Salva atleta.
    return this.atletaRepository.salvar(atleta);
  }

  cadastrarAtleta(nome: string, equipe: string): Atleta {

    return this.criar(nome, "ativo", Number(equipe), 0);
  }
}
