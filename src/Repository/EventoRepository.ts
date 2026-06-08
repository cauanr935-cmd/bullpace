import { supabase } from '../database/supabase';

export interface EventoDB {
  id_evento: number;
  nome: string;
  cidade: string;
  estado: string;
  data_inicio: string;
  data_fim: string;
  status: string;
  deleted_at: boolean;
}

export class EventoRepository {

  async listar(): Promise<EventoDB[]> {
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .eq('deleted_at', false);

    if (error) throw new Error(`[EventoRepository.listar] ${error.message}`);
    return (data || []) as EventoDB[];
  }

  /** Retorna o primeiro evento ativo encontrado (convenção: evento em andamento). */
  async buscarAtivo(): Promise<EventoDB | null> {
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .eq('status', 'ativo')
      .eq('deleted_at', false)
      .order('data_inicio', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`[EventoRepository.buscarAtivo] ${error.message}`);
    return data as EventoDB | null;
  }

  async atualizarStatus(idEvento: number, status: string): Promise<void> {
    const { error } = await supabase
      .from('eventos')
      .update({ status })
      .eq('id_evento', idEvento);

    if (error) throw new Error(`[EventoRepository.atualizarStatus] ${error.message}`);
  }
}