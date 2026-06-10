import { 
  iniciarTurno, 
  finalizarTurno, 
  Turno 
} from '../Controller/TurnoController';
import { TurnoRepository } from '../Repository/TurnoRepository';

// Reaproveitando a tipagem de entrada definida no controller
type IniciarTurnoInput = Omit<Turno, "id_turno" | "horario_fim" | "km_turno" | "status">;

export class TurnoService {
  
  // Instância do repositório
  private turnoRepositoryInstance = new TurnoRepository();

  // Atributos definidos conforme o diagrama de classes
  private turnoRepository = {
    insert: iniciarTurno,
    update: finalizarTurno,
  };

  private eventoRepository = {
    // Declarado para manter fidelidade ao UML. 
    // Pode ser preenchido futuramente caso o service precise buscar dados do evento.
  };

  /**
   * + iniciarNovoTurno(idEvento: Long) : Turno
   * Regra de Negócio: Delega a criação de um novo turno operacional.
   * * Nota de Arquitetura: O UML prevê apenas 'idEvento' como parâmetro, mas para
   * satisfazer as chaves estrangeiras do banco, passamos o DTO completo.
   */
  public async iniciarNovoTurno(input: IniciarTurnoInput): Promise<Turno> {
    try {
      // Abstração da persistência mapeada para o repositório/controlador
      const novoTurno = await this.turnoRepository.insert(input);
      return novoTurno;
    } catch (error) {
      console.error(`[TurnoService] Falha na delegação ao iniciar novo turno:`, (error as Error).message);
      throw error;
    }
  }

  /**
   * + finalizarTurnoExistente(idTurno: Long, kmFinal: Decimal) : Turno
   * Regra de Negócio: Intermedia o fechamento do turno, registrando a quilometragem final.
   * * Nota de Arquitetura: Os tipos 'Long' e 'Decimal' do diagrama UML foram 
   * mapeados nativamente para 'number' no TypeScript.
   */
  public async finalizarTurnoExistente(idTurno: number, kmFinal: number): Promise<Turno> {
    try {
      // Abstração da persistência mapeada para o repositório/controlador
      const turnoEncerrado = await this.turnoRepository.update(idTurno, kmFinal);
      return turnoEncerrado;
    } catch (error) {
      console.error(`[TurnoService] Falha na delegação ao finalizar turno #${idTurno}:`, (error as Error).message);
      throw error;
    }
  }

  /**
   * Regra 7: Conta turnos ativos (status = 'em_andamento') em uma sessão
   */
  public async contarTurnosAtivos(idSessao: number): Promise<number> {
    try {
      return await this.turnoRepositoryInstance.contarTurnosAtivos(idSessao);
    } catch (error) {
      console.error(`[TurnoService] Erro ao contar turnos ativos:`, (error as Error).message);
      throw error;
    }
  }
}