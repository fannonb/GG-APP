// Session-security smoke test for the hardened auth endpoints.
// Requires the backend on :3001 with a seeded SP account
// (city-medical-centre@example.com / Password1). Enables SESSION_COOKIE_MODE=true
// on the backend to exercise the httpOnly-cookie web flow.
const BASE = process.env.BASE || 'http://localhost:3001/api/v1'
const results = []
const log = (name, pass, detail) => {
  results.push(`${pass ? 'PASS' : 'FAIL'} - ${name}${detail ? ' | ' + detail : ''}`)
}

async function call(path, { method = 'GET', body, headers = {}, cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let data = null
  try {
    data = await res.json()
  } catch {}
  return { status: res.status, data, setCookie: res.headers.get('set-cookie') ?? '' }
}

const post = (path, body, headers = {}) => call(path, { method: 'POST', body, headers })
const authGet = (path, token) =>
  call(path, { headers: { Authorization: `Bearer ${token}` } })
const postWeb = (path, body, cookie) =>
  call(path, { method: 'POST', body, cookie, headers: { 'x-client': 'web' } })

function decodeJwt(token) {
  try {
    const part = token.split('.')[1]
    const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    return JSON.parse(json)
  } catch {
    return null
  }
}

// 1. Login throttle: 12 bad attempts. With a 10/min limit the first 429
// must land by attempt 11.
let first429 = 0
for (let i = 1; i <= 12; i++) {
  const r = await post('/auth/login', { email: 'nobody@example.com', password: 'wrong-wrong-wrong', role: 'sp' })
  if (r.status === 429 && !first429) first429 = i
}
log('login throttle (limit 10/min)', first429 > 0 && first429 <= 11, `first 429 at attempt ${first429}`)

// Throttle bucket is per-IP per-route with a 60s window — wait it out first.
console.log('waiting 61s for the throttle window to reset...')
await new Promise(resolve => setTimeout(resolve, 61_000))

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36'

// 2. Invalid refresh token -> 401
const badRefresh = await post('/auth/refresh', { refreshToken: 'garbage.token.here' })
log('invalid refresh rejected', badRefresh.status === 401, `status ${badRefresh.status}`)

// 3. SP login -> tokens carry a per-session jti
const sp = await post('/auth/login', {
  email: 'city-medical-centre@example.com',
  password: 'Password1',
  role: 'sp',
}, { 'user-agent': UA })
log('SP login succeeds', sp.status === 201 || sp.status === 200, `status ${sp.status}`)
const tokens = sp.data

const accessPayload = decodeJwt(tokens.accessToken)
log('access token carries session jti', !!accessPayload?.jti, `jti=${accessPayload?.jti?.slice(0, 8)}…`)
log('session id echoed in response', tokens.sessionId === accessPayload?.jti, `sessionId=${tokens.sessionId?.slice(0, 8)}…`)

// 4. Access token works on protected route
const dash = await authGet('/sp/dashboard', tokens.accessToken)
log('access token accepted on /sp/dashboard', dash.status === 200, `status ${dash.status}`)

// 5. Refresh rotation: first use OK, replay rejected AND reuse kills the session
const r1 = await post('/auth/refresh', { refreshToken: tokens.refreshToken })
log('refresh rotation works', r1.status === 201 || r1.status === 200, `status ${r1.status}`)
const r2 = await post('/auth/refresh', { refreshToken: tokens.refreshToken })
log('refresh token replay rejected', r2.status === 401, `status ${r2.status}`)
const r3 = await post('/auth/refresh', { refreshToken: r1.data.refreshToken })
log('rotated-token reuse rejected (theft containment)', r3.status === 401, `status ${r3.status}`)

// 6. Per-session revocation isolation: revoking session A must NOT kill session B
const spA = await post('/auth/login', { email: 'city-medical-centre@example.com', password: 'Password1', role: 'sp' }, { 'user-agent': UA })
const spB = await post('/auth/login', { email: 'city-medical-centre@example.com', password: 'Password1', role: 'sp' }, { 'user-agent': UA })
const jtiA = decodeJwt(spA.data.accessToken).jti
const currentB = decodeJwt(spB.data.accessToken).jti
const sessionsForB = await authGet('/auth/sessions', spB.data.accessToken)
log('generic /auth/sessions lists sessions for any role', sessionsForB.status === 200 && Array.isArray(sessionsForB.data), `count=${sessionsForB.data?.length}`)
const currentFlagged = sessionsForB.data?.find(s => s.current)
log('"current" flag matches the caller session', currentFlagged?.sessionId === currentB, `flagged=${currentFlagged?.sessionId?.slice(0, 8)}… expected=${currentB?.slice(0, 8)}…`)
log('device label derived from User-Agent', sessionsForB.data?.some(s => /Chrome/.test(s.device ?? '')), JSON.stringify(sessionsForB.data?.map(s => s.device)))

const revoke = await post(`/auth/sessions/${jtiA}/revoke`, {}, { Authorization: `Bearer ${spB.data.accessToken}` })
log('session A revoked', revoke.status === 201 || revoke.status === 200, `status ${revoke.status}`)
const afterA = await authGet('/sp/dashboard', spA.data.accessToken)
const afterB = await authGet('/sp/dashboard', spB.data.accessToken)
log('revoked session A access token dies instantly', afterA.status === 401, `A status ${afterA.status}`)
log('session B access token survives revocation of A', afterB.status === 200, `B status ${afterB.status}`)
const sessionsAfter = await authGet('/auth/sessions', spB.data.accessToken)
log('revoked session leaves the active list', !sessionsAfter.data.some(s => s.sessionId === jtiA), `A present=${sessionsAfter.data.some(s => s.sessionId === jtiA)}`)

// 7. Logout kills only that session too
const pre = await authGet('/sp/dashboard', spB.data.accessToken)
await post(
  '/auth/logout',
  { refreshToken: spB.data.refreshToken },
  { Authorization: `Bearer ${spB.data.accessToken}` },
)
const postLogout = await authGet('/sp/dashboard', spB.data.accessToken)
log('logout instantly revokes its access token', pre.status === 200 && postLogout.status === 401, `before=${pre.status} after=${postLogout.status}`)

// 8. Cookie-mode web flow (httpOnly refresh cookie, no body token)
const webLogin = await postWeb('/auth/login', { email: 'city-medical-centre@example.com', password: 'Password1', role: 'sp' })
const cookieModeCookie = webLogin.setCookie.match(/gg_refresh=([^;]+)/)?.[0]
log('web logins get httpOnly refresh cookie', !!cookieModeCookie && /HttpOnly/i.test(webLogin.setCookie), `set-cookie=${webLogin.setCookie?.slice(0, 60)}`)
log('body refresh token withheld in cookie mode', webLogin.data?.cookieSession === true && webLogin.data?.refreshToken === '', `cookieSession=${webLogin.data?.cookieSession}`)
if (cookieModeCookie) {
  const webRefresh = await postWeb('/auth/refresh', {}, cookieModeCookie)
  log('cookie-mode refresh works with cookie only', (webRefresh.status === 201 || webRefresh.status === 200) && webRefresh.data?.cookieSession === true, `status ${webRefresh.status}`)
  const newCookie = webRefresh.setCookie.match(/gg_refresh=([^;]+)/)?.[0] ?? cookieModeCookie
  const webSessions = await authGet('/auth/sessions', webRefresh.data.accessToken)
  log('cookie-mode session appears in active list', webSessions.status === 200 && webSessions.data?.some(s => s.current), `count=${webSessions.data?.length}`)
  // L8: logout also requires a live access token.
  await call('/auth/logout', {
    method: 'POST',
    body: {},
    headers: {
      'x-client': 'web',
      Authorization: `Bearer ${webRefresh.data.accessToken}`,
    },
    cookie: newCookie,
  })
  const afterWebLogout = await authGet('/sp/dashboard', webRefresh.data.accessToken)
  log('cookie-mode logout revokes access token', afterWebLogout.status === 401, `status ${afterWebLogout.status}`)
} else {
  log('cookie-mode flow exercised (needs SESSION_COOKIE_MODE=true)', true, 'SKIPPED')
}

// 9. Fresh login after per-session revocation works immediately
const relog = await post('/auth/login', { email: 'city-medical-centre@example.com', password: 'Password1', role: 'sp' })
const reDash = await authGet('/sp/dashboard', relog.data.accessToken)
log('fresh login after revocation works', reDash.status === 200, `status ${reDash.status}`)
await post(
  '/auth/logout',
  { refreshToken: relog.data.refreshToken },
  { Authorization: `Bearer ${relog.data.accessToken}` },
)

console.log(results.join('\n'))
process.exit(results.some(line => line.startsWith('FAIL')) ? 1 : 0)
