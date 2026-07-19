import { register } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const hook = pathToFileURL(resolve(fileURLToPath(new URL('.', import.meta.url)), 'resolve-alias.js'))
register(hook.href, import.meta.url)
