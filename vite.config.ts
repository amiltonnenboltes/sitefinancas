import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import express from 'express';
import path from 'path';
import { defineConfig } from 'vite';
import { parseFinancialInput, chatFinancialAdvisor, getFinancialInsights } from './server/geminiService.ts';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'api-server-middleware',
        configureServer(server) {
          server.middlewares.use(express.json({ limit: '50mb' }));
          server.middlewares.use(express.urlencoded({ extended: true, limit: '50mb' }));

          server.middlewares.use(async (req: any, res: any, next: any) => {
            if (!req.url?.startsWith('/api/')) {
              return next();
            }

            res.setHeader('Content-Type', 'application/json');

            try {
              if (req.url === '/api/ai/parse' && req.method === 'POST') {
                const result = await parseFinancialInput(req.body);
                res.end(JSON.stringify(result));
                return;
              }

              if (req.url === '/api/ai/chat' && req.method === 'POST') {
                const result = await chatFinancialAdvisor(req.body);
                res.end(JSON.stringify(result));
                return;
              }

              if (req.url === '/api/ai/insights' && req.method === 'POST') {
                const result = await getFinancialInsights(req.body);
                res.end(JSON.stringify(result));
                return;
              }

              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Endpoint não encontrado' }));
            } catch (err: any) {
              console.error('API Error:', err);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message || 'Erro interno no servidor' }));
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
