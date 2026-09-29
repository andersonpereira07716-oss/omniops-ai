import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const AVAILABLE_AGENTS = [
  "atendeProIA",
  "Nexa-omni-v3",
  "divulga-ai",
  "guardiao-pro",
  "ContentFlow-ai",
  "suporte-vendas-ai"
];

// Registo de métricas em memória para o Dashboard
let metricsStore = {
  totalRequests: 0,
  lastAgent: 'Nenhum',
  history: []
};

export function getMetrics() {
  return metricsStore;
}

export async function processIncomingEvent(channel, rawData) {
  try {
    let targetAgent = 'atendeProIA';
    const messageText = JSON.stringify(rawData).toLowerCase();

    try {
      const prompt = `
        Você é o OmniOps-AI, o cérebro orquestrador de um ecossistema de IAs.
        Analise a seguinte mensagem/payload recebida do canal "${channel}":
        "${messageText}"

        Escolha estritamente UM dos seguintes agentes para lidar com esta requisição:
        ${AVAILABLE_AGENTS.join(', ')}

        Responda APENAS com o nome exato do agente escolhido. Nada mais.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      if (response.text) {
        targetAgent = response.text.trim();
      }
    } catch (apiError) {
      console.warn('API do Gemini indisponível. Usando roteamento inteligente por regras locais...');
      
      if (messageText.includes('pagamento') || messageText.includes('pix') || messageText.includes('plano') || messageText.includes('comprar')) {
        targetAgent = 'suporte-vendas-ai';
      } else if (messageText.includes('erro') || messageText.includes('bug') || messageText.includes('falha') || messageText.includes('alerta')) {
        targetAgent = 'guardiao-pro';
      } else if (messageText.includes('divulgar') || messageText.includes('marketing') || messageText.includes('anúncio')) {
        targetAgent = 'divulga-ai';
      } else if (messageText.includes('conteúdo') || messageText.includes('post') || messageText.includes('vídeo')) {
        targetAgent = 'ContentFlow-ai';
      } else {
        targetAgent = 'Nexa-omni-v3';
      }
    }

    // Atualiza métricas para o Dashboard
    metricsStore.totalRequests += 1;
    metricsStore.lastAgent = targetAgent;
    metricsStore.history.unshift({
      channel,
      agent: targetAgent,
      time: new Date().toLocaleTimeString()
    });
    if (metricsStore.history.length > 10) metricsStore.history.pop();

    // Opção 3: Sistema de Encadeamento de Agentes (Multi-Agent Workflow)
    let workflowChain = [{ agent: targetAgent, status: 'executed' }];

    if (targetAgent === 'guardiao-pro') {
      if (process.env.TELEGRAM_BOT_TOKEN) {
        await sendTelegramAlert(`🚨 **Alerta Crítico do Guardião-Pro via OmniOps**: \n${JSON.stringify(rawData)}`);
      }
      // Encadeamento automático secundário: notifica também o suporte de engenharia/vendas se for crítico
      workflowChain.push({ agent: 'suporte-vendas-ai', status: 'cascaded_safety_alert' });
    } else if (targetAgent === 'suporte-vendas-ai') {
      // Encadeamento automático secundário: dispara registo de lead ou verificação de gateway
      workflowChain.push({ agent: 'Nexa-omni-v3', status: 'logged_for_crm' });
    }

    const adaptivePayload = generateAdaptivePayload(targetAgent, rawData);

    return { success: true, targetAgent, adaptivePayload, workflowChain };
  } catch (error) {
    console.error('Erro no processamento do OmniOps:', error);
    return { success: false, error: error.message };
  }
}

function generateAdaptivePayload(agent, originalData) {
  switch (agent) {
    case 'suporte-vendas-ai':
      return { priority: 'high', action: 'check_pix_gateway', autoReplyTemplate: 'Olá, verificamos o seu pagamento. Um atendente de vendas já vai ajudar.' };
    case 'guardiao-pro':
      return { priority: 'critical', securityCheck: true, notifyChannels: ['telegram', 'dashboard'] };
    case 'divulga-ai':
      return { campaignType: 'lead_generation', targetAudience: 'general' };
    case 'ContentFlow-ai':
      return { contentType: 'social_media', autoSchedule: true };
    default:
      return { priority: 'normal', routedBy: 'OmniOps-Core' };
  }
}

async function sendTelegramAlert(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' })
  });
}
