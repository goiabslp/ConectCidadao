import { GoogleGenAI, Type } from "@google/genai";

// Configuração para o Vercel
export default async function handler(req: any, res: any) {
  // Habilita CORS para testes locais se necessário, embora no Vercel seja mesma origem
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { description, serviceName } = req.body;

    if (!description || !serviceName) {
      return res.status(400).json({ error: 'Missing description or serviceName' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const schema = {
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
    
    const result = JSON.parse(text);
    return res.status(200).json(result);

  } catch (error) {
    console.error("Backend Gemini Analysis Error:", error);
    return res.status(500).json({
      summary: "Análise indisponível",
      urgency: "Média",
      category: "Erro Interno",
      isClear: true
    });
  }
}