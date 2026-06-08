import { Request, Response } from 'express';
import { CoordenadorService } from '../Service/CoordenadorService';

export class CoordenadorController {

  private coordenadorService = new CoordenadorService();

  // Lista coordenadores cadastrados.
  async listarCoordenadores(req: Request, res: Response) {
    try {
      const coordenadores = await this.coordenadorService.listar();
      return res.status(200).json(coordenadores);
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao listar coordenadores.' });
    }
  }

  // Login do coordenador com validação real no Supabase.
  async login(req: Request, res: Response) {
    try {
      const { email, senha, perfilUsuario } = req.body;

      if (!email || !senha) {
        return res.status(400).json({ message: 'Login e senha são obrigatórios.' });
      }

      const isAdmin = perfilUsuario === 'administrador_geral';

      if (isAdmin) {
        const admin = await this.coordenadorService.autenticarAdmin(email, senha);
        if (!admin) return res.status(401).json({ autenticado: false, message: 'Credenciais inválidas.' });
        return res.status(200).json({ autenticado: true, nome: admin.nome, papel: 'administrador_geral' });
      }

      const coord = await this.coordenadorService.autenticar(email, senha);
      if (!coord) return res.status(401).json({ autenticado: false, message: 'Credenciais inválidas.' });
      return res.status(200).json({ autenticado: true, nome: coord.nome, papel: 'coordenador' });

    } catch (error) {
      return res.status(500).json({ message: 'Erro no processo de autenticação.' });
    }
  }
}
