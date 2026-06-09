import { CriarHistoricoOperacaoInput, FiltrosHistoricoOperacao, HistoricoOperacao } from '../Models/HistoricoOperacaoModels';
import { HistoricoOperacaoRepository } from '../Repository/HistoricoOperacaoRepository';

export class HistoricoOperacaoService {
  private historicoRepository = new HistoricoOperacaoRepository();

  public async registrar(input: CriarHistoricoOperacaoInput): Promise<HistoricoOperacao> {
    return this.historicoRepository.insert(input);
  }

  public async listar(filtros: FiltrosHistoricoOperacao): Promise<HistoricoOperacao[]> {
    return this.historicoRepository.listar(filtros);
  }
}
