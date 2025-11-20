import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AIAnalysisResult } from '../types';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeReport = async (description: string, serviceName: string): Promise<AIAnalysisResult> => {
  try {
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, description: "A professional, short title/summary of the issue for the admin dashboard." },
        urgency: { type: Type.STRING, enum: ["Baixa", "Média", "Alta"], description: "Estimated urgency based on keywords (e.g., 'risk', 'danger', 'blocked')." },
        category: { type: Type.STRING, description: "A verified technical category for the issue." },
        isClear: { type: Type.BOOLEAN, description: "True if the description is understandable, False if it's gibberish." }
      },
      required: ["summary", "urgency", "category", "isClear"]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analise a seguinte solicitação de um cidadão para a prefeitura.
      Serviço Selecionado: ${serviceName}
      Descrição do Cidadão: "${description}"
      
      Retorne um JSON classificando essa demanda.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as AIAnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Fallback in case of error
    return {
      summary: "Análise indisponível",
      urgency: "Média",
      category: serviceName,
      isClear: true
    };
  }
};
