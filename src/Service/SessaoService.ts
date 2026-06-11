import { 
  abrirSessao, 
  encerrarSessao, 
  SessaoOperacional 
} from '../Controller/SessaoController';

// Reaproveitando a tipagem estruturada de entrada para a abertura da sessão
type AbrirSessaoInput = Omit<SessaoOperacional, "id_sessao_operacional" | "fim_em" | "status">;

export class SessaoService {

  /**
   * + iniciarNovaSessao(idTurno: Long, idEsteira: Long) : Sessao
   * Regra de Negócio: Delega a abertura de uma nova sessão de auditoria no sistema.
   * * * Nota Arquitetural: O diagrama conceitual indica 'idTurno' e 'idEsteira', mas para
   * respeitar o esquema relacional do banco de dados (tabela sessoes_operacionais),
   * passamos o objeto contendo 'id_evento' e 'id_funcao'.
   */
  public async iniciarNovaSessao(input: AbrirSessaoInput): Promise<SessaoOperacional> {
    try {
      const novaSessao = await abrirSessao(input);
      return novaSessao;
    } catch (error) {
      console.error(`[SessaoService] Falha ao iniciar nova sessão operacional:`, (error as Error).message);
      throw error;
    }
  }

  /**
   * + encerrarSessaoExistente(idSessao: Long) : Sessao
   * Regra de Negócio: Fecha a sessão do operador, alterando o status para 'encerrada'.
   * * * Nota Arquitetural: O tipo 'Long' do UML foi mapeado para 'number' nativo do TypeScript.
   */
  public async encerrarSessaoExistente(idSessao: number): Promise<SessaoOperacional> {
    try {
      const sessaoFinalizada = await encerrarSessao(idSessao);
      return sessaoFinalizada;
    } catch (error) {
      console.error(`[SessaoService] Falha ao encerrar a sessão #${idSessao}:`, (error as Error).message);
      throw error;
    }
  }
}
