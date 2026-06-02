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
}