export interface Checkpoint {
  id_checkpoint: number; // Mapeado de 'Long'
  id_turno: number | null;
  id_sessao_operacional: number | null;
  km_acumulado: number;     // Mapeado de 'Decimal'
  pace_medio: number;       // Mapeado de 'Decimal'
  velocidade_media: number; // Mapeado de 'Decimal'
  registrado_em: string | Date; // Mapeado de 'DateTime'
  is_ajuste: boolean;
  ocr_status?: string | null;
  ocr_texto_extraido?: string | null;
  ocr_km_extraido?: number | null;
  ocr_confianca?: number | null;
  atualizado_em?: string | Date | null;
}

export type CriarCheckpointInput = Omit<Checkpoint, "id_checkpoint">;
