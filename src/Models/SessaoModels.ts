export interface SessaoOperacional {
  id_sessao_operacional: number;
  id_evento: number;
  id_funcao: number;
  inicio_em: string | Date;
  fim_em?: string | Date;
  status: 'ativa' | 'encerrada';
}

export type CriarSessaoInput = Omit<SessaoOperacional, "id_sessao_operacional" | "fim_em" | "status">;
