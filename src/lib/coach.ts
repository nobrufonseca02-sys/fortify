import { gatewayJsonHeaders } from '@/lib/gateway';

const gatewayUrl = () => {
  const configuredUrl = String(
    import.meta.env.VITE_BILLING_API_URL ||
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_BACKEND_URL ||
      import.meta.env.VITE_PUBLIC_BACKEND_URL ||
      '',
  ).trim();

  if (configuredUrl) return configuredUrl.replace(/\/+$/, '');
  if (import.meta.env.DEV) return '/api';

  const legacyGatewayUrl = String(import.meta.env.VITE_METAAPI_GATEWAY_URL || '').trim();
  return legacyGatewayUrl ? legacyGatewayUrl.replace(/\/+$/, '') : '';
};

function coachErrorMessage(body: any, fallback: string) {
  const code = String(body?.code || '');
  if (code === 'plan_required') {
    return 'O coach de risco com IA é um recurso do plano pago Fortify.';
  }
  if (code === 'daily_limit_reached') {
    return 'Você atingiu o limite de mensagens do coach por hoje. Tente novamente amanhã.';
  }
  if (code === 'coach_not_configured') {
    return 'O coach de risco ainda não está disponível. Tente novamente em breve.';
  }
  if (['missing_user_session', 'invalid_user_session', 'user_session_check_failed'].includes(code)) {
    return 'Sessão expirada. Entre novamente para continuar a conversa.';
  }
  return body?.error || fallback;
}

export interface CoachChatResponse {
  reply: string;
  conversationId: string;
}

export async function sendCoachMessage({
  accessToken,
  tradingAccountId,
  message,
}: {
  accessToken: string;
  tradingAccountId: string;
  message: string;
}): Promise<CoachChatResponse> {
  const response = await fetch(`${gatewayUrl()}/coach/chat`, {
    method: 'POST',
    headers: gatewayJsonHeaders(accessToken),
    body: JSON.stringify({ tradingAccountId, message }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(coachErrorMessage(body, 'Falha ao conversar com o coach de risco.')) as Error & { code?: string };
    error.code = body?.code;
    throw error;
  }

  return body as CoachChatResponse;
}
