import { supabase } from '../supabase';

export class PlacarRepository {

  /**
   * Verifica se o coordenador acionou o modo de ocultação de dados no telão (Modo TV).
   */
  public async buscarStatusModoTv(idEvento: number): Promise<boolean> {
    const { data, error } = await supabase
      .from('eventos')
      .select('modo_tv_bloqueado')
      .eq('id_evento', idEvento)
      .single();

    if (error || !data) {
      throw new Error(`[PlacarRepository.buscarStatusModoTv] Erro 23502. O evento #${idEvento} não existe: ${error.message}`);
    }
    return data.modo_tv_bloqueado;
  }

  /**
   * Altera a coluna de bloqueio do Modo TV direto nas configurações globais do evento.
   */
  public async atualizarModoTv(idEvento: number, bloquear: boolean): Promise<void> {
    const { error } = await supabase
      .from('eventos')
      .update({ modo_tv_bloqueado: bloquear })
      .eq('id_evento', idEvento);

    if (error) {
      throw new Error(`[PlacarRepository.atualizarModoTv] Falha na sincronização de segurança do painel: ${error.message}`);
    }
  }
}