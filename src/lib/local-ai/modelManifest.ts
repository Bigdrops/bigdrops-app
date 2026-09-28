export const BIGDROPS_LOCAL_AI_POC_MODEL_ID = 'qwen3-1.7b-instruct-q4-k-m-gguf-poc'
export const BIGDROPS_LOCAL_AI_LITE_MODEL_ID = 'qwen3-0.6b-instruct-q4-k-m-gguf-poc'

export type LocalAIModelTier = 'lite' | 'standard'

export type LocalAIModelBenchmarkStatus = 'load-proven' | 'device-unproven'

export type LocalAIModelManifest = {
  modelId: string
  displayName: string
  family: string
  tier: LocalAIModelTier
  description: string
  providerLabel: string
  sourceRepository: string
  sourceRevision: string
  sourceFilename: string
  downloadUrl: string
  expectedSha256: string
  expectedBytes: number
  appPrivateFilename: string
  license: string
  quantization: string
  runtime: string
  recommended: boolean
  recommendationNote?: string
  benchmarkStatus: LocalAIModelBenchmarkStatus
  enabled: boolean
  purpose: string
}

export const BIGDROPS_LOCAL_AI_LITE_MODEL: LocalAIModelManifest = {
  modelId: BIGDROPS_LOCAL_AI_LITE_MODEL_ID,
  displayName: 'Qwen3 0.6B Q4_K_M GGUF',
  family: 'Qwen3',
  tier: 'lite',
  description: 'Lower memory and faster candidate. Useful on weaker devices and for benchmark comparison.',
  providerLabel: 'QuantFactory community GGUF of Qwen3 0.6B Base',
  sourceRepository: 'QuantFactory/Qwen3-0.6B-GGUF',
  sourceRevision: 'e7e05d713acaa2baccdfb52e967eaba8ba562ba8',
  sourceFilename: 'Qwen3-0.6B.Q4_K_M.gguf',
  downloadUrl:
    'https://huggingface.co/QuantFactory/Qwen3-0.6B-GGUF/resolve/e7e05d713acaa2baccdfb52e967eaba8ba562ba8/Qwen3-0.6B.Q4_K_M.gguf?download=1',
  expectedSha256: '7af3fdf842f87b24672f8a7f1dd50404043f0bfb71093ff91c31d2b49df4631d',
  expectedBytes: 484_220_000,
  appPrivateFilename: 'qwen3-0.6b-instruct-q4-k-m-gguf-poc.gguf',
  license: 'Apache-2.0 base model.',
  quantization: 'Q4_K_M',
  runtime: 'llama.cpp GGUF on Android arm64-v8a with a 4096-token context.',
  recommended: false,
  benchmarkStatus: 'load-proven',
  enabled: true,
  purpose: 'Read-only Cleanup Hub duplicate review suggestions.',
}

export const BIGDROPS_LOCAL_AI_POC_MODEL: LocalAIModelManifest = {
  modelId: BIGDROPS_LOCAL_AI_POC_MODEL_ID,
  displayName: 'Qwen3 1.7B Instruct Q4_K_M GGUF',
  family: 'Qwen3',
  tier: 'standard',
  description: 'Stronger Cleanup reasoning candidate. Recommended where storage and memory allow.',
  providerLabel: 'Unsloth community GGUF of Qwen3 1.7B Instruct (imatrix)',
  sourceRepository: 'unsloth/Qwen3-1.7B-GGUF',
  sourceRevision: 'd7f544eead698dbd1f15126ef60b45a1e1933222',
  sourceFilename: 'Qwen3-1.7B-Q4_K_M.gguf',
  downloadUrl:
    'https://huggingface.co/unsloth/Qwen3-1.7B-GGUF/resolve/d7f544eead698dbd1f15126ef60b45a1e1933222/Qwen3-1.7B-Q4_K_M.gguf?download=1',
  expectedSha256: 'b139949c5bd74937ad8ed8c8cf3d9ffb1e99c866c823204dc42c0d91fa181897',
  expectedBytes: 1_107_409_472,
  appPrivateFilename: 'qwen3-1.7b-instruct-q4-k-m-gguf-poc.gguf',
  license: 'Apache-2.0 base model (Qwen3 1.7B Instruct).',
  quantization: 'Q4_K_M',
  runtime: 'llama.cpp GGUF on Android arm64-v8a with a 4096-token context.',
  recommended: true,
  recommendationNote: 'Recommended where storage and memory allow.',
  benchmarkStatus: 'device-unproven',
  enabled: true,
  purpose: 'Read-only Cleanup Hub duplicate review suggestions.',
}

export const LOCAL_AI_MODEL_CATALOG: LocalAIModelManifest[] = [
  BIGDROPS_LOCAL_AI_LITE_MODEL,
  BIGDROPS_LOCAL_AI_POC_MODEL,
]

export function getLocalAIModelManifest(modelId: string | null | undefined): LocalAIModelManifest | undefined {
  const normalized = String(modelId || '').trim()
  if (!normalized) return undefined
  return LOCAL_AI_MODEL_CATALOG.find((entry) => entry.enabled && entry.modelId === normalized)
}
