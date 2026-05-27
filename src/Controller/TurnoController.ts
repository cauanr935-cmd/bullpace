import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fhxjysgowbdrfdwlxurv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoeGp5c2dvd2JkcmZkd2x4dXJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0ODM4NDQsImV4cCI6MjA5NDA1OTg0NH0.KCemCejnePNuLTYcMDrmHEt3Aqs6ntqNamphhBtGcyM'; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface Turno {
  id_turno: number;               
  id_atleta: number;              
  id_esteira: number;             
  id_sessao_operacional: number;  
  horario_inicio: string | Date;  
  horario_fim?: string | Date;    
  status: string;                 
}

type IniciarTurnoInput = Omit<Turno, "id_turno" | "horario_fim" | "km_turno" | "status">;

/**
 * Valida se os IDs necessários para iniciar um turno foram enviados
 */
function validarDadosInicioTurno(input: IniciarTurnoInput): void {
  const camposFaltando: string[] = [];

  if (!input.id_atleta) camposFaltando.push("id_atleta");
  if (!input.id_esteira) camposFaltando.push("id_esteira");
  if (!input.id_sessao_operacional) camposFaltando.push("id_sessao_operacional");
  if (!input.horario_inicio) camposFaltando.push("horario_inicio");

  if (camposFaltando.length > 0) {
    throw new Error(`Impossível iniciar turno. Campos obrigatórios ausentes: ${camposFaltando.join(", ")}.`);
  }
}

/**
 * 2. REGRA DE NEGÓCIO: Inicia um novo turno de revezamento no banco de dados
 * Ajustado para obedecer a constraint 'ck_turnos_status' utilizando o valor 'em_andamento'
 */
export async function iniciarTurno(input: IniciarTurnoInput): Promise<Turno> {
  validarDadosInicioTurno(input);

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
    console.error(`[Erro Supabase ao iniciar turno]:`, error);
    throw new Error(`Erro ao abrir turno no banco: ${error.message}`);
  }

  console.log(`[TurnoController] Turno #${data.id_turno} iniciado para o atleta ${data.id_atleta}`);
  return data as Turno;
}

/**
 * 3. REGRA DE NEGÓCIO: Finaliza o turno quando o atleta sai da esteira
 * Ajustado para obedecer a constraint 'ck_turnos_status' utilizando o valor 'encerrado'
 */
export async function finalizarTurno(idTurno: number, kmFinal: number): Promise<Turno> {
  const horarioFim = new Date().toISOString();

  const { data, error } = await supabase
    .from('turnos')
    .update({
      horario_fim: horarioFim,
      status: 'encerrado', 
      km_turno: kmFinal
    })
    .eq('id_turno', idTurno) 
    .select()
    .single();

  if (error) {
    console.error(`[Erro Supabase ao finalizar turno]:`, error);
    throw new Error(`Erro ao encerrar turno no banco: ${error.message}`);
  }

  console.log(`[TurnoController] Turno #${idTurno} finalizado com sucesso. Total: ${kmFinal}km.`);
  return data as Turno;
}