import { Request, Response } from 'express';
import { AdministradorService } from '../Service/AdministradorService';

export class AdministradorController {

  private administradorService = new AdministradorService();

  // Login do administrador geral com validacao na tabela admin_principal.
  async login(req: Request, res: Response) {
    try {
      const { email, login, administrador, senha } = req.body;
      const credencial = email || login || administrador;

      if (!credencial || !senha) {
        return res.status(400).json({ message: 'Login e senha são obrigatórios.' });
      }

      const admin = await this.administradorService.autenticar(credencial, senha);

      if (!admin) {
        return res.status(401).json({ autenticado: false, message: 'Credenciais inválidas.' });
      }

      return res.status(200).json({
        autenticado: true,
        nome: admin.nome,
        papel: 'administrador_geral'
      });
    } catch (error) {
      return res.status(500).json({ message: 'Erro no processo de autenticação do administrador.' });
    }
  }
}
