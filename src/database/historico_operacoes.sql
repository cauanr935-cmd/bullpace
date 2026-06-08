create table if not exists historico_operacoes (
  id bigserial primary key,
  usuario_id text,
  nome_usuario text not null,
  perfil_usuario text not null check (perfil_usuario in ('operador', 'coordenador', 'administrador_geral', 'sistema')),
  tipo_operacao text not null,
  entidade text not null,
  entidade_id text,
  valor_anterior jsonb,
  valor_novo jsonb,
  motivo text,
  data_hora timestamptz not null default now()
);

create index if not exists idx_historico_operacoes_data_hora
  on historico_operacoes (data_hora desc);

create index if not exists idx_historico_operacoes_perfil_usuario
  on historico_operacoes (perfil_usuario);

create index if not exists idx_historico_operacoes_tipo_operacao
  on historico_operacoes (tipo_operacao);

create index if not exists idx_historico_operacoes_nome_usuario
  on historico_operacoes (nome_usuario);

create or replace function bloquear_mutacao_historico_operacoes()
returns trigger as $$
begin
  raise exception 'Registros de histórico não podem ser alterados ou apagados.';
end;
$$ language plpgsql;

drop trigger if exists trg_bloquear_mutacao_historico_operacoes on historico_operacoes;

create trigger trg_bloquear_mutacao_historico_operacoes
before update or delete on historico_operacoes
for each row execute function bloquear_mutacao_historico_operacoes();
