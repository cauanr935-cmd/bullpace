import { EventoDB, EventoRepository } from '../Repository/EventoRepository';

export class EventoService {

  private eventoRepository = new EventoRepository();

  async listar(): Promise<EventoDB[]> {
    return this.eventoRepository.listar();
  }

  async buscarAtivo(): Promise<EventoDB | null> {
    return this.eventoRepository.buscarAtivo();
  }

  async atualizarStatus(idEvento: number, status: string): Promise<void> {
    return this.eventoRepository.atualizarStatus(idEvento, status);
  }
}
