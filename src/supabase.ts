import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fhxjysgowbdrfdwlxurv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInZiI6ImZoeGp5c2dvd2JkcmZkd2x4dXJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0ODM4NDQsImV4cCI6MjA5NDA1OTg0NH0.KCemCejnePNuLTYcMDrmHEt3Aqs6ntqNamphhBtGcyM'; 

/**
 * Cliente único global (Singleton).
 * Evita múltiplas inicializações e desperdício de sockets de conexão.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);