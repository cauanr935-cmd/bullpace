import { Operador } from "../Models/OperadorModels";

import { OperadorRepository } from "../Repository/OperadorRepository";

export class OperadorService {

  private operadorRepository = new OperadorRepository();

  listar(): Operador[] {

    return this.operadorRepository.listar();
  }

  criar(
    nome: string,
    status: string
  ): Operador {

    const operador = new Operador(
      Date.now(),
      nome,
      status
    );

    return this.operadorRepository.salvar(operador);
  }
}