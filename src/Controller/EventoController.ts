import { Request, Response } from 'express';
import { EventoService } from '../Service/EventoService';

export class EventoController {

  private eventoService = new EventoService();

  // Lista todos os eventos.
  async listarEventos(req: Request, res: Response) {
    try {
      const eventos = await this.eventoService.listar();
      return res.status(200).json(eventos);
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao listar eventos.' });
    }
  }

  // Retorna o evento ativo atual.
  async buscarAtivo(req: Request, res: Response) {
    try {
      const evento = await this.eventoService.buscarAtivo();
      if (!evento) return res.status(404).json({ message: 'Nenhum evento ativo encontrado.' });
      return res.status(200).json(evento);
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao buscar evento ativo.' });
    }
  }

  // Atualiza o status de um evento.
  async atualizarStatus(req: Request, res: Response) {
    try {
      const { id_evento, status } = req.body;
      if (!id_evento || !status) {
        return res.status(400).json({ message: 'id_evento e status são obrigatórios.' });
      }
      await this.eventoService.atualizarStatus(Number(id_evento), status);
      return res.status(200).json({ message: 'Status atualizado com sucesso.' });
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao atualizar status do evento.' });
    }
  }
}