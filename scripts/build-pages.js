const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const viewDir = path.join(rootDir, 'src', 'View');
const outDir = path.join(rootDir, 'public');
const templatePath = path.join(viewDir, 'index.html');
const template = fs.readFileSync(templatePath, 'utf8');

const operadores = [
  { nome: 'Ana Martins', iniciais: 'AM' },
  { nome: 'João Lima', iniciais: 'JL' },
  { nome: 'Marina Souza', iniciais: 'MS' },
  { nome: 'Pedro Alves', iniciais: 'PA' }
];

const equipes = [
  { nome: 'Equipe Vermelha', iniciais: 'EV', atletas: 16 },
  { nome: 'Equipe Azul', iniciais: 'EA', atletas: 16 }
];

const equipesPainel = [
  { nome: 'Equipe Vermelha', km: '124,480 km', atleta: 'Rafael Luz em turno', atletas: 16 },
  { nome: 'Equipe Azul', km: '121,930 km', atleta: 'Beatriz em turno', atletas: 16 }
];

const rankingFechamento = [
  { posicao: 1, nome: 'Equipe Vermelha', km: '348,920 km', checkpoints: 412, correcoes: 3 },
  { posicao: 2, nome: 'Equipe Azul', km: '344,180 km', checkpoints: 407, correcoes: 1 }
];

const resultadoOficial = {
  vencedor: rankingFechamento[0],
  segundoLugar: rankingFechamento[1],
  totalCheckpoints: 819,
  correcoesAuditadas: 4,
  validadoPor: 'Camila Rocha',
  diferenca: '+ 4,740 km'
};

const checkpointsPorEquipe = {
  'Equipe Vermelha': [
    { horario: '15:24:48', atleta: 'Rafael Luz', km: '12,760 km', operador: 'Ana Martins' },
    { horario: '15:04:51', atleta: 'Bia Torres', km: '12,480 km', operador: 'Ana Martins', selecionado: true },
    { horario: '14:22:31', atleta: 'Clara Nunes', km: '11,940 km', operador: 'João Lima' }
  ],
  'Equipe Azul': [
    { horario: '15:18:20', atleta: 'Beatriz', km: '12,240 km', operador: 'Marina Souza', selecionado: true },
    { horario: '14:50:15', atleta: 'Lucas Lima', km: '11,980 km', operador: 'Pedro Alves' },
    { horario: '14:12:03', atleta: 'Sofia Cardoso', km: '11,620 km', operador: 'Marina Souza' }
  ]
};

const atletasFiltroPorEquipe = {
  'Equipe Vermelha': [
    { nome: 'Rafael Luz', iniciais: 'RL', status: 'Turno ativo · 3 checkpoints', selecionado: true },
    { nome: 'Bia Torres', iniciais: 'BT', status: 'Último turno há 34 min' },
    { nome: 'Clara Nunes', iniciais: 'CN', status: 'Último turno há 1h12' }
  ],
  'Equipe Azul': [
    { nome: 'Beatriz', iniciais: 'BZ', status: 'Turno ativo · 4 checkpoints', selecionado: true },
    { nome: 'Lucas Lima', iniciais: 'LL', status: 'Último turno há 28 min' },
    { nome: 'Sofia Cardoso', iniciais: 'SC', status: 'Último turno há 1h04' }
  ]
};

const atletasPorEquipe = {
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

const esteiras = [
  { nome: 'Esteira 01', status: 'Livre para iniciar turno', tipo: 'livre' },
  { nome: 'Esteira 02', status: 'Em manutenção', tipo: 'manutencao' }
];

const slug = (value) => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

const file = {
  operador: (operador) => operador ? `operador-${slug(operador)}.html` : 'operador.html',
  equipe: (operador, equipe) => equipe ? `equipe-${slug(operador)}-${slug(equipe)}.html` : `equipe-${slug(operador)}.html`,
  atleta: (operador, equipe, atleta) => atleta ? `atleta-${slug(operador)}-${slug(equipe)}-${slug(atleta)}.html` : `atleta-${slug(operador)}-${slug(equipe)}.html`,
  esteira: (operador, equipe, atleta, esteira) => esteira ? `esteira-${slug(operador)}-${slug(equipe)}-${slug(atleta)}-${slug(esteira)}.html` : `esteira-${slug(operador)}-${slug(equipe)}-${slug(atleta)}.html`,
  checkpoint: (operador, equipe, atleta, esteira) => `checkpoint-${slug(operador)}-${slug(equipe)}-${slug(atleta)}-${slug(esteira)}.html`,
  encerramento: (operador, equipe, atleta, esteira) => `encerramento-${slug(operador)}-${slug(equipe)}-${slug(atleta)}-${slug(esteira)}.html`,
  detalheEquipe: (equipe) => `detalhes-${slug(equipe)}.html`,
  filtroEquipe: (equipe, atleta) => atleta ? `filtro-${slug(equipe)}-${slug(atleta)}.html` : `filtro-${slug(equipe)}.html`
};

const staticScript = `
<script>
(() => {
  const slug = (value) => String(value || '')
    .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const target = {
    operador: (operador) => operador ? 'operador-' + slug(operador) + '.html' : 'operador.html',
    equipe: (operador, equipe) => equipe ? 'equipe-' + slug(operador) + '-' + slug(equipe) + '.html' : 'equipe-' + slug(operador) + '.html',
    atleta: (operador, equipe, atleta) => atleta ? 'atleta-' + slug(operador) + '-' + slug(equipe) + '-' + slug(atleta) + '.html' : 'atleta-' + slug(operador) + '-' + slug(equipe) + '.html',
    esteira: (operador, equipe, atleta, esteira) => esteira ? 'esteira-' + slug(operador) + '-' + slug(equipe) + '-' + slug(atleta) + '-' + slug(esteira) + '.html' : 'esteira-' + slug(operador) + '-' + slug(equipe) + '-' + slug(atleta) + '.html',
    checkpoint: (operador, equipe, atleta, esteira) => 'checkpoint-' + slug(operador) + '-' + slug(equipe) + '-' + slug(atleta) + '-' + slug(esteira) + '.html',
    encerramento: (operador, equipe, atleta, esteira) => 'encerramento-' + slug(operador) + '-' + slug(equipe) + '-' + slug(atleta) + '-' + slug(esteira) + '.html',
    detalheEquipe: (equipe) => 'detalhes-' + slug(equipe) + '.html',
    filtroEquipe: (equipe, atleta) => atleta ? 'filtro-' + slug(equipe) + '-' + slug(atleta) + '.html' : 'filtro-' + slug(equipe) + '.html'
  };
  const withQuery = (url, data) => {
    const params = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const query = params.toString();
    return query ? url + '?' + query : url;
  };
  const updateEndPage = () => {
    if (!location.pathname.includes('encerramento-')) return;
    const params = new URLSearchParams(location.search);
    const setMetric = (label, value) => {
      const article = Array.from(document.querySelectorAll('.end-metrics article')).find((item) => item.querySelector('strong')?.textContent.trim() === label);
      if (article && value) article.querySelector('span').textContent = value;
    };
    const startedAt = Number(params.get('inicioTurnoTimestamp'));
    if (startedAt) {
      setMetric('INÍCIO', new Date(startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    }
    setMetric('DURAÇÃO', params.get('duracaoTurno'));
    setMetric('KM FINAL', params.get('kmFinal') ? params.get('kmFinal') + ' km' : '');
    document.querySelectorAll('input[name="inicioTurnoTimestamp"]').forEach((input) => {
      input.value = params.get('inicioTurnoTimestamp') || input.value;
    });
  };
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.action) return;
    const action = new URL(form.action).pathname;
    const data = Object.fromEntries(new FormData(form).entries());
    let next = '';
    if (action === '/selecionar-funcao') next = data.funcao === 'coordenador' ? 'login-coordenador.html' : 'operador.html';
    if (action === '/login-coordenador') next = 'painel-coordenador.html';
    if (action === '/voltar-login-coordenador') next = 'login-coordenador.html';
    if (action === '/voltar-painel-coordenador') next = 'painel-coordenador.html';
    if (action === '/modo-tv') next = 'modo-tv.html';
    if (action === '/fechamento') next = 'fechamento.html';
    if (action === '/finalizar-prova') next = 'confirmacao-fechamento.html';
    if (action === '/confirmar-finalizacao') next = 'resultado-oficial.html';
    if (action === '/voltar-fechamento') next = 'fechamento.html';
    if (action === '/publicar-resultado') next = 'publicar-resultado.html';
    if (action === '/confirmar-publicacao') next = 'tv-resultado.html';
    if (action === '/voltar-resultado-oficial') next = 'resultado-oficial.html';
    if (action === '/detalhes-equipe') next = target.detalheEquipe(data.equipe);
    if (action === '/filtro-atletas-equipe') next = target.filtroEquipe(data.equipe, data.atleta);
    if (action === '/selecionar-operador') next = target.operador(data.operador);
    if (action === '/continuar-operador') next = target.equipe(data.operador);
    if (action === '/voltar-operador') next = target.operador(data.operador);
    if (action === '/selecionar-equipe') next = target.equipe(data.operador, data.equipe);
    if (action === '/continuar-equipe') next = target.atleta(data.operador, data.equipe);
    if (action === '/voltar-equipe') next = target.equipe(data.operador, data.equipe);
    if (action === '/selecionar-atleta') next = target.atleta(data.operador, data.equipe, data.atleta);
    if (action === '/continuar-atleta') next = target.esteira(data.operador, data.equipe, data.atleta);
    if (action === '/voltar-atleta') next = target.atleta(data.operador, data.equipe, data.atleta);
    if (action === '/selecionar-esteira') next = target.esteira(data.operador, data.equipe, data.atleta, data.esteira);
    if (action === '/iniciar-turno') next = withQuery(target.checkpoint(data.operador, data.equipe, data.atleta, data.esteira), { inicioTurnoTimestamp: Date.now() });
    if (action === '/finalizar-turno') {
      const km = document.getElementById('kmAcumulado')?.value.trim();
      if (!km) return;
      data.kmFinal = km;
      data.duracaoTurno = document.getElementById('turnTimer')?.textContent || data.duracaoTurno;
      data.inicioTurnoTimestamp = data.inicioTurnoTimestamp || String(Date.now());
      next = withQuery(target.encerramento(data.operador, data.equipe, data.atleta, data.esteira), data);
    }
    if (action === '/voltar-checkpoint') next = withQuery(target.checkpoint(data.operador, data.equipe, data.atleta, data.esteira), { inicioTurnoTimestamp: data.inicioTurnoTimestamp });
    if (action === '/confirmar-encerramento') next = target.atleta(data.operador, data.equipe);
    if (!next) return;
    event.preventDefault();
    window.location.href = next;
  }, true);
  document.querySelectorAll('a[href="/"]').forEach((link) => link.setAttribute('href', 'index.html'));
  document.querySelectorAll('a[href="/tv"]').forEach((link) => link.setAttribute('href', 'tv.html'));
  updateEndPage();
})();
</script>`;

const render = (outputFile, data) => {
  const html = ejs.render(template, data, { filename: templatePath })
    .replace(/href="\/static\//g, 'href="static/')
    .replace(/href="\/tv"/g, 'href="tv.html"')
    .replace('</body>', `${staticScript}\n</body>`);

  fs.writeFileSync(path.join(outDir, outputFile), html);
};

const baseData = {
  funcoes: [
    { nome: 'OPERADOR(A)', valor: 'operador' },
    { nome: 'COORDENADOR(A)', valor: 'coordenador' }
  ],
  operadores,
  equipes,
  equipesPainel,
  rankingFechamento,
  resultadoOficial,
  esteiras
};

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, 'static'), { recursive: true });

render('index.html', { ...baseData, tela: 'funcao', titulo: 'SELEÇÃO DE FUNÇÃO' });
render('operador.html', { ...baseData, tela: 'operador', titulo: 'SELEÇÃO DE OPERADOR(A)' });
render('login-coordenador.html', { ...baseData, tela: 'loginCoordenador', titulo: 'ACESSO RESTRITO' });
render('painel-coordenador.html', { ...baseData, tela: 'painelCoordenador', titulo: 'PAINEL DA PROVA', coordenadorSelecionado: 'Coordenador(a)' });
render('modo-tv.html', { ...baseData, tela: 'modoTv', titulo: 'MODO TV', coordenadorSelecionado: 'Coordenador(a)' });
render('fechamento.html', { ...baseData, tela: 'fechamento', titulo: 'Fechamento', coordenadorSelecionado: 'Coordenador(a)' });
render('confirmacao-fechamento.html', { ...baseData, tela: 'confirmacaoFechamento', titulo: 'Confirmar encerramento', coordenadorSelecionado: 'Coordenador(a)' });
render('resultado-oficial.html', { ...baseData, tela: 'resultadoOficial', titulo: 'Resultado oficial', coordenadorSelecionado: 'Coordenador(a)' });
render('publicar-resultado.html', { ...baseData, tela: 'publicarResultado', titulo: 'Publicar resultado', coordenadorSelecionado: 'Coordenador(a)' });
render('tv.html', { ...baseData, tela: 'tvPublica', titulo: 'PLACAR AO VIVO' });
render('tv-resultado.html', { ...baseData, tela: 'tvResultado', titulo: 'RESULTADO OFICIAL' });

equipesPainel.forEach((equipePainel) => {
  const atletasFiltro = atletasFiltroPorEquipe[equipePainel.nome] || [];
  render(file.detalheEquipe(equipePainel.nome), {
    ...baseData,
    tela: 'detalheEquipe',
    titulo: equipePainel.nome,
    coordenadorSelecionado: 'Coordenador(a)',
    equipePainel,
    checkpoints: checkpointsPorEquipe[equipePainel.nome] || []
  });
  render(file.filtroEquipe(equipePainel.nome), {
    ...baseData,
    tela: 'filtroAtletasEquipe',
    titulo: 'ATLETAS DA EQUIPE',
    coordenadorSelecionado: 'Coordenador(a)',
    equipePainel,
    atletasFiltro,
    atletaSelecionado: atletasFiltro.find((atleta) => atleta.selecionado)?.nome
  });
  atletasFiltro.forEach((atleta) => render(file.filtroEquipe(equipePainel.nome, atleta.nome), {
    ...baseData,
    tela: 'filtroAtletasEquipe',
    titulo: 'ATLETAS DA EQUIPE',
    coordenadorSelecionado: 'Coordenador(a)',
    equipePainel,
    atletasFiltro,
    atletaSelecionado: atleta.nome
  }));
});

operadores.forEach((operador) => {
  render(file.operador(operador.nome), {
    ...baseData,
    tela: 'operador',
    titulo: 'SELEÇÃO DE OPERADOR(A)',
    operadorSelecionado: operador.nome
  });

  render(file.equipe(operador.nome), {
    ...baseData,
    tela: 'equipe',
    titulo: 'SELEÇÃO DE EQUIPE',
    operadorSelecionado: operador.nome
  });

  equipes.forEach((equipe) => {
    render(file.equipe(operador.nome, equipe.nome), {
      ...baseData,
      tela: 'equipe',
      titulo: 'SELEÇÃO DE EQUIPE',
      operadorSelecionado: operador.nome,
      equipeSelecionada: equipe.nome
    });

    render(file.atleta(operador.nome, equipe.nome), {
      ...baseData,
      tela: 'atleta',
      titulo: equipe.nome,
      operadorSelecionado: operador.nome,
      equipeSelecionada: equipe.nome,
      atletas: atletasPorEquipe[equipe.nome] || []
    });

    (atletasPorEquipe[equipe.nome] || []).forEach((atleta) => {
      render(file.atleta(operador.nome, equipe.nome, atleta.nome), {
        ...baseData,
        tela: 'atleta',
        titulo: equipe.nome,
        operadorSelecionado: operador.nome,
        equipeSelecionada: equipe.nome,
        atletaSelecionado: atleta.nome,
        atletas: atletasPorEquipe[equipe.nome] || []
      });

      render(file.esteira(operador.nome, equipe.nome, atleta.nome), {
        ...baseData,
        tela: 'esteira',
        titulo: 'INICIAR TURNO',
        operadorSelecionado: operador.nome,
        equipeSelecionada: equipe.nome,
        atletaSelecionado: atleta.nome
      });

      esteiras.filter((esteira) => esteira.tipo === 'livre').forEach((esteira) => {
        render(file.esteira(operador.nome, equipe.nome, atleta.nome, esteira.nome), {
          ...baseData,
          tela: 'esteira',
          titulo: 'INICIAR TURNO',
          operadorSelecionado: operador.nome,
          equipeSelecionada: equipe.nome,
          atletaSelecionado: atleta.nome,
          esteiraSelecionada: esteira.nome
        });

        render(file.checkpoint(operador.nome, equipe.nome, atleta.nome, esteira.nome), {
          ...baseData,
          tela: 'checkpoint',
          titulo: 'TURNO ATIVO',
          operadorSelecionado: operador.nome,
          equipeSelecionada: equipe.nome,
          atletaSelecionado: atleta.nome,
          esteiraSelecionada: esteira.nome,
          inicioTurnoTimestamp: ''
        });

        render(file.encerramento(operador.nome, equipe.nome, atleta.nome, esteira.nome), {
          ...baseData,
          tela: 'encerramento',
          titulo: 'FINALIZAR TURNO',
          operadorSelecionado: operador.nome,
          equipeSelecionada: equipe.nome,
          atletaSelecionado: atleta.nome,
          esteiraSelecionada: esteira.nome,
          kmFinal: '0',
          duracaoTurno: '00:00:00',
          inicioTurno: '00:00',
          inicioTurnoTimestamp: ''
        });
      });
    });
  });
});

fs.copyFileSync(path.join(viewDir, 'style.css'), path.join(outDir, 'static', 'style.css'));

console.log('GitLab Pages files generated in public/.');
