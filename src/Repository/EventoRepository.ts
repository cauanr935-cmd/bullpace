import { supabase } from '../database/supabase';

export interface EventoDB {
  id_evento: number;
  nome: string;
  cidade: string;
  estado: string;
  data_inicio: string;
  data_fim: string;
  status: string;
  // Estado operacional da prova persistido (sobrevive a reinicio do servidor).
  // Colunas opcionais: presentes apos rodar o ALTER TABLE de estado da prova.
  status_prova?: string | null;
  inicio_prova?: string | null;
  atualizado_por_prova?: string | null;
}

// Estado da prova lido/gravado na tabela eventos.
export interface EstadoProvaDB {
  idEvento: number | null;
  status: string;            // 'nao_iniciada' | 'em_andamento' | 'pausada' | 'finalizada'
  inicioEm: string | null;   // ISO timestamp ou null
  atualizadoPor: string | null;
}

export class EventoRepository {

  async listar(): Promise<EventoDB[]> {
    const { data, error } = await supabase
      .from('eventos')
      .select('*');

    if (error) throw new Error(`[EventoRepository.listar] ${error.message}`);
    return (data || []) as EventoDB[];
  }

  /** Retorna o primeiro evento ativo encontrado (convenção: evento em andamento). */
  async buscarAtivo(): Promise<EventoDB | null> {
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .eq('status', 'ativo')
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

  /**
   * Le o estado operacional da prova a partir do evento mais recente.
   * Tolerante a colunas ausentes: se status_prova/inicio_prova nao existirem,
   * cai para o status geral do evento e retorna inicio nulo.
   */
  async lerEstadoProva(): Promise<EstadoProvaDB> {
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .order('id_evento', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return { idEvento: null, status: 'nao_iniciada', inicioEm: null, atualizadoPor: null };
    }

    const row = data as EventoDB;
    return {
      idEvento: row.id_evento,
      status: row.status_prova || 'nao_iniciada',
      inicioEm: row.inicio_prova || null,
      atualizadoPor: row.atualizado_por_prova || null
    };
  }

  /**
   * Persiste o estado operacional da prova no evento informado.
   * Grava nas colunas dedicadas (status_prova/inicio_prova/atualizado_por_prova).
   */
  async salvarEstadoProva(
    idEvento: number,
    estado: { status: string; inicioEm: string | null; atualizadoPor: string | null }
  ): Promise<void> {
    const { error } = await supabase
      .from('eventos')
      .update({
        status_prova: estado.status,
        inicio_prova: estado.inicioEm,
        atualizado_por_prova: estado.atualizadoPor
      })
      .eq('id_evento', idEvento);

    if (error) throw new Error(`[EventoRepository.salvarEstadoProva] ${error.message}`);
  }
}
