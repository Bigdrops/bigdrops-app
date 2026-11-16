/**
 * boluSpeech.ts — guarded bridge to the native Android Text-to-Speech plugin.
 *
 * The plugin (`BoluSpeechPlugin.java`) is registered in `MainActivity`. This
 * wrapper follows the existing native convention (`foldAwareness`, `localAI`):
 * probe for the plugin, call it, and degrade to a safe value if the call fails.
 *
 * No cloud service is used. The device speech engine reads the text locally.
 */

import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'

export type BoluSpeechCapability = {
  available: boolean
  platform: string
  engine: string
  language: string
  languageStatus: number
  missingLanguageData: boolean
  speaking: boolean
  message: string
}

export type BoluSpeechStateName = 'speaking' | 'completed' | 'stopped' | 'error'

export type BoluSpeechStateEvent = {
  messageId: string | null
  status: BoluSpeechStateName
  error: string | null
}

type BoluSpeechPlugin = {
  getCapability(): Promise<BoluSpeechCapability>
  speak(options: { text: string; messageId: string; rate: number }): Promise<{
    started: boolean
    maxLength: number
  }>
  stop(): Promise<{ stopped: boolean }>
  addListener(
    eventName: 'boluSpeechState',
    listenerFunc: (event: BoluSpeechStateEvent) => void,
  ): Promise<PluginListenerHandle>
}

const BoluSpeech = registerPlugin<BoluSpeechPlugin>('BoluSpeech')

const UNAVAILABLE_CAPABILITY: BoluSpeechCapability = {
  available: false,
  platform: 'web',
  engine: 'none',
  language: '',
  languageStatus: -2,
  missingLanguageData: false,
  speaking: false,
  message: 'The native speech bridge is not available.',
}

export function hasBoluSpeechPlugin(): boolean {
  try {
    return Capacitor.isPluginAvailable('BoluSpeech')
  } catch {
    return false
  }
}

export async function getBoluSpeechCapability(): Promise<BoluSpeechCapability> {
  if (!hasBoluSpeechPlugin()) return UNAVAILABLE_CAPABILITY

  try {
    const capability = await BoluSpeech.getCapability()
    return { ...UNAVAILABLE_CAPABILITY, ...capability }
  } catch {
    return UNAVAILABLE_CAPABILITY
  }
}

/** Speaks one prepared chunk. Returns false when the bridge refused the call. */
export async function speakBoluSpeech(options: {
  text: string
  messageId: string
  rate: number
}): Promise<boolean> {
  if (!hasBoluSpeechPlugin()) return false
  if (!options.text.trim()) return false

  try {
    const result = await BoluSpeech.speak(options)
    return result?.started === true
  } catch {
    return false
  }
}

export async function stopBoluSpeech(): Promise<void> {
  if (!hasBoluSpeechPlugin()) return

  try {
    await BoluSpeech.stop()
  } catch {
    // A rejected stop must not break the chat.
  }
}

export async function onBoluSpeechState(
  listener: (event: BoluSpeechStateEvent) => void,
): Promise<PluginListenerHandle | null> {
  if (!hasBoluSpeechPlugin()) return null

  try {
    return await BoluSpeech.addListener('boluSpeechState', listener)
  } catch {
    return null
  }
}
