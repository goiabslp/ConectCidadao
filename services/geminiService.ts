import { AIAnalysisResult } from '../types';

// A chave de API foi removida do front-end por segurança.
// A lógica foi movida para api/gemini.ts (Serverless Function).

export const analyzeReport = async (description: string, serviceName: string): Promise<AIAnalysisResult> => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description,
        serviceName
      }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    return data as AIAnalysisResult;

  } catch (error) {
    console.error("API Request Error:", error);
    // Fallback in case of server error
    return {
      summary: "Análise indisponível",
      urgency: "Média",
      category: serviceName,
      isClear: true
    };
  }
};