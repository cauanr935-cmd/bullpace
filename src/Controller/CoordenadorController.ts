import {Request, Response} from 'express';
import {CoordenadorService} from 'src/Service/CoordenadorService';

//Controller do coordenador.
export class CoordenadorController {

    private coordenadorService = new CoordenadorService();

    // Lista coordenadores.
    listarCoordenadores(req: Request, res: Response) {

      const coordenadores = this.coordenadorService.listar();

      return res.status(200).json(coordenadores);

    }

    // Login do coordenador.
    login(req: Request, res: Response) {

        const {email, senha} = req.body;

        const resultado = this.coordenadorService.login(email, senha);

        return res.status(200).json(resultado);
        
    }
}