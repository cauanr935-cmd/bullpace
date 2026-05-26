export interface SessaoOperacional {
  id_sessao_operacional: number; 
  id_evento: number;              
  id_funcao: number;              
  inicio_em: string | Date;       
  fim_em?: string | Date;         
  status: 'ativa' | 'encerrada'; // Evita strings inválidas que quebram restrições no banco
  deleted_at: boolean;           
}

/**
 * DTO (Data Transfer Object) para abertura de sessão.
 * Garante que parâmetros controlados pelo banco de dados não sejam enviados manualmente.
 */
export type CriarSessaoInput = Omit<SessaoOperacional, "id_sessao_operacional" | "fim_em" | "status" | "deleted_at">;