import Anthropic from '@anthropic-ai/sdk';
import { log } from './logger';
import { WHATSAPP_AGENT_SYSTEM_PROMPT, buildLeadContextBlock } from './systemPrompt';
import { runCalculateRiskTool } from './riskCalculatorTool';
import { createPreauthCheckoutSession } from './gatewayClient';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const WHATSAPP_AGENT_MODEL = process.env.WHATSAPP_AGENT_MODEL || 'claude-sonnet-5';

export const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

const CALCULATE_RISK_TOOL = {
  name: 'calculate_risk',
  description:
    'Calculate the recommended MT5 lot size, dollar risk, risk:reward ratio, and prop-firm ' +
    'daily-loss/drawdown impact for a specific trade, using the real numbers the lead gives you. ' +
    "This is the live demo of Fortify's risk calculator -- the core of the sales pitch. Call it " +
    'whenever the lead has given enough numbers (equity + instrument + stop distance or entry/stop ' +
    'prices) for a real calculation. Never estimate the math yourself.',
  input_schema: {
    type: 'object' as const,
    properties: {
      instrumentSymbol: { type: 'string', description: "e.g. 'EUR/USD', 'XAU/USD', 'US30'." },
      equity: { type: 'number', description: 'Account equity/balance in USD.' },
      riskPercent: { type: 'number', description: 'Percent of equity to risk (e.g. 1 for 1%). Used if riskAmount not given.' },
      riskAmount: { type: 'number', description: 'Dollar amount to risk. Takes priority over riskPercent.' },
      entryPrice: { type: 'number' },
      stopLoss: { type: 'number' },
      takeProfit: { type: 'number' },
      manualStopDistance: { type: 'number', description: 'Stop distance in pips/points, if given instead of prices.' },
      manualTargetDistance: { type: 'number' },
      dailyLossLimitAmount: { type: 'number', description: "The prop firm's daily loss limit in USD, if known." },
      totalDrawdownLimitAmount: { type: 'number', description: "The prop firm's max drawdown limit in USD, if known." },
    },
    required: ['instrumentSymbol', 'equity'],
  },
};

const RECORD_LEAD_INFO_TOOL = {
  name: 'record_lead_info',
  description:
    'Save a qualifying fact you just learned about this lead (prop firm, account size, past rule ' +
    'violations, plan interest, objections raised) so it persists across the conversation. Call this ' +
    'every time you learn something new -- do not wait until the end.',
  input_schema: {
    type: 'object' as const,
    properties: {
      propFirm: { type: 'string' },
      accountSizeUsd: { type: 'number' },
      pastViolations: { type: 'string' },
      planInterest: { type: 'string' },
      objections: { type: 'string' },
    },
  },
};

const CREATE_PAID_CHECKOUT_LINK_TOOL = {
  name: 'create_paid_checkout_link',
  description:
    'Create a real Stripe checkout link for a paid Fortify plan once the lead has explicitly ' +
    'confirmed they want to buy a specific plan. Never call this speculatively -- only when they have ' +
    'said yes to a plan.',
  input_schema: {
    type: 'object' as const,
    properties: { planSlug: { type: 'string', description: 'Plan slug, e.g. monthly, annual, vip.' } },
    required: ['planSlug'],
  },
};

export interface AgentTurnInput {
  conversationId: string;
  phoneNumber: string;
  history: { role: 'user' | 'assistant'; content: any }[];
  newUserMessage: string;
  leadContext: Record<string, unknown>;
}

export interface AgentTurnResult {
  replyText: string;
  updatedLeadContext?: Record<string, unknown>;
  toolCalls: any[];
}

const MAX_TOOL_ITERATIONS = 6;

export async function runAgentTurn(opts: AgentTurnInput): Promise<AgentTurnResult> {
  if (!anthropic) {
    throw new Error('ANTHROPIC_API_KEY is not configured.');
  }

  const messages: any[] = [...opts.history, { role: 'user', content: opts.newUserMessage }];
  let updatedLeadContext: Record<string, unknown> | undefined;
  const toolCalls: any[] = [];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: WHATSAPP_AGENT_MODEL,
      max_tokens: 2048,
      system: [
        { type: 'text', text: WHATSAPP_AGENT_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: buildLeadContextBlock({ ...opts.leadContext, ...updatedLeadContext }) },
      ],
      messages,
      tools: [CALCULATE_RISK_TOOL, RECORD_LEAD_INFO_TOOL, CREATE_PAID_CHECKOUT_LINK_TOOL],
      output_config: { effort: 'medium' },
    } as any);

    messages.push({ role: 'assistant', content: response.content });

    const toolUseBlocks = (response.content as any[]).filter((b: any) => b.type === 'tool_use');
    if (toolUseBlocks.length === 0) {
      const replyText = response.content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('\n')
        .trim();
      return {
        replyText: replyText || 'Desculpe, não consegui responder agora. Pode repetir?',
        updatedLeadContext,
        toolCalls,
      };
    }

    const toolResults: any[] = [];
    for (const toolUse of toolUseBlocks) {
      toolCalls.push({ name: toolUse.name, input: toolUse.input });
      if (toolUse.name === 'calculate_risk') {
        try {
          const result = runCalculateRiskTool(toolUse.input);
          toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(result) });
        } catch (err: any) {
          toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: err?.message || 'calc failed', is_error: true });
        }
      } else if (toolUse.name === 'record_lead_info') {
        updatedLeadContext = { ...opts.leadContext, ...updatedLeadContext, ...toolUse.input };
        toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: 'saved' });
      } else if (toolUse.name === 'create_paid_checkout_link') {
        try {
          const { checkout_url } = await createPreauthCheckoutSession({
            planSlug: String(toolUse.input.planSlug),
            phoneNumber: opts.phoneNumber,
          });
          toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify({ checkout_url }) });
        } catch (err: any) {
          toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: err?.message || 'checkout link failed', is_error: true });
        }
      } else {
        toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: 'Unknown tool', is_error: true });
      }
    }
    messages.push({ role: 'user', content: toolResults });
  }

  log.warn({ event: 'whatsapp_agent_tool_loop_exhausted', conversationId: opts.conversationId });
  return {
    replyText: 'Deixa eu confirmar isso com a equipe e já te retorno.',
    updatedLeadContext,
    toolCalls,
  };
}
