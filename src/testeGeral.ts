import { iniciarTurno, finalizarTurno } from './Controller/TurnoController';
import { registrarCheckpoint } from './Controller/CheckpointController';
import { supabase } from './Controller/SessaoController';
    
async function executarTesteGeral() {
  console.log("Iniciando Teste Geral do Backend (Fluxo de Integração Real)...\n");

  try {
    console.log("0. Buscando registros existentes no banco para o teste...");
    
    const { data: evento } = await supabase.from('eventos').select('id_evento').limit(1).single();
    const { data: atleta } = await supabase.from('atletas').select('id_atleta').limit(1).single();
    const { data: esteira } = await supabase.from('esteiras').select('id_esteira').limit(1).single();

    if (!evento || !atleta || !esteira) {
      throw new Error("Pré-requisitos ausentes. Certifique-se de ter pelo menos 1 evento, 1 atleta e 1 esteira cadastrados no Supabase antes de rodar o teste.");
    }

    const idEvento = evento.id_evento;
    const idAtleta = atleta.id_atleta;
    const idEsteira = esteira.id_esteira;

    console.log(`   Usando Evento ID: ${idEvento}, Atleta ID: ${idAtleta}, Esteira ID: ${idEsteira}`);

    console.log("\n1. Simulando operador abrindo o sistema...");
    const sessao = await abrirSessao({
      id_evento: idEvento, 
      id_funcao: 1, 
      inicio_em: new Date()
    });
    console.log(`Sessão criada com sucesso! ID: ${sessao.id_sessao_operacional}`);

    console.log("\n2. Atleta inicia o revezamento na esteira...");
    const turno = await iniciarTurno({
      id_atleta: idAtleta, 
      id_esteira: idEsteira, 
      id_sessao_operacional: sessao.id_sessao_operacional,
      horario_inicio: new Date()
    });
    console.log(`Turno aberto com sucesso! ID: ${turno.id_turno}`);

    console.log("\n3. Simulando passagem de tempo (Gerando Checkpoint)...");
    const cp = await registrarCheckpoint({
      id_turno: turno.id_turno, 
      id_sessao_operacional: sessao.id_sessao_operacional,
      km_acumulado: 1.5, 
      pace_medio: 5.0,
      velocidade_media: 12.0,
      registrado_em: new Date(),
      is_ajuste: false
    });
    console.log(`   Checkpoint salvo com sucesso! ID: ${cp.id_checkpoint} (${cp.km_acumulado} km)`);

    console.log("\n4. Atleta encerra o tempo dele e desce da esteira...");
    const turnoFinalizado = await finalizarTurno(turno.id_turno, 1.5); 
    console.log(`Turno #${turnoFinalizado.id_turno} fechado com Status: ${turnoFinalizado.status}`);

    console.log("\n5. Operador faz logoff e encerra a sessão de trabalho...");
    const sessaoEncerrada = await encerrarSessao(sessao.id_sessao_operacional);
    console.log(`Sessão #${sessaoEncerrada.id_sessao_operacional} auditada e fechada com sucesso!`);

    console.log("\n---------------------------------------------------------");
    console.log("TESTE INTEGRADO DO BACKEND CONCLUÍDO COM 100% DE SUCESSO!");
    console.log("---------------------------------------------------------");

  } catch (error) {
    console.error("\nO TESTE FALHOU EM ALGUMA ETAPA:");
    console.error((error as Error).message);
  }
}

executarTesteGeral();