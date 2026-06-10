import { supabase } from "../database/supabase";

export interface SessaoOperacional {
  id_sessao_operacional: number; 
  id_evento: number;              
  id_funcao: number;              
  inicio_em: string | Date;       
  fim_em?: string | Date;         
  status: string;                 
}

type AbrirSessaoInput = Omit<SessaoOperacional, "id_sessao_operacional" | "fim_em" | "status">;

/**
 * Validação prévia para garantir a integridade dos dados de auditoria antes de enviar ao banco
 */
function validarAberturaSessao(input: AbrirSessaoInput): void {
  const camposFaltando: string[] = [];

  if (!input.id_evento) camposFaltando.push("id_evento");
  if (!input.id_funcao) camposFaltando.push("id_funcao");
  if (!input.inicio_em) camposFaltando.push("inicio_em");

  if (camposFaltando.length > 0) {
    throw new Error(`Erro de Auditoria: Dados obrigatórios ausentes: ${camposFaltando.join(", ")}.`);
  }
}

/**
 * 2. REGRA DE NEGÓCIO: Inicia uma sessão de trabalho de um operador
 * Ajustado para obedecer a constraint 'ck_sessoes_operacionais_status' utilizando o valor 'ativa'
 */
export async function abrirSessao(input: AbrirSessaoInput): Promise<SessaoOperacional> {
  validarAberturaSessao(input);

  const dataInicioFormatada = input.inicio_em instanceof Date ? input.inicio_em.toISOString() : input.inicio_em;

  const { data, error } = await supabase
    .from('sessoes_operacionais') 
    .insert([
      {
        id_evento: input.id_evento,
        id_funcao: input.id_funcao,
        inicio_em: dataInicioFormatada,
        status: 'ativa' // Corrigido de 'ABERTA' para 'ativa'
      }
    ])
    .select()
    .single();

  if (error) {
    console.error(`[Erro Supabase ao abrir sessão]:`, error);
    throw new Error(`Falha crítica ao registrar início da sessão no banco: ${error.message}`);
  }

  console.log(`[SessaoController] Sessão de Auditoria #${data.id_sessao_operacional} iniciada.`);
  return data as SessaoOperacional;
}

/**
 * 3. REGRA DE NEGÓCIO: Encerra a sessão de trabalho do operador (Auditoria de término)
 * Ajustado para obedecer a constraint 'ck_sessoes_operacionais_status' utilizando o valor 'encerrada'
 */
export async function encerrarSessao(idSessao: number): Promise<SessaoOperacional> {
  const dataFimFormatada = new Date().toISOString();

  const { data, error } = await supabase
    .from('sessoes_operacionais')
    .update({
      fim_em: dataFimFormatada,
      status: 'encerrada' // Corrigido de 'ENCERRADA' para 'encerrada'
    })
    .eq('id_sessao_operacional', idSessao)
    .select()
    .single();

  if (error) {
    console.error(`[Erro Supabase ao encerrar sessão]:`, error);
    throw new Error(`Falha crítica ao registrar término da sessão: ${error.message}`);
  }

  console.log(`[SessaoController] Sessão #${idSessao} encerrada e auditada com sucesso.`);
  return data as SessaoOperacional;
}

/**
 * 4. AUDITORIA: Busca o histórico de sessões ativas ou passadas de um determinado evento
 */
export async function buscarSessoesPorEvento(idEvento: number): Promise<SessaoOperacional[]> {
  const { data, error } = await supabase
    .from('sessoes_operacionais')
    .select('*')
    .eq('id_evento', idEvento)
    .order('inicio_em', { ascending: false }); 

  if (error) {
    console.error(`[Erro Supabase ao buscar sessões]:`, error);
    throw new Error(`Erro ao consultar dados de auditoria: ${error.message}`);
  }

  return (data || []) as SessaoOperacional[];
}
