export interface Evento {
  id_evento: number; // Mapeado de 'Long'
  nome: string;
  cidade: string;
  estado: string;
  data_inicio: string | Date; // Mapeado de 'Date'
  data_fim: string | Date;   // Mapeado de 'Date'
  status: 'em_andamento' | 'pausada' | 'finalizada' | string;
  pausado_em?: string | Date | null;
  pausado_por?: number | null;
  finalizado_em?: string | Date | null;
  finalizado_por?: number | null;
}

export type CriarEventoInput = Omit<Evento, "id_evento">;
