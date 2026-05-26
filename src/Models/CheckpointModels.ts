export interface Checkpoint {
  id_checkpoint: number; // Mapeado de 'Long'
  id_turno: number;
  id_sessao_operacional: number;
  km_acumulado: number;     // Mapeado de 'Decimal'
  pace_medio: number;       // Mapeado de 'Decimal'
  velocidade_media: number; // Mapeado de 'Decimal'
  registrado_em: string | Date; // Mapeado de 'DateTime'
  is_ajuste: boolean;
}

export type CriarCheckpointInput = Omit<Checkpoint, "id_checkpoint">;