import { describe, expect, jest, test } from '@jest/globals';
import { extrairKmDoTexto, processarImagemCheckpoint, processarTextoCheckpoint } from './OcrService';

jest.mock('tesseract.js', () => ({
  recognize: jest.fn()
}));

const tesseract = require('tesseract.js') as {
  recognize: jest.Mock;
};
const recognizeMock = tesseract.recognize as unknown as {
  mockResolvedValueOnce: (value: unknown) => void;
  mockRejectedValueOnce: (value: unknown) => void;
};

describe('OcrService', () => {
  test('CT01 - extrai KM de "KM 4"', () => {
    expect(extrairKmDoTexto('KM 4')).toBe(4);
  });

  test('CT02 - extrai KM de "4 km"', () => {
    expect(extrairKmDoTexto('4 km')).toBe(4);
  });

  test('CT03 - extrai KM de "4,5 km"', () => {
    expect(extrairKmDoTexto('4,5 km')).toBe(4.5);
  });

  test('CT04 - extrai KM de "Distância 4.50 km"', () => {
    expect(extrairKmDoTexto('Distância 4.50 km')).toBe(4.5);
  });

  test('CT05 - retorna null para texto ilegível', () => {
    expect(extrairKmDoTexto('### @@@')).toBeNull();
  });

  test('CT06 - retorna null para texto sem número', () => {
    expect(extrairKmDoTexto('texto sem numero')).toBeNull();
  });

  test('CT07 - não aceita valor negativo', () => {
    expect(extrairKmDoTexto('KM -4')).toBeNull();
  });

  test('CT08 - não sobrescreve KM oficial automaticamente', () => {
    const resultado = processarTextoCheckpoint('Total: 10.25 KM');

    expect(resultado.kmExtraido).toBe(10.25);
    expect(resultado).not.toHaveProperty('km_acumulado');
  });

  test('CT09 - atualiza status para processado quando KM é encontrado', () => {
    const resultado = processarTextoCheckpoint('Total: 10.25 KM');

    expect(resultado.status).toBe('processado');
    expect(resultado.kmExtraido).toBe(10.25);
  });

  test('CT10 - atualiza status para pendente_revisao quando KM não é encontrado', () => {
    const resultado = processarTextoCheckpoint('texto ilegível');

    expect(resultado.status).toBe('pendente_revisao');
    expect(resultado.kmExtraido).toBeNull();
  });

  test('retorna nao_processado quando nenhuma imagem é enviada', async () => {
    const resultado = await processarImagemCheckpoint('');

    expect(resultado.status).toBe('nao_processado');
    expect(resultado.kmExtraido).toBeNull();
  });

  test('processa imagem com provider OCR e retorna KM sugerido', async () => {
    recognizeMock.mockResolvedValueOnce({
      data: {
        text: 'Distância 4,50 km',
        confidence: 87.333
      }
    });

    const resultado = await processarImagemCheckpoint('data:image/png;base64,abc');

    expect(resultado.status).toBe('processado');
    expect(resultado.kmExtraido).toBe(4.5);
    expect(resultado.confianca).toBe(87.33);
  });

  test('retorna erro quando o provider OCR falha', async () => {
    recognizeMock.mockRejectedValueOnce(new Error('falha no provider'));

    const resultado = await processarImagemCheckpoint('data:image/png;base64,abc');

    expect(resultado.status).toBe('erro');
    expect(resultado.kmExtraido).toBeNull();
    expect(resultado.mensagem).toContain('falha no provider');
  });
});
