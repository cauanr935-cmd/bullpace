import { Request, Response } from 'express';
import { EsteiraService } from '../Service/EsteiraService';

export class EsteiraController {

    private esteiraService = new EsteiraService();

    listarEsteiras(req: Request, res: Response) {
        const esteiras = this.esteiraService.listar();
        return res.status(200).json(esteiras);
    }

}