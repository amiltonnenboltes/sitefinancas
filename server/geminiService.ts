import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the GoogleGenAI instance server-side
// Telemetry header 'aistudio-build' is required
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'Despesa' | 'Receita';
  category: string;
  payment_method: string;
  notes: string;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  summary: string;
  confidence: 'high' | 'medium' | 'low';
  raw_extracted_text?: string;
}

/**
 * Parses financial inputs (text, audio base64, or image base64) into structured transactions
 */
export async function parseFinancialInput(params: {
  type: 'text' | 'image' | 'audio';
  content?: string;
  dataBase64?: string;
  mimeType?: string;
  currentDate?: string;
}): Promise<ParseResult> {
  const todayStr = params.currentDate || new Date().toISOString().split('T')[0];

  const systemInstruction = `Você é o FinanIA, um especialista sênior em finanças pessoais brasileiras.
Sua missão é extrair transações financeiras (despesas ou receitas) com precisão cirúrgica a partir de:
- Mensagens de texto do usuário (ex: "gastei 45 no almoço no debito", "salario 4500 caiu hoje")
- Áudios de voz transcritos ou processados diretamente
- Imagens de notas fiscais, cupons fiscais (NFC-e / SAT), recibos bancários (Pix, TED, cartão), comprovantes ou anotações manuais em papel/rascunhos.

Regras fundamentais:
1. Data de referência de hoje: "${todayStr}".
   Se o usuário disser "ontem", "anteontem", "hoje", "sexta-feira", calcule a data correta no formato AAAA-MM-DD.
   Se a nota fiscal ou comprovante tiver data impressa, priorize a data impressa no documento. Se não encontrar data, use "${todayStr}".
2. Valor: sempre número positivo em Reais (Float ex: 45.90). Se for cupom fiscal com múltiplos itens, você pode:
   - Se for uma compra geral em supermercado/loja com valor total nítido, gere uma transação com o valor total e coloque os itens mais relevantes no campo 'notes'.
   - Se houver contas distintas ou o usuário listar gastos diferentes, gere múltiplas transações.
3. Tipo: Deve ser "Despesa" ou "Receita".
4. Categoria: Escolha a mais adequada entre:
   - Alimentação (supermercado, restaurante, lanchonete, delivery, café, padaria)
   - Transporte (combustível, uber, táxi, ônibus, metrô, estacionamento, pedágio, manutenção)
   - Moradia (aluguel, condomínio, luz, água, gás, internet, reformas, mobília)
   - Lazer (viagens, cinema, passeios, jogos, streaming, restaurantes comemorativos)
   - Saúde (farmácia, consultas, exames, plano de saúde, dentista)
   - Educação (cursos, faculdade, livros, material escolar)
   - Serviços (assinaturas, beleza, barbearia, lavanderia, manutenção)
   - Compras (roupas, eletrônicos, presentes, itens pessoais)
   - Investimentos (aportes, ações, poupança, tesouro)
   - Receitas/Salário (salário, freelance, rendimentos, pix recebido, venda de itens)
   - Outros
5. Forma de Pagamento: "Pix", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Boleto", "Transferência", "Não especificado".
6. Resumo amigável: crie um texto breve e cordial explicando o que você detectou e preparou para lançamento.`;

  const contentsParts: any[] = [];

  if (params.type === 'image' && params.dataBase64 && params.mimeType) {
    contentsParts.push({
      inlineData: {
        mimeType: params.mimeType,
        data: params.dataBase64,
      },
    });
    contentsParts.push({
      text: `Analise cuidadosamente esta imagem de nota fiscal, cupom fiscal, recibo ou anotação financeira. Extraia os dados das transações e retorne o JSON estruturado. Texto adicional do usuário: "${params.content || ''}"`,
    });
  } else if (params.type === 'audio' && params.dataBase64 && params.mimeType) {
    contentsParts.push({
      inlineData: {
        mimeType: params.mimeType,
        data: params.dataBase64,
      },
    });
    contentsParts.push({
      text: `Ouça atentamente este áudio em português contendo um relato de gasto ou receita financeira. Transcreva o que foi falado e extraia a transação financeira no formato JSON estruturado.`,
    });
  } else {
    contentsParts.push({
      text: `Texto informado pelo usuário: "${params.content || ''}"`,
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: contentsParts.length === 1 && typeof contentsParts[0].text === 'string' 
      ? contentsParts[0].text 
      : { parts: contentsParts },
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          transactions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING, description: 'Data formato YYYY-MM-DD' },
                description: { type: Type.STRING, description: 'Descrição concisa e identificável do gasto ou receita' },
                amount: { type: Type.NUMBER, description: 'Valor em Reais (ex: 29.90)' },
                type: { type: Type.STRING, description: 'Despesa ou Receita' },
                category: { type: Type.STRING, description: 'Categoria financeira padronizada' },
                payment_method: { type: Type.STRING, description: 'Pix, Cartão de Crédito, Cartão de Débito, Dinheiro, etc.' },
                notes: { type: Type.STRING, description: 'Itens listados, detalhes da loja ou observações úteis' },
              },
              required: ['date', 'description', 'amount', 'type', 'category'],
            },
          },
          summary: { type: Type.STRING, description: 'Resumo amigável em português' },
          confidence: { type: Type.STRING, description: 'high, medium ou low' },
          raw_extracted_text: { type: Type.STRING, description: 'Transcrição do áudio ou texto detectado na imagem' },
        },
        required: ['transactions', 'summary', 'confidence'],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Nenhuma resposta gerada pelo modelo de IA.');
  }

  return JSON.parse(text) as ParseResult;
}

/**
 * Chat endpoint for consulting financial status, answering questions, giving advice
 */
export async function chatFinancialAdvisor(params: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  financialContext: {
    spreadsheetTitle?: string;
    totalExpenses: number;
    totalIncome: number;
    balance: number;
    categoriesSummary: Array<{ category: string; total: number; count: number }>;
    recentTransactions: Array<{
      date: string;
      description: string;
      category: string;
      type: string;
      amount: number;
      payment_method?: string;
    }>;
    currentMonthName?: string;
  };
}) {
  const ctx = params.financialContext;

  const systemInstruction = `Você é o FinanIA, um assistente financeiro pessoal de inteligência artificial de alto nível.
Você tem acesso direto aos dados da planilha do Google Sheets do usuário em tempo real.

Dados Atuais da Planilha do Usuário:
- Título da Planilha: ${ctx.spreadsheetTitle || 'Minha Planilha de Gastos'}
- Período: ${ctx.currentMonthName || 'Mês Atual'}
- Saldo Atual: R$ ${ctx.balance.toFixed(2)}
- Total de Receitas: R$ ${ctx.totalIncome.toFixed(2)}
- Total de Despesas: R$ ${ctx.totalExpenses.toFixed(2)}

Gastos por Categoria:
${ctx.categoriesSummary.map(c => `- ${c.category}: R$ ${c.total.toFixed(2)} (${c.count} lançamentos)`).join('\n') || 'Nenhum gasto registrado ainda.'}

Últimos 15 Lançamentos na Planilha:
${ctx.recentTransactions.map(t => `- [${t.date}] ${t.description} (${t.category}) | ${t.type}: R$ ${t.amount.toFixed(2)} via ${t.payment_method || 'N/A'}`).join('\n') || 'Nenhuma transação recente.'}

Diretrizes para o diálogo:
1. Seja acolhedor, proativo, claro e empático. Responda em português brasileiro fluente.
2. Formate valores monetários no padrão do Brasil (R$ X.XXX,XX).
3. Use os dados reais acima para responder dúvidas específicas como:
   - "Quanto gastei em alimentação?"
   - "Qual foi meu maior gasto?"
   - "Como estão minhas finanças este mês?"
   - "Dicas para economizar"
4. Se o usuário informar que fez um novo gasto ou recebeu dinheiro durante o chat (ex: "paguei 30 reais na padaria agora"), acolha a informação e avise que você pode preparar o lançamento para a planilha dele!
5. Use markdown para listas, destaques em negrito e tabelas quando útil para a visualização financeira. Mantenha respostas elegantes e fáceis de ler no celular e no desktop.`;

  // Format messages into Gemini contents structure
  const formattedContents = params.messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: formattedContents,
    config: {
      systemInstruction,
      temperature: 0.7,
    },
  });

  return {
    reply: response.text || 'Desculpe, não consegui processar a resposta agora.',
  };
}

/**
 * Generates automated proactive insights and financial health score
 */
export async function getFinancialInsights(params: {
  financialContext: {
    totalExpenses: number;
    totalIncome: number;
    balance: number;
    categoriesSummary: Array<{ category: string; total: number; count: number }>;
    recentTransactions: Array<{
      date: string;
      description: string;
      category: string;
      type: string;
      amount: number;
    }>;
  };
}) {
  const ctx = params.financialContext;

  const prompt = `Analise os dados financeiros abaixo e forneça 3 a 4 insights inteligentes e uma nota de saúde financeira de 0 a 100 com dicas práticas.
Saldo: R$ ${ctx.balance.toFixed(2)}
Receitas: R$ ${ctx.totalIncome.toFixed(2)}
Despesas: R$ ${ctx.totalExpenses.toFixed(2)}
Categorias:
${ctx.categoriesSummary.map(c => `- ${c.category}: R$ ${c.total.toFixed(2)}`).join('\n')}
Últimos lançamentos:
${ctx.recentTransactions.slice(0, 10).map(t => `- ${t.date}: ${t.description} - R$ ${t.amount.toFixed(2)} (${t.category})`).join('\n')}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction: 'Você é um consultor financeiro analítico. Retorne os insights em formato JSON.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          healthScore: { type: Type.NUMBER, description: 'Nota de 0 a 100' },
          healthStatus: { type: Type.STRING, description: 'Excelente, Saudável, Atenção ou Crítico' },
          summaryHighlight: { type: Type.STRING, description: 'Frase de impacto sobre o momento financeiro' },
          insights: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                type: { type: Type.STRING, description: 'warning, success, tip, or info' },
                category: { type: Type.STRING },
              },
              required: ['title', 'description', 'type'],
            },
          },
        },
        required: ['healthScore', 'healthStatus', 'summaryHighlight', 'insights'],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error('Falha ao gerar insights');
  return JSON.parse(text);
}
