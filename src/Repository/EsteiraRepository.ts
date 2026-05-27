import { Esteira } from "../Models/EsteiraModels";

export class EsteiraRepository {

  private esteiras: Esteira[] = [];

  listar(): Esteira[] {

    return this.esteiras;
  }

  salvar(esteira: Esteira): Esteira {

    this.esteiras.push(esteira);

    return esteira;
  }
}