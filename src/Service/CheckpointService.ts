import { 
  registrarCheckpoint, 
  buscarCheckpointsPorTurno, 
  Checkpoint 
} from '../Controller/CheckpointController';
import { CheckpointRepository } from '../Repository/CheckpointRepository';

/**
 * Interface de entrada omitindo o ID autogerado pelo banco,
 * garantindo tipagem forte para a camada de aplicação.
 */
export type NovoCheckpointInput = Omit<Checkpoint, 'id_checkpoint'>;

export class CheckpointService {
  // Instância do repositório para acesso aos novos métodos
  private checkpointRepository = new CheckpointRepository();

  // Atributos definidos conforme a assinatura do diagrama de classes
  private checkpointRepositoryOld = {
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
      const resultado = await this.checkpointRepositoryOld.insert(checkpoint);
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

  /**
   * Regra 2 & 4: Atualiza o Km de um checkpoint
   */
  public async atualizarKmCheckpoint(idCheckpoint: number, novoKm: number): Promise<Checkpoint> {
    try {
      return await this.checkpointRepository.updateKm(idCheckpoint, novoKm);
    } catch (error) {
      console.error(`[CheckpointService] Erro ao atualizar Km:`, (error as Error).message);
      throw error;
    }
  }

  /**
   * Regra 3: Soma KMs acumulados de uma equipe durante um turno
   */
  public async obterKmsAcumuladosDuranteTurno(idTurno: number): Promise<number> {
    try {
      return await this.checkpointRepository.sumKmsPorEquipeDuranteTurno(idTurno);
    } catch (error) {
      console.error(`[CheckpointService] Erro ao somar KMs:`, (error as Error).message);
      throw error;
    }
  }

  /**
   * Regra 8: Conta checkpoints em uma sessão
   */
  public async contarCheckpointsPorSessao(idSessao: number): Promise<number> {
    try {
      return await this.checkpointRepository.countBySessao(idSessao);
    } catch (error) {
      console.error(`[CheckpointService] Erro ao contar checkpoints:`, (error as Error).message);
      throw error;
    }
  }

  /**
   * Regra 5: Busca histórico de checkpoints do atleta durante turno
   */
  public async obterHistoricoCheckpointsAtleta(idAtleta: number, idTurno: number): Promise<Checkpoint[]> {
    try {
      return await this.checkpointRepository.findByAtletaDuranteTurno(idAtleta, idTurno);
    } catch (error) {
      console.error(`[CheckpointService] Erro ao obter histórico:`, (error as Error).message);
      throw error;
    }
  }
}