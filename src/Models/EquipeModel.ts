export interface Equipe {
  id_equipe: number; // Mapeado de 'Long'
  id_evento: number; // Necessário para corrigir o erro 23502 (image_b46da8.png)
  nome: string;
  status: string;
  km_total: number; // Mapeado de 'Decimal'
}

export type CriarEquipeInput = Omit<Equipe, "id_equipe" | "km_total">;