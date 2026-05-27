import { Coordenador } from "../Models/CoordenadorModels";

export class CoordenadorRepository {

  private coordenadores: Coordenador[] = [];

  listar(): Coordenador[] {

    return this.coordenadores;
  }

  salvar(coordenador: Coordenador): Coordenador {

    this.coordenadores.push(coordenador);

    return coordenador;
  }
}