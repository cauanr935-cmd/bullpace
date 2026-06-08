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

  login(email: string, senha: string, papelSolicitado = 'coordenador') {
    const papel = papelSolicitado === 'administrador_geral' ? 'administrador_geral' : 'coordenador';

    return {
      email,
      papel,
      pode_exportar: true,
      pode_pausar_prova: papel === 'administrador_geral',
      pode_finalizar_prova: papel === 'administrador_geral',
      autenticado: Boolean(email && senha)
    };
  }
}
