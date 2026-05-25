// Importa os tipos de Request e Response do Express.
import { Request, Response } from 'express';

// Importa o service do atleta.
import AtletaService from 'src/Service/AtletaService';

// Classe Responsável pelas requisições do atleta.
export class AtletaController {

    //Cria a conexão com o service do atleta.
    private atletaService = new AtletaService();

    // Lista os atletas.
    listarAtletas(req: Request, res: Response) {

        const atletas = this.atletaService.listarAtletas();

        return res.status(200).json(atletas);
    }

    // Cadastra um atleta.
    cadastrarAtleta(req: Request, res: Response) {

        const { nome, equipe } = req.body;

        const novoAtleta = this.atletaService.cadastrarAtleta(nome, equipe);
        
        return res.status(201).json(novoAtleta);
    }