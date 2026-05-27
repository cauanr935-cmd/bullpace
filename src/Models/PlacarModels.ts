export interface ClassificacaoEquipe {
  id_esteira: number;
  km_total: number;
}

export interface Placar {
  id_evento: number;
  modo_tv_bloqueado: boolean;
  atualizado_em: string;
  classificacao: ClassificacaoEquipe[];
}

