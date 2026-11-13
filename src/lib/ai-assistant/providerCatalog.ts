export type AIProviderId = 'nvidia' | 'openrouter' | 'amd' | 'gemini'

export type AIProviderRow = {
  id: AIProviderId
  label: string
  baseUrl: string
  model: string
  keyHint: string
  signupUrl: string
  note: string
}

/**
 * Each row is one OpenAI compatible endpoint. The assistant sends the same
 * request to every row, so a row is a base URL, a model name and a key.
 *
 * Order follows the provider table in the PRD. Decision DEC-17 puts
 * Cloudflare first and DEC-18 puts AMD second; that conflict is unresolved,
 * so this list keeps the PRD order and does not invent a third answer.
 *
 * Cloudflare is absent on purpose: its base URL carries an account id, so it
 * needs a configured account id before it can be a row.
 */
export const AI_PROVIDER_ROWS: AIProviderRow[] = [
  {
    id: 'nvidia',
    label: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    model: 'nvidia/nemotron-3.5-lightning-30b-a3b',
    keyHint: 'Starts with nvapi-',
    signupUrl: 'https://build.nvidia.com/models',
    note: 'Rate limited, no daily token cap on the free developer tier.',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openrouter/free',
    keyHint: 'Starts with sk-or-',
    signupUrl: 'https://openrouter.ai/keys',
    note: 'Free models only. 50 requests a day under 10 US dollars of lifetime credit.',
  },
  {
    id: 'amd',
    label: 'AMD Token Factory',
    baseUrl: 'https://developer.amd.com.cn/radeon/api/v1',
    model: 'DeepSeek-V4-Flash',
    keyHint: 'From the AMD AI Developer Program',
    signupUrl: 'https://developer.amd.com.cn',
    note: 'Largest daily allowance. The endpoint is on the China site, so it can be slow here.',
  },
  {
    id: 'gemini',
    label: 'Google AI Studio',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-3.5-flash-lite',
    keyHint: 'Starts with AIza',
    signupUrl: 'https://aistudio.google.com/apikey',
    note: '500 requests a day. The free tier may use content to improve its products.',
  },
]

export const AI_PROVIDER_ORDER: AIProviderId[] = AI_PROVIDER_ROWS.map((row) => row.id)

export function getAIProviderRow(id: string): AIProviderRow | undefined {
  return AI_PROVIDER_ROWS.find((row) => row.id === id)
}

export function orderedAIProviderRows(order: AIProviderId[] = AI_PROVIDER_ORDER): AIProviderRow[] {
  return order
    .map((id) => getAIProviderRow(id))
    .filter((row): row is AIProviderRow => Boolean(row))
}
