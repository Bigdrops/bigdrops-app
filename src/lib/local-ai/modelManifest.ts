export const BIGDROPS_LOCAL_AI_POC_MODEL_ID = 'qwen3-0.6b-instruct-q4-k-m-gguf-poc'

export type LocalAIModelManifest = {
  modelId: string
  displayName: string
  providerLabel: string
  sourceRepository: string
  sourceRevision: string
  sourceFilename: string
  downloadUrl: string
  expectedSha256: string
  expectedBytes: number
  appPrivateFilename: string
  license: string
  purpose: string
}

export const BIGDROPS_LOCAL_AI_POC_MODEL: LocalAIModelManifest = {
  modelId: BIGDROPS_LOCAL_AI_POC_MODEL_ID,
  displayName: 'Qwen3 0.6B Q4_K_M GGUF',
  providerLabel: 'QuantFactory community GGUF of Qwen3 0.6B',
  sourceRepository: 'QuantFactory/Qwen3-0.6B-GGUF',
  sourceRevision: 'e7e05d713acaa2baccdfb52e967eaba8ba562ba8',
  sourceFilename: 'Qwen3-0.6B.Q4_K_M.gguf',
  downloadUrl:
    'https://huggingface.co/QuantFactory/Qwen3-0.6B-GGUF/resolve/e7e05d713acaa2baccdfb52e967eaba8ba562ba8/Qwen3-0.6B.Q4_K_M.gguf?download=1',
  expectedSha256: '7af3fdf842f87b24672f8a7f1dd50404043f0bfb71093ff91c31d2b49df4631d',
  expectedBytes: 484_220_000,
  appPrivateFilename: 'qwen3-0.6b-instruct-q4-k-m-gguf-poc.gguf',
  license: 'Apache-2.0 base model; community GGUF quantization for POC verification.',
  purpose: 'Read-only Cleanup Hub duplicate review suggestions.',
}

