import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json());

const supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não foram definidas.');
  process.exit(1);
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

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
