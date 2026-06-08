import { OperadorDB, OperadorRepository } from '../Repository/OperadorRepository';

export class OperadorService {

  private operadorRepository = new OperadorRepository();

  async listar(): Promise<OperadorDB[]> {
    return this.operadorRepository.listar();
  }

  async buscarPorLogin(login: string): Promise<OperadorDB | null> {
    return this.operadorRepository.buscarPorLogin(login);
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
