import { describe, expect, jest, test } from '@jest/globals';
import { abrirSessao, encerrarSessao, supabase } from './Controller/SessaoController';
import { iniciarTurno, finalizarTurno } from './Controller/TurnoController';
import { registrarCheckpoint } from './Controller/CheckpointController';

async function buscarPrimeiroId(tabela: string, coluna: string): Promise<number> {
  const { data, error } = await supabase
    .from(tabela)
    .select(coluna)
    .limit(1)
    .single();

  if (error) {
    throw new Error(`Erro ao buscar ${coluna} em ${tabela}: ${error.message}`);
  }

  const registro = data as unknown as Record<string, unknown> | null;
  const id = registro?.[coluna];

  if (typeof id !== 'number') {
    throw new Error(`Nenhum registro valido encontrado em ${tabela}.`);
  }

  return id;
}

describe('Teste geral do backend', () => {
  jest.setTimeout(30000);

  test('deve abrir sessao, iniciar turno, registrar checkpoint, finalizar turno e encerrar sessao', async () => {
    const idEvento = await buscarPrimeiroId('eventos', 'id_evento');
    const idAtleta = await buscarPrimeiroId('atletas', 'id_atleta');
    const idEsteira = await buscarPrimeiroId('esteiras', 'id_esteira');

    const sessao = await abrirSessao({
      id_evento: idEvento,
      id_funcao: 1,
      inicio_em: new Date()
    });

    expect(sessao).toBeDefined();
    expect(sessao.id_sessao_operacional).toEqual(expect.any(Number));
    expect(sessao.status).toBe('ativa');

    const turno = await iniciarTurno({
      id_atleta: idAtleta,
      id_esteira: idEsteira,
      id_sessao_operacional: sessao.id_sessao_operacional,
      horario_inicio: new Date()
    });

    expect(turno).toBeDefined();
    expect(turno.id_turno).toEqual(expect.any(Number));
    expect(turno.status).toBe('em_andamento');

    const checkpoint = await registrarCheckpoint({
      id_turno: turno.id_turno,
      id_sessao_operacional: sessao.id_sessao_operacional,
      km_acumulado: 1.5,
      pace_medio: 5,
      velocidade_media: 12,
      registrado_em: new Date(),
      is_ajuste: false
    });

    expect(checkpoint).toBeDefined();
    expect(checkpoint.id_checkpoint).toEqual(expect.any(Number));
    expect(checkpoint.km_acumulado).toBe(1.5);

    const turnoFinalizado = await finalizarTurno(turno.id_turno, 1.5);

    expect(turnoFinalizado.id_turno).toBe(turno.id_turno);
    expect(turnoFinalizado.status).toBe('encerrado');
    expect(Number(turnoFinalizado.km_turno)).toBe(1.5);

    const sessaoEncerrada = await encerrarSessao(sessao.id_sessao_operacional);

    expect(sessaoEncerrada.id_sessao_operacional).toBe(sessao.id_sessao_operacional);
    expect(sessaoEncerrada.status).toBe('encerrada');
  });
});
