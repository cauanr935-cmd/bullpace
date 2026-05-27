import { Request, Response } from "express";

import { EventoService } from "../Service/EventoService";

export class EventoController {

  private eventoService = new EventoService();

  listarEventos(req: Request, res: Response) {

    const eventos = this.eventoService.listar();

    return res.status(200).json(eventos);
  }

  cadastrarEvento(req: Request, res: Response) {

    const {
      nome,
      cidade,
      estado,
      data_inicio,
      data_fim,
      status,
      descricao
    } = req.body;

    const evento = this.eventoService.criar(
      nome,
      cidade,
      estado,
      data_inicio,
      data_fim,
      status,
      descricao
    );

    return res.status(201).json(evento);
  }
}