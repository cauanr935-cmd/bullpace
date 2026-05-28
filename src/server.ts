import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const app = express();

// Permite receber dados em JSON e tambem dados enviados por formularios HTML.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configura o EJS como motor de views e define onde ficam os arquivos visuais.
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'src', 'View'));

// Libera arquivos estaticos, como o style.css, pela rota /static.
app.use('/static', express.static(path.join(process.cwd(), 'src', 'View')));

const supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não foram definidas.');
  process.exit(1);
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Lista temporaria usada para montar a tela de selecao de operador.
const operadores = [
  { nome: 'Ana Martins', iniciais: 'AM' },
  { nome: 'João Lima', iniciais: 'JL' },
  { nome: 'Marina Souza', iniciais: 'MS' },
  { nome: 'Pedro Alves', iniciais: 'PA' }
];

// Lista temporaria usada para montar a tela de selecao de equipe.
const equipes = [
  { nome: 'Equipe 1', iniciais: 'E1', atletas: 16 },
  { nome: 'Equipe 2', iniciais: 'E2', atletas: 16 }
];

// Lista temporaria de atletas por equipe para montar a tela de selecao do proximo turno.
const atletasPorEquipe: Record<string, { nome: string, iniciais: string, status: string }[]> = {
  'Equipe 1': [
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
  'Equipe 2': [
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

const esteiras = [
  { nome: 'Esteira 01', status: 'Livre para iniciar turno', tipo: 'livre' },
  { nome: 'Esteira 02', status: 'Em manutenção', tipo: 'manutencao' }
];

// Renderiza a tela inicial, onde o usuario escolhe se entrara como operador ou organizador.
app.get('/', (req: Request, res: Response): void => {
  res.render('index', {
    // A view usa "tela" para decidir qual bloco HTML mostrar.
    tela: 'funcao',
    titulo: 'SELEÇÃO DE FUNÇÃO',
    funcoes: [
      { nome: 'OPERADOR(A)', valor: 'operador' },
      { nome: 'ORGANIZADOR(A)', valor: 'organizador' }
    ]
  });
});

// Recebe a funcao escolhida na tela inicial e direciona para o proximo passo do fluxo.
app.post('/selecionar-funcao', (req: Request, res: Response): void => {
  const { funcao } = req.body;

  if (funcao === 'operador') {
    res.render('index', {
      // Mostra a segunda etapa do fluxo usando o mesmo index.ejs.
      tela: 'operador',
      titulo: 'SELEÇÃO DE OPERADOR(A)',
      operadores
    });
    return;
  }

  if (funcao === 'organizador') {
    res.render('index', {
      // Mostra a tela de autenticacao restrita do coordenador/organizador.
      tela: 'loginCoordenador',
      titulo: 'ACESSO RESTRITO'
    });
    return;
  }

  res.redirect('/');
});

app.post('/login-coordenador', (req: Request, res: Response): void => {
  const { coordenador, senha } = req.body;

  res.render('index', {
    // Login visual temporario ate a tela administrativa ser criada.
    tela: 'loginCoordenador',
    titulo: 'ACESSO RESTRITO',
    loginMensagem: coordenador && senha
      ? `Acesso recebido para ${coordenador}.`
      : 'Preencha o nome do coordenador(a) e a senha para entrar.'
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
  const { operador, equipe, atleta } = req.body;

  res.render('index', {
    // Mantem a tela de atletas e destaca o atleta escolhido.
    tela: 'atleta',
    titulo: equipe,
    operadorSelecionado: operador,
    equipeSelecionada: equipe,
    atletaSelecionado: atleta,
    atletas: atletasPorEquipe[equipe] || [],
    esteiras
  });
});

app.post('/continuar-atleta', (req: Request, res: Response): void => {
  const { operador, equipe, atleta } = req.body;

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

  res.render('index', {
    // Abre a tela de checkpoint com o turno em andamento.
    tela: 'checkpoint',
    titulo: 'TURNO ATIVO',
    operadorSelecionado: operador,
    equipeSelecionada: equipe,
    atletaSelecionado: atleta,
    esteiraSelecionada: esteira
  });
});

app.post('/finalizar-turno', (req: Request, res: Response): void => {
  const { operador, equipe, atleta, esteira, kmFinal, duracaoTurno } = req.body;

  res.render('index', {
    // Mostra uma conferencia antes de encerrar o turno e reiniciar o ciclo.
    tela: 'encerramento',
    titulo: 'FINALIZAR TURNO',
    operadorSelecionado: operador,
    equipeSelecionada: equipe,
    atletaSelecionado: atleta,
    esteiraSelecionada: esteira,
    kmFinal: kmFinal || '0',
    duracaoTurno: duracaoTurno || '00:00:00',
    inicioTurno: new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  });
});

app.post('/voltar-checkpoint', (req: Request, res: Response): void => {
  const { operador, equipe, atleta, esteira } = req.body;

  res.render('index', {
    // Retorna para o turno em andamento caso o operador queira revisar os checkpoints.
    tela: 'checkpoint',
    titulo: 'TURNO ATIVO',
    operadorSelecionado: operador,
    equipeSelecionada: equipe,
    atletaSelecionado: atleta,
    esteiraSelecionada: esteira
  });
});

app.post('/confirmar-encerramento', (req: Request, res: Response): void => {
  const { operador, equipe } = req.body;

  res.render('index', {
    // Encerramento confirmado: volta para a selecao de atletas da mesma equipe.
    tela: 'atleta',
    titulo: equipe,
    operadorSelecionado: operador,
    equipeSelecionada: equipe,
    atletas: atletasPorEquipe[equipe] || [],
    esteiras
  });
});

// Buscar todos os registros de uma tabela
app.get('/api/:tabela', async (req: Request, res: Response): Promise<Response> => {
  try {
    const tabela = req.params.tabela as string;
    const { data, error } = await supabase.from(tabela).select('*');

    if (error) throw error;
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Inserir um novo registro em uma tabela
app.post('/api/:tabela', async (req: Request, res: Response): Promise<Response> => {
  try {
    const tabela = req.params.tabela as string;
    const registro = req.body;
    
    const { data, error } = await supabase.from(tabela).insert([registro]).select();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor TypeScript ativo na porta ${PORT}`);
});
