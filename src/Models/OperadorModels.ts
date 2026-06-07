export interface Operador {
  id_operador: number; // Mapeado de 'Long'
  nome: string;
  login?: string;
  senha_hash?: string;
  papel?: 'operador' | 'coordenador' | 'administrador_geral';
}

export type CriarOperadorInput = Omit<Operador, "id_operador">;
