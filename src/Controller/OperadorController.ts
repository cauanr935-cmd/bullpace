import { Request, Response } from 'express';
import { OperadorService } from '../Service/OperadorService';

// Controller do operador. 
export class OperadorController {

    // Criar conexão com o serviço do operador.
    private operadorService = new OperadorService();

    // Listar operadores.
    listarOperadores = async (req: Request, res: Response) => {

        const operadores = this.operadorService.listarOperadores();

        return res.status(200).json(operadores);
    }

    // Mostar permissões do operador.
    listarPermissoes = (req: Request, res: Response) => {

        // Pegar o id do operador da requisição.
        const id = String(req.params.id);

        // Busca as permissões do operador.
        const permissoes = this.operadorService.listarPermissoes(id);

        // Retorna as permissões do operador.
        return res.status(200).json(permissoes);
    }
}
