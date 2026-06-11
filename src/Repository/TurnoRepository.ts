import { supabase } from '../database/supabase';
import { Turno, IniciarTurnoInput } from '../Models/TurnoModels';

export class TurnoRepository {

  /**
   * Persiste a abertura de turno vinculando Atleta, Esteira e Sessão.
   */
  public async insert(input: IniciarTurnoInput): Promise<Turno> {
    const dataInicioFormatada = input.horario_inicio instanceof Date ? input.horario_inicio.toISOString() : input.horario_inicio;

    const { data, error } = await supabase
      .from('turnos')
      .insert([
        {
          id_atleta: input.id_atleta,
          id_esteira: input.id_esteira,
          id_sessao_operacional: input.id_sessao_operacional,
          horario_inicio: dataInicioFormatada,
          status: 'em_andamento',
          km_turno: 0
        }
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`[TurnoRepository.insert] Abortado. Verifique se os IDs informados existem nas tabelas pai: ${error.message}`);
    }
    return data as Turno;
  }

  /**
   * Atualiza a distância acumulada final percorrida pelo atleta ao encerrar o seu tempo de uso.
   */
  public async updateParaEncerrado(idTurno: number, kmFinal: number): Promise<Turno> {
    const { data, error } = await supabase
      .from('turnos')
      .update({
        horario_fim: new Date().toISOString(),
        status: 'encerrado',
        km_turno: kmFinal
      })
      .eq('id_turno', idTurno)
      .select()
      .single();

    if (error) {
      throw new Error(`[TurnoRepository.updateParaEncerrado] Erro ao commitar fechamento do turno #${idTurno}: ${error.message}`);
    }
    return data as Turno;
  }

  /**
   * Coleta dados brutos de quilometragem de turnos vinculados à sessão operacional.
   * Utilizado pela camada de serviço para montagem matemática de placares.
   */
  public async buscarTurnosPorSessao(idSessao: number): Promise<{ id_esteira: number; km_turno: number }[]> {
    const { data, error } = await supabase
      .from('turnos')
      .select('id_esteira, km_turno')
      .eq('id_sessao_operacional', idSessao);

    if (error) {
      throw new Error(`[TurnoRepository.buscarTurnosPorSessao] Falha ao ler registros de telemetria: ${error.message}`);
    }
    return data || [];
  }

  /**
   * Regra 7: Conta turnos com status_ativo = true em uma sessão operacional
   */
  public async contarTurnosAtivos(idSessao?: number): Promise<number> {
    let query = supabase
      .from('turnos')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'em_andamento');

    if (idSessao) {
      query = query.eq('id_sessao_operacional', idSessao);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`[TurnoRepository.contarTurnosAtivos] ${error.message}`);
    }
    return count || 0;
  }
}