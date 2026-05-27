import { Operador } from "../Models/OperadorModels";

export class OperadorRepository {

  private operadores: Operador[] = [];

  listar(): Operador[] {

    return this.operadores;
  }

  salvar(operador: Operador): Operador {

    this.operadores.push(operador);

    return operador;
  }
}