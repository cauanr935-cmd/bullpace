import { Atleta } from "../Models/AtletaModels";

export class AtletaRepository {

  // Simula banco.
  private atletas: Atleta[] = [];

  // Lista atletas.
  listar(): Atleta[] {

    return this.atletas;
  }

  // Salva atleta.
  salvar(atleta: Atleta): Atleta {

    this.atletas.push(atleta);

    return atleta;
  }
}