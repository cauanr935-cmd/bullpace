// Importa os tipos de Request e Response do Express.
import { Request, Response } from 'express';

// Importa o service do atleta.
import AtletaService from '../Service/AtletaService';

// Classe responsável por receber as requisições HTTP dos atleta, repassá-las ao service e retornar a resposta esperada.
export class AtletaController {

    // Responsável pela lógica de negócios.
    private atletaService = new AtletaService();

    // Lista todos os atletas cadastrados.
    async listarAtletas(req: Request, res: Response) {
        try {
            const atletas = await this.atletaService.listarAtletas();
            return res.status(200).json(atletas);
        } catch (error) {
            return res.status(500).json({ message: 'Erro ao listar atletas.' });
        }
    }

    // Cadastra um novo atleta.
    async cadastrarAtleta(req: Request, res: Response) {
        try {
            const { nome, equipe } = req.body;

            // Campos obrigatórios do formulário.
            if (!nome || !equipe) {
                return res.status(400).json({ message: 'Nome e equipe são obrigatórios.' });
            }

            const novoAtleta = await this.atletaService.cadastrarAtleta(nome, equipe);
            return res.status(201).json(novoAtleta);
        } catch (error) {
            return res.status(500).json({ message: 'Erro ao cadastrar atleta.' });
        }
    }
}