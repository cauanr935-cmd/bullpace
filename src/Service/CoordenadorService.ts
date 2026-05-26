import { Coordenador } from "../Models/CoordenadorModels";

import { CoordenadorRepository } from "../Repository/CoordenadorRepository";

export class CoordenadorService {

  private coordenadorRepository = new CoordenadorRepository();

  listar(): Coordenador[] {

    return this.coordenadorRepository.listar();
  }

  criar(
    nome: string,
    email: string
  ): Coordenador {

    const coordenador = new Coordenador(
      Date.now(),
      nome,
      email
    );

    return this.coordenadorRepository.salvar(coordenador);
  }
}