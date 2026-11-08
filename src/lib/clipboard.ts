import { isNativePlatform } from '@/lib/native/capacitor'

/**
 * Copies text to clipboard using the best available platform mechanism:
 * 1. @capacitor/clipboard on native Android/iOS
 * 2. navigator.clipboard.writeText on modern secure browser contexts
 * 3. Fallback to hidden textarea execCommand('copy')
 *
 * Returns true if and only if the clipboard operation actually succeeded.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false

  // 1. Native Capacitor
  if (isNativePlatform()) {
    try {
      const { Clipboard } = await import('@capacitor/clipboard')
      await Clipboard.write({ string: text })
      return true
    } catch (nativeErr) {
      console.warn('[clipboard] Native clipboard write failed, falling back to browser API:', nativeErr)
    }
  }

  // 2. Standard navigator.clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (webErr) {
      console.warn('[clipboard] navigator.clipboard.writeText failed, falling back to execCommand:', webErr)
    }
  }

  // 3. Legacy textarea execCommand fallback
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.top = '0'
      textarea.style.left = '0'
      textarea.style.width = '2em'
      textarea.style.height = '2em'
      textarea.style.padding = '0'
      textarea.style.border = 'none'
      textarea.style.outline = 'none'
      textarea.style.boxShadow = 'none'
      textarea.style.background = 'transparent'
      textarea.setAttribute('readonly', '')
      document.body.appendChild(textarea)
      textarea.select()
      textarea.setSelectionRange(0, text.length)
      const success = document.execCommand('copy')
      document.body.removeChild(textarea)
      if (success) return true
    } catch (domErr) {
      console.warn('[clipboard] execCommand fallback failed:', domErr)
    }
  }

  return false
}
