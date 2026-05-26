export interface Operador {
  id_operador: number; // Mapeado de 'Long'
  nome: string;
}

export type CriarOperadorInput = Omit<Operador, "id_operador">;