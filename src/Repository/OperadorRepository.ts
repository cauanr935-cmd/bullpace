import { supabase } from '../database/supabase';

export interface OperadorDB {
  id_operador: number;
  nome: string;
  login: string;
  senha: string;
  id_sessao_operacional: number | null;
}

export class OperadorRepository {

  async listar(): Promise<OperadorDB[]> {
    const { data, error } = await supabase
      .from('operador')
      .select('id_operador, nome, login, id_sessao_operacional');

    if (error) throw new Error(`[OperadorRepository.listar] ${error.message}`);
    return (data || []) as OperadorDB[];
  }

  async buscarPorLogin(login: string): Promise<OperadorDB | null> {
    const { data, error } = await supabase
      .from('operador')
      .select('*')
      .eq('login', login)
      .maybeSingle();

    if (error) throw new Error(`[OperadorRepository.buscarPorLogin] ${error.message}`);
    return data as OperadorDB | null;
  }
}