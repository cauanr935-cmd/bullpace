import { Request, Response } from 'express';
import { OperadorService } from '../Service/OperadorService';

export class OperadorController {

  private operadorService = new OperadorService();

  // Lista todos os operadores cadastrados.
  listarOperadores = async (req: Request, res: Response) => {
    try {
      const operadores = await this.operadorService.listar();
      return res.status(200).json(operadores);
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao listar operadores.' });
    }
  }

  // Mostra permissões de um operador pelo id.
  listarPermissoes = (req: Request, res: Response) => {
    const id = String(req.params.id);
    const permissoes = this.operadorService.listarPermissoes(id);
    return res.status(200).json(permissoes);
  }
}
