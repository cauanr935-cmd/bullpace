export type OcrStatus = 'nao_processado' | 'processando' | 'processado' | 'pendente_revisao' | 'erro';

export type ResultadoOcrCheckpoint = {
  textoExtraido: string;
  kmExtraido: number | null;
  confianca: number | null;
  status: OcrStatus;
  mensagem: string;
};

type TesseractResult = {
  data?: {
    text?: string;
    confidence?: number;
  };
};

const MAX_KM_CHECKPOINT = 300;

const criarResultado = (
  textoExtraido: string,
  confianca: number | null,
  erro?: string
): ResultadoOcrCheckpoint => {
  if (erro) {
    return {
      textoExtraido,
      kmExtraido: null,
      confianca,
      status: 'erro',
      mensagem: erro
    };
  }

  const kmExtraido = extrairKmDoTexto(textoExtraido);

  if (kmExtraido === null) {
    return {
      textoExtraido,
      kmExtraido: null,
      confianca,
      status: 'pendente_revisao',
      mensagem: 'Texto lido, mas nenhum KM confiável foi encontrado.'
    };
  }

  return {
    textoExtraido,
    kmExtraido,
    confianca,
    status: 'processado',
    mensagem: 'KM sugerido a partir da imagem. Confira antes de registrar.'
  };
};

export function extrairKmDoTexto(textoExtraido: string): number | null {
  const texto = String(textoExtraido || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  if (!texto) return null;

  const temContextoKm = /\b(km|quilometragem|distancia|total)\b/.test(texto);
  const padraoComContexto = /(?:km|quilometragem|distancia|total)\s*:?\s*(-?\d+(?:[,.]\d{1,3})?)|(-?\d+(?:[,.]\d{1,3})?)\s*(?:km)\b/g;
  const padraoNumerico = /-?\d+(?:[,.]\d{1,3})?/g;
  const candidatos: string[] = [];

  for (const match of texto.matchAll(padraoComContexto)) {
    const valor = match[1] || match[2];
    if (valor) candidatos.push(valor);
  }

  if (!temContextoKm) {
    const numerosSoltos = texto.match(padraoNumerico) || [];
    if (numerosSoltos.length === 1) candidatos.push(numerosSoltos[0]);
  }

  for (const candidato of candidatos) {
    const km = Number(candidato.replace(',', '.'));
    if (Number.isFinite(km) && km >= 0 && km <= MAX_KM_CHECKPOINT) {
      return Math.round(km * 1000) / 1000;
    }
  }

  return null;
}

export function processarTextoCheckpoint(textoExtraido: string, confianca: number | null = null): ResultadoOcrCheckpoint {
  return criarResultado(textoExtraido, confianca);
}

export async function processarImagemCheckpoint(imagem: string | Buffer): Promise<ResultadoOcrCheckpoint> {
  if (!imagem || (typeof imagem === 'string' && imagem.trim() === '')) {
    return {
      textoExtraido: '',
      kmExtraido: null,
      confianca: null,
      status: 'nao_processado',
      mensagem: 'Nenhuma imagem foi enviada para leitura.'
    };
  }

  try {
    const tesseract = require('tesseract.js') as {
      recognize: (imagemEntrada: string | Buffer, idioma?: string) => Promise<TesseractResult>;
    };
    const resultado = await tesseract.recognize(imagem, 'por+eng');
    const textoExtraido = resultado.data?.text || '';
    const confianca = typeof resultado.data?.confidence === 'number'
      ? Math.round(resultado.data.confidence * 100) / 100
      : null;

    return criarResultado(textoExtraido, confianca);
  } catch (error) {
    return criarResultado(
      '',
      null,
      `Erro técnico na leitura OCR: ${(error as Error).message}`
    );
  }
}
