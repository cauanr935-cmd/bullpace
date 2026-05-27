import { Evento } from "../Models/EventoModels";

import { EventoRepository } from "../Repository/EventoRepository";

export class EventoService {

  private eventoRepository = new EventoRepository();

  listar(): Evento[] {

    return this.eventoRepository.listar();
  }

  criar(
    nome: string,
    cidade: string,
    estado: string,
    data_inicio: Date,
    data_fim: Date,
    status: string,
    descricao: string
  ): Evento {

    const evento: Evento = {
      id_evento: Date.now(),
      nome,
      cidade,
      estado,
      data_inicio,
      data_fim,
      status
    };

    return this.eventoRepository.salvar(evento);
  }
}
