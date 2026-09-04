import type { Request, Response } from 'express'

/** Name of the httpOnly refresh-session cookie (web cookie mode). */
export const REFRESH_COOKIE_NAME = 'gg_refresh'

export interface RefreshCookieOptions {
  /** Cookie lifetime in seconds (must match the refresh token TTL). */
  maxAgeSeconds: number
  /** Only set `Secure` over real HTTPS deployments. */
  secure: boolean
}

/**
 * Stores the refresh token in an httpOnly SameSite=Lax cookie so it never
 * touches page-visible storage (localStorage/sessionStorage are script- and
 * XSS-readable; the cookie is not). SameSite=Lax is correct for the same
 * registrable-domain layout (e.g. app.gatewayglobal.africa → api.gatewayglobal.africa).
 */
export function setRefreshCookie(res: Response, value: string, opts: RefreshCookieOptions) {
  res.cookie(REFRESH_COOKIE_NAME, value, {
    httpOnly: true,
    secure: opts.secure,
    sameSite: 'lax',
    path: '/',
    maxAge: opts.maxAgeSeconds * 1000,
  })
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })
}

/** Reads the raw `gg_refresh` cookie value without requiring cookie-parser. */
export function getRefreshCookie(req: Request): string | null {
  const header = req.headers?.cookie
  if (!header) return null
  for (const part of String(header).split(';')) {
    const separator = part.indexOf('=')
    if (separator === -1) continue
    const name = part.slice(0, separator).trim()
    if (name === REFRESH_COOKIE_NAME) {
      return decodeURIComponent(part.slice(separator + 1).trim()) || null
    }
  }
  return null
}