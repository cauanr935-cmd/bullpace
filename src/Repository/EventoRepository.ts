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

// Evento com contagens agregadas para os cards da tela inicial.
export interface EventoResumoDB extends EventoDB {
  total_equipes: number;
  total_atletas: number;
}

// Dados aceitos ao criar um novo evento pela tela inicial.
export interface CriarEventoInput {
  nome: string;
  cidade: string;
  estado: string;
  data_inicio: string; // ISO
  data_fim: string;    // ISO
}

export class EventoRepository {

  async listar(): Promise<EventoDB[]> {
    const { data, error } = await supabase
      .from('eventos')
      .select('*');

    if (error) throw new Error(`[EventoRepository.listar] ${error.message}`);
    return (data || []) as EventoDB[];
  }

  /** Cria um novo evento. Status inicia como 'planejado' (default da tabela). */
  async criar(input: CriarEventoInput): Promise<EventoDB> {
    const { data, error } = await supabase
      .from('eventos')
      .insert({
        nome: input.nome,
        cidade: input.cidade,
        estado: input.estado,
        data_inicio: input.data_inicio,
        data_fim: input.data_fim
      })
      .select('*')
      .single();

    if (error) throw new Error(`[EventoRepository.criar] ${error.message}`);
    return data as EventoDB;
  }

  /**
   * Lista os eventos (mais recentes primeiro) com contagem de equipes e atletas.
   * As contagens sao agregadas em memoria para evitar dependencia de RPC no banco.
   */
  async listarComResumo(): Promise<EventoResumoDB[]> {
    const { data: eventos, error } = await supabase
      .from('eventos')
      .select('*')
      .order('id_evento', { ascending: false });

    if (error) throw new Error(`[EventoRepository.listarComResumo] ${error.message}`);

    const { data: equipes, error: erroEquipes } = await supabase
      .from('equipes')
      .select('id_equipe, id_evento');

    if (erroEquipes) throw new Error(`[EventoRepository.listarComResumo] ${erroEquipes.message}`);

    const { data: atletas, error: erroAtletas } = await supabase
      .from('atletas')
      .select('id_atleta, id_equipe');

    if (erroAtletas) throw new Error(`[EventoRepository.listarComResumo] ${erroAtletas.message}`);

    // Mapa equipe -> evento para somar atletas por evento.
    const eventoPorEquipe = new Map<number, number>();
    const equipesPorEvento = new Map<number, number>();
    (equipes || []).forEach((e: { id_equipe: number; id_evento: number }) => {
      eventoPorEquipe.set(e.id_equipe, e.id_evento);
      equipesPorEvento.set(e.id_evento, (equipesPorEvento.get(e.id_evento) || 0) + 1);
    });

    const atletasPorEvento = new Map<number, number>();
    (atletas || []).forEach((a: { id_atleta: number; id_equipe: number }) => {
      const idEvento = eventoPorEquipe.get(a.id_equipe);
      if (idEvento === undefined) return;
      atletasPorEvento.set(idEvento, (atletasPorEvento.get(idEvento) || 0) + 1);
    });

    return (eventos || []).map((evento) => {
      const row = evento as EventoDB;
      return {
        ...row,
        total_equipes: equipesPorEvento.get(row.id_evento) || 0,
        total_atletas: atletasPorEvento.get(row.id_evento) || 0
      };
    });
  }

  /** Busca um evento pelo id. */
  async buscarPorId(idEvento: number): Promise<EventoDB | null> {
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .eq('id_evento', idEvento)
      .maybeSingle();

    if (error) throw new Error(`[EventoRepository.buscarPorId] ${error.message}`);
    return data as EventoDB | null;
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
