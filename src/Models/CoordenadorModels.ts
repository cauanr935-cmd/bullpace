export interface Coordenador {
  id_coordenador: number; // Mapeado de 'Long'
  nome: string;
}

export type CriarCoordenadorInput = Omit<Coordenador, "id_coordenador">;