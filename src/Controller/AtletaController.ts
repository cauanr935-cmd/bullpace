import { Request, Response } from 'express';
import { AtletaService } from '../Service/AtletaService';

export class AtletaController {

  private atletaService = new AtletaService();

  // Lista atletas de uma equipe (id_equipe via query param).
  async listarAtletas(req: Request, res: Response) {
    try {
      const idEquipe = Number(req.query.id_equipe);
      if (!idEquipe) {
        return res.status(400).json({ message: 'Parâmetro id_equipe obrigatório.' });
      }
      const atletas = await this.atletaService.listarPorEquipe(idEquipe);
      return res.status(200).json(atletas);
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao listar atletas.' });
    }
  }

  // Busca um atleta por nome dentro de uma equipe.
  async buscarAtleta(req: Request, res: Response) {
    try {
      const { nome, id_equipe } = req.body;
      if (!nome || !id_equipe) {
        return res.status(400).json({ message: 'Nome e id_equipe são obrigatórios.' });
      }
      const atleta = await this.atletaService.buscarPorNome(nome, Number(id_equipe));
      if (!atleta) return res.status(404).json({ message: 'Atleta não encontrado.' });
      return res.status(200).json(atleta);
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao buscar atleta.' });
    }
  }
}
