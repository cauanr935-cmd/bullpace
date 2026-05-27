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
    status: string
  ): Esteira {

    const esteira = new Esteira(
      Date.now(),
      marca,
      modelo,
      status
    );

    return this.esteiraRepository.salvar(esteira);
  }
}
