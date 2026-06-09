export interface HistoricoOperacao {
  id: number;
  usuario_id: string | null;
  nome_usuario: string;
  perfil_usuario: string;
  tipo_operacao: string;
  entidade: string;
  entidade_id: string | null;
  valor_anterior: unknown;
  valor_novo: unknown;
  motivo: string | null;
  data_hora: string;
}

export type CriarHistoricoOperacaoInput = Omit<HistoricoOperacao, 'id' | 'data_hora'> & {
  data_hora?: Date | string;
};

export type FiltrosHistoricoOperacao = {
  nomeUsuario?: string;
  perfilUsuario?: string;
  tipoOperacao?: string;
  dataInicio?: string;
  dataFim?: string;
};
