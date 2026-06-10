import { supabase } from '../database/supabase';

export interface AtletaDB {
  id_atleta: number;
  id_equipe: number;
  nome: string;
  status: string;
}

export class AtletaRepository {

  async listarPorEquipe(idEquipe: number): Promise<AtletaDB[]> {
    const { data, error } = await supabase
      .from('atletas')
      .select('id_atleta, id_equipe, nome, status')
      .eq('id_equipe', idEquipe);

    if (error) throw new Error(`[AtletaRepository.listarPorEquipe] ${error.message}`);
    return (data || []) as AtletaDB[];
  }

  async buscarPorNome(nome: string, idEquipe: number): Promise<AtletaDB | null> {
    const { data, error } = await supabase
      .from('atletas')
      .select('*')
      .eq('nome', nome)
      .eq('id_equipe', idEquipe)
      .maybeSingle();

    if (error) throw new Error(`[AtletaRepository.buscarPorNome] ${error.message}`);
    return data as AtletaDB | null;
  }
}
