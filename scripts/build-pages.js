const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const viewDir = path.join(rootDir, 'src', 'View');
const outDir = path.join(rootDir, 'public');

const initialPageData = {
  tela: 'funcao',
  titulo: 'SELECAO DE FUNCAO',
  funcoes: [
    { nome: 'OPERADOR(A)', valor: 'operador' },
    { nome: 'COORDENADOR(A)', valor: 'coordenador' }
  ]
};

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, 'static'), { recursive: true });

const templatePath = path.join(viewDir, 'index.html');
const html = ejs.render(fs.readFileSync(templatePath, 'utf8'), initialPageData, {
  filename: templatePath
}).replace(/href="\/static\//g, 'href="static/');

fs.writeFileSync(path.join(outDir, 'index.html'), html);
fs.copyFileSync(path.join(viewDir, 'style.css'), path.join(outDir, 'static', 'style.css'));

console.log('GitLab Pages files generated in public/.');
