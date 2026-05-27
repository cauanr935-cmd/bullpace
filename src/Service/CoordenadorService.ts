import { Coordenador } from "../Models/CoordenadorModels";

import { CoordenadorRepository } from "../Repository/CoordenadorRepository";

export class CoordenadorService {

  private coordenadorRepository = new CoordenadorRepository();

  listar(): Coordenador[] {

    return this.coordenadorRepository.listar();
  }

  criar(nome: string): Coordenador {

    const coordenador: Coordenador = {
      id_coordenador: Date.now(),
      nome
    };

    return this.coordenadorRepository.salvar(coordenador);
  }

  login(email: string, senha: string) {
    return {
      email,
      autenticado: Boolean(email && senha)
    };
  }
}
