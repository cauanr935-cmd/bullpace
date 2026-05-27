import { Esteira } from "../Models/EsteiraModels";

import { EsteiraRepository } from "../Repository/EsteiraRepository";

export class EsteiraService {

  private esteiraRepository = new EsteiraRepository();

  listar(): Esteira[] {

    return this.esteiraRepository.listar();
  }

  criar(
    marca: string,
    modelo: string,
    status: string,
    id_equipe = 0,
    id_evento = 0,
    numero_serie = Date.now()
  ): Esteira {

    const esteira: Esteira = {
      id_esteira: Date.now(),
      id_equipe,
      id_evento,
      marca,
      modelo,
      numero_serie,
      status
    };

    return this.esteiraRepository.salvar(esteira);
  }
}
