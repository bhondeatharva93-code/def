export interface AdvisorMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AdvisorResponse {
  reply: string;
  productIds: string[];
}

export async function askPcAdvisor(
  messages: AdvisorMessage[],
  productId = '',
  endpoint = '/api/assistant'
): Promise<AdvisorResponse> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, productId })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Assistant request failed (${response.status})`);
  }

  return {
    reply: typeof data.reply === 'string' ? data.reply : '',
    productIds: Array.isArray(data.productIds) ? data.productIds : []
  };
}
