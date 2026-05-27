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

// Renderiza a tela inicial, onde o usuario escolhe se entrara como operador ou organizador.
app.get('/', (req: Request, res: Response): void => {
  res.render('index', {
    // A view usa "tela" para decidir qual bloco HTML mostrar.
    tela: 'funcao',
    titulo: 'SELEÇÃO DE FUNÇÃO',
    funcoes: [
      { nome: 'OPERADOR', valor: 'operador' },
      { nome: 'ORGANIZADOR', valor: 'organizador' }
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
      titulo: 'SELEÇÃO DE OPERADOR',
      operadores
    });
    return;
  }

  res.redirect('/');
});

// Mostra diretamente a selecao de operadores caso a rota seja acessada pela URL.
app.get('/operador', (req: Request, res: Response): void => {
  res.render('index', {
    // Permite acessar a selecao de operadores diretamente pela URL /operador.
    tela: 'operador',
    titulo: 'SELEÇÃO DE OPERADOR',
    operadores
  });
});

// Recebe o operador escolhido e mostra uma confirmacao simples na mesma tela.
app.post('/selecionar-operador', (req: Request, res: Response): void => {
  const { operador } = req.body;

  res.render('index', {
    // Mantem a tela de operadores e destaca quem foi selecionado.
    tela: 'operador',
    titulo: 'SELEÇÃO DE OPERADOR',
    operadores,
    operadorSelecionado: operador
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
