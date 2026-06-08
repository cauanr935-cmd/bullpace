import { supabase } from '../database/supabase';

export interface EquipeDB {
  id_equipe: number;
  id_evento: number | null;
  nome: string;
  status: string;
  km_total: number;
  deleted_at: boolean;
}

export class EquipeRepository {

  async listar(): Promise<EquipeDB[]> {
    const { data, error } = await supabase
      .from('equipes')
      .select('id_equipe, id_evento, nome, status, km_total')
      .eq('deleted_at', false);

    if (error) throw new Error(`[EquipeRepository.listar] ${error.message}`);
    return (data || []) as EquipeDB[];
  }

  async buscarPorNome(nome: string): Promise<EquipeDB | null> {
    const { data, error } = await supabase
      .from('equipes')
      .select('*')
      .eq('nome', nome)
      .maybeSingle();

    if (error) throw new Error(`[EquipeRepository.buscarPorNome] ${error.message}`);
    return data as EquipeDB | null;
  }

  /** Retorna km_total de cada equipe para o painel e ranking */
  async listarComKm(): Promise<{ id_equipe: number; nome: string; km_total: number }[]> {
    const { data, error } = await supabase
      .from('equipes')
      .select('id_equipe, nome, km_total')
      .eq('deleted_at', false)
      .order('km_total', { ascending: false });

    if (error) throw new Error(`[EquipeRepository.listarComKm] ${error.message}`);
    return (data || []) as { id_equipe: number; nome: string; km_total: number }[];
  }
}
