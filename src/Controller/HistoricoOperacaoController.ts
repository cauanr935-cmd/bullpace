import { Request, Response } from 'express';
import {
  CriarHistoricoOperacaoInput,
  FiltrosHistoricoOperacao,
  HistoricoOperacao
} from '../Models/HistoricoOperacaoModels';
import { HistoricoOperacaoService } from '../Service/HistoricoOperacaoService';

const historicoOperacaoService = new HistoricoOperacaoService();

const obterFiltroTexto = (valor: unknown): string | undefined => {
  if (Array.isArray(valor)) return obterFiltroTexto(valor[0]);
  return typeof valor === 'string' && valor.trim() ? valor.trim() : undefined;
};

const montarFiltros = (req: Request): FiltrosHistoricoOperacao => ({
  nomeUsuario: obterFiltroTexto(req.query.nomeUsuario),
  perfilUsuario: obterFiltroTexto(req.query.perfilUsuario),
  tipoOperacao: obterFiltroTexto(req.query.tipoOperacao),
  dataInicio: obterFiltroTexto(req.query.dataInicio),
  dataFim: obterFiltroTexto(req.query.dataFim)
});

const validarInputHistorico = (input: Partial<CriarHistoricoOperacaoInput>): string[] => {
  const camposObrigatorios: Array<keyof CriarHistoricoOperacaoInput> = [
    'nome_usuario',
    'perfil_usuario',
    'tipo_operacao',
    'entidade',
    'valor_anterior',
    'valor_novo'
  ];

  return camposObrigatorios.filter((campo) => input[campo] === undefined || input[campo] === null || input[campo] === '');
};

export async function registrarHistoricoOperacao(input: CriarHistoricoOperacaoInput): Promise<HistoricoOperacao> {
  return historicoOperacaoService.registrar(input);
}

export async function listarHistoricoOperacoes(
  filtros: FiltrosHistoricoOperacao = {}
): Promise<HistoricoOperacao[]> {
  return historicoOperacaoService.listar(filtros);
}

export class HistoricoOperacaoController {
  private historicoService = historicoOperacaoService;

  // Registra uma operação no histórico de auditoria.
  registrarOperacao = async (req: Request, res: Response) => {
    try {
      const input = req.body as Partial<CriarHistoricoOperacaoInput>;
      const camposFaltando = validarInputHistorico(input);

      if (camposFaltando.length > 0) {
        return res.status(400).json({
          message: `Campos obrigatórios ausentes: ${camposFaltando.join(', ')}.`
        });
      }

      const historico = await this.historicoService.registrar(input as CriarHistoricoOperacaoInput);
      return res.status(201).json(historico);
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao registrar histórico de operação.' });
    }
  }

  // Lista o histórico de operações com filtros opcionais via query string.
  listarOperacoes = async (req: Request, res: Response) => {
    try {
      const historico = await this.historicoService.listar(montarFiltros(req));
      return res.status(200).json(historico);
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao listar histórico de operações.' });
    }
  }
}
