import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const src = path.resolve(__dirname, '../../files/app-logo.js')
const out = path.resolve(__dirname, '../public/logo.png')

const content = fs.readFileSync(src, 'utf8')
const match = content.match(/const GGAPP_LOGO = '(data:image\/png;base64,[^']+)'/)
if (!match) throw new Error('Logo base64 not found in app-logo.js')

const b64 = match[1].replace(/^data:image\/png;base64,/, '')
fs.writeFileSync(out, Buffer.from(b64, 'base64'))
console.log(`Wrote ${out} (${b64.length} base64 chars)`)
