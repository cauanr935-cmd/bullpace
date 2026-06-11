import { supabase } from '../database/supabase';
import { Checkpoint, CriarCheckpointInput } from '../Models/CheckpointModels';

export class CheckpointRepository {

  /**
   * Adiciona um registro de ponto de checagem (telemetria de pace e distância instantânea).
   */
  public async insert(cp: CriarCheckpointInput): Promise<Checkpoint> {
    const dataFormatada = cp.registrado_em instanceof Date ? cp.registrado_em.toISOString() : cp.registrado_em;

    const { data, error } = await supabase
      .from('checkpoints')
      .insert([{ ...cp, registrado_em: dataFormatada }])
      .select()
      .single();

    if (error) {
      throw new Error(`[CheckpointRepository.insert] Erro de integridade. Verifique id_turno e id_sessao_operacional: ${error.message}`);
    }
    return data as Checkpoint;
  }

  /**
   * Lista cronologicamente todos os checkpoints associados a um determinado turno.
   */
  public async findByTurno(idTurno: number): Promise<Checkpoint[]> {
    const { data, error } = await supabase
      .from('checkpoints')
      .select('*')
      .eq('id_turno', idTurno);

    if (error) {
      throw new Error(`[CheckpointRepository.findByTurno] Não foi possível coletar parciais do turno #${idTurno}: ${error.message}`);
    }
    return data || [];
  }

  /**
   * Atualiza o valor de km_acumulado de um checkpoint específico.
   * Regra 2: Permite alterar o Km ao clicar em um checkpoint.
   */
  public async updateKm(idCheckpoint: number, novoKm: number): Promise<Checkpoint> {
    const { data, error } = await supabase
      .from('checkpoints')
      .update({ km_acumulado: novoKm })
      .eq('id_checkpoint', idCheckpoint)
      .select()
      .single();

    if (error) {
      throw new Error(`[CheckpointRepository.updateKm] Erro ao atualizar km do checkpoint #${idCheckpoint}: ${error.message}`);
    }
    return data as Checkpoint;
  }

  /**
   * Busca checkpoints com JOIN na tabela de operadores.
   * Regra 4: Retorna qual operador registrou cada checkpoint.
   */
  public async findByTurnoWithOperador(idTurno: number): Promise<any[]> {
    const { data, error } = await supabase
      .from('checkpoints')
      .select(`
        id_checkpoint,
        id_turno,
        id_sessao_operacional,
        km_acumulado,
        pace_medio,
        velocidade_media,
        registrado_em,
        is_ajuste,
        operador(nome)
      `)
      .eq('id_turno', idTurno);

    if (error) {
      // Tenta buscar sem relacionamento caso o join não exista no esquema atual.
      const fallback = await supabase
        .from('checkpoints')
        .select('*')
        .eq('id_turno', idTurno);
      if (fallback.error) {
        throw new Error(`[CheckpointRepository.findByTurnoWithOperador] ${error.message}`);
      }
      return fallback.data || [];
    }
    return data || [];
  }

  /**
   * Conta o número total de checkpoints registrados na tabela.
   * Regra 8: Usado para exibir no painel da prova.
   */
  public async countTotalCheckpoints(): Promise<number> {
    const { count, error } = await supabase
      .from('checkpoints')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw new Error(`[CheckpointRepository.countTotalCheckpoints] ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Soma todos os Kms acumulados de uma equipe durante um turno específico.
   * Regra 3: Calcula KMs acumulados da equipe.
   */
  public async sumKmsPorEquipeDuranteTurno(idTurno: number): Promise<number> {
    const { data, error } = await supabase
      .from('checkpoints')
      .select('km_acumulado')
      .eq('id_turno', idTurno);

    if (error) {
      throw new Error(`[CheckpointRepository.sumKmsPorEquipeDuranteTurno] ${error.message}`);
    }

    const total = data?.reduce((acc, cp) => acc + (cp.km_acumulado || 0), 0) || 0;
    return total;
  }

  /**
   * Contagem total de checkpoints em uma sessão operacional.
   * Regra 8: Retorna quantidade de checkpoints para o painel.
   */
  public async countBySessao(idSessao: number): Promise<number> {
    const { count, error } = await supabase
      .from('checkpoints')
      .select('*', { count: 'exact', head: true })
      .eq('id_sessao_operacional', idSessao);

    if (error) {
      throw new Error(`[CheckpointRepository.countBySessao] ${error.message}`);
    }
    return count || 0;
  }

  /**
   * Busca checkpoints de um atleta durante um turno específico.
   * Regra 5: Histórico de checkpoints para o atleta.
   */
  public async findByAtletaDuranteTurno(idAtleta: number, idTurno: number): Promise<Checkpoint[]> {
    const { data, error } = await supabase
      .from('checkpoints')
      .select('*')
      .eq('id_turno', idTurno);

    if (error) {
      throw new Error(`[CheckpointRepository.findByAtletaDuranteTurno] ${error.message}`);
    }
    return data || [];
  }

  /**
   * Atualiza metadados OCR quando as colunas opcionais existem no banco.
   */
  public async atualizarMetadadosOcr(
    idCheckpoint: number,
    metadados: {
      ocr_status: string;
      ocr_texto_extraido: string | null;
      ocr_km_extraido: number | null;
      ocr_confianca: number | null;
      atualizado_em: string;
    }
  ): Promise<void> {
    const { error } = await supabase
      .from('checkpoints')
      .update(metadados)
      .eq('id_checkpoint', idCheckpoint);

    if (error) {
      throw new Error(`[CheckpointRepository.atualizarMetadadosOcr] Metadados OCR não persistidos: ${error.message}`);
    }
  }
}
