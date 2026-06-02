import { supabase } from "../database/supabase";

export interface Checkpoint {
  id_checkpoint: number;          
  id_turno: number;               
  id_sessao_operacional: number;  
  km_acumulado: number;            
  pace_medio: number;             
  velocidade_media: number;       
  registrado_em: string | Date;   
  is_ajuste: boolean;             
}

type CheckpointInput = Omit<Checkpoint, "id_checkpoint">;

/**
 * Validação atualizada com os novos nomes de campos
 */
function validarCheckpoint(cp: CheckpointInput): void {
  const camposFaltando: string[] = [];

  if (cp.id_turno === undefined || cp.id_turno === null) camposFaltando.push("id_turno");
  if (cp.id_sessao_operacional === undefined || cp.id_sessao_operacional === null) camposFaltando.push("id_sessao_operacional");
  if (cp.km_acumulado === undefined || cp.km_acumulado === null) camposFaltando.push("km_acumulado");
  if (cp.velocidade_media === undefined || cp.velocidade_media === null) camposFaltando.push("velocidade_media");
  if (!cp.registrado_em) camposFaltando.push("registrado_em");

  if (camposFaltando.length > 0) {
    throw new Error(`Os seguintes campos são obrigatórios: ${camposFaltando.join(", ")}.`);
  }
}

/**
 * Registra o checkpoint usando a estrutura exata do banco
 */
export async function registrarCheckpoint(cp: CheckpointInput): Promise<Checkpoint> {
  validarCheckpoint(cp);

  const dataFormatada = cp.registrado_em instanceof Date ? cp.registrado_em.toISOString() : cp.registrado_em;

  const { data, error } = await supabase
    .from('checkpoints') 
    .insert([
      {
        ...cp,
        registrado_em: dataFormatada
      }
    ])
    .select() 
    .single(); 

  if (error) {
    console.error(`[Erro Supabase]:`, error);
    throw new Error(`Erro ao salvar no banco de dados: ${error.message}`);
  }

  console.log(`[CheckpointController] Registrado com ID ${data.id_checkpoint}`);
  return data as Checkpoint;
}

/**
 * Busca atualizada usando a coluna 'id_turno' do banco
 */
export async function buscarCheckpointsPorTurno(idTurno: number): Promise<Checkpoint[]> {
  const { data, error } = await supabase
    .from('checkpoints')
    .select('*')
    .eq('id_turno', idTurno); 

  if (error) {
    console.error(`[Erro Supabase]:`, error);
    throw new Error(`Erro ao buscar dados: ${error.message}`);
  }

  return (data || []) as Checkpoint[];
}
