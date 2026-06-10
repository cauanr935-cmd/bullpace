import { supabase } from '../database/supabase';
import {
  CriarHistoricoOperacaoInput,
  FiltrosHistoricoOperacao,
  HistoricoOperacao
} from '../Models/HistoricoOperacaoModels';

export class HistoricoOperacaoRepository {
  public async insert(_input: CriarHistoricoOperacaoInput): Promise<HistoricoOperacao | null> {
    return null;
  }

  public async listar(filtros: FiltrosHistoricoOperacao = {}): Promise<HistoricoOperacao[]> {
    try {
      const { data, error } = await supabase
        .from('vw_historico_completo')
        .select('*')
        .order('horario_inicio', { ascending: false })
        .limit(500);

      if (error) {
        return [];
      }

      return (data || [])
        .map((linha: any) => this.mapearViewParaHistorico(linha))
        .filter((registro) => this.aplicarFiltros(registro, filtros))
        .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime())
        .slice(0, 200);
    } catch {
      return [];
    }
  }

  private mapearViewParaHistorico(linha: any): HistoricoOperacao {
    const temCheckpoint = linha.id_checkpoint !== null && linha.id_checkpoint !== undefined;
    const dataHora = temCheckpoint
      ? linha.registrado_em || linha.horario_inicio
      : linha.horario_inicio || linha.registrado_em;

    return {
      id: Number(linha.id_checkpoint || linha.id_turno || 0),
      usuario_id: linha.id_sessao_registro_checkpoint || linha.id_sessao_inicio_turno
        ? String(linha.id_sessao_registro_checkpoint || linha.id_sessao_inicio_turno)
        : null,
      nome_usuario: linha.funcao_registro_checkpoint || linha.funcao_inicio_turno || 'Sistema operacional',
      perfil_usuario: 'operador',
      tipo_operacao: temCheckpoint ? 'registrar_checkpoint' : 'iniciar_turno',
      entidade: temCheckpoint ? 'checkpoint' : 'turno',
      entidade_id: temCheckpoint
        ? String(linha.id_checkpoint)
        : linha.id_turno !== null && linha.id_turno !== undefined
          ? String(linha.id_turno)
          : null,
      valor_anterior: null,
      valor_novo: {
        evento: linha.evento_nome,
        equipe: linha.equipe_nome,
        atleta: linha.atleta_nome,
        esteira: linha.esteira_modelo,
        km_acumulado: linha.km_acumulado,
        pace_medio: linha.pace_medio,
        velocidade_media: linha.velocidade_media,
        km_turno: linha.km_turno,
        is_ajuste: linha.is_ajuste
      },
      motivo: linha.is_ajuste ? 'Ajuste operacional' : null,
      data_hora: dataHora || new Date(0).toISOString()
    };
  }

  private aplicarFiltros(registro: HistoricoOperacao, filtros: FiltrosHistoricoOperacao): boolean {
    if (filtros.perfilUsuario && registro.perfil_usuario !== filtros.perfilUsuario) {
      return false;
    }

    if (filtros.nomeUsuario) {
      const termo = filtros.nomeUsuario.toLowerCase();
      const valorNovo = registro.valor_novo as Record<string, unknown>;
      const alvo = [
        registro.nome_usuario,
        valorNovo.equipe,
        valorNovo.atleta
      ].join(' ').toLowerCase();

      if (!alvo.includes(termo)) return false;
    }

    if (filtros.tipoOperacao && !registro.tipo_operacao.toLowerCase().includes(filtros.tipoOperacao.toLowerCase())) {
      return false;
    }

    const dataRegistro = new Date(registro.data_hora).getTime();

    if (filtros.dataInicio) {
      const inicio = new Date(`${filtros.dataInicio}T00:00:00`).getTime();
      if (Number.isFinite(inicio) && dataRegistro < inicio) return false;
    }

    if (filtros.dataFim) {
      const fim = new Date(`${filtros.dataFim}T23:59:59`).getTime();
      if (Number.isFinite(fim) && dataRegistro > fim) return false;
    }

    return true;
  }
}
