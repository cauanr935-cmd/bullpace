import { supabase } from '../database/supabase';

export interface CoordenadorDB {
  id_coordenador: number;
  nome: string;
  login: string;
  senha: string;
  id_sessao_operacional: number | null;
}

export interface AdminPrincipalDB {
  id_admin: number;
  id_evento: number | null;
  nome: string;
  login: string;
  senha: string;
}

export class CoordenadorRepository {

  async listar(): Promise<CoordenadorDB[]> {
    const { data, error } = await supabase
      .from('coordenador')
      .select('id_coordenador, nome, login, id_sessao_operacional');

    if (error) throw new Error(`[CoordenadorRepository.listar] ${error.message}`);
    return (data || []) as CoordenadorDB[];
  }

  /** Verifica credenciais na tabela coordenador */
  async autenticar(login: string, senha: string): Promise<CoordenadorDB | null> {
    const { data, error } = await supabase
      .from('coordenador')
      .select('*')
      .eq('login', login)
      .eq('senha', senha)
      .maybeSingle();

    if (error) throw new Error(`[CoordenadorRepository.autenticar] ${error.message}`);
    return data as CoordenadorDB | null;
  }

  /** Verifica credenciais na tabela admin_principal */
  async autenticarAdmin(login: string, senha: string): Promise<AdminPrincipalDB | null> {
    const { data, error } = await supabase
      .from('admin_principal')
      .select('*')
      .eq('login', login)
      .eq('senha', senha)
      .maybeSingle();

    if (error) throw new Error(`[CoordenadorRepository.autenticarAdmin] ${error.message}`);
    return data as AdminPrincipalDB | null;
  }

  async criarCoordenador(nome: string, login: string, senha: string): Promise<CoordenadorDB> {
    const { data, error } = await supabase
      .from('coordenador')
      .insert({ nome, login, senha })
      .select()
      .single();

    if (error) throw new Error(`[CoordenadorRepository.criarCoordenador] ${error.message}`);
    return data as CoordenadorDB;
  }

  async criarAdmin(nome: string, login: string, senha: string): Promise<AdminPrincipalDB> {
    const { data, error } = await supabase
      .from('admin_principal')
      .insert({ nome, login, senha })
      .select()
      .single();

    if (error) throw new Error(`[CoordenadorRepository.criarAdmin] ${error.message}`);
    return data as AdminPrincipalDB;
  }
}