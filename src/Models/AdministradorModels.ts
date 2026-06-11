export interface Administrador {
  id_admin: number; // Mapeado de 'Long'
  id_evento?: number | null;
  nome: string;
  login?: string;
  senha_hash?: string;
  papel?: 'administrador_geral';
}

export type CriarAdministradorInput = Omit<Administrador, "id_admin">;
