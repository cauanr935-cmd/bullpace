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

const operadorRepo = new OperadorRepository();
const equipeRepo = new EquipeRepository();
const atletaRepo = new AtletaRepository();
const esteiraRepo = new EsteiraRepository();
const coordenadorRepo = new CoordenadorRepository();
const checkpointRepo = new CheckpointRepository();
const turnoRepo = new TurnoRepository();
const eventoRepo = new EventoRepository();
const sessaoRepo = new SessaoRepository();

const ejs = require('ejs');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'View'));

// Serve arquivos estaticos (CSS, imagens) a partir da pasta View sob o prefixo /static.
app.use('/static', express.static(path.join(__dirname, 'View')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Mantido em memória apenas o estado da prova (será integrado à tabela eventos na Fase 5)
const estadoProva: {
  status: StatusProva;
  atualizadoPor?: string;
  atualizadoEm: Date;
} = {
  status: 'em_andamento',
  atualizadoEm: new Date()
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
  const equipes = [];
  for (const eq of listaEquipes) {
    const atletasList = await atletaRepo.listarPorEquipe(eq.id_equipe);
    equipes.push({
      nome: eq.nome,
      iniciais: obterIniciais(eq.nome),
      atletas: atletasList.length
    });
  }
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
  const { data: turnosAtivos } = await supabase
    .from('turnos')
    .select('id_turno, id_atleta, atletas (nome, id_equipe)')
    .eq('status', 'em_andamento');

  const equipesPainel = [];
  for (const eq of listaEquipes) {
    const active = (turnosAtivos || []).find(t => t.atletas && (t.atletas as any).id_equipe === eq.id_equipe);
    const atletaStr = active ? `${(active.atletas as any).nome} em turno` : 'Nenhum atleta em turno';
    const numAtletas = (await atletaRepo.listarPorEquipe(eq.id_equipe)).length;
    equipesPainel.push({
      nome: eq.nome,
      km: `${eq.km_total.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} km`,
      atleta: atletaStr,
      atletas: numAtletas
    });
  }
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
    console.error("Error fetching checkpoints:", error);
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

      const dataReg = new Date(r.registrado_em);
      const horario = dataReg.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      return {
        horario,
        atleta: r.atleta_nome,
        km: `${Number(r.km_acumulado).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} km`,
        operador: operadorNome
      };
    });
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

const obterTabelaPermitida = (tabela: string): string | null => {
  return tabelasPermitidas.has(tabela) ? tabela : null;
};

const filtrarRegistroPermitido = (tabela: string, registro: Record<string, unknown>): Record<string, unknown> => {
  const camposPermitidos = camposPermitidosPorTabela[tabela];
  return Object.fromEntries(
    Object.entries(registro).filter(([campo]) => camposPermitidos.has(campo))
  );
};

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
    res.render('index', {
      tela: 'painelCoordenador',
      titulo: 'PAINEL DA PROVA',
      coordenadorSelecionado: nomeAutenticado,
      equipesPainel,
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

  res.render('index', {
    // Retorna dos detalhes para a visao geral da coordenacao.
    tela: 'painelCoordenador',
    titulo: 'PAINEL DA PROVA',
    coordenadorSelecionado: coordenador,
    equipesPainel,
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
  const equipesPainel = await obterEquipesPainelReal();
  res.render('index', {
    // Tela publica somente leitura, pensada para abrir na TV ou projetor.
    tela: 'tvPublica',
    titulo: 'PLACAR AO VIVO',
    equipesPainel
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

// Registra um checkpoint de km acumulado no Supabase com cálculo de pace.
// Recebe JSON via fetch do front-end: { operador, equipe, atleta, esteira, kmAcumulado, inicioTurnoTimestamp, idTurno }
app.post('/registrar-checkpoint', bloquearOperacaoSeProvaFinalizada, async (req: Request, res: Response): Promise<Response> => {
  try {
    const { operador, equipe, atleta, esteira, kmAcumulado, inicioTurnoTimestamp, idTurno } = req.body;

    // --- Validação numérica do km acumulado ---
    const kmRaw = String(kmAcumulado || '').replace(',', '.');
    const km = parseFloat(kmRaw);

    if (!kmRaw || isNaN(km) || km <= 0) {
      return res.status(400).json({ error: 'km_acumulado deve ser um número positivo.' });
    }

    // Máximo de 3 casas decimais.
    const kmArredondado = Math.round(km * 1000) / 1000;
    if (kmArredondado !== km && kmRaw.includes('.') && kmRaw.split('.')[1].length > 3) {
      return res.status(400).json({ error: 'km_acumulado aceita no máximo 3 casas decimais.' });
    }

    // --- Resolve id_turno ---
    let turnoId = idTurno ? Number(idTurno) : null;

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

    if (!turnoId) {
      return res.status(400).json({ error: 'Turno ativo não encontrado. Inicie o turno antes de registrar checkpoints.' });
    }

    // --- Busca sessão operacional vinculada ao turno ---
    const { data: turnoRow } = await supabase
      .from('turnos')
      .select('id_sessao_operacional, horario_inicio, km_turno')
      .eq('id_turno', turnoId)
      .single();

    if (!turnoRow) {
      return res.status(404).json({ error: `Turno #${turnoId} não encontrado no banco.` });
    }

    const idSessaoOperacional = turnoRow.id_sessao_operacional;

    // --- Busca checkpoint anterior para calcular pace ---
    const checkpointsAnteriores = await checkpointRepo.findByTurno(turnoId);
    const anterior = checkpointsAnteriores.length > 0
      ? checkpointsAnteriores.reduce((a, b) =>
          new Date(a.registrado_em) > new Date(b.registrado_em) ? a : b)
      : null;

    const kmAnterior = anterior ? Number(anterior.km_acumulado) : 0;
    const kmDelta = kmArredondado - kmAnterior;

    if (kmDelta <= 0 && checkpointsAnteriores.length > 0) {
      return res.status(400).json({ error: `km_acumulado (${kmArredondado}) deve ser maior que o checkpoint anterior (${kmAnterior}).` });
    }

    // Calcula tempo decorrido desde o início do turno ou último checkpoint.
    const agora = Date.now();
    const referencia = anterior
      ? new Date(anterior.registrado_em).getTime()
      : (turnoRow.horario_inicio ? new Date(turnoRow.horario_inicio).getTime() : Number(inicioTurnoTimestamp));
    const segundosDecorridos = Math.max(1, (agora - referencia) / 1000);

    // Pace em min/km: tempo (min) dividido por km percorridos neste trecho.
    const paceMinKm = kmDelta > 0 ? (segundosDecorridos / 60) / kmDelta : 0;
    const paceArredondado = Math.round(paceMinKm * 1000) / 1000;

    // Velocidade média em km/h: km/tempo_em_horas.
    const velocidadeMedia = kmDelta > 0 ? kmDelta / (segundosDecorridos / 3600) : 0;
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
    console.error('[/registrar-checkpoint] Erro:', err.message);
    return res.status(500).json({ error: err.message || 'Erro interno ao registrar checkpoint.' });
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

  // Persiste o encerramento do turno no banco de dados.
  if (idTurno) {
    try {
      const kmFinalNum = parseFloat(String(kmFinal || '0').replace(',', '.')) || 0;
      await turnoRepo.updateParaEncerrado(Number(idTurno), kmFinalNum);
    } catch (err: any) {
      console.error('[/confirmar-encerramento] Erro ao fechar turno no banco:', err.message);
    }
  }

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
  estadoProva.status = 'pausada';
  estadoProva.atualizadoPor = req.body.coordenador;
  estadoProva.atualizadoEm = new Date();
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
  estadoProva.status = 'em_andamento';
  estadoProva.atualizadoPor = req.body.coordenador;
  estadoProva.atualizadoEm = new Date();
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

// Cadastro Rápido de Operadores
app.post('/cadastro-rapido/operador', autorizarPapeis(ROLES.OPERADOR, ROLES.COORDENADOR, ROLES.ADMINISTRADOR_GERAL), bloquearOperacaoSeProvaFinalizada, async (req: Request, res: Response): Promise<Response> => {
  try {
    const { nome } = req.body;
    if (!nome) {
      return res.status(400).json({ error: 'Nome do operador é obrigatório.' });
    }
    const operador = await operadorRepo.criar(nome);
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
    return res.status(201).json(coordenador);
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
    // Responde com status 201, indicando criacao bem-sucedida.
    return res.status(201).json(data);
  } catch (error: any) {
    // Responde com status 500 e a mensagem do erro.
    return res.status(500).json({ error: error.message });
  }
});

// Usa a porta do ambiente ou 3000 quando nenhuma porta for definida.
const PORT = process.env.PORT || 3000;
// Inicia o servidor e mostra no terminal a porta usada.
app.listen(PORT, () => {
  console.log(`Servidor TypeScript ativo na porta ${PORT}`);
});
