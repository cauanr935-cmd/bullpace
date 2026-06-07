export interface Coordenador {
  id_coordenador: number; // Mapeado de 'Long'
  nome: string;
  login?: string;
  senha_hash?: string;
  papel?: 'coordenador' | 'administrador_geral';
}

export type CriarCoordenadorInput = Omit<Coordenador, "id_coordenador">;
