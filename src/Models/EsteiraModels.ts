export interface Esteira {
  id_esteira: number; // Mapeado de 'Long'
  id_equipe: number;  
  id_evento: number;  // Adicionado para blindar o erro 23502 (image_b46a7d.png)
  marca: string;
  modelo: string;
  numero_serie: number; // Mapeado de 'Int'
  status: string;
}

export type CriarEsteiraInput = Omit<Esteira, "id_esteira">;