import { BadRequestException } from '@nestjs/common'
import { ECDH } from 'node:crypto'

/** Only browser-vendor push origins may receive subscription traffic. No redirects are followed by web-push. */
export function validatePushDestination(endpoint: string) {
  let url: URL
  try { url = new URL(endpoint) } catch { throw new BadRequestException('Invalid push endpoint') }
  const host = url.hostname
  const allowed = host === 'fcm.googleapis.com' || host === 'updates.push.services.mozilla.com' ||
    /^[a-z0-9-]+\.push\.apple\.com$/.test(host) || /^[a-z0-9-]+\.notify\.windows\.com$/.test(host)
  if (url.protocol !== 'https:' || url.port || url.username || url.password || url.hash || !allowed) {
    throw new BadRequestException('Unsupported push endpoint')
  }
}

export function validatePushKeys(keys: Record<string, string> | undefined) {
  const publicKey = keys?.p256dh
  const auth = keys?.auth
  if (!publicKey || !auth || !/^[\w-]{87}=?$/.test(publicKey) || !/^[\w-]{22}={0,2}$/.test(auth)) {
    throw new BadRequestException('Invalid web push keys')
  }
  try {
    const point = Buffer.from(publicKey, 'base64url')
    if (point.length !== 65 || point[0] !== 4 || Buffer.from(auth, 'base64url').length !== 16) throw new Error()
    ECDH.convertKey(point, 'prime256v1')
  } catch { throw new BadRequestException('Invalid web push keys') }
}
