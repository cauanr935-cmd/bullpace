export interface Atleta {
  id_atleta: number; // Mapeado de 'Long'
  id_equipe: number; // Chave estrangeira de vínculo do atleta
  nome: string;
  status: string;
}

export type CriarAtletaInput = Omit<Atleta, "id_atleta">;


