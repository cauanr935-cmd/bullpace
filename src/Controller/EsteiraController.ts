import { Request, Response } from 'express';
import { EsteiraService } from '../Service/EsteiraService';

export class EsteiraController {

    private esteiraService = new EsteiraService();

    async listarEsteiras(req: Request, res: Response) {
        try {
            const esteiras = await this.esteiraService.listar();
            return res.status(200).json(esteiras);
        } catch (error) {
            return res.status(500).json({ message: 'Erro ao listar esteiras.' });
        }
    }

}