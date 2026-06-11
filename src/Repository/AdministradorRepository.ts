import { supabase } from '../database/supabase';

export interface AdministradorDB {
  id_admin: number;
  id_evento: number | null;
  nome: string;
  login: string;
  senha: string;
}

export class AdministradorRepository {

  async listar(): Promise<AdministradorDB[]> {
    const { data, error } = await supabase
      .from('admin_principal')
      .select('id_admin, id_evento, nome, login');

    if (error) throw new Error(`[AdministradorRepository.listar] ${error.message}`);
    return (data || []) as AdministradorDB[];
  }

  async buscarPorLogin(login: string): Promise<AdministradorDB | null> {
    const { data, error } = await supabase
      .from('admin_principal')
      .select('*')
      .eq('login', login)
      .maybeSingle();

    if (error) throw new Error(`[AdministradorRepository.buscarPorLogin] ${error.message}`);
    return data as AdministradorDB | null;
  }

  async autenticar(login: string, senha: string): Promise<AdministradorDB | null> {
    const { data, error } = await supabase
      .from('admin_principal')
      .select('*')
      .eq('login', login)
      .eq('senha', senha)
      .maybeSingle();

    if (error) throw new Error(`[AdministradorRepository.autenticar] ${error.message}`);
    return data as AdministradorDB | null;
  }

  async criar(nome: string, login: string, senha: string, idEvento?: number | null): Promise<AdministradorDB> {
    const { data, error } = await supabase
      .from('admin_principal')
      .insert({
        nome,
        login,
        senha,
        id_evento: idEvento || null
      })
      .select()
      .single();

    if (error) throw new Error(`[AdministradorRepository.criar] ${error.message}`);
    return data as AdministradorDB;
  }
}
