import { Evento } from "../Models/EventoModels";

export class EventoRepository {

  private eventos: Evento[] = [];

  listar(): Evento[] {

    return this.eventos;
  }

  salvar(evento: Evento): Evento {

    this.eventos.push(evento);

    return evento;
  }
}