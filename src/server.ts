// Carrega as variaveis do arquivo .env antes do servidor iniciar.
import 'dotenv/config';
// Importa o Express, que cria as rotas HTTP do projeto.
import express from 'express';
// Importa os tipos do Express para deixar req/res tipados no TypeScript.
import type { Request, Response } from 'express';
// Importa o path para montar caminhos de pasta sem depender do sistema operacional.
import path from 'path';
// Importa o client centralizado do Supabase para ler e escrever dados no banco.
import { supabase } from './database/supabase';

// Importa o EJS para renderizar o arquivo HTML que ainda usa variaveis dinamicas.
const ejs = require('ejs');

// Cria a aplicacao Express que vai receber as requisicoes do navegador.
const app = express();

// Permite receber dados em JSON e tambem dados enviados por formularios HTML.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configura arquivos .html para serem renderizados pelo EJS e define onde ficam os arquivos visuais.
app.engine('html', ejs.renderFile);
app.set('view engine', 'html');
app.set('views', path.join(process.cwd(), 'src', 'View'));

// Libera arquivos estaticos, como o style.css, pela rota /static.
app.use('/static', express.static(path.join(process.cwd(), 'src', 'View')));

// Serve a documentacao navegavel da WebAPI solicitada na secao 3.7 do WAD.
app.get('/docs/webapi', (req: Request, res: Response): void => {
  res.sendFile(path.join(process.cwd(), 'documentos', 'webapi.html'));
});

// Lista temporaria usada para montar a tela de selecao de operador.
const operadores = [
  { nome: 'Ana Martins', iniciais: 'AM' },
  { nome: 'João Lima', iniciais: 'JL' },
  { nome: 'Marina Souza', iniciais: 'MS' },
  { nome: 'Pedro Alves', iniciais: 'PA' }
];

// Lista temporaria usada para montar a tela de selecao de equipe.
const equipes = [
  { nome: 'Equipe Vermelha', iniciais: 'EV', atletas: 16 },
  { nome: 'Equipe Azul', iniciais: 'EA', atletas: 16 }
];

// Dados resumidos usados no painel da coordenacao.
const equipesPainel = [
  { nome: 'Equipe Vermelha', km: '124,480 km', atleta: 'Rafael Luz em turno', atletas: 16 },
  { nome: 'Equipe Azul', km: '121,930 km', atleta: 'Beatriz em turno', atletas: 16 }
];

// Dados consolidados usados na etapa de fechamento.
const rankingFechamento = [
  { posicao: 1, nome: 'Equipe Vermelha', km: '348,920 km', checkpoints: 412, correcoes: 3 },
  { posicao: 2, nome: 'Equipe Azul', km: '344,180 km', checkpoints: 407, correcoes: 1 }
];

// Resultado final usado na tela oficial e na TV de resultado.
const resultadoOficial = {
  vencedor: rankingFechamento[0],
  segundoLugar: rankingFechamento[1],
  totalCheckpoints: 819,
  correcoesAuditadas: 4,
  validadoPor: 'Camila Rocha',
  diferenca: '+ 4,740 km'
};

// Checkpoints temporarios exibidos nas telas de auditoria por equipe.
const checkpointsPorEquipe: Record<string, { horario: string, atleta: string, km: string, operador: string, selecionado?: boolean }[]> = {
  'Equipe Vermelha': [
    { horario: '15:24:48', atleta: 'Rafael Luz', km: '12,760 km', operador: 'Ana Martins' },
    { horario: '15:04:51', atleta: 'Bia Torres', km: '12,480 km', operador: 'Ana Martins', selecionado: true },
    { horario: '14:22:31', atleta: 'Clara Nunes', km: '11,940 km', operador: 'João Lima' },
    { horario: '13:58:06', atleta: 'Enzo Reis', km: '11,600 km', operador: 'João Lima' },
    { horario: '13:21:44', atleta: 'Marina Costa', km: '11,240 km', operador: 'Ana Martins' },
    { horario: '12:48:19', atleta: 'Diego Ramos', km: '10,980 km', operador: 'Pedro Alves' },
    { horario: '12:12:57', atleta: 'Elisa Rocha', km: '10,610 km', operador: 'Marina Souza' },
    { horario: '11:37:22', atleta: 'Felipe Dias', km: '10,220 km', operador: 'João Lima' }
  ],
  'Equipe Azul': [
    { horario: '15:18:20', atleta: 'Beatriz', km: '12,240 km', operador: 'Marina Souza', selecionado: true },
    { horario: '14:50:15', atleta: 'Lucas Lima', km: '11,980 km', operador: 'Pedro Alves' },
    { horario: '14:12:03', atleta: 'Sofia Cardoso', km: '11,620 km', operador: 'Marina Souza' },
    { horario: '13:44:42', atleta: 'Mateus Campos', km: '11,300 km', operador: 'Pedro Alves' },
    { horario: '13:08:34', atleta: 'Alice Martins', km: '10,940 km', operador: 'Ana Martins' },
    { horario: '12:32:08', atleta: 'Bruno Faria', km: '10,570 km', operador: 'João Lima' },
    { horario: '11:59:46', atleta: 'Camila Teixeira', km: '10,190 km', operador: 'Marina Souza' },
    { horario: '11:21:30', atleta: 'Daniel Souza', km: '9,880 km', operador: 'Pedro Alves' }
  ]
};

// Lista temporaria usada no filtro de auditoria por atleta.
const atletasFiltroPorEquipe: Record<string, { nome: string, iniciais: string, status: string, selecionado?: boolean }[]> = {
  'Equipe Vermelha': [
    { nome: 'Rafael Luz', iniciais: 'RL', status: 'Turno ativo · 3 checkpoints', selecionado: true },
    { nome: 'Bia Torres', iniciais: 'BT', status: 'Último turno há 34 min' },
    { nome: 'Clara Nunes', iniciais: 'CN', status: 'Último turno há 1h12' },
    { nome: 'Enzo Reis', iniciais: 'ER', status: 'Sem turno registrado' },
    { nome: 'Marina Costa', iniciais: 'MC', status: 'Último turno há 1h48' },
    { nome: 'Diego Ramos', iniciais: 'DR', status: 'Último turno há 2h10' },
    { nome: 'Elisa Rocha', iniciais: 'ER', status: 'Disponível para investigação' },
    { nome: 'Felipe Dias', iniciais: 'FD', status: 'Disponível para investigação' },
    { nome: 'Gabriela Reis', iniciais: 'GR', status: 'Disponível para investigação' },
    { nome: 'Henrique Melo', iniciais: 'HM', status: 'Disponível para investigação' },
    { nome: 'Isabela Costa', iniciais: 'IC', status: 'Disponível para investigação' },
    { nome: 'Júlia Prado', iniciais: 'JP', status: 'Disponível para investigação' }
  ],
  'Equipe Azul': [
    { nome: 'Beatriz', iniciais: 'BZ', status: 'Turno ativo · 4 checkpoints', selecionado: true },
    { nome: 'Lucas Lima', iniciais: 'LL', status: 'Último turno há 28 min' },
    { nome: 'Sofia Cardoso', iniciais: 'SC', status: 'Último turno há 1h04' },
    { nome: 'Mateus Campos', iniciais: 'MC', status: 'Sem turno registrado' },
    { nome: 'Alice Martins', iniciais: 'AM', status: 'Último turno há 1h35' },
    { nome: 'Bruno Faria', iniciais: 'BF', status: 'Último turno há 2h02' },
    { nome: 'Camila Teixeira', iniciais: 'CT', status: 'Disponível para investigação' },
    { nome: 'Daniel Souza', iniciais: 'DS', status: 'Disponível para investigação' },
    { nome: 'Eduarda Pires', iniciais: 'EP', status: 'Disponível para investigação' },
    { nome: 'Fernando Brito', iniciais: 'FB', status: 'Disponível para investigação' },
    { nome: 'Giovana Freitas', iniciais: 'GF', status: 'Disponível para investigação' },
    { nome: 'Hugo Moreira', iniciais: 'HM', status: 'Disponível para investigação' }
  ]
};

// Lista temporaria de atletas por equipe para montar a tela de selecao do proximo turno.
const atletasPorEquipe: Record<string, { nome: string, iniciais: string, status: string }[]> = {
  'Equipe Vermelha': [
    { nome: 'Rafael Luz', iniciais: 'RL', status: 'Turno anterior há 1h12' },
    { nome: 'Bia Torres', iniciais: 'BT', status: 'Disponível para revezamento' },
    { nome: 'Clara Nunes', iniciais: 'CN', status: 'Disponível para revezamento' },
    { nome: 'Diego Ramos', iniciais: 'DR', status: 'Disponível para revezamento' },
    { nome: 'Elisa Rocha', iniciais: 'ER', status: 'Disponível para revezamento' },
    { nome: 'Felipe Dias', iniciais: 'FD', status: 'Disponível para revezamento' },
    { nome: 'Gabriela Reis', iniciais: 'GR', status: 'Disponível para revezamento' },
    { nome: 'Henrique Melo', iniciais: 'HM', status: 'Disponível para revezamento' },
    { nome: 'Isabela Costa', iniciais: 'IC', status: 'Disponível para revezamento' },
    { nome: 'Júlia Prado', iniciais: 'JP', status: 'Disponível para revezamento' },
    { nome: 'Lucas Lima', iniciais: 'LL', status: 'Disponível para revezamento' },
    { nome: 'Marcos Alves', iniciais: 'MA', status: 'Disponível para revezamento' },
    { nome: 'Nina Barros', iniciais: 'NB', status: 'Disponível para revezamento' },
    { nome: 'Otávio Silva', iniciais: 'OS', status: 'Disponível para revezamento' },
    { nome: 'Paula Gomes', iniciais: 'PG', status: 'Disponível para revezamento' },
    { nome: 'Victor Lopes', iniciais: 'VL', status: 'Disponível para revezamento' }
  ],
  'Equipe Azul': [
    { nome: 'Alice Martins', iniciais: 'AM', status: 'Disponível para revezamento' },
    { nome: 'Bruno Faria', iniciais: 'BF', status: 'Disponível para revezamento' },
    { nome: 'Camila Teixeira', iniciais: 'CT', status: 'Disponível para revezamento' },
    { nome: 'Daniel Souza', iniciais: 'DS', status: 'Turno anterior há 52min' },
    { nome: 'Eduarda Pires', iniciais: 'EP', status: 'Disponível para revezamento' },
    { nome: 'Fernando Brito', iniciais: 'FB', status: 'Disponível para revezamento' },
    { nome: 'Giovana Freitas', iniciais: 'GF', status: 'Disponível para revezamento' },
    { nome: 'Hugo Moreira', iniciais: 'HM', status: 'Disponível para revezamento' },
    { nome: 'Igor Neves', iniciais: 'IN', status: 'Disponível para revezamento' },
    { nome: 'Laura Mendes', iniciais: 'LM', status: 'Disponível para revezamento' },
    { nome: 'Mateus Campos', iniciais: 'MC', status: 'Disponível para revezamento' },
    { nome: 'Natália Ribeiro', iniciais: 'NR', status: 'Disponível para revezamento' },
    { nome: 'Renan Duarte', iniciais: 'RD', status: 'Disponível para revezamento' },
    { nome: 'Sofia Cardoso', iniciais: 'SC', status: 'Disponível para revezamento' },
    { nome: 'Thiago Matos', iniciais: 'TM', status: 'Disponível para revezamento' },
    { nome: 'Yasmin Araújo', iniciais: 'YA', status: 'Disponível para revezamento' }
  ]
};

// Lista de esteiras e seus estados para a tela de inicio de turno.
const esteiras = [
  { nome: 'Esteira 01', status: 'Livre para iniciar turno', tipo: 'livre' },
  { nome: 'Esteira 02', status: 'Em manutenção', tipo: 'manutencao' }
];

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
      { nome: 'COORDENADOR(A)', valor: 'coordenador' }
    ]
  });
});

// Recebe a funcao escolhida na tela inicial e direciona para o proximo passo do fluxo.
app.post('/selecionar-funcao', (req: Request, res: Response): void => {
  // Pega do formulario qual funcao foi escolhida.
  const { funcao } = req.body;

  // Se escolheu operador, renderiza a tela de operadores.
  if (funcao === 'operador') {
    res.render('index', {
      // Mostra a segunda etapa do fluxo usando o mesmo index.html.
      tela: 'operador',
      titulo: 'SELEÇÃO DE OPERADOR(A)',
      operadores
    });
    return;
  }

  // Se escolheu coordenador, renderiza a tela de login da coordenacao.
  if (funcao === 'coordenador' || funcao === 'organizador') {
    res.render('index', {
      // Mostra a tela de autenticacao restrita do coordenador.
      tela: 'loginCoordenador',
      titulo: 'ACESSO RESTRITO'
    });
    return;
  }

  // Qualquer valor inesperado volta para a tela inicial.
  res.redirect('/');
});

app.post('/login-coordenador', (req: Request, res: Response): void => {
  // Le nome e senha enviados pela tela de login.
  const { coordenador, senha } = req.body;

  // Se os dois campos vieram preenchidos, libera o painel.
  if (coordenador && senha) {
    res.render('index', {
      // Depois da autenticacao visual, abre o painel geral da prova.
      tela: 'painelCoordenador',
      titulo: 'PAINEL DA PROVA',
      coordenadorSelecionado: coordenador,
      equipesPainel
    });
    return;
  }

  res.render('index', {
    // Login visual temporario ate a tela administrativa ser criada.
    tela: 'loginCoordenador',
    titulo: 'ACESSO RESTRITO',
    loginMensagem: coordenador && senha
      ? `Acesso recebido para ${coordenador}.`
      : 'Preencha o nome do coordenador(a) e a senha para entrar.'
  });
});

app.post('/voltar-login-coordenador', (req: Request, res: Response): void => {
  const { coordenador } = req.body;

  res.render('index', {
    // Retorna do painel para a autenticacao do coordenador(a).
    tela: 'loginCoordenador',
    titulo: 'ACESSO RESTRITO',
    coordenadorSelecionado: coordenador
  });
});

app.post('/voltar-painel-coordenador', (req: Request, res: Response): void => {
  const { coordenador } = req.body;

  res.render('index', {
    // Retorna dos detalhes para a visao geral da coordenacao.
    tela: 'painelCoordenador',
    titulo: 'PAINEL DA PROVA',
    coordenadorSelecionado: coordenador,
    equipesPainel
  });
});

app.post('/modo-tv', (req: Request, res: Response): void => {
  const { coordenador } = req.body;

  res.render('index', {
    // Tela de controle do placar publico, usada no tablet da coordenacao.
    tela: 'modoTv',
    titulo: 'MODO TV',
    coordenadorSelecionado: coordenador,
    equipesPainel
  });
});

app.post('/fechamento', (req: Request, res: Response): void => {
  const { coordenador } = req.body;

  res.render('index', {
    // Tela de revisao final antes de encerrar a prova.
    tela: 'fechamento',
    titulo: 'Fechamento',
    coordenadorSelecionado: coordenador,
    rankingFechamento
  });
});

app.post('/finalizar-prova', (req: Request, res: Response): void => {
  const { coordenador } = req.body;

  res.render('index', {
    // Confirmacao obrigatoria antes de bloquear novos registros e oficializar o resultado.
    tela: 'confirmacaoFechamento',
    titulo: 'Confirmar encerramento',
    coordenadorSelecionado: coordenador,
    resultadoOficial,
    rankingFechamento
  });
});

app.post('/confirmar-finalizacao', (req: Request, res: Response): void => {
  const { coordenador, confirmaBloqueio } = req.body;

  if (confirmaBloqueio !== 'sim') {
    res.render('index', {
      // Mantem a confirmacao bloqueada se o responsavel ainda nao concordou.
      tela: 'confirmacaoFechamento',
      titulo: 'Confirmar encerramento',
      coordenadorSelecionado: coordenador,
      resultadoOficial,
      rankingFechamento,
      confirmacaoMensagem: 'Marque a confirmação para continuar.'
    });
    return;
  }

  res.render('index', {
    // Resultado oficial apos a confirmacao do fechamento da prova.
    tela: 'resultadoOficial',
    titulo: 'Resultado oficial',
    coordenadorSelecionado: coordenador,
    resultadoOficial,
    rankingFechamento
  });
});

app.post('/publicar-resultado', (req: Request, res: Response): void => {
  const { coordenador } = req.body;

  res.render('index', {
    // Confirmacao explicita antes de mostrar o resultado final no placar publico.
    tela: 'publicarResultado',
    titulo: 'Publicar resultado',
    coordenadorSelecionado: coordenador,
    resultadoOficial,
    rankingFechamento
  });
});

app.post('/confirmar-publicacao', (req: Request, res: Response): void => {
  res.render('index', {
    // Tela publica final, liberada apos a confirmacao da coordenacao.
    tela: 'tvResultado',
    titulo: 'RESULTADO OFICIAL',
    resultadoOficial,
    rankingFechamento
  });
});

app.post('/voltar-fechamento', (req: Request, res: Response): void => {
  const { coordenador } = req.body;

  res.render('index', {
    // Volta do resultado oficial para a revisao de fechamento.
    tela: 'fechamento',
    titulo: 'Fechamento',
    coordenadorSelecionado: coordenador,
    rankingFechamento
  });
});

app.post('/voltar-resultado-oficial', (req: Request, res: Response): void => {
  const { coordenador } = req.body;

  res.render('index', {
    // Retorna da publicacao para o resultado oficial privado.
    tela: 'resultadoOficial',
    titulo: 'Resultado oficial',
    coordenadorSelecionado: coordenador,
    resultadoOficial,
    rankingFechamento
  });
});

app.get('/tv', (req: Request, res: Response): void => {
  res.render('index', {
    // Tela publica somente leitura, pensada para abrir na TV ou projetor.
    tela: 'tvPublica',
    titulo: 'PLACAR AO VIVO',
    equipesPainel
  });
});

app.get('/tv-resultado', (req: Request, res: Response): void => {
  res.render('index', {
    // Tela publica final, pensada para divulgar o resultado oficial na TV.
    tela: 'tvResultado',
    titulo: 'RESULTADO OFICIAL',
    resultadoOficial,
    rankingFechamento
  });
});

app.post('/detalhes-equipe', (req: Request, res: Response): void => {
  // Recebe qual coordenador esta logado e qual equipe foi aberta.
  const { coordenador, equipe } = req.body;
  // Procura os dados da equipe; se nao achar, usa a primeira equipe como fallback.
  const equipePainel = equipesPainel.find((item) => item.nome === equipe) || equipesPainel[0];

  res.render('index', {
    // Abre os registros gerais da equipe para auditoria.
    tela: 'detalheEquipe',
    titulo: equipePainel.nome,
    coordenadorSelecionado: coordenador,
    equipePainel,
    checkpoints: checkpointsPorEquipe[equipePainel.nome] || []
  });
});

app.post('/filtro-atletas-equipe', (req: Request, res: Response): void => {
  // Recebe a equipe e, opcionalmente, o atleta selecionado no filtro.
  const { coordenador, equipe, atleta } = req.body;
  // Recupera o resumo da equipe escolhida.
  const equipePainel = equipesPainel.find((item) => item.nome === equipe) || equipesPainel[0];
  // Busca a lista de atletas dessa equipe.
  const atletas = atletasFiltroPorEquipe[equipePainel.nome] || [];
  // Mantem o atleta clicado ou usa o atleta marcado como padrao.
  const atletaSelecionado = atleta || atletas.find((item) => item.selecionado)?.nome;

  res.render('index', {
    // Mostra o filtro por atleta dentro dos detalhes da equipe.
    tela: 'filtroAtletasEquipe',
    titulo: 'ATLETAS DA EQUIPE',
    coordenadorSelecionado: coordenador,
    equipePainel,
    atletasFiltro: atletas,
    atletaSelecionado
  });
});

// Mostra diretamente a selecao de operadores caso a rota seja acessada pela URL.
app.get('/operador', (req: Request, res: Response): void => {
  res.render('index', {
    // Permite acessar a selecao de operadores diretamente pela URL /operador.
    tela: 'operador',
    titulo: 'SELEÇÃO DE OPERADOR(A)',
    operadores
  });
});

// Recebe o operador escolhido e mostra uma confirmacao simples na mesma tela.
app.post('/selecionar-operador', (req: Request, res: Response): void => {
  const { operador } = req.body;

  res.render('index', {
    // Mantem a tela de operadores e destaca quem foi selecionado.
    tela: 'operador',
    titulo: 'SELEÇÃO DE OPERADOR(A)',
    operadores,
    operadorSelecionado: operador
  });
});

app.post('/continuar-operador', (req: Request, res: Response): void => {
  const { operador } = req.body;

  res.render('index', {
    // Mostra a etapa seguinte, mantendo o operador escolhido visivel no topo.
    tela: 'equipe',
    titulo: 'SELEÇÃO DE EQUIPE',
    operadorSelecionado: operador,
    equipes
  });
});

app.post('/voltar-operador', (req: Request, res: Response): void => {
  const { operador } = req.body;

  res.render('index', {
    // Volta da selecao de equipe para a etapa anterior, mantendo o operador selecionado.
    tela: 'operador',
    titulo: 'SELEÇÃO DE OPERADOR(A)',
    operadores,
    operadorSelecionado: operador
  });
});

app.post('/selecionar-equipe', (req: Request, res: Response): void => {
  const { operador, equipe } = req.body;

  res.render('index', {
    // Mantem a tela de equipes e destaca a equipe escolhida futuramente.
    tela: 'equipe',
    titulo: 'SELEÇÃO DE EQUIPE',
    operadorSelecionado: operador,
    equipeSelecionada: equipe,
    equipes
  });
});

app.post('/continuar-equipe', (req: Request, res: Response): void => {
  const { operador, equipe } = req.body;

  res.render('index', {
    // Mostra todos os atletas da equipe selecionada e o status das esteiras.
    tela: 'atleta',
    titulo: equipe,
    operadorSelecionado: operador,
    equipeSelecionada: equipe,
    atletas: atletasPorEquipe[equipe] || [],
    esteiras
  });
});

app.post('/voltar-equipe', (req: Request, res: Response): void => {
  const { operador, equipe } = req.body;

  res.render('index', {
    // Volta da selecao de atleta para a tela de equipe, mantendo a equipe marcada.
    tela: 'equipe',
    titulo: 'SELEÇÃO DE EQUIPE',
    operadorSelecionado: operador,
    equipeSelecionada: equipe,
    equipes
  });
});

app.post('/selecionar-atleta', (req: Request, res: Response): void => {
  // Recebe o atleta clicado e o ultimo atleta que correu.
  const { operador, equipe, atleta, ultimoAtleta } = req.body;

  // Bloqueia a regra de negocio: o mesmo atleta nao pode correr dois turnos seguidos.
  if (ultimoAtleta && atleta === ultimoAtleta) {
    res.render('index', {
      // Impede o mesmo atleta de correr dois turnos seguidos.
      tela: 'atleta',
      titulo: equipe,
      operadorSelecionado: operador,
      equipeSelecionada: equipe,
      ultimoAtleta,
      atletas: atletasPorEquipe[equipe] || [],
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
    atletas: atletasPorEquipe[equipe] || [],
    esteiras
  });
});

app.post('/continuar-atleta', (req: Request, res: Response): void => {
  // Recebe os dados necessarios para seguir da selecao de atleta para a esteira.
  const { operador, equipe, atleta, ultimoAtleta } = req.body;

  // Repete a validacao para evitar que alguem avance manualmente pelo HTML.
  if (ultimoAtleta && atleta === ultimoAtleta) {
    res.render('index', {
      // Segunda validacao para evitar avanço manual com atleta bloqueado.
      tela: 'atleta',
      titulo: equipe,
      operadorSelecionado: operador,
      equipeSelecionada: equipe,
      ultimoAtleta,
      atletas: atletasPorEquipe[equipe] || [],
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

app.post('/selecionar-esteira', (req: Request, res: Response): void => {
  const { operador, equipe, atleta, esteira } = req.body;

  res.render('index', {
    // Mantem a tela de esteiras e destaca a esteira escolhida.
    tela: 'esteira',
    titulo: 'INICIAR TURNO',
    operadorSelecionado: operador,
    equipeSelecionada: equipe,
    atletaSelecionado: atleta,
    esteiraSelecionada: esteira,
    esteiras
  });
});

app.post('/voltar-atleta', (req: Request, res: Response): void => {
  const { operador, equipe, atleta } = req.body;

  res.render('index', {
    // Volta da selecao de esteira para a tela de atletas.
    tela: 'atleta',
    titulo: equipe,
    operadorSelecionado: operador,
    equipeSelecionada: equipe,
    atletaSelecionado: atleta,
    atletas: atletasPorEquipe[equipe] || [],
    esteiras
  });
});

app.post('/iniciar-turno', (req: Request, res: Response): void => {
  const { operador, equipe, atleta, esteira } = req.body;
  const inicioTurnoTimestamp = Date.now();

  res.render('index', {
    // Abre a tela de checkpoint com o turno em andamento.
    tela: 'checkpoint',
    titulo: 'TURNO ATIVO',
    operadorSelecionado: operador,
    equipeSelecionada: equipe,
    atletaSelecionado: atleta,
    esteiraSelecionada: esteira,
    inicioTurnoTimestamp
  });
});

app.post('/finalizar-turno', (req: Request, res: Response): void => {
  const { operador, equipe, atleta, esteira, kmFinal, duracaoTurno } = req.body;
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
    inicioTurnoTimestamp
  });
});

app.post('/voltar-checkpoint', (req: Request, res: Response): void => {
  const { operador, equipe, atleta, esteira } = req.body;
  const inicioTurnoTimestamp = obterInicioTurno(req.body.inicioTurnoTimestamp);

  res.render('index', {
    // Retorna para o turno em andamento caso o operador queira revisar os checkpoints.
    tela: 'checkpoint',
    titulo: 'TURNO ATIVO',
    operadorSelecionado: operador,
    equipeSelecionada: equipe,
    atletaSelecionado: atleta,
    esteiraSelecionada: esteira,
    inicioTurnoTimestamp
  });
});

app.post('/confirmar-encerramento', (req: Request, res: Response): void => {
  const { operador, equipe, atleta } = req.body;

  res.render('index', {
    // Encerramento confirmado: volta para a selecao de atletas da mesma equipe.
    tela: 'atleta',
    titulo: equipe,
    operadorSelecionado: operador,
    equipeSelecionada: equipe,
    ultimoAtleta: atleta,
    atletas: atletasPorEquipe[equipe] || [],
    esteiras
  });
});

// Buscar todos os registros de uma tabela
app.get('/api/:tabela', async (req: Request, res: Response): Promise<Response> => {
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

// Inserir um novo registro em uma tabela
app.post('/api/:tabela', async (req: Request, res: Response): Promise<Response> => {
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
