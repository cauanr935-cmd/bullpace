import Groq from "groq-sdk";

// ────────────────────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────────────────────

export type OcrStatus = "sucesso" | "valor não identificado" | "erro de identificação";

export interface OcrResult {
  status: OcrStatus;
  km: number | null;
}

// ────────────────────────────────────────────────────────────────────────────
// Constantes
// ────────────────────────────────────────────────────────────────────────────

/**
 * Modelo de visão atualmente ativo na Groq (substitui o llama-3.2-11b-vision-preview
 * que foi desativado). Documentação oficial: https://console.groq.com/docs/vision
 */
const GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const SYSTEM_PROMPT = `
Você é um sistema especializado em OCR para painéis de equipamentos de academia.
Sua única função é extrair a quilometragem acumulada (KM) do visor de uma esteira.

Regras de resposta — você DEVE retornar APENAS um JSON válido, sem texto adicional:

1. Quilometragem identificada com clareza:
   {"status": "sucesso", "km": <valor numérico em float>}

2. Imagem ilegível, escura, borrada ou sem valor visível:
   {"status": "valor não identificado", "km": null}

3. Mais de um valor numérico candidato a quilometragem (ambiguidade):
   {"status": "erro de identificação", "km": null}

Observações importantes:
- O campo "km" deve ser um número float (ex: 12.45), nunca uma string.
- Ignore outros valores do painel (tempo, calorias, velocidade, inclinação).
- Foque exclusivamente no campo rotulado como "KM", "DIST", "DISTANCE" ou equivalente.
`.trim();

const USER_PROMPT = `
Analise o visor da esteira na imagem e extraia a quilometragem acumulada.
Responda exclusivamente com o JSON conforme as regras do sistema.
`.trim();

// ────────────────────────────────────────────────────────────────────────────
// Inicialização do cliente Groq
// ────────────────────────────────────────────────────────────────────────────

// A chave é lida da variável de ambiente — nunca a coloque diretamente no código.
// Adicione ao seu .env:  GROQ_API_KEY=gsk_...
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ────────────────────────────────────────────────────────────────────────────
// Função principal
// ────────────────────────────────────────────────────────────────────────────

/**
 * Recebe a imagem do painel da esteira em Base64 e retorna a quilometragem
 * acumulada extraída via OCR com o modelo de visão da Groq.
 *
 * @param base64Image - String Base64 da imagem (com ou sem prefixo data URI).
 * @param mimeType    - Tipo MIME da imagem (padrão: "image/jpeg").
 * @returns           - Objeto { status, km } conforme as regras de negócio.
 */
export async function extrairQuilometragem(
  base64Image: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" = "image/jpeg"
): Promise<OcrResult> {

  // Remove o prefixo data URI caso o front-end o envie junto (ex: "data:image/jpeg;base64,...")
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

  try {
    const response = await groq.chat.completions.create({
      model: GROQ_VISION_MODEL,

      // Força retorno em JSON puro, sem blocos de markdown
      response_format: { type: "json_object" },

      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                // Formato exigido pela API da Groq para imagens Base64
                url: `data:${mimeType};base64,${base64Data}`,
              },
            },
            {
              type: "text",
              text: USER_PROMPT,
            },
          ],
        },
      ],

      // Resposta curta — apenas o JSON de resultado
      max_tokens: 100,

      // Temperatura zero para máxima determinismo na leitura do valor
      temperature: 0,
    });

    const rawContent = response.choices[0]?.message?.content;

    if (!rawContent) {
      console.error("[OcrService] Resposta vazia recebida da API da Groq.");
      return { status: "valor não identificado", km: null };
    }

    // Parse do JSON retornado pelo modelo
    const parsed: OcrResult = JSON.parse(rawContent);

    // Validação mínima dos campos esperados
    if (!parsed.status) {
      throw new Error("Campo 'status' ausente na resposta do modelo.");
    }

    // Garante que km seja number ou null (nunca string)
    if (typeof parsed.km === "string") {
      parsed.km = parseFloat(parsed.km) || null;
    }

    console.log("[OcrService] Resultado OCR:", parsed);
    return parsed;

  } catch (error) {
    console.error("[OcrService] Erro na chamada da API do Groq:", error);

    // Retorno seguro em caso de falha na API ou no parse
    return { status: "valor não identificado", km: null };
  }
}