import { supabase } from '../database/supabase';

export interface EsteiraDB {
  id_esteira: number;
  id_equipe: number | null;
  id_evento: number | null;
  marca: string;
  modelo: string;
  numero_serie: string;
  status: string;
  delet_at: boolean;
}

export class EsteiraRepository {

  async listar(): Promise<EsteiraDB[]> {
    const { data, error } = await supabase
      .from('esteiras')
      .select('id_esteira, id_equipe, id_evento, marca, modelo, numero_serie, status')
      .eq('delet_at', false);

    if (error) throw new Error(`[EsteiraRepository.listar] ${error.message}`);
    return (data || []) as EsteiraDB[];
  }

  async buscarPorModelo(modelo: string): Promise<EsteiraDB | null> {
    const { data, error } = await supabase
      .from('esteiras')
      .select('*')
      .eq('modelo', modelo)
      .maybeSingle();

    if (error) throw new Error(`[EsteiraRepository.buscarPorModelo] ${error.message}`);
    return data as EsteiraDB | null;
  }
}