import { obterDadosPlacar, DadosPlacar } from '../Controller/PlacarController';

export class PlacarService {
  
  /**
   * + obterPlacarGeralDoEvento(idEvento: Long) : Placar
   * * Regra de Negócio: Intermedia a requisição para obter a classificação atual do evento.
   * O retorno já respeita as regras de negócio de ocultação de dados caso o 
   * "Modo TV" (suspense) esteja ativado pelo coordenador.
   * * Nota arquitetural: 'Long' do UML foi mapeado para 'number' nativo do TypeScript, 
   * e 'Placar' mapeado para a interface 'DadosPlacar'.
   */
  public async obterPlacarGeralDoEvento(idEvento: number): Promise<DadosPlacar> {
    try {
      // Abstração da lógica delegando para o controlador/repositório
      const placar = await obterDadosPlacar(idEvento);
      
      return placar;
    } catch (error) {
      console.error(`[PlacarService] Falha ao processar a obtenção do placar para o evento #${idEvento}:`, (error as Error).message);
      throw error; // Repassa o erro para a camada superior (ex: rota da API) tratar adequadamente
    }
  }

}