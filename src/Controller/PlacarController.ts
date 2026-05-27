import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fhxjysgowbdrfdwlxurv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoeGp5c2dvd2JkcmZkd2x4dXJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0ODM4NDQsImV4cCI6MjA5NDA1OTg0NH0.KCemCejnePNuLTYcMDrmHEt3Aqs6ntqNamphhBtGcyM'; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Interface para o retorno do placar estruturado
export interface DadosPlacar {
  id_evento: number;
  modo_tv_bloqueado: boolean;
  atualizado_em: string;
  classificacao: {
    id_esteira: number; // Cada esteira representa uma equipe/raia
    km_total: number;
  }[];
}

/**
 * 1. REGRA DE NEGÓCIO: Alterna o estado do Modo TV (Bloqueia ou Libera)
 * Função chamada exclusivamente pelo Coordenador para gerar o suspense.
 */
export async function alternarBloqueioModoTV(idEvento: number, bloquear: boolean): Promise<void> {
  const { error } = await supabase
    .from('eventos') // Altera a configuração direto na tabela do evento
    .update({ modo_tv_bloqueado: bloquear })
    .eq('id_evento', idEvento);

  if (error) {
    console.error(`[Erro PlacarController] Falha ao alternar Modo TV:`, error);
    throw new Error(`Não foi possível alterar o estado do Modo TV: ${error.message}`);
  }

  console.log(`[PlacarController] Modo TV do evento #${idEvento} foi ${bloquear ? 'BLOQUEADO (Suspense Ativo)' : 'LIBERADO'}.`);
}

/**
 * 2. REGRA DE NEGÓCIO: Busca os dados para exibir no Telão/ModoTV
 * Se estiver bloqueado, os KMs são omitidos para garantir o sigilo absoluto.
 */
export async function obterDadosPlacar(idEvento: number): Promise<DadosPlacar> {
  // Passo 1: Verifica se o coordenador ativou o modo suspense/bloqueio no evento
  const { data: evento, error: erroEvento } = await supabase
    .from('eventos')
    .select('modo_tv_bloqueado')
    .eq('id_evento', idEvento)
    .single();

  if (erroEvento || !evento) {
    console.error(`[Erro PlacarController] Evento não encontrado:`, erroEvento);
    throw new Error(`Não foi possível verificar o status do evento.`);
  }

  // Se estiver bloqueado, retorna a estrutura avisando o Front-end, mas com a classificação ZERADA/OCULTA
  if (evento.modo_tv_bloqueado) {
    return {
      id_evento: idEvento,
      modo_tv_bloqueado: true,
      atualizado_em: new Date().toISOString(),
      classificacao: [] // Segurança absoluta: zero dados enviados para a rede!
    };
  }

  // Passo 2: Se NÃO estiver bloqueado, faz o cálculo dos KMs somando os dados da tabela 'turnos'
  const { data: turnos, error: erroTurnos } = await supabase
    .from('turnos')
    .select('id_esteira, km_turno')
    .eq('id_sessao_operacional', idEvento); // Filtra os turnos pertencentes ao evento

  if (erroTurnos) {
    console.error(`[Erro PlacarController] Erro ao buscar KMs:`, erroTurnos);
    throw new Error(`Erro ao calcular placar.`);
  }

  // Passo 3: Agrupa e soma os quilômetros de cada esteira (equipe) em memória
  const mapaEquipes: { [key: number]: number } = {};

  (turnos || []).forEach(turno => {
    const esteira = turno.id_esteira;
    const km = Number(turno.km_turno) || 0;
    mapaEquipes[esteira] = (mapaEquipes[esteira] || 0) + km;
  });

  // Passo 4: Transforma o mapa em uma lista formatada e ordenada do maior KM para o menor
  const classificacaoOrdenada = Object.keys(mapaEquipes).map(idEsteira => ({
    id_esteira: Number(idEsteira),
    km_total: Number(mapaEquipes[Number(idEsteira)].toFixed(2)) // Limita a 2 casas decimais
  })).sort((a, b) => b.km_total - a.km_total); // Ordena decrescente (líder primeiro)

  return {
    id_evento: idEvento,
    modo_tv_bloqueado: false,
    atualizado_em: new Date().toISOString(),
    classificacao: classificacaoOrdenada
  };
}