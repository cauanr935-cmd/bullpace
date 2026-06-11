// Carrega as variaveis do arquivo .env antes do servidor iniciar.
import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import path from 'path';
import { supabase } from './database/supabase';

// Importando repositórios para integração real com o banco de dados Supabase
import { OperadorRepository } from './Repository/OperadorRepository';
import { EquipeRepository } from './Repository/EquipeRepository';
import { AtletaRepository } from './Repository/AtletaRepository';
import { EsteiraRepository } from './Repository/EsteiraRepository';
import { CoordenadorRepository } from './Repository/CoordenadorRepository';
import { CheckpointRepository } from './Repository/CheckpointRepository';
import { TurnoRepository } from './Repository/TurnoRepository';
import { EventoRepository } from './Repository/EventoRepository';
import { SessaoRepository } from './Repository/SessaoRepository';
import { HistoricoOperacaoService } from './Service/HistoricoOperacaoService';
import { CriarHistoricoOperacaoInput, FiltrosHistoricoOperacao } from './Models/HistoricoOperacaoModels';
import { extrairQuilometragem } from './Service/OcrService';

const operadorRepo = new OperadorRepository();
const equipeRepo = new EquipeRepository();
const atletaRepo = new AtletaRepository();
const esteiraRepo = new EsteiraRepository();
const coordenadorRepo = new CoordenadorRepository();
const checkpointRepo = new CheckpointRepository();
const turnoRepo = new TurnoRepository();
const eventoRepo = new EventoRepository();
const sessaoRepo = new SessaoRepository();
const historicoService = new HistoricoOperacaoService();

const ejs = require('ejs');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'View'));

// Serve arquivos estaticos (CSS, imagens) a partir da pasta View sob o prefixo /static.
app.use('/static', express.static(path.join(__dirname, 'View')));
// Serve os assets do projeto, incluindo a logo oficial Red Bull 24h.
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const ROLES = {
  OPERADOR: 'operador',
  COORDENADOR: 'coordenador',
  ADMINISTRADOR_GERAL: 'administrador_geral'
} as const;

type PapelUsuario = typeof ROLES[keyof typeof ROLES];
type StatusProva = 'em_andamento' | 'pausada' | 'finalizada';
type UsuarioRequisicao = {
  nome?: string;
  papel: PapelUsuario;
};
type RequestComUsuario = Request & {
  usuario?: UsuarioRequisicao;
};

type HistoricoViewItem = {
  dataHora: string;
  nomeUsuario: string;
  perfilUsuario: string;
  tipoOperacao: string;
  entidade: string;
  entidadeId: string;
  valorAnterior: string;
  valorNovo: string;
  motivo: string;
};

// Mantido em memória apenas o estado da prova (será integrado à tabela eventos na Fase 5)
const estadoProva: {
  status: StatusProva;
  atualizadoPor?: string;
  atualizadoEm: Date;
  // Horario em que a prova de 24h comecou a contar. Usado pelo cronometro da TV.
  inicioEm: Date;
} = {
  status: 'em_andamento',
  atualizadoEm: new Date(),
  inicioEm: new Date()
};

// Duracao oficial da prova em milissegundos (24 horas).
const DURACAO_PROVA_MS = 24 * 60 * 60 * 1000;

// Monta os dados do placar publico (ranking real + diferenca) a partir das equipes.
const montarPlacarTv = async () => {
  const equipes = await obterEquipesPainelReal();
  // Converte o km formatado de volta para numero para ordenar e calcular a diferenca.
  const parseKm = (texto: string) => Number(String(texto).replace(' km', '').replace(/\./g, '').replace(',', '.')) || 0;
  const ordenadas = equipes
    .map((eq) => ({ ...eq, kmValor: parseKm(eq.km) }))
    .sort((a, b) => b.kmValor - a.kmValor);

  const lider = ordenadas[0];
  const vice = ordenadas[1];
  const diferencaValor = lider && vice ? Math.max(0, lider.kmValor - vice.kmValor) : 0;
  const diferenca = `+ ${diferencaValor.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} km`;

  return { equipes: ordenadas, diferenca };
};

const normalizarPapel = (papel: unknown): PapelUsuario | null => {
  if (typeof papel !== 'string') return null;

  const valor = papel.trim().toLowerCase();
  const aliases: Record<string, PapelUsuario> = {
    operador: ROLES.OPERADOR,
    operadora: ROLES.OPERADOR,
    coordenador: ROLES.COORDENADOR,
    coordenadora: ROLES.COORDENADOR,
    organizador: ROLES.COORDENADOR,
    organizadora: ROLES.COORDENADOR,
    admin: ROLES.ADMINISTRADOR_GERAL,
    administrador: ROLES.ADMINISTRADOR_GERAL,
    administradora: ROLES.ADMINISTRADOR_GERAL,
    administrador_geral: ROLES.ADMINISTRADOR_GERAL,
    administradora_geral: ROLES.ADMINISTRADOR_GERAL,
    admin_principal: ROLES.ADMINISTRADOR_GERAL
  };

  return aliases[valor] || null;
};

const extrairPapelDaRequisicao = (req: Request): PapelUsuario | null => {
  const candidatos = [
    req.body?.perfilUsuario,
    req.body?.perfil,
    req.body?.papel,
    req.body?.funcao,
    req.query?.perfilUsuario,
    req.query?.perfil,
    req.query?.papel
  ];

  for (const candidato of candidatos) {
    const papel = normalizarPapel(Array.isArray(candidato) ? candidato[0] : candidato);
    if (papel) return papel;
  }

  if (req.body?.operador) return ROLES.OPERADOR;
  if (req.body?.coordenador) return ROLES.COORDENADOR;

  return null;
};

const autorizarPapeis = (...papeisPermitidos: PapelUsuario[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const papel = extrairPapelDaRequisicao(req);

    if (!papel || !papeisPermitidos.includes(papel)) {
      res.status(403).json({ error: 'Acesso negado para este perfil.' });
      return;
    }

    (req as RequestComUsuario).usuario = {
      nome: req.body?.operador || req.body?.coordenador,
      papel
    };

    next();
  };
};

const podeExportarDados = (papel: PapelUsuario): boolean => {
  return papel === ROLES.COORDENADOR || papel === ROLES.ADMINISTRADOR_GERAL;
};

const podeControlarProva = (papel: PapelUsuario): boolean => {
  return papel === ROLES.ADMINISTRADOR_GERAL;
};

const bloquearOperacaoSeProvaFinalizada = (req: Request, res: Response, next: NextFunction): void => {
  if (estadoProva.status === 'finalizada') {
    res.status(403).json({
      error: 'Prova finalizada. Alterações operacionais não são permitidas.'
    });
    return;
  }

  next();
};

// Helpers para computação e mapeamento de dados do banco para os templates EJS
const obterIniciais = (nome: string): string => {
  return (nome || '').split(' ').map((parte) => parte[0]).join('').toUpperCase().slice(0, 2);
};

const obterInicioTurno = (valor: unknown): number => {
  const timestamp = Number(valor);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now();
};

const formatarDuracao = (inicioTurnoTimestamp: number, duracaoFallback = '00:00:00'): string => {
  if (!Number.isFinite(inicioTurnoTimestamp) || inicioTurnoTimestamp <= 0) {
    return duracaoFallback;
  }

  const segundos = Math.max(0, Math.floor((Date.now() - inicioTurnoTimestamp) / 1000));
  const horas = String(Math.floor(segundos / 3600)).padStart(2, '0');
  const minutos = String(Math.floor((segundos % 3600) / 60)).padStart(2, '0');
  const segundosRestantes = String(segundos % 60).padStart(2, '0');

  return `${horas}:${minutos}:${segundosRestantes}`;
};

const formatarHorario = (timestamp: number): string => new Date(timestamp).toLocaleTimeString('pt-BR', {
  hour: '2-digit',
  minute: '2-digit'
});

const formatarDataHoraHistorico = (valor: string): string => new Date(valor).toLocaleString('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

const formatarValorHistorico = (valor: unknown): string => {
  if (valor === null || valor === undefined || valor === '') return '--';
  if (typeof valor === 'string') return valor;
  try {
    return JSON.stringify(valor);
  } catch {
    return String(valor);
  }
};

const contextoAutorizacao = (papel: PapelUsuario = ROLES.OPERADOR) => ({
  perfilUsuario: papel,
  estadoProva,
  pode: (acao: string) => {
    if (acao === 'exportar_dados') return podeExportarDados(papel);
    if (acao === 'pausar_prova' || acao === 'retomar_prova' || acao === 'finalizar_prova') {
      return podeControlarProva(papel);
    }
    return false;
  }
});

const obterPapelRenderizacao = (req: Request, fallback: PapelUsuario = ROLES.COORDENADOR): PapelUsuario => {
  return extrairPapelDaRequisicao(req) || fallback;
};

const registrarHistorico = async (input: CriarHistoricoOperacaoInput): Promise<void> => {
  try {
    await historicoService.registrar({
      ...input,
      data_hora: input.data_hora || new Date()
    });
  } catch {
    // Auditoria operacional legada não pode interromper o fluxo principal.
  }
};

const registrarHistoricoOperador = async (
  operador: string,
  tipoOperacao: string,
  entidade: string,
  dados: Record<string, unknown>,
  entidadeId?: string | number | null,
  valorAnterior: unknown = null
): Promise<void> => {
  await registrarHistorico({
    usuario_id: dados.operadorId ? String(dados.operadorId) : null,
    nome_usuario: operador || 'Operador não informado',
    perfil_usuario: ROLES.OPERADOR,
    tipo_operacao: tipoOperacao,
    entidade,
    entidade_id: entidadeId !== undefined && entidadeId !== null ? String(entidadeId) : null,
    valor_anterior: valorAnterior,
    valor_novo: dados,
    motivo: null
  });
};

const registrarHistoricoAdministrativo = async (
  req: Request,
  tipoOperacao: string,
  entidade: string,
  valorNovo: Record<string, unknown>,
  entidadeId?: string | number | null,
  valorAnterior: unknown = null,
  motivo: string | null = null
): Promise<void> => {
  const usuario = (req as RequestComUsuario).usuario;
  await registrarHistorico({
    usuario_id: null,
    nome_usuario: usuario?.nome || req.body?.coordenador || 'Usuário administrativo',
    perfil_usuario: usuario?.papel || obterPapelRenderizacao(req),
    tipo_operacao: tipoOperacao,
    entidade,
    entidade_id: entidadeId !== undefined && entidadeId !== null ? String(entidadeId) : null,
    valor_anterior: valorAnterior,
    valor_novo: valorNovo,
    motivo
  });
};

// Funções para carregar dados reais do Supabase estruturados para o EJS
const obterOperadoresReal = async () => {
  const ops = await operadorRepo.listar();
  return ops.map(op => ({
    nome: op.nome,
    iniciais: obterIniciais(op.nome)
  }));
};

const obterEquipesReal = async () => {
  const listaEquipes = await equipeRepo.listar();
  console.log(`[AUDIT obterEquipesReal] Equipes carregadas: ${listaEquipes.length}`);
  console.log('[AUDIT obterEquipesReal] Equipes retornadas:', listaEquipes.map((e) => ({
    id: e.id_equipe,
    nome: e.nome
  })));
  const equipes = [];
  for (const eq of listaEquipes) {
    const atletasList = await atletaRepo.listarPorEquipe(eq.id_equipe);
    console.log(`[AUDIT obterEquipesReal]   Equipe "${eq.nome}" (id=${eq.id_equipe}): ${atletasList.length} atleta(s)`);
    equipes.push({
      nome: eq.nome,
      iniciais: obterIniciais(eq.nome),
      atletas: atletasList.length
    });
  }
  console.log(`[AUDIT obterEquipesReal] Total de atletas encontrados: ${equipes.reduce((s, e) => s + e.atletas, 0)}`);
  return equipes;
};

const obterAtletasReal = async (nomeEquipe: string) => {
  const eq = await equipeRepo.buscarPorNome(nomeEquipe);
  if (!eq) return [];
  const atletasDB = await atletaRepo.listarPorEquipe(eq.id_equipe);
  return atletasDB.map(at => ({
    nome: at.nome,
    iniciais: obterIniciais(at.nome),
    status: at.status || 'Disponível para revezamento'
  }));
};

const obterIdEventoParaCadastroEquipe = async (): Promise<number> => {
  const eventoAtivo = await eventoRepo.buscarAtivo();
  if (eventoAtivo) return eventoAtivo.id_evento;

  const { data, error } = await supabase
    .from('eventos')
    .select('id_evento, nome, status')
    .order('id_evento', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`[AUDIT CADASTRO EQUIPE] Erro ao localizar evento para nova equipe: ${error.message}`);
  }

  if (!data) {
    throw new Error('Nenhum evento encontrado para vincular a nova equipe.');
  }

  console.log('[AUDIT CADASTRO EQUIPE] Nenhum evento ativo encontrado; usando evento mais recente:', data);
  return data.id_evento;
};

const obterEsteirasReal = async () => {
  const esteirasDB = await esteiraRepo.listar();
  return esteirasDB.map(est => ({
    nome: est.modelo,
    tipo: est.status === 'ativo' || est.status === 'livre' ? 'livre' : 'manutencao',
    status: est.status === 'ativo' || est.status === 'livre' ? 'Livre para iniciar turno' : 'Em manutenção'
  }));
};

const obterEquipesPainelReal = async () => {
  const listaEquipes = await equipeRepo.listar();
  console.log(`[AUDIT obterEquipesPainelReal] Equipes carregadas: ${listaEquipes.length}`);
  console.log('[AUDIT obterEquipesPainelReal] Equipes retornadas:', listaEquipes.map((e) => ({
    id: e.id_equipe,
    nome: e.nome
  })));
  const { data: turnosAtivos } = await supabase
    .from('turnos')
    .select('id_turno, id_atleta, atletas (nome, id_equipe)')
    .eq('status', 'em_andamento');

  const equipesPainel = [];
  for (const eq of listaEquipes) {
    const active = (turnosAtivos || []).find(t => t.atletas && (t.atletas as any).id_equipe === eq.id_equipe);
    const atletaStr = active ? `${(active.atletas as any).nome} em turno` : 'Nenhum atleta em turno';
    const numAtletas = (await atletaRepo.listarPorEquipe(eq.id_equipe)).length;
    console.log(`[AUDIT obterEquipesPainelReal]   Equipe "${eq.nome}" (id=${eq.id_equipe}): ${numAtletas} atleta(s)`);
    equipesPainel.push({
      nome: eq.nome,
      km: `${eq.km_total.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} km`,
      atleta: atletaStr,
      atletas: numAtletas
    });
  }
  console.log(`[AUDIT obterEquipesPainelReal] Total de atletas encontrados: ${equipesPainel.reduce((s, e) => s + e.atletas, 0)}`);
  return equipesPainel;
};

const obterRankingFechamentoReal = async () => {
  const listaEquipes = await equipeRepo.listar();
  listaEquipes.sort((a, b) => b.km_total - a.km_total);

  const { data: hist } = await supabase
    .from('vw_historico_completo')
    .select('id_equipe, id_checkpoint, is_ajuste');

  return listaEquipes.map((eq, index) => {
    const teamRows = (hist || []).filter(r => r.id_equipe === eq.id_equipe && r.id_checkpoint !== null);
    const checkpointsCount = teamRows.length;
    const correcoesCount = teamRows.filter(r => r.is_ajuste === true).length;
    return {
      posicao: index + 1,
      nome: eq.nome,
      km: `${eq.km_total.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} km`,
      checkpoints: checkpointsCount,
      correcoes: correcoesCount
    };
  });
};

const obterResultadoOficialReal = async (coordenador: string) => {
  const ranking = await obterRankingFechamentoReal();
  const vencedor = ranking[0] || { nome: 'Nenhuma', km: '0,000 km' };
  const segundoLugar = ranking[1] || { nome: 'Nenhuma', km: '0,000 km' };
  const totalCheckpoints = ranking.reduce((acc, r) => acc + r.checkpoints, 0);
  const correcoesAuditadas = ranking.reduce((acc, r) => acc + r.correcoes, 0);

  const kmVencedor = parseFloat(vencedor.km.replace(' km', '').replace(/\./g, '').replace(',', '.'));
  const kmSegundo = parseFloat(segundoLugar.km.replace(' km', '').replace(/\./g, '').replace(',', '.'));
  const diffKm = Math.max(0, kmVencedor - kmSegundo);
  const diferenca = `+ ${diffKm.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} km`;

  return {
    vencedor,
    segundoLugar,
    totalCheckpoints,
    correcoesAuditadas,
    validadoPor: coordenador || estadoProva.atualizadoPor || 'Coordenador',
    diferenca
  };
};

const obterCheckpointsEquipeReal = async (nomeEquipe: string) => {
  const eq = await equipeRepo.buscarPorNome(nomeEquipe);
  if (!eq) return [];

  const { data: hist, error } = await supabase
    .from('vw_historico_completo')
    .select('registrado_em, atleta_nome, km_acumulado, id_checkpoint, id_sessao_registro_checkpoint')
    .eq('id_equipe', eq.id_equipe)
    .order('registrado_em', { ascending: false });

  if (error) {
    console.error('[obterCheckpointsEquipeReal] Erro fetching checkpoints:', error.message);
    return [];
  }

  const { data: ops } = await supabase
    .from('operador')
    .select('nome, id_sessao_operacional');

  return (hist || [])
    .filter(r => r.id_checkpoint !== null)
    .map(r => {
      const op = (ops || []).find(o => o.id_sessao_operacional === r.id_sessao_registro_checkpoint);
      const operadorNome = op ? op.nome : 'Sistema';
      const kmValor = Number(r.km_acumulado || 0);
      const dataReg = new Date(r.registrado_em);
      const horario = dataReg.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      return {
        id_checkpoint: r.id_checkpoint,
        horario,
        atleta: r.atleta_nome,
        km: `${kmValor.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} km`,
        kmValor,
        operador: operadorNome
      };
    });
};

const obterSessaoOperacionalAtiva = async (): Promise<number | null> => {
  const { data, error } = await supabase
    .from('sessoes_operacionais')
    .select('id_sessao_operacional')
    .eq('status', 'ativa')
    .order('inicio_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[obterSessaoOperacionalAtiva] Erro:', error.message);
    return null;
  }

  return data?.id_sessao_operacional ?? null;
};

const obterPainelMetricsReal = async () => {
  const idSessaoAtiva = await obterSessaoOperacionalAtiva();
  const turnosAtivos = await turnoRepo.contarTurnosAtivos(idSessaoAtiva || undefined);
  const totalCheckpoints = idSessaoAtiva
    ? await checkpointRepo.countBySessao(idSessaoAtiva)
    : await checkpointRepo.countTotalCheckpoints();

  return { idSessaoAtiva, turnosAtivos, totalCheckpoints };
};

const obterHistoricoOperacoesView = async (
  papel: PapelUsuario,
  filtros: FiltrosHistoricoOperacao
): Promise<HistoricoViewItem[]> => {
  const filtrosAplicados: FiltrosHistoricoOperacao = {
    ...filtros,
    perfilUsuario: papel === ROLES.COORDENADOR ? ROLES.OPERADOR : filtros.perfilUsuario
  };

  const registros = await historicoService.listar(filtrosAplicados);

  return registros.map((registro) => ({
    dataHora: formatarDataHoraHistorico(registro.data_hora),
    nomeUsuario: registro.nome_usuario,
    perfilUsuario: registro.perfil_usuario,
    tipoOperacao: registro.tipo_operacao,
    entidade: registro.entidade,
    entidadeId: registro.entidade_id || '--',
    valorAnterior: formatarValorHistorico(registro.valor_anterior),
    valorNovo: formatarValorHistorico(registro.valor_novo),
    motivo: registro.motivo || '--'
  }));
};

const obterAtletasFiltroReal = async (nomeEquipe: string) => {
  const eq = await equipeRepo.buscarPorNome(nomeEquipe);
  if (!eq) return [];

  const atletasDB = await atletaRepo.listarPorEquipe(eq.id_equipe);

  const { data: turnosAtletas } = await supabase
    .from('turnos')
    .select('id_turno, id_atleta, status, horario_inicio, horario_fim')
    .in('id_atleta', atletasDB.map(a => a.id_atleta))
    .order('horario_inicio', { ascending: false });

  return atletasDB.map(at => {
    const turnos = (turnosAtletas || []).filter(t => t.id_atleta === at.id_atleta);
    let statusText = 'Sem turno registrado';
    if (turnos.length > 0) {
      const active = turnos.find(t => t.status === 'em_andamento');
      if (active) {
        statusText = 'Turno ativo';
      } else {
        const last = turnos[0];
        const fim = last.horario_fim ? new Date(last.horario_fim) : new Date(last.horario_inicio);
        const diffMs = Date.now() - fim.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 60) {
          statusText = `Último turno há ${diffMin} min`;
        } else {
          statusText = `Último turno há ${Math.floor(diffMin / 60)}h${String(diffMin % 60).padStart(2, '0')}`;
        }
      }
    }
    return {
      nome: at.nome,
      iniciais: obterIniciais(at.nome),
      status: statusText
    };
  });
};

const tabelasPermitidas = new Set([
  'atletas',
  'checkpoints',
  'coordenadores',
  'equipes',
  'esteiras',
  'eventos',
  'operadores',
  'sessoes_operacionais',
  'turnos'
]);

const camposPermitidosPorTabela: Record<string, Set<string>> = {
  atletas: new Set(['id_equipe', 'nome', 'status']),
  checkpoints: new Set(['id_turno', 'id_sessao_operacional', 'km_acumulado', 'pace_medio', 'velocidade_media', 'registrado_em', 'is_ajuste']),
  coordenadores: new Set(['nome']),
  equipes: new Set(['id_evento', 'nome', 'status']),
  esteiras: new Set(['id_equipe', 'id_evento', 'marca', 'modelo', 'numero_serie', 'status']),
  eventos: new Set(['nome', 'cidade', 'estado', 'data_inicio', 'data_fim', 'status']),
  operadores: new Set(['nome']),
  sessoes_operacionais: new Set(['id_evento', 'id_funcao', 'inicio_em']),
  turnos: new Set(['id_atleta', 'id_esteira', 'id_sessao_operacional', 'horario_inicio'])
};

const chavesPrimariasPorTabela: Record<string, string> = {
  atletas: 'id_atleta',
  checkpoints: 'id_checkpoint',
  coordenadores: 'id_coordenador',
  equipes: 'id_equipe',
  esteiras: 'id_esteira',
  eventos: 'id_evento',
  operadores: 'id_operador',
  sessoes_operacionais: 'id_sessao_operacional',
  turnos: 'id_turno'
};

const obterTabelaPermitida = (tabela: string): string | null => {
  return tabelasPermitidas.has(tabela) ? tabela : null;
};

const filtrarRegistroPermitido = (tabela: string, registro: Record<string, unknown>): Record<string, unknown> => {
  const camposPermitidos = camposPermitidosPorTabela[tabela];
  return Object.fromEntries(
    Object.entries(registro).filter(([campo]) => camposPermitidos.has(campo))
  );
};

app.use(async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.locals.operadoresQuick = await obterOperadoresReal();
  } catch {
    res.locals.operadoresQuick = [];
  }

  next();
});

// Renderiza a tela inicial, onde o usuario escolhe se entrara como operador ou coordenador.
app.get('/', (req: Request, res: Response): void => {
  res.render('index', {
    // A view usa "tela" para decidir qual bloco HTML mostrar.
    tela: 'funcao',
    titulo: 'SELEÇÃO DE FUNÇÃO',
    funcoes: [
      { nome: 'OPERADOR(A)', valor: 'operador' },
      { nome: 'COORDENADOR(A)', valor: 'coordenador' },
      { nome: 'ADMINISTRADOR(A)', valor: 'administrador_geral' }
    ]
  });
});

// Recebe a funcao escolhida na tela inicial e direciona para o proximo passo do fluxo.
app.post('/selecionar-funcao', async (req: Request, res: Response): Promise<void> => {
  // Pega do formulario qual funcao foi escolhida.
  const { funcao } = req.body;

  // Se escolheu operador, renderiza a tela de operadores.
  if (funcao === 'operador') {
    const operadores = await obterOperadoresReal();
    res.render('index', {
      // Mostra a segunda etapa do fluxo usando o mesmo index.html.
      tela: 'operador',
      titulo: 'SELEÇÃO DE OPERADOR(A)',
      operadores
    });
    return;
  }

  // Se escolheu coordenador, renderiza a tela de login da coordenacao.
  if (funcao === 'coordenador' || funcao === 'organizador' || funcao === 'administrador_geral') {
    const papel = funcao === 'administrador_geral' ? ROLES.ADMINISTRADOR_GERAL : ROLES.COORDENADOR;

    res.render('index', {
      // Mostra a tela de autenticacao restrita do coordenador.
      tela: 'loginCoordenador',
      titulo: 'ACESSO RESTRITO',
      perfilLogin: papel,
      ...contextoAutorizacao(papel)
    });
    return;
  }

  // Qualquer valor inesperado volta para a tela inicial.
  res.redirect('/');
});

app.post('/login-coordenador', async (req: Request, res: Response): Promise<void> => {
  // Le login e senha enviados pela tela de login.
  const { coordenador, senha } = req.body;
  const papel = obterPapelRenderizacao(req);

  if (!coordenador || !senha) {
    res.render('index', {
      tela: 'loginCoordenador',
      titulo: 'ACESSO RESTRITO',
      perfilLogin: papel,
      ...contextoAutorizacao(papel),
      loginMensagem: 'Preencha o login e a senha para entrar.'
    });
    return;
  }

  try {
    // Autenticação real: testa contra admin_principal primeiro (se perfil for administrador_geral),
    // caso contrário valida contra a tabela coordenador.
    let nomeAutenticado: string | null = null;

    if (papel === ROLES.ADMINISTRADOR_GERAL) {
      const admin = await coordenadorRepo.autenticarAdmin(coordenador, senha);
      if (admin) nomeAutenticado = admin.nome;
    } else {
      const coord = await coordenadorRepo.autenticar(coordenador, senha);
      if (coord) nomeAutenticado = coord.nome;
    }

    if (!nomeAutenticado) {
      res.render('index', {
        tela: 'loginCoordenador',
        titulo: 'ACESSO RESTRITO',
        perfilLogin: papel,
        ...contextoAutorizacao(papel),
        loginMensagem: 'Login ou senha incorretos. Tente novamente.'
      });
      return;
    }

    // Credenciais válidas: abre o painel com dados reais do banco.
    const equipesPainel = await obterEquipesPainelReal();
    const painelMetrics = await obterPainelMetricsReal();
    res.render('index', {
      tela: 'painelCoordenador',
      titulo: 'PAINEL DA PROVA',
      coordenadorSelecionado: nomeAutenticado,
      equipesPainel,
      turnosAtivos: painelMetrics.turnosAtivos,
      totalCheckpoints: painelMetrics.totalCheckpoints,
      ...contextoAutorizacao(papel)
    });

  } catch (err: any) {
    console.error('[/login-coordenador] Erro na autenticação:', err.message);
    res.render('index', {
      tela: 'loginCoordenador',
      titulo: 'ACESSO RESTRITO',
      perfilLogin: papel,
      ...contextoAutorizacao(papel),
      loginMensagem: 'Erro interno. Tente novamente em instantes.'
    });
  }
});

app.post('/voltar-login-coordenador', (req: Request, res: Response): void => {
  const { coordenador } = req.body;
  const papel = obterPapelRenderizacao(req);

  res.render('index', {
    // Retorna do painel para a autenticacao do coordenador(a).
    tela: 'loginCoordenador',
    titulo: 'ACESSO RESTRITO',
    coordenadorSelecionado: coordenador,
    perfilLogin: papel,
    ...contextoAutorizacao(papel)
  });
});

app.post('/voltar-painel-coordenador', async (req: Request, res: Response): Promise<void> => {
  const { coordenador } = req.body;
  const papel = obterPapelRenderizacao(req);
  const equipesPainel = await obterEquipesPainelReal();

  const painelMetrics = await obterPainelMetricsReal();

  res.render('index', {
    // Retorna dos detalhes para a visao geral da coordenacao.
    tela: 'painelCoordenador',
    titulo: 'PAINEL DA PROVA',
    coordenadorSelecionado: coordenador,
    equipesPainel,
    turnosAtivos: painelMetrics.turnosAtivos,
    totalCheckpoints: painelMetrics.totalCheckpoints,
    ...contextoAutorizacao(papel)
  });
});

app.post('/modo-tv', autorizarPapeis(ROLES.COORDENADOR, ROLES.ADMINISTRADOR_GERAL), async (req: Request, res: Response): Promise<void> => {
  const { coordenador } = req.body;
  const papel = (req as RequestComUsuario).usuario!.papel;
  const equipesPainel = await obterEquipesPainelReal();

  res.render('index', {
    // Tela de controle do placar publico, usada no tablet da coordenacao.
    tela: 'modoTv',
    titulo: 'MODO TV',
    coordenadorSelecionado: coordenador,
    equipesPainel,
    ...contextoAutorizacao(papel)
  });
});

app.post('/fechamento', autorizarPapeis(ROLES.ADMINISTRADOR_GERAL), async (req: Request, res: Response): Promise<void> => {
  const { coordenador } = req.body;
  const papel = (req as RequestComUsuario).usuario!.papel;
  const rankingFechamento = await obterRankingFechamentoReal();

  res.render('index', {
    // Tela de revisao final antes de encerrar a prova.
    tela: 'fechamento',
    titulo: 'Fechamento',
    coordenadorSelecionado: coordenador,
    rankingFechamento,
    ...contextoAutorizacao(papel)
  });
});

app.post('/finalizar-prova', autorizarPapeis(ROLES.ADMINISTRADOR_GERAL), async (req: Request, res: Response): Promise<void> => {
  const { coordenador } = req.body;
  const papel = (req as RequestComUsuario).usuario!.papel;
  const rankingFechamento = await obterRankingFechamentoReal();
  const resultadoOficial = await obterResultadoOficialReal(coordenador);

  res.render('index', {
    // Confirmacao obrigatoria antes de bloquear novos registros e oficializar o resultado.
    tela: 'confirmacaoFechamento',
    titulo: 'Confirmar encerramento',
    coordenadorSelecionado: coordenador,
    resultadoOficial,
    rankingFechamento,
    ...contextoAutorizacao(papel)
  });
});

app.post('/confirmar-finalizacao', autorizarPapeis(ROLES.ADMINISTRADOR_GERAL), async (req: Request, res: Response): Promise<void> => {
  const { coordenador, confirmaBloqueio } = req.body;
  const papel = (req as RequestComUsuario).usuario!.papel;
  const rankingFechamento = await obterRankingFechamentoReal();
  const resultadoOficial = await obterResultadoOficialReal(coordenador);

  if (confirmaBloqueio !== 'sim') {
    res.render('index', {
      // Mantem a confirmacao bloqueada se o responsavel ainda nao concordou.
      tela: 'confirmacaoFechamento',
      titulo: 'Confirmar encerramento',
      coordenadorSelecionado: coordenador,
      resultadoOficial,
      rankingFechamento,
      ...contextoAutorizacao(papel),
      confirmacaoMensagem: 'Marque a confirmação para continuar.'
    });
    return;
  }

  estadoProva.status = 'finalizada';
  estadoProva.atualizadoPor = coordenador;
  estadoProva.atualizadoEm = new Date();

  await registrarHistoricoAdministrativo(req, 'finalizar_prova', 'estado_prova', {
    status: estadoProva.status,
    atualizadoPor: coordenador,
    atualizadoEm: estadoProva.atualizadoEm
  }, null, { status: 'em_andamento_ou_pausada' });

  res.render('index', {
    // Resultado oficial apos a confirmacao do fechamento da prova.
    tela: 'resultadoOficial',
    titulo: 'Resultado oficial',
    coordenadorSelecionado: coordenador,
    resultadoOficial,
    rankingFechamento,
    ...contextoAutorizacao(papel)
  });
});

app.post('/publicar-resultado', autorizarPapeis(ROLES.ADMINISTRADOR_GERAL), async (req: Request, res: Response): Promise<void> => {
  const { coordenador } = req.body;
  const papel = (req as RequestComUsuario).usuario!.papel;
  const rankingFechamento = await obterRankingFechamentoReal();
  const resultadoOficial = await obterResultadoOficialReal(coordenador);

  res.render('index', {
    // Confirmacao explicita antes de mostrar o resultado final no placar publico.
    tela: 'publicarResultado',
    titulo: 'Publicar resultado',
    coordenadorSelecionado: coordenador,
    resultadoOficial,
    rankingFechamento,
    ...contextoAutorizacao(papel)
  });
});

app.post('/confirmar-publicacao', autorizarPapeis(ROLES.ADMINISTRADOR_GERAL), async (req: Request, res: Response): Promise<void> => {
  const { coordenador } = req.body;
  const rankingFechamento = await obterRankingFechamentoReal();
  const resultadoOficial = await obterResultadoOficialReal(coordenador);
  await registrarHistoricoAdministrativo(req, 'publicar_resultado', 'resultado_oficial', {
    coordenador,
    vencedor: resultadoOficial.vencedor,
    segundoLugar: resultadoOficial.segundoLugar
  });
  res.render('index', {
    // Tela publica final, liberada apos a confirmacao da coordenacao.
    tela: 'tvResultado',
    titulo: 'RESULTADO OFICIAL',
    resultadoOficial,
    rankingFechamento
  });
});

app.post('/voltar-fechamento', async (req: Request, res: Response): Promise<void> => {
  const { coordenador } = req.body;
  const papel = obterPapelRenderizacao(req);
  const rankingFechamento = await obterRankingFechamentoReal();

  res.render('index', {
    // Volta do resultado oficial para a revisao de fechamento.
    tela: 'fechamento',
    titulo: 'Fechamento',
    coordenadorSelecionado: coordenador,
    rankingFechamento,
    ...contextoAutorizacao(papel)
  });
});

app.post('/voltar-resultado-oficial', async (req: Request, res: Response): Promise<void> => {
  const { coordenador } = req.body;
  const papel = obterPapelRenderizacao(req);
  const rankingFechamento = await obterRankingFechamentoReal();
  const resultadoOficial = await obterResultadoOficialReal(coordenador);

  res.render('index', {
    // Retorna da publicacao para o resultado oficial privado.
    tela: 'resultadoOficial',
    titulo: 'Resultado oficial',
    coordenadorSelecionado: coordenador,
    resultadoOficial,
    rankingFechamento,
    ...contextoAutorizacao(papel)
  });
});

app.get('/tv', async (req: Request, res: Response): Promise<void> => {
  const placar = await montarPlacarTv();
  res.render('index', {
    // Tela publica somente leitura, pensada para abrir na TV ou projetor.
    tela: 'tvPublica',
    titulo: 'PLACAR AO VIVO',
    equipesPainel: placar.equipes,
    diferencaTv: placar.diferenca,
    // Timestamp do inicio da prova e duracao total para o cronometro rodar na TV.
    inicioProvaTimestamp: estadoProva.inicioEm.getTime(),
    duracaoProvaMs: DURACAO_PROVA_MS,
    statusProvaTv: estadoProva.status
  });
});

app.get('/tv-resultado', async (req: Request, res: Response): Promise<void> => {
  const rankingFechamento = await obterRankingFechamentoReal();
  const resultadoOficial = await obterResultadoOficialReal('');
  res.render('index', {
    // Tela publica final, pensada para divulgar o resultado oficial na TV.
    tela: 'tvResultado',
    titulo: 'RESULTADO OFICIAL',
    resultadoOficial,
    rankingFechamento
  });
});

app.post('/detalhes-equipe', autorizarPapeis(ROLES.COORDENADOR, ROLES.ADMINISTRADOR_GERAL), async (req: Request, res: Response): Promise<void> => {
  // Recebe qual coordenador esta logado e qual equipe foi aberta.
  const { coordenador, equipe } = req.body;
  const papel = (req as RequestComUsuario).usuario!.papel;
  // Procura os dados da equipe; se nao achar, usa a primeira equipe como fallback.
  const equipesPainel = await obterEquipesPainelReal();
  const equipePainel = equipesPainel.find((item) => item.nome === equipe) || equipesPainel[0];
  const checkpoints = await obterCheckpointsEquipeReal(equipePainel.nome);
  const kmTotalEquipe = checkpoints.reduce((sum, checkpoint) => sum + (checkpoint.kmValor || 0), 0);
  equipePainel.km = `${kmTotalEquipe.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} km`;

  res.render('index', {
    // Abre os registros gerais da equipe para auditoria.
    tela: 'detalheEquipe',
    titulo: equipePainel.nome,
    coordenadorSelecionado: coordenador,
    equipePainel,
    checkpoints,
    ...contextoAutorizacao(papel)
  });
});

app.post('/historico-operacoes', autorizarPapeis(ROLES.COORDENADOR, ROLES.ADMINISTRADOR_GERAL), async (req: Request, res: Response): Promise<void> => {
  const { coordenador, nomeUsuario, perfilFiltro, tipoOperacao, dataInicio, dataFim } = req.body;
  const papel = (req as RequestComUsuario).usuario!.papel;
  const filtrosHistorico: FiltrosHistoricoOperacao = {
    nomeUsuario: nomeUsuario || undefined,
    perfilUsuario: papel === ROLES.ADMINISTRADOR_GERAL ? (perfilFiltro || undefined) : ROLES.OPERADOR,
    tipoOperacao: tipoOperacao || undefined,
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined
  };
  let historicoOperacoes: HistoricoViewItem[] = [];
  let historicoMensagem: string | undefined;

  try {
    historicoOperacoes = await obterHistoricoOperacoesView(papel, filtrosHistorico);
  } catch {
    historicoMensagem = 'Histórico operacional indisponível no momento.';
  }

  res.render('index', {
    tela: 'historicoOperacoes',
    titulo: 'HISTÓRICO OPERACIONAL',
    coordenadorSelecionado: coordenador,
    historicoOperacoes,
    historicoMensagem,
    filtrosHistorico: {
      nomeUsuario: nomeUsuario || '',
      perfilFiltro: papel === ROLES.ADMINISTRADOR_GERAL ? (perfilFiltro || '') : ROLES.OPERADOR,
      tipoOperacao: tipoOperacao || '',
      dataInicio: dataInicio || '',
      dataFim: dataFim || ''
    },
    ...contextoAutorizacao(papel)
  });
});

app.post('/filtro-atletas-equipe', autorizarPapeis(ROLES.COORDENADOR, ROLES.ADMINISTRADOR_GERAL), async (req: Request, res: Response): Promise<void> => {
  // Recebe a equipe e, opcionalmente, o atleta selecionado no filtro.
  const { coordenador, equipe, atleta } = req.body;
  const papel = (req as RequestComUsuario).usuario!.papel;
  // Recupera o resumo da equipe escolhida.
  const equipesPainel = await obterEquipesPainelReal();
  const equipePainel = equipesPainel.find((item) => item.nome === equipe) || equipesPainel[0];
  // Busca a lista de atletas dessa equipe.
  const atletas = await obterAtletasFiltroReal(equipePainel.nome);
  // Mantem o atleta clicado ou usa o atleta marcado como padrao.
  const atletaSelecionado = atleta || atletas[0]?.nome;

  res.render('index', {
    // Mostra o filtro por atleta dentro dos detalhes da equipe.
    tela: 'filtroAtletasEquipe',
    titulo: 'ATLETAS DA EQUIPE',
    coordenadorSelecionado: coordenador,
    equipePainel,
    atletasFiltro: atletas,
    atletaSelecionado,
    ...contextoAutorizacao(papel)
  });
});

// Mostra diretamente a selecao de operadores caso a rota seja acessada pela URL.
app.get('/operador', async (req: Request, res: Response): Promise<void> => {
  const operadores = await obterOperadoresReal();
  res.render('index', {
    // Permite acessar a selecao de operadores diretamente pela URL /operador.
    tela: 'operador',
    titulo: 'SELEÇÃO DE OPERADOR(A)',
    operadores
  });
});

// Recebe o operador escolhido e mostra uma confirmacao simples na mesma tela.
app.post('/selecionar-operador', async (req: Request, res: Response): Promise<void> => {
  const { operador } = req.body;
  const operadores = await obterOperadoresReal();

  await registrarHistoricoOperador(operador, 'selecionar_operador', 'operador', { operador });

  res.render('index', {
    // Mantem a tela de operadores e destaca quem foi selecionado.
    tela: 'operador',
    titulo: 'SELEÇÃO DE OPERADOR(A)',
    operadores,
    operadorSelecionado: operador
  });
});

app.post('/continuar-operador', autorizarPapeis(ROLES.OPERADOR, ROLES.COORDENADOR, ROLES.ADMINISTRADOR_GERAL), bloquearOperacaoSeProvaFinalizada, async (req: Request, res: Response): Promise<void> => {
  const { operador } = req.body;
  const equipes = await obterEquipesReal();

  res.render('index', {
    // Mostra a etapa seguinte, mantendo o operador escolhido visivel no topo.
    tela: 'equipe',
    titulo: 'SELEÇÃO DE EQUIPE',
    operadorSelecionado: operador,
    equipes
  });
});

app.post('/voltar-operador', async (req: Request, res: Response): Promise<void> => {
  const { operador } = req.body;
  const operadores = await obterOperadoresReal();

  res.render('index', {
    // Volta da selecao de equipe para a etapa anterior, mantendo o operador selecionado.
    tela: 'operador',
    titulo: 'SELEÇÃO DE OPERADOR(A)',
    operadores,
    operadorSelecionado: operador
  });
});

app.post('/selecionar-equipe', autorizarPapeis(ROLES.OPERADOR, ROLES.COORDENADOR, ROLES.ADMINISTRADOR_GERAL), bloquearOperacaoSeProvaFinalizada, async (req: Request, res: Response): Promise<void> => {
  const { operador, equipe } = req.body;
  const equipes = await obterEquipesReal();

  await registrarHistoricoOperador(operador, 'selecionar_equipe', 'equipe', { operador, equipe });

  res.render('index', {
    // Mantem a tela de equipes e destaca a equipe escolhida futuramente.
    tela: 'equipe',
    titulo: 'SELEÇÃO DE EQUIPE',
    operadorSelecionado: operador,
    equipeSelecionada: equipe,
    equipes
  });
});

app.post('/continuar-equipe', autorizarPapeis(ROLES.OPERADOR, ROLES.COORDENADOR, ROLES.ADMINISTRADOR_GERAL), bloquearOperacaoSeProvaFinalizada, async (req: Request, res: Response): Promise<void> => {
  const { operador, equipe } = req.body;
  const atletas = await obterAtletasReal(equipe);
  const esteiras = await obterEsteirasReal();

  res.render('index', {
    // Mostra todos os atletas da equipe selecionada e o status das esteiras.
    tela: 'atleta',
    titulo: equipe,
    operadorSelecionado: operador,
    equipeSelecionada: equipe,
    atletas,
    esteiras
  });
});

app.post('/voltar-equipe', async (req: Request, res: Response): Promise<void> => {
  const { operador, equipe } = req.body;
  const equipes = await obterEquipesReal();

  res.render('index', {
    // Volta da selecao de atleta para a tela de equipe, mantendo a equipe marcada.
    tela: 'equipe',
    titulo: 'SELEÇÃO DE EQUIPE',
    operadorSelecionado: operador,
    equipeSelecionada: equipe,
    equipes
  });
});

app.post('/selecionar-atleta', autorizarPapeis(ROLES.OPERADOR, ROLES.COORDENADOR, ROLES.ADMINISTRADOR_GERAL), bloquearOperacaoSeProvaFinalizada, async (req: Request, res: Response): Promise<void> => {
  // Recebe o atleta clicado e o ultimo atleta que correu.
  const { operador, equipe, atleta, ultimoAtleta } = req.body;
  const atletas = await obterAtletasReal(equipe);
  const esteiras = await obterEsteirasReal();

  await registrarHistoricoOperador(operador, 'selecionar_atleta', 'atleta', {
    operador,
    equipe,
    atleta,
    ultimoAtleta: ultimoAtleta || null
  });

  // Bloqueia a regra de negocio: o mesmo atleta nao pode correr dois turnos seguidos.
  if (ultimoAtleta && atleta === ultimoAtleta) {
    res.render('index', {
      // Impede o mesmo atleta de correr dois turnos seguidos.
      tela: 'atleta',
      titulo: equipe,
      operadorSelecionado: operador,
      equipeSelecionada: equipe,
      ultimoAtleta,
      atletas,
      esteiras
    });
    return;
  }

  res.render('index', {
    // Mantem a tela de atletas e destaca o atleta escolhido.
    tela: 'atleta',
    titulo: equipe,
    operadorSelecionado: operador,
    equipeSelecionada: equipe,
    atletaSelecionado: atleta,
    ultimoAtleta,
    atletas,
    esteiras
  });
});

app.post('/continuar-atleta', autorizarPapeis(ROLES.OPERADOR, ROLES.COORDENADOR, ROLES.ADMINISTRADOR_GERAL), bloquearOperacaoSeProvaFinalizada, async (req: Request, res: Response): Promise<void> => {
  // Recebe os dados necessarios para seguir da selecao de atleta para a esteira.
  const { operador, equipe, atleta, ultimoAtleta } = req.body;
  const atletas = await obterAtletasReal(equipe);
  const esteiras = await obterEsteirasReal();

  // Repete a validacao para evitar que alguem avance manualmente pelo HTML.
  if (ultimoAtleta && atleta === ultimoAtleta) {
    res.render('index', {
      // Segunda validacao para evitar avanço manual com atleta bloqueado.
      tela: 'atleta',
      titulo: equipe,
      operadorSelecionado: operador,
      equipeSelecionada: equipe,
      ultimoAtleta,
      atletas,
      esteiras
    });
    return;
  }

  res.render('index', {
    // Confirma atleta e permite escolher a esteira para iniciar o turno.
    tela: 'esteira',
    titulo: 'INICIAR TURNO',
    operadorSelecionado: operador,
    equipeSelecionada: equipe,
    atletaSelecionado: atleta,
    esteiras
  });
});

app.post('/selecionar-esteira', autorizarPapeis(ROLES.OPERADOR, ROLES.COORDENADOR, ROLES.ADMINISTRADOR_GERAL), bloquearOperacaoSeProvaFinalizada, async (req: Request, res: Response): Promise<void> => {
  const { operador, equipe, atleta, esteira, bypassManutencao } = req.body;
  const esteiras = await obterEsteirasReal();

  await registrarHistoricoOperador(operador, 'selecionar_esteira', 'esteira', {
    operador,
    equipe,
    atleta,
    esteira,
    bypassManutencao: bypassManutencao === 'sim'
  });

  res.render('index', {
    // Mantem a tela de esteiras e destaca a esteira escolhida.
    tela: 'esteira',
    titulo: 'INICIAR TURNO',
    operadorSelecionado: operador,
    equipeSelecionada: equipe,
    atletaSelecionado: atleta,
    esteiraSelecionada: esteira,
    esteiraEmManutencaoSelecionada: bypassManutencao === 'sim',
    esteiras
  });
});

app.post('/voltar-atleta', async (req: Request, res: Response): Promise<void> => {
  const { operador, equipe, atleta } = req.body;
  const atletas = await obterAtletasReal(equipe);
  const esteiras = await obterEsteirasReal();

  res.render('index', {
    // Volta da selecao de esteira para a tela de atletas.
    tela: 'atleta',
    titulo: equipe,
    operadorSelecionado: operador,
    equipeSelecionada: equipe,
    atletaSelecionado: atleta,
    atletas,
    esteiras
  });
});

app.post('/iniciar-turno', autorizarPapeis(ROLES.OPERADOR, ROLES.COORDENADOR, ROLES.ADMINISTRADOR_GERAL), bloquearOperacaoSeProvaFinalizada, async (req: Request, res: Response): Promise<void> => {
  const { operador, equipe, atleta, esteira } = req.body;
  const inicioTurnoTimestamp = Date.now();

  try {
    // Resolve IDs reais no banco a partir dos nomes recebidos do formulário.
    const atletaDB = await atletaRepo.buscarPorNome(atleta, (await equipeRepo.buscarPorNome(equipe))?.id_equipe ?? 0);
    const esteiraDB = await esteiraRepo.buscarPorModelo(esteira);
    const eventoAtivo = await eventoRepo.buscarAtivo();

    let idTurno: number | null = null;

    if (atletaDB && esteiraDB && eventoAtivo) {
      // Cria sessao operacional para o operador desta jornada.
      const sessao = await sessaoRepo.insert({
        id_evento: eventoAtivo.id_evento,
        id_funcao: 1, // funcao padrão: operador de esteira
        inicio_em: new Date()
      });

      // Insere o turno vinculando atleta, esteira e sessao operacional.
      const turno = await turnoRepo.insert({
        id_atleta: atletaDB.id_atleta,
        id_esteira: esteiraDB.id_esteira,
        id_sessao_operacional: sessao.id_sessao_operacional,
        horario_inicio: new Date()
      });
      idTurno = turno.id_turno;
    }

    await registrarHistoricoOperador(operador, 'iniciar_turno', 'turno', {
      operador,
      equipe,
      atleta,
      esteira,
      inicioTurnoTimestamp,
      idTurno
    }, idTurno);

    res.render('index', {
      // Abre a tela de checkpoint com o turno em andamento.
      tela: 'checkpoint',
      titulo: 'TURNO ATIVO',
      operadorSelecionado: operador,
      equipeSelecionada: equipe,
      atletaSelecionado: atleta,
      esteiraSelecionada: esteira,
      inicioTurnoTimestamp,
      idTurno
    });
  } catch (err: any) {
    console.error('[/iniciar-turno] Erro ao persistir turno:', err.message);
    await registrarHistoricoOperador(operador, 'iniciar_turno_fallback', 'turno', {
      operador,
      equipe,
      atleta,
      esteira,
      inicioTurnoTimestamp,
      erro: err.message
    });
    // Mesmo com erro no banco, abre a tela para não bloquear o operador.
    res.render('index', {
      tela: 'checkpoint',
      titulo: 'TURNO ATIVO',
      operadorSelecionado: operador,
      equipeSelecionada: equipe,
      atletaSelecionado: atleta,
      esteiraSelecionada: esteira,
      inicioTurnoTimestamp,
      idTurno: null
    });
  }
});

app.post('/processar-ocr-checkpoint', autorizarPapeis(ROLES.OPERADOR, ROLES.COORDENADOR, ROLES.ADMINISTRADOR_GERAL), bloquearOperacaoSeProvaFinalizada, async (req: Request, res: Response): Promise<Response> => {
  const operador = String(req.body?.operador || req.body?.coordenador || 'Operador não informado');

  try {
    const imagemCheckpoint = req.body?.imagemCheckpoint;
    const resultado = await extrairQuilometragem(imagemCheckpoint);
    const operacaoPorStatus: Record<string, string> = {
      sucesso: 'CHECKPOINT_OCR_PROCESSADO',
      'valor não identificado': 'CHECKPOINT_OCR_NAO_PROCESSADO',
      'erro de identificação': 'CHECKPOINT_OCR_ERRO'
    };

    await registrarHistoricoOperador(
      operador,
      operacaoPorStatus[resultado.status] || 'CHECKPOINT_OCR_PROCESSADO',
      'checkpoint',
      {
        operador,
        equipe: req.body?.equipe || null,
        atleta: req.body?.atleta || null,
        esteira: req.body?.esteira || null,
        ocr_status: resultado.status,
        ocr_texto_extraido: JSON.stringify(resultado),
        ocr_km_extraido: resultado.km ?? null,
        ocr_confianca: null
      }
    );

    if (resultado.status === 'sucesso' && resultado.km !== null) {
      await registrarHistoricoOperador(
        operador,
        'CHECKPOINT_KM_SUGERIDO_OCR',
        'checkpoint',
        {
          operador,
          equipe: req.body?.equipe || null,
          atleta: req.body?.atleta || null,
          esteira: req.body?.esteira || null,
          ocr_km_extraido: resultado.km
        }
      );
    }

    return res.status(200).json({ ok: true, resultado });
  } catch (err: any) {
    console.error('[/processar-ocr-checkpoint] Erro:', err.message);
    await registrarHistoricoOperador(operador, 'CHECKPOINT_OCR_ERRO', 'checkpoint', {
      operador,
      erro: err.message
    });
    return res.status(500).json({ error: err.message || 'Erro interno ao processar OCR.' });
  }
});

// Registra um checkpoint de km acumulado no Supabase com cálculo de pace.
// Recebe JSON via fetch do front-end: { operador, equipe, atleta, esteira, kmAcumulado, inicioTurnoTimestamp, idTurno }
app.post('/registrar-checkpoint', bloquearOperacaoSeProvaFinalizada, async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log('[POST /registrar-checkpoint] req.body:', JSON.stringify(req.body));
    let {
      operador,
      equipe,
      atleta,
      esteira,
      kmAcumulado,
      km_acumulado,
      inicioTurnoTimestamp,
      idTurno,
      id_turno,
      origemKm,
      ocrStatus,
      ocrTextoExtraido,
      ocrKmExtraido,
      ocrConfianca
    } = req.body;

    const imagemCheckpoint = String(req.body?.imagemCheckpoint || '').trim();
    const kmIncomingRaw = kmAcumulado ?? km_acumulado ?? null;
    const idTurnoIncoming = idTurno ?? id_turno ?? null;
    const temKmNoBody = kmIncomingRaw !== null && String(kmIncomingRaw).trim() !== '';

    if (imagemCheckpoint && !temKmNoBody) {
      const resultadoOcr = await extrairQuilometragem(imagemCheckpoint);
      return res.status(200).json({ status: resultadoOcr.status || 'valor não identificado', km: resultadoOcr.km ?? null });
    }

    if (imagemCheckpoint) {
      const resultadoOcr = await extrairQuilometragem(imagemCheckpoint);
      ocrStatus = resultadoOcr.status || 'valor não identificado';
      ocrKmExtraido = resultadoOcr.km ?? null;
      ocrTextoExtraido = JSON.stringify(resultadoOcr);
      ocrConfianca = null;
    }

    // --- Validação numérica do km acumulado ---
    const kmRaw = String(kmIncomingRaw ?? '').trim();
    const kmNormalizado = kmRaw.includes(',')
      ? kmRaw.replace(/\./g, '').replace(',', '.')
      : kmRaw;
    const km = Number(kmNormalizado);

    if (!kmRaw || !Number.isFinite(km) || km <= 0) {
      return res.status(400).json({ error: 'km_acumulado deve ser um número positivo.' });
    }

    // Máximo de 3 casas decimais.
    const kmArredondado = Math.round(km * 1000) / 1000;
    if (kmArredondado !== km && kmNormalizado.includes('.') && kmNormalizado.split('.')[1].length > 3) {
      return res.status(400).json({ error: 'km_acumulado aceita no máximo 3 casas decimais.' });
    }

    // --- Resolve id_turno ---
    let turnoId = (idTurnoIncoming !== null && idTurnoIncoming !== undefined && idTurnoIncoming !== '')
      ? Number(idTurnoIncoming)
      : null;

    // Se não veio idTurno, tenta achar o turno ativo do atleta no banco.
    if (!turnoId) {
      const eq = await equipeRepo.buscarPorNome(equipe);
      if (eq) {
        const atletaDB = await atletaRepo.buscarPorNome(atleta, eq.id_equipe);
        if (atletaDB) {
          const { data: turnoAtivo } = await supabase
            .from('turnos')
            .select('id_turno, id_sessao_operacional')
            .eq('id_atleta', atletaDB.id_atleta)
            .eq('status', 'em_andamento')
            .order('horario_inicio', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (turnoAtivo) turnoId = turnoAtivo.id_turno;
        }
      }
    }
    // Caso ainda não tenha turnoId, tenta localizar um turno ativo pela equipe (lista de atletas).
    if (!turnoId) {
      try {
        const eq = await equipeRepo.buscarPorNome(equipe);
        if (eq) {
          const atletasEquipe = await atletaRepo.listarPorEquipe(eq.id_equipe);
          const atletaIds = (atletasEquipe || []).map(a => a.id_atleta);
          if (atletaIds.length > 0) {
            const { data: turnoEquipe } = await supabase
              .from('turnos')
              .select('id_turno, id_sessao_operacional')
              .in('id_atleta', atletaIds)
              .eq('status', 'em_andamento')
              .order('horario_inicio', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (turnoEquipe) {
              turnoId = turnoEquipe.id_turno;
            }
          }
        }
      } catch (e) {
        const msg = (e && (e as any).message) ? (e as any).message : String(e);
        console.warn('[POST /registrar-checkpoint] erro ao buscar turno por equipe:', msg);
      }
    }

    // Se ainda não encontrou um turno ativo, bloqueia o registro informando o problema.
    if (!turnoId) {
      return res.status(400).json({ error: 'Não é possível registrar um checkpoint sem um turno ativo iniciado no sistema. Por favor, inicie o turno da equipe primeiro.' });
    }

    // --- Busca sessão operacional vinculada ao turno quando um id foi fornecido ---
    let turnoRow: any = null;
    if (turnoId) {
      const { data } = await supabase
        .from('turnos')
        .select('id_sessao_operacional, horario_inicio, km_turno')
        .eq('id_turno', turnoId)
        .maybeSingle();

      if (data) {
        turnoRow = data;
      } else {
        console.warn(`[POST /registrar-checkpoint] Turno informado (#${turnoId}) não encontrado no banco; prosseguindo com turno=null.`);
      }
    }

    const idSessaoOperacional = turnoRow ? turnoRow.id_sessao_operacional : null;

    // --- Busca checkpoint anterior para calcular pace ---
    const checkpointsAnteriores = turnoId ? await checkpointRepo.findByTurno(turnoId) : [];
    const anterior = checkpointsAnteriores.length > 0
      ? checkpointsAnteriores.reduce((a, b) =>
          new Date(a.registrado_em) > new Date(b.registrado_em) ? a : b)
      : null;

    const kmAnterior = anterior ? Number(anterior.km_acumulado) : 0;
    const kmDelta = kmArredondado - kmAnterior;

    if (kmDelta <= 0 && checkpointsAnteriores.length > 0) {
      return res.status(400).json({ error: `km_acumulado (${kmArredondado}) deve ser maior que o checkpoint anterior (${kmAnterior}).` });
    }

    // Calcula tempo decorrido desde o início do turno.
    const agora = Date.now();
    // Protege caso turnoRow seja null — use ordem de preferência:
    // 1) horario_inicio do turno recuperado do banco
    // 2) valor enviado pelo frontend em inicioTurnoTimestamp
    // 3) fallback para 'agora'
    let inicioTurno = agora;
    try {
      if (turnoRow && turnoRow.horario_inicio) {
        const parsed = new Date(turnoRow.horario_inicio).getTime();
        if (Number.isFinite(parsed) && parsed > 0) inicioTurno = parsed;
      } else if (inicioTurnoTimestamp !== undefined && inicioTurnoTimestamp !== null && inicioTurnoTimestamp !== '') {
        const asNumber = Number(inicioTurnoTimestamp);
        if (Number.isFinite(asNumber) && asNumber > 0) {
          inicioTurno = asNumber;
        } else {
          const parsedReq = Date.parse(String(inicioTurnoTimestamp));
          if (!Number.isNaN(parsedReq)) inicioTurno = parsedReq;
        }
      }
    } catch (e) {
      // se algo falhar no parse, mantemos 'agora' como fallback
      console.warn('[POST /registrar-checkpoint] falha ao parsear inicioTurno, usando agora:', e);
      inicioTurno = agora;
    }

    const referenciaTurno = Number.isFinite(inicioTurno) && inicioTurno > 0 ? inicioTurno : agora;
    const segundosDecorridos = Math.max(1, (agora - referenciaTurno) / 1000);

    // Pace em min/km: tempo total do turno (min) dividido pelo KM acumulado registrado.
    const paceMinKm = (segundosDecorridos / 60) / kmArredondado;
    const paceArredondado = Math.round(paceMinKm * 1000) / 1000;

    // Velocidade média em km/h: KM acumulado dividido pelo tempo total do turno.
    const velocidadeMedia = kmArredondado / (segundosDecorridos / 3600);
    const velocidadeArredondada = Math.round(velocidadeMedia * 100) / 100;

    // --- Persiste checkpoint no Supabase ---
    const checkpoint = await checkpointRepo.insert({
      id_turno: turnoId,
      id_sessao_operacional: idSessaoOperacional,
      km_acumulado: kmArredondado,
      pace_medio: paceArredondado,
      velocidade_media: velocidadeArredondada,
      registrado_em: new Date(),
      is_ajuste: false
    });

    const metadadosOcrRecebidos = Boolean(ocrStatus || ocrTextoExtraido || ocrKmExtraido || ocrConfianca);
    if (metadadosOcrRecebidos) {
      try {
        await checkpointRepo.atualizarMetadadosOcr(checkpoint.id_checkpoint, {
          ocr_status: String(ocrStatus || 'nao_processado'),
          ocr_texto_extraido: ocrTextoExtraido ? String(ocrTextoExtraido) : null,
          ocr_km_extraido: ocrKmExtraido !== undefined && ocrKmExtraido !== null && ocrKmExtraido !== ''
            ? Number(ocrKmExtraido)
            : null,
          ocr_confianca: ocrConfianca !== undefined && ocrConfianca !== null && ocrConfianca !== ''
            ? Number(ocrConfianca)
            : null,
          atualizado_em: new Date().toISOString()
        });
      } catch (error: any) {
        console.error('[/registrar-checkpoint] Metadados OCR ignorados:', error.message);
      }
    }

    await registrarHistoricoOperador(operador, 'registrar_checkpoint', 'checkpoint', {
      operador,
      equipe,
      atleta,
      esteira,
      km_acumulado: kmArredondado,
      pace_medio: paceArredondado,
      velocidade_media: velocidadeArredondada,
      id_turno: turnoId,
      origem_km: origemKm || 'manual',
      ocr_status: ocrStatus || null,
      ocr_texto_extraido: ocrTextoExtraido || null,
      ocr_km_extraido: ocrKmExtraido !== undefined && ocrKmExtraido !== null && ocrKmExtraido !== ''
        ? Number(ocrKmExtraido)
        : null,
      ocr_confianca: ocrConfianca !== undefined && ocrConfianca !== null && ocrConfianca !== ''
        ? Number(ocrConfianca)
        : null
    }, checkpoint.id_checkpoint, anterior ? {
      id_checkpoint: anterior.id_checkpoint,
      km_acumulado: kmAnterior
    } : null);

    return res.status(201).json({
      ok: true,
      idTurno: turnoId,
      checkpoint: {
        id: checkpoint.id_checkpoint,
        km_acumulado: kmArredondado,
        pace_medio: paceArredondado,
        velocidade_media: velocidadeArredondada,
        registrado_em: checkpoint.registrado_em
      }
    });

  } catch (err: any) {
    try {
      console.error('[POST /registrar-checkpoint] req.body at error:', JSON.stringify(req.body));
    } catch (e) {
      console.error('[POST /registrar-checkpoint] erro ao serializar req.body:', e);
    }
    const e = err as any;
    console.error('[/registrar-checkpoint] Erro:', e?.message ?? e);
    if (e?.details) console.error('[/registrar-checkpoint] details:', e.details);
    if (e?.hint) console.error('[/registrar-checkpoint] hint:', e.hint);
    if (e?.stack) console.error(e.stack);
    return res.status(500).json({ error: e?.message || 'Erro interno ao registrar checkpoint.' });
  }
});

app.post('/finalizar-turno', autorizarPapeis(ROLES.OPERADOR, ROLES.COORDENADOR, ROLES.ADMINISTRADOR_GERAL), bloquearOperacaoSeProvaFinalizada, (req: Request, res: Response): void => {
  const { operador, equipe, atleta, esteira, kmFinal, duracaoTurno, idTurno } = req.body;
  const inicioTurnoTimestamp = obterInicioTurno(req.body.inicioTurnoTimestamp);

  res.render('index', {
    // Mostra uma conferencia antes de encerrar o turno e reiniciar o ciclo.
    tela: 'encerramento',
    titulo: 'FINALIZAR TURNO',
    operadorSelecionado: operador,
    equipeSelecionada: equipe,
    atletaSelecionado: atleta,
    esteiraSelecionada: esteira,
    kmFinal: kmFinal || '0',
    duracaoTurno: formatarDuracao(inicioTurnoTimestamp, duracaoTurno || '00:00:00'),
    inicioTurno: formatarHorario(inicioTurnoTimestamp),
    inicioTurnoTimestamp,
    idTurno: idTurno || null
  });
});

app.post('/voltar-checkpoint', (req: Request, res: Response): void => {
  const { operador, equipe, atleta, esteira, idTurno } = req.body;
  const inicioTurnoTimestamp = obterInicioTurno(req.body.inicioTurnoTimestamp);

  res.render('index', {
    // Retorna para o turno em andamento caso o operador queira revisar os checkpoints.
    tela: 'checkpoint',
    titulo: 'TURNO ATIVO',
    operadorSelecionado: operador,
    equipeSelecionada: equipe,
    atletaSelecionado: atleta,
    esteiraSelecionada: esteira,
    inicioTurnoTimestamp,
    idTurno: idTurno || null
  });
});

app.post('/confirmar-encerramento', autorizarPapeis(ROLES.OPERADOR, ROLES.COORDENADOR, ROLES.ADMINISTRADOR_GERAL), bloquearOperacaoSeProvaFinalizada, async (req: Request, res: Response): Promise<void> => {
  const { operador, equipe, atleta, idTurno, kmFinal } = req.body;
  let valorAnteriorTurno: unknown = null;

  // Persiste o encerramento do turno no banco de dados.
  if (idTurno) {
    try {
      const kmFinalNum = parseFloat(String(kmFinal || '0').replace(',', '.')) || 0;
      const { data: turnoAntes } = await supabase
        .from('turnos')
        .select('id_turno, status, km_turno, horario_fim')
        .eq('id_turno', Number(idTurno))
        .maybeSingle();
      valorAnteriorTurno = turnoAntes || null;
      await turnoRepo.updateParaEncerrado(Number(idTurno), kmFinalNum);
    } catch (err: any) {
      console.error('[/confirmar-encerramento] Erro ao fechar turno no banco:', err.message);
    }
  }

  await registrarHistoricoOperador(operador, 'finalizar_turno', 'turno', {
    operador,
    equipe,
    atleta,
    idTurno: idTurno || null,
    kmFinal
  }, idTurno || null, valorAnteriorTurno);

  const atletas = await obterAtletasReal(equipe);
  const esteiras = await obterEsteirasReal();

  res.render('index', {
    // Encerramento confirmado: volta para a selecao de atletas da mesma equipe.
    tela: 'atleta',
    titulo: equipe,
    operadorSelecionado: operador,
    equipeSelecionada: equipe,
    ultimoAtleta: atleta,
    atletas,
    esteiras
  });
});

app.post('/pausar-prova', autorizarPapeis(ROLES.ADMINISTRADOR_GERAL), async (req: Request, res: Response): Promise<void> => {
  const statusAnterior = estadoProva.status;
  estadoProva.status = 'pausada';
  estadoProva.atualizadoPor = req.body.coordenador;
  estadoProva.atualizadoEm = new Date();
  await registrarHistoricoAdministrativo(req, 'pausar_prova', 'estado_prova', {
    status: estadoProva.status,
    atualizadoPor: estadoProva.atualizadoPor,
    atualizadoEm: estadoProva.atualizadoEm
  }, null, { status: statusAnterior });
  const equipesPainel = await obterEquipesPainelReal();

  res.render('index', {
    tela: 'painelCoordenador',
    titulo: 'PAINEL DA PROVA',
    coordenadorSelecionado: req.body.coordenador,
    equipesPainel,
    painelMensagem: 'Prova pausada com sucesso.',
    ...contextoAutorizacao((req as RequestComUsuario).usuario!.papel)
  });
});

app.post('/retomar-prova', autorizarPapeis(ROLES.ADMINISTRADOR_GERAL), async (req: Request, res: Response): Promise<void> => {
  const statusAnterior = estadoProva.status;
  estadoProva.status = 'em_andamento';
  estadoProva.atualizadoPor = req.body.coordenador;
  estadoProva.atualizadoEm = new Date();
  await registrarHistoricoAdministrativo(req, 'retomar_prova', 'estado_prova', {
    status: estadoProva.status,
    atualizadoPor: estadoProva.atualizadoPor,
    atualizadoEm: estadoProva.atualizadoEm
  }, null, { status: statusAnterior });
  const equipesPainel = await obterEquipesPainelReal();

  res.render('index', {
    tela: 'painelCoordenador',
    titulo: 'PAINEL DA PROVA',
    coordenadorSelecionado: req.body.coordenador,
    equipesPainel,
    painelMensagem: 'Prova retomada com sucesso.',
    ...contextoAutorizacao((req as RequestComUsuario).usuario!.papel)
  });
});

app.get('/exportar-dados', autorizarPapeis(ROLES.COORDENADOR, ROLES.ADMINISTRADOR_GERAL), async (req: Request, res: Response): Promise<Response> => {
  const rankingFechamento = await obterRankingFechamentoReal();
  const linhas = [
    'posicao,equipe,km,checkpoints,correcoes',
    ...rankingFechamento.map((equipe) => [
      equipe.posicao,
      equipe.nome,
      equipe.km.replace(' km', ''),
      equipe.checkpoints,
      equipe.correcoes
    ].join(','))
  ];

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="bullpace-auditoria.csv"');

  return res.status(200).send(linhas.join('\n'));
});

// Buscar todos os registros de uma tabela
app.get('/api/:tabela', autorizarPapeis(ROLES.COORDENADOR, ROLES.ADMINISTRADOR_GERAL), async (req: Request, res: Response): Promise<Response> => {
  try {
    // Le o nome da tabela vindo da URL, por exemplo /api/atletas.
    const tabela = obterTabelaPermitida(req.params.tabela as string);

    if (!tabela) {
      return res.status(403).json({ error: 'Tabela não permitida para acesso pela API.' });
    }

    // Busca todos os registros da tabela no Supabase.
    const { data, error } = await supabase.from(tabela).select('*');

    // Se o Supabase devolveu erro, joga para o catch.
    if (error) throw error;
    // Responde com status 200 e os dados encontrados.
    return res.status(200).json(data);
  } catch (error: any) {
    // Responde com status 500 quando algo falha no servidor ou no Supabase.
    return res.status(500).json({ error: error.message });
  }
});

// Atualizar um registro com auditoria de valor anterior e valor novo.
app.patch('/api/:tabela/:id', autorizarPapeis(ROLES.COORDENADOR, ROLES.ADMINISTRADOR_GERAL), bloquearOperacaoSeProvaFinalizada, async (req: Request, res: Response): Promise<Response> => {
  try {
    const tabela = obterTabelaPermitida(req.params.tabela as string);

    if (!tabela) {
      return res.status(403).json({ error: 'Tabela não permitida para correção pela API.' });
    }

    const chavePrimaria = chavesPrimariasPorTabela[tabela];
    const registroId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const registro = filtrarRegistroPermitido(tabela, req.body);

    if (Object.keys(registro).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo permitido foi enviado.' });
    }

    if (tabela === 'checkpoints') {
      registro.is_ajuste = true;
    }

    const { data: valorAnterior, error: erroBusca } = await supabase
      .from(tabela)
      .select('*')
      .eq(chavePrimaria, registroId)
      .maybeSingle();

    if (erroBusca) throw erroBusca;
    if (!valorAnterior) {
      return res.status(404).json({ error: `Registro ${registroId} não encontrado em ${tabela}.` });
    }

    const { data, error } = await supabase
      .from(tabela)
      .update(registro)
      .eq(chavePrimaria, registroId)
      .select()
      .single();

    if (error) throw error;

    await registrarHistoricoAdministrativo(req, 'corrigir_registro', tabela, data, registroId, valorAnterior, req.body?.motivo || null);

    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Cadastro Rápido de Operadores
app.post('/cadastro-rapido/operador', autorizarPapeis(ROLES.OPERADOR, ROLES.COORDENADOR, ROLES.ADMINISTRADOR_GERAL), bloquearOperacaoSeProvaFinalizada, async (req: Request, res: Response): Promise<Response> => {
  try {
    const { nome } = req.body;
    if (!nome) {
      return res.status(400).json({ error: 'Nome do operador é obrigatório.' });
    }
    const operador = await operadorRepo.criar(nome);
    await registrarHistoricoAdministrativo(req, 'cadastrar_operador', 'operador', {
      id_operador: operador.id_operador,
      nome: operador.nome,
      login: operador.login
    }, operador.id_operador);
    return res.status(201).json(operador);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Cadastro Rápido de Coordenadores
app.post('/cadastro-rapido/coordenador', autorizarPapeis(ROLES.COORDENADOR, ROLES.ADMINISTRADOR_GERAL), bloquearOperacaoSeProvaFinalizada, async (req: Request, res: Response): Promise<Response> => {
  try {
    const { nome, login, senha } = req.body;
    if (!nome || !login || !senha) {
      return res.status(400).json({ error: 'Nome, login e senha são obrigatórios.' });
    }
    const coordenador = await coordenadorRepo.criarCoordenador(nome, login, senha);
    await registrarHistoricoAdministrativo(req, 'cadastrar_coordenador', 'coordenador', {
      id_coordenador: coordenador.id_coordenador,
      nome: coordenador.nome,
      login: coordenador.login
    }, coordenador.id_coordenador);
    return res.status(201).json(coordenador);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Listar Equipes para o SELECT do Cadastro Rápido de Atleta
// Implementa paginação progressiva para buscar todas as equipes do banco sem limite oculto.
app.get('/cadastro-rapido/equipes', autorizarPapeis(ROLES.OPERADOR, ROLES.COORDENADOR, ROLES.ADMINISTRADOR_GERAL), async (req: Request, res: Response): Promise<Response> => {
  try {
    let allEquipes: any[] = [];
    let start = 0;
    const limit = 1000;
    let keepFetching = true;

    while (keepFetching) {
      const { data, error } = await supabase
        .from('equipes')
        .select('id_equipe, nome')
        .order('nome', { ascending: true })
        .range(start, start + limit - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        allEquipes = allEquipes.concat(data);
        start += limit;
        if (data.length < limit) {
          keepFetching = false;
        }
      } else {
        keepFetching = false;
      }
    }

    console.log('[AUDIT CADASTRO EQUIPE] Quantidade de equipes retornadas pela API:', allEquipes.length);
    console.log('[AUDIT CADASTRO EQUIPE] Equipes retornadas pela API:', allEquipes.map((e) => ({
      id: e.id_equipe,
      nome: e.nome
    })));

    return res.status(200).json(allEquipes);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Cadastro Rápido de Equipes
app.post('/cadastro-rapido/equipe', autorizarPapeis(ROLES.OPERADOR, ROLES.COORDENADOR, ROLES.ADMINISTRADOR_GERAL), async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log('[AUDIT CADASTRO EQUIPE] payload:', req.body);
    console.log('[AUDIT CLIENT INSTANCE CADASTRO EQUIPE]', supabase);
    const { nome } = req.body;
    if (!nome || !String(nome).trim()) {
      return res.status(400).json({ error: 'Nome da equipe é obrigatório.' });
    }

    const idEvento = await obterIdEventoParaCadastroEquipe();
    const payloadEquipe = {
      nome: String(nome).trim(),
      id_evento: idEvento
    };
    console.log('[AUDIT CADASTRO EQUIPE] payload normalizado:', payloadEquipe);

    const { count: countAntesInsert, error: erroCountAntesInsert } = await supabase
      .from('equipes')
      .select('*', {
        count: 'exact',
        head: true
      });

    if (erroCountAntesInsert) {
      console.log('[AUDIT COUNT ANTES INSERT] erro:', erroCountAntesInsert.message);
    } else {
      console.log('[AUDIT COUNT ANTES INSERT]', countAntesInsert);
    }

    const { data, error } = await supabase
      .from('equipes')
      .insert([payloadEquipe])
      .select('id_equipe, id_evento, nome, status, km_total')
      .single();
    if (error) throw error;

    console.log('[AUDIT CADASTRO EQUIPE] resultado insert:', data);
    console.log('[AUDIT INSERT RESULT]', data);

    const idEquipeInserida = data.id_equipe;

    const { data: verificacao, error: erroVerificacao } = await supabase
      .from('equipes')
      .select('*')
      .eq('id_equipe', idEquipeInserida);

    if (erroVerificacao) {
      console.log('[AUDIT POS INSERT] erro:', erroVerificacao.message);
    } else {
      console.log('[AUDIT POS INSERT]', verificacao);
    }

    const { count: countAposInsert, error: erroCountAposInsert } = await supabase
      .from('equipes')
      .select('*', {
        count: 'exact',
        head: true
      });

    if (erroCountAposInsert) {
      console.log('[AUDIT COUNT APOS INSERT] erro:', erroCountAposInsert.message);
    } else {
      console.log('[AUDIT COUNT APOS INSERT]', countAposInsert);
    }

    const { data: equipesAposInsert, error: erroConsultaAposInsert } = await supabase
      .from('equipes')
      .select('*')
      .order('id_equipe', { ascending: false });

    if (erroConsultaAposInsert) {
      console.log('[AUDIT CADASTRO EQUIPE] erro ao consultar equipes após insert:', erroConsultaAposInsert.message);
    } else {
      console.log('[AUDIT CADASTRO EQUIPE] quantidade de equipes no banco:', equipesAposInsert?.length || 0);
      console.log('[AUDIT CADASTRO EQUIPE] SELECT * FROM equipes ORDER BY id_equipe DESC:', equipesAposInsert);
    }

    // Fire-and-forget: não bloqueia a resposta ao cliente.
    void registrarHistoricoAdministrativo(req, 'cadastrar_equipe', 'equipes', {
      id_equipe: data.id_equipe,
      nome: data.nome
    }, data.id_equipe);
    return res.status(201).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Cadastro Rápido de Atletas
app.post('/cadastro-rapido/atleta', autorizarPapeis(ROLES.OPERADOR, ROLES.COORDENADOR, ROLES.ADMINISTRADOR_GERAL), async (req: Request, res: Response): Promise<Response> => {
  try {
    const { nome, id_equipe } = req.body;
    if (!nome || !String(nome).trim()) {
      return res.status(400).json({ error: 'Nome do atleta é obrigatório.' });
    }
    if (!id_equipe) {
      return res.status(400).json({ error: 'Equipe é obrigatória.' });
    }
    const idEquipeNum = Number(id_equipe);
    if (!Number.isFinite(idEquipeNum) || idEquipeNum <= 0) {
      return res.status(400).json({ error: 'Equipe inválida.' });
    }
    const { data, error } = await supabase
      .from('atletas')
      .insert([{ nome: String(nome).trim(), id_equipe: idEquipeNum }])
      .select('id_atleta, nome, id_equipe')
      .single();
    if (error) throw error;
    // Fire-and-forget: não bloqueia a resposta ao cliente.
    void registrarHistoricoAdministrativo(req, 'cadastrar_atleta', 'atletas', {
      id_atleta: data.id_atleta,
      nome: data.nome,
      id_equipe: data.id_equipe
    }, data.id_atleta);
    return res.status(201).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Cadastro Rápido de Admins Principais
app.post('/cadastro-rapido/admin', autorizarPapeis(ROLES.ADMINISTRADOR_GERAL), bloquearOperacaoSeProvaFinalizada, async (req: Request, res: Response): Promise<Response> => {
  try {
    const { nome, login, senha } = req.body;
    if (!nome || !login || !senha) {
      return res.status(400).json({ error: 'Nome, login e senha são obrigatórios.' });
    }
    const admin = await coordenadorRepo.criarAdmin(nome, login, senha);
    await registrarHistoricoAdministrativo(req, 'cadastrar_admin', 'admin_principal', {
      id_admin: admin.id_admin,
      nome: admin.nome,
      login: admin.login
    }, admin.id_admin);
    return res.status(201).json(admin);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Inserir um novo registro em uma tabela
app.post('/api/:tabela', autorizarPapeis(ROLES.ADMINISTRADOR_GERAL), bloquearOperacaoSeProvaFinalizada, async (req: Request, res: Response): Promise<Response> => {
  try {
    // Le o nome da tabela que recebera o novo registro.
    const tabela = obterTabelaPermitida(req.params.tabela as string);

    if (!tabela) {
      return res.status(403).json({ error: 'Tabela não permitida para escrita pela API.' });
    }

    // Pega o corpo enviado na requisicao.
    const registro = filtrarRegistroPermitido(tabela, req.body);

    if (Object.keys(registro).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo permitido foi enviado.' });
    }
    
    // Insere o registro no Supabase e devolve o item criado.
    const { data, error } = await supabase.from(tabela).insert([registro]).select();

    // Se o Supabase retornar erro, manda para o catch.
    if (error) throw error;
    await registrarHistoricoAdministrativo(req, 'inserir_registro_api', tabela, {
      registros: data
    }, Array.isArray(data) && data[0]?.id ? data[0].id : null);
    // Responde com status 201, indicando criacao bem-sucedida.
    return res.status(201).json(data);
  } catch (error: any) {
    // Responde com status 500 e a mensagem do erro.
    return res.status(500).json({ error: error.message });
  }
});

// Usa a porta do ambiente ou 3000 quando nenhuma porta for definida.
const PORT = process.env.PORT || 3000;

// ============ NOVOS ENDPOINTS - REGRAS 2 A 10 ============

/**
 * Regra 2 & 4: Atualiza o Km acumulado de um checkpoint específico.
 * PUT /atualizar-checkpoint-km
 * Body: { idCheckpoint, novoKm }
 */
app.put('/atualizar-checkpoint-km', autorizarPapeis(ROLES.OPERADOR, ROLES.COORDENADOR, ROLES.ADMINISTRADOR_GERAL), async (req: Request, res: Response): Promise<Response> => {
  try {
    const { idCheckpoint, novoKm } = req.body;
    
    if (!idCheckpoint || !Number.isFinite(Number(novoKm)) || Number(novoKm) <= 0) {
      return res.status(400).json({ error: 'idCheckpoint e novoKm (positivo) são obrigatórios.' });
    }

    const checkpoint = await checkpointRepo.updateKm(Number(idCheckpoint), Number(novoKm));
    
    // Registra no histórico
    await registrarHistoricoOperador(
      req.body.operador || 'Sistema',
      'atualizar_checkpoint',
      'checkpoint',
      { id_checkpoint: idCheckpoint, novo_km: novoKm },
      idCheckpoint,
      null
    );

    return res.status(200).json({
      ok: true,
      checkpoint: {
        id: checkpoint.id_checkpoint,
        km_acumulado: checkpoint.km_acumulado
      }
    });
  } catch (error: any) {
    console.error('[PUT /atualizar-checkpoint-km] Erro:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Regra 3: Obtém a soma de KMs acumulados durante um turno
 * GET /somar-kms-turno?idTurno=123
 */
app.get('/somar-kms-turno', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { idTurno } = req.query;
    
    if (!idTurno || !Number.isFinite(Number(idTurno))) {
      return res.status(400).json({ error: 'idTurno é obrigatório e deve ser um número.' });
    }

    const totalKms = await checkpointRepo.sumKmsPorEquipeDuranteTurno(Number(idTurno));
    
    return res.status(200).json({
      ok: true,
      idTurno: Number(idTurno),
      totalKmsAcumulados: totalKms
    });
  } catch (error: any) {
    console.error('[GET /somar-kms-turno] Erro:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Regra 5: Obtém histórico de checkpoints de um atleta durante um turno
 * GET /historico-checkpoints-atleta?idAtleta=123&idTurno=456
 */
app.get('/historico-checkpoints-atleta', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { idAtleta, idTurno } = req.query;
    
    if (!idAtleta || !idTurno || !Number.isFinite(Number(idAtleta)) || !Number.isFinite(Number(idTurno))) {
      return res.status(400).json({ error: 'idAtleta e idTurno são obrigatórios e devem ser números.' });
    }

    const checkpoints = await checkpointRepo.findByAtletaDuranteTurno(Number(idAtleta), Number(idTurno));
    
    return res.status(200).json({
      ok: true,
      idAtleta: Number(idAtleta),
      idTurno: Number(idTurno),
      checkpoints: checkpoints.map(cp => ({
        id: cp.id_checkpoint,
        kmAcumulado: cp.km_acumulado,
        paceMedio: cp.pace_medio,
        velocidadeMedia: cp.velocidade_media,
        registradoEm: cp.registrado_em
      }))
    });
  } catch (error: any) {
    console.error('[GET /historico-checkpoints-atleta] Erro:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Regra 7: Conta turnos ativos (status = 'em_andamento') em uma sessão
 * GET /contar-turnos-ativos?idSessao=123
 */
app.get('/contar-turnos-ativos', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { idSessao } = req.query;
    
    if (!idSessao || !Number.isFinite(Number(idSessao))) {
      return res.status(400).json({ error: 'idSessao é obrigatório e deve ser um número.' });
    }

    const countTurnos = await turnoRepo.contarTurnosAtivos(Number(idSessao));
    
    return res.status(200).json({
      ok: true,
      idSessao: Number(idSessao),
      turnosAtivos: countTurnos
    });
  } catch (error: any) {
    console.error('[GET /contar-turnos-ativos] Erro:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Regra 8: Conta total de checkpoints registrados em uma sessão operacional
 * GET /contar-checkpoints?idSessao=123
 */
app.get('/contar-checkpoints', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { idSessao } = req.query;
    
    if (!idSessao || !Number.isFinite(Number(idSessao))) {
      return res.status(400).json({ error: 'idSessao é obrigatório e deve ser um número.' });
    }

    const countCheckpoints = await checkpointRepo.countBySessao(Number(idSessao));
    
    return res.status(200).json({
      ok: true,
      idSessao: Number(idSessao),
      totalCheckpoints: countCheckpoints
    });
  } catch (error: any) {
    console.error('[GET /contar-checkpoints] Erro:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Regra 9: Validação de pace e geração de alertas
 * POST /validar-pace-alerta
 * Body: { idCheckpoint, paceMedio, coordenadorId }
 * Retorna alerta se pace < 3 ou > 10
 */
app.post('/validar-pace-alerta', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { idCheckpoint, paceMedio, coordenadorId } = req.body;
    
    if (!idCheckpoint || !Number.isFinite(Number(paceMedio))) {
      return res.status(400).json({ error: 'idCheckpoint e paceMedio são obrigatórios.' });
    }

    const pace = Number(paceMedio);
    let alerta = null;
    let statusAlerta = 'OK';

    // Validação Regra 9: Alerta se pace < 3 ou > 10
    if (pace < 3 || pace > 10) {
      statusAlerta = 'ALERTA';
      alerta = {
        tipo: pace < 3 ? 'PACE_MUITO_RAPIDO' : 'PACE_MUITO_LENTO',
        mensagem: pace < 3 
          ? `⚠️ ALERTA: Pace muito rápido (${pace.toFixed(2)} min/km)! Verificar atleta.`
          : `⚠️ ALERTA: Pace muito lento (${pace.toFixed(2)} min/km)! Verificar condições da esteira.`,
        coordenadorId: coordenadorId || 'coordenador_padrao',
        timestampAlerta: new Date().toISOString(),
        idCheckpoint
      };

      // Registra o alerta no histórico (fire-and-forget)
      void registrarHistoricoOperador(
        'Sistema-AlertaPace',
        'gerar_alerta_pace',
        'checkpoint',
        alerta,
        idCheckpoint,
        null
      );
    }

    return res.status(200).json({
      ok: true,
      idCheckpoint,
      pace,
      statusAlerta,
      alerta
    });
  } catch (error: any) {
    console.error('[POST /validar-pace-alerta] Erro:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// ============ FIM DOS NOVOS ENDPOINTS ============

// Inicia o servidor e mostra no terminal a porta usada.
app.listen(PORT, () => {
  console.log(`Servidor TypeScript ativo na porta ${PORT}`);
});
