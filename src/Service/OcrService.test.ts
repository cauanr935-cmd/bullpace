/*import { describe, expect, jest, test, beforeEach } from '@jest/globals';
import { analisarImagemGroq } from './OcrService';

var createMock: jest.MockedFunction<(...args: unknown[]) => Promise<any>>;

jest.mock('groq-sdk', () => {
  createMock = jest.fn();
  return {
    __esModule: true,
    default: jest.fn(() => ({
      chat: {
        completions: {
          create: createMock
        }
      }
    }))
  };
});

describe('OcrService', () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  test('retorna o resultado correto quando o Groq responde com JSON válido', async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: '{"status":"sucesso","km":12.45}' } }]
    });

    const resultado = await analisarImagemGroq('data:image/png;base64,abc');

    expect(resultado).toEqual({ status: 'sucesso', km: 12.45 });
  });

  test('retorna valor não identificado quando a imagem não é enviada', async () => {
    const resultado = await analisarImagemGroq('');

    expect(resultado).toEqual({ status: 'valor não identificado', km: null });
  });

  test('retorna erro de identificação quando a chamada do Groq falha', async () => {
    createMock.mockRejectedValueOnce(new Error('falha no Groq'));

    const resultado = await analisarImagemGroq('data:image/png;base64,abc');

    expect(resultado).toEqual({ status: 'erro de identificação', km: null });
  });
}); */



