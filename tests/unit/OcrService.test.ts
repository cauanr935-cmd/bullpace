/// <reference types="jest" />

const createMock = jest.fn();

jest.mock('groq-sdk', () => {
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

import { extrairQuilometragem } from '../../src/Service/OcrService';

describe('OcrService (White-box Unit Tests)', () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it('CT01 -> RN01: retorna resultado correto quando Groq responde JSON válido', async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: '{"status":"sucesso","km":12.45}' } }]
    });

    const result = await extrairQuilometragem('data:image/png;base64,abc123');

    expect(createMock).toHaveBeenCalled();
    expect(result).toEqual({ status: 'sucesso', km: 12.45 });
  });

  it('CT02 -> RN02: converte km string para número quando Groq retorna string', async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: '{"status":"sucesso","km":"15.7"}' } }]
    });

    const result = await extrairQuilometragem('data:image/png;base64,abc123');

    expect(result).toEqual({ status: 'sucesso', km: 15.7 });
  });

  it('CT03 -> RN03: retorna valor não identificado quando a API do Groq falha', async () => {
    createMock.mockRejectedValueOnce(new Error('API failure'));

    const result = await extrairQuilometragem('data:image/png;base64,abc123');

    expect(result).toEqual({ status: 'valor não identificado', km: null });
  });
});
