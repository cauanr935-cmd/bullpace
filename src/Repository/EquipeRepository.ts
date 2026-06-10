import { supabase } from '../database/supabase';

export interface EquipeDB {
  id_equipe: number;
  id_evento: number | null;
  nome: string;
  status: string;
  km_total: number;
}

export class EquipeRepository {

  async listar(): Promise<EquipeDB[]> {
    console.log('[AUDIT QUERY EXECUTADA] SELECT equipes');
    console.log('[AUDIT FILTROS EQUIPES]', {
      id_evento: 'nenhum filtro aplicado',
      status: 'nenhum filtro aplicado',
      joins: 'nenhum join',
      order: 'id_equipe asc'
    });

    const { data: semFiltro, error: erroSemFiltro } = await supabase
      .from('equipes')
      .select('*')
      .order('id_equipe', { ascending: false });

    if (erroSemFiltro) {
      console.log('[AUDIT RESULTADO CONSULTA SEM FILTRO] erro:', erroSemFiltro.message);
    } else {
      console.log('[AUDIT RESULTADO CONSULTA SEM FILTRO]', semFiltro);
    }

    const { data, error } = await supabase
      .from('equipes')
      .select('id_equipe, id_evento, nome, status, km_total')
      .order('id_equipe', { ascending: true });

    if (error) throw new Error(`[EquipeRepository.listar] ${error.message}`);
    console.log('[AUDIT RESULTADO CONSULTA]', data);
    console.log('[AUDIT LISTAGEM EQUIPE] Quantidade de equipes retornadas:', data?.length || 0);
    console.log('[AUDIT LISTAGEM EQUIPE] equipes:', (data || []).map((e) => ({
      id: e.id_equipe,
      nome: e.nome
    })));
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
      .order('km_total', { ascending: false });

    if (error) throw new Error(`[EquipeRepository.listarComKm] ${error.message}`);
    return (data || []) as { id_equipe: number; nome: string; km_total: number }[];
  }
}
