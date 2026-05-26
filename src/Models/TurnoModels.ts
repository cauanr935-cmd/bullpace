export interface Turno {
  id_turno: number; // Mapeado de 'Long'
  id_atleta: number;
  id_esteira: number;
  id_sessao_operacional: number;
  horario_inicio: string | Date; // Mapeado de 'Time'
  horario_fim?: string | Date;   // Mapeado de 'Time'
  status: 'em_andamento' | 'encerrado' | 'cancelado';
  km_turno: number; // Mapeado de 'Decimal'
}

export type IniciarTurnoInput = Omit<Turno, "id_turno" | "horario_fim" | "km_turno" | "status">;