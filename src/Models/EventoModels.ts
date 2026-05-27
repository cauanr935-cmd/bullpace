export interface Evento {
  id_evento: number; // Mapeado de 'Long'
  nome: string;
  cidade: string;
  estado: string;
  data_inicio: string | Date; // Mapeado de 'Date'
  data_fim: string | Date;   // Mapeado de 'Date'
  status: string;
}

export type CriarEventoInput = Omit<Evento, "id_evento">;