import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { parseFinancialInput, chatFinancialAdvisor, getFinancialInsights } from './server/geminiService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Endpoints
app.post('/api/ai/parse', async (req, res) => {
  try {
    const result = await parseFinancialInput(req.body);
    res.json(result);
  } catch (err: any) {
    console.error('API /api/ai/parse error:', err);
    res.status(500).json({ error: err.message || 'Erro ao processar entrada financeira' });
  }
});

app.post('/api/ai/chat', async (req, res) => {
  try {
    const result = await chatFinancialAdvisor(req.body);
    res.json(result);
  } catch (err: any) {
    console.error('API /api/ai/chat error:', err);
    res.status(500).json({ error: err.message || 'Erro ao consultar assistente financeiro' });
  }
});

app.post('/api/ai/insights', async (req, res) => {
  try {
    const result = await getFinancialInsights(req.body);
    res.json(result);
  } catch (err: any) {
    console.error('API /api/ai/insights error:', err);
    res.status(500).json({ error: err.message || 'Erro ao gerar insights' });
  }
});

// Serve frontend build if in dist
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FinanIA server running on port ${PORT}`);
});
