import { Operador } from "../Models/OperadorModels";

import { OperadorRepository } from "../Repository/OperadorRepository";

export class OperadorService {

  private operadorRepository = new OperadorRepository();

  listar(): Operador[] {

    return this.operadorRepository.listar();
  }

  listarOperadores(): Operador[] {

    return this.listar();
  }

  criar(nome: string): Operador {

    const operador: Operador = {
      id_operador: Date.now(),
      nome
    };

    return this.operadorRepository.salvar(operador);
  }

  listarPermissoes(id: string) {
    return {
      id_operador: Number(id),
      papel: 'operador',
      pode_exportar: false,
      pode_pausar_prova: false,
      pode_finalizar_prova: false
    };
  }
}
