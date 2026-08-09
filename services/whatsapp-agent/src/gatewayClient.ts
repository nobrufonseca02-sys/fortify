const GATEWAY_INTERNAL_URL = process.env.GATEWAY_INTERNAL_URL || 'http://127.0.0.1:3001';
const WHATSAPP_SERVICE_SECRET = process.env.WHATSAPP_SERVICE_SECRET || '';

export async function createPreauthCheckoutSession(params: {
  planSlug: string;
  phoneNumber: string;
  leadEmail?: string | null;
}): Promise<{ checkout_url: string; session_id: string }> {
  if (!WHATSAPP_SERVICE_SECRET) {
    throw new Error('WHATSAPP_SERVICE_SECRET is not configured.');
  }

  const response = await fetch(`${GATEWAY_INTERNAL_URL}/internal/whatsapp/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-whatsapp-service-secret': WHATSAPP_SERVICE_SECRET,
    },
    body: JSON.stringify({
      planSlug: params.planSlug,
      phoneNumber: params.phoneNumber,
      leadEmail: params.leadEmail || undefined,
    }),
  });

  const body: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error || `Gateway returned ${response.status} creating checkout session`);
  }

  return body as { checkout_url: string; session_id: string };
}
