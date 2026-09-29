import 'dotenv/config';
import express from 'express';
import { processIncomingEvent, getMetrics } from './omniOpsCore.js';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OMNIOPS_SECRET_KEY = process.env.OMNIOPS_SECRET_KEY || 'token-segredo-padrao';

const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== OMNIOPS_SECRET_KEY) {
    return res.status(403).json({ status: 'error', message: 'Acesso negado: Chave de API inválida ou ausente.' });
  }
  next();
};

app.post('/webhook/:channel', verifyApiKey, async (req, res) => {
  const { channel } = req.params;
  const payload = req.body;

  console.log(`[OmniOps] Evento seguro recebido de [${channel}]`);

  const result = await processIncomingEvent(channel, payload);

  if (result.success) {
    res.status(200).json({
      status: 'success',
      message: 'Evento processado, validado, roteado e encadeado com sucesso.',
      routedTo: result.targetAgent,
      adaptivePayload: result.adaptivePayload,
      workflowChain: result.workflowChain
    });
  } else {
    res.status(500).json({ status: 'error', message: result.error });
  }
});

// Opção 2: Dashboard Web em Tempo Real com Tailwind CSS
app.get('/dashboard', (req, res) => {
  const metrics = getMetrics();
  const html = `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>OmniOps-AI Dashboard</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-900 text-slate-100 font-sans p-6">
      <div class="max-w-4xl mx-auto">
        <header class="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
          <h1 class="text-2xl font-bold text-emerald-400">🧠 OmniOps-AI Dashboard</h1>
          <span class="bg-emerald-500/20 text-emerald-400 text-xs px-3 py-1 rounded-full border border-emerald-500/30">Online no Termux</span>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div class="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <h2 class="text-slate-400 text-sm font-medium">Total de Requisições</h2>
            <p class="text-4xl font-extrabold mt-2 text-indigo-400">${metrics.totalRequests}</p>
          </div>
          <div class="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <h2 class="text-slate-400 text-sm font-medium">Último Agente Acionado</h2>
            <p class="text-2xl font-bold mt-2 text-amber-400">${metrics.lastAgent}</p>
          </div>
        </div>

        <div class="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h2 class="text-lg font-semibold mb-4 text-slate-200">Histórico Recente de Tráfego</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-slate-300">
              <thead class="bg-slate-700/50 uppercase text-xs text-slate-400">
                <tr>
                  <th class="p-3">Canal</th>
                  <th class="p-3">Agente Destino</th>
                  <th class="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                ${metrics.history.map(item => `
                  <tr class="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td class="p-3">${item.channel}</td>
                    <td class="p-3 font-semibold text-emerald-400">${item.agent}</td>
                    <td class="p-3 text-slate-400">${item.time}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  res.send(html);
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OmniOps-AI is online, secure & monitored' });
});

app.listen(PORT, () => {
  console.log(`🧠 OmniOps-AI rodando na porta ${PORT} com Dashboard e Workflows ativos`);
});
