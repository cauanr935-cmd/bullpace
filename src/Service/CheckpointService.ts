import { 
  registrarCheckpoint, 
  buscarCheckpointsPorTurno, 
  Checkpoint 
} from '../Controller/CheckpointController';

/**
 * Interface de entrada omitindo o ID autogerado pelo banco,
 * garantindo tipagem forte para a camada de aplicação.
 */
export type NovoCheckpointInput = Omit<Checkpoint, 'id_checkpoint'>;

export class CheckpointService {
  // Atributos definidos conforme a assinatura do diagrama de classes
  private checkpointRepository = {
    insert: registrarCheckpoint,
  };
  
  private turnoRepository = {
    findCheckpoints: buscarCheckpointsPorTurno,
  };

  /**
   * + registrarNovoCheckpoint(checkpoint: Checkpoint): Checkpoint
   * Regra de Negócio: Encaminha os dados validados de auditoria de quilometragem para persistência.
   */
  public async registrarNovoCheckpoint(checkpoint: NovoCheckpointInput): Promise<Checkpoint> {
    try {
      // Abstração da persistência mapeada para o repositório/controlador do Supabase
      const resultado = await this.checkpointRepository.insert(checkpoint);
      return resultado;
    } catch (error) {
      console.error(`[CheckpointService] Erro ao registrar novo checkpoint:`, (error as Error).message);
      throw error;
    }
  }

  /**
   * + listarCheckpointsPorTurno(idTurno: Long): List<Checkpoint>
   * Regra de Negócio: Recupera a série histórica de parciais de desempenho de um determinado turno de atleta.
   */
  public async listarCheckpointsPorTurno(idTurno: number): Promise<Checkpoint[]> {
    try {
      const lista = await this.turnoRepository.findCheckpoints(idTurno);
      return lista;
    } catch (error) {
      console.error(`[CheckpointService] Erro ao listar checkpoints do turno #${idTurno}:`, (error as Error).message);
      throw error;
    }
  }
}