import { supabase } from '../supabase';
import { SessaoOperacional, CriarSessaoInput } from '../Models/SessaoModels';

export class SessaoRepository {
  
  /**
   * Grava no banco o início da sessão de trabalho do operador logado.
   */
  public async insert(input: CriarSessaoInput): Promise<SessaoOperacional> {
    const dataInicioFormatada = input.inicio_em instanceof Date ? input.inicio_em.toISOString() : input.inicio_em;

    const { data, error } = await supabase
      .from('sessoes_operacionais')
      .insert([
        {
          id_evento: input.id_evento,
          id_funcao: input.id_funcao,
          inicio_em: dataInicioFormatada,
          status: 'ativa',
          deleted_at: false
        }
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`[SessaoRepository.insert] Erro 23502 ou Violação de constraint: ${error.message}`);
    }
    return data as SessaoOperacional;
  }

  /**
   * Modifica o status para encerrada e salva o timestamp final da sessão de auditoria.
   */
  public async updateParaEncerrada(idSessao: number): Promise<SessaoOperacional> {
    const { data, error } = await supabase
      .from('sessoes_operacionais')
      .update({
        fim_em: new Date().toISOString(),
        status: 'encerrada'
      })
      .eq('id_sessao_operacional', idSessao)
      .select()
      .single();

    if (error) {
      throw new Error(`[SessaoRepository.updateParaEncerrada] Não foi possível finalizar a sessão #${idSessao}: ${error.message}`);
    }
    return data as SessaoOperacional;
  }
}