import { supabase } from '../database/supabase';
import {
  CriarHistoricoOperacaoInput,
  FiltrosHistoricoOperacao,
  HistoricoOperacao
} from '../Models/HistoricoOperacaoModels';

export class HistoricoOperacaoRepository {
  public async insert(input: CriarHistoricoOperacaoInput): Promise<HistoricoOperacao> {
    const dataHora = input.data_hora instanceof Date ? input.data_hora.toISOString() : input.data_hora;

    const { data, error } = await supabase
      .from('historico_operacoes')
      .insert([{
        ...input,
        data_hora: dataHora || new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`[HistoricoOperacaoRepository.insert] ${error.message}`);
    }

    return data as HistoricoOperacao;
  }

  public async listar(filtros: FiltrosHistoricoOperacao = {}): Promise<HistoricoOperacao[]> {
    let query = supabase
      .from('historico_operacoes')
      .select('*')
      .order('data_hora', { ascending: false })
      .limit(200);

    if (filtros.nomeUsuario) {
      query = query.ilike('nome_usuario', `%${filtros.nomeUsuario}%`);
    }

    if (filtros.perfilUsuario) {
      query = query.eq('perfil_usuario', filtros.perfilUsuario);
    }

    if (filtros.tipoOperacao) {
      query = query.ilike('tipo_operacao', `%${filtros.tipoOperacao}%`);
    }

    if (filtros.dataInicio) {
      query = query.gte('data_hora', `${filtros.dataInicio}T00:00:00`);
    }

    if (filtros.dataFim) {
      query = query.lte('data_hora', `${filtros.dataFim}T23:59:59`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`[HistoricoOperacaoRepository.listar] ${error.message}`);
    }

    return (data || []) as HistoricoOperacao[];
  }
}
