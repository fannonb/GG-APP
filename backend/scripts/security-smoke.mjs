// One-off security smoke test for the hardened auth endpoints.
const BASE = 'http://localhost:3001/api/v1'
const results = []
const log = (name, pass, detail) => {
  results.push(`${pass ? 'PASS' : 'FAIL'} - ${name}${detail ? ' | ' + detail : ''}`)
}

async function post(path, body, headers = {}) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  let data = null
  try {
    data = await res.json()
  } catch {}
  return { status: res.status, data }
}

// 1. Login throttle: 12 bad attempts. With a 10/min limit the first 429
// must land by attempt 11 (earlier if a rolling window already holds
// stale counts from a prior run).
let first429 = 0
for (let i = 1; i <= 12; i++) {
  const r = await post('/auth/login', { email: 'nobody@example.com', password: 'wrong-wrong-wrong', role: 'sp' })
  if (r.status === 429 && !first429) first429 = i
}
log('login throttle (limit 10/min)', first429 > 0 && first429 <= 11, `first 429 at attempt ${first429}`)

// The throttle bucket is per-IP per-route with a 60s window, so wait it
// out before the real-login tests below.
console.log('waiting 61s for the throttle window to reset...')
await new Promise(resolve => setTimeout(resolve, 61_000))

// 2. Invalid refresh token -> 401
const badRefresh = await post('/auth/refresh', { refreshToken: 'garbage.token.here' })
log('invalid refresh rejected', badRefresh.status === 401, `status ${badRefresh.status}`)

// 3. SP login -> tokens
const sp = await post('/auth/login', { email: 'city-medical-centre@example.com', password: 'Password1', role: 'sp' })
log('SP login succeeds', sp.status === 201 || sp.status === 200, `status ${sp.status}`)
const tokens = sp.data

// 4. Access token works on protected route
const dash = await fetch(BASE + '/sp/dashboard', { headers: { Authorization: `Bearer ${tokens.accessToken}` } })
log('access token accepted on /sp/dashboard', dash.status === 200, `status ${dash.status}`)

// 5. Refresh rotation: first use OK, replay rejected
const r1 = await post('/auth/refresh', { refreshToken: tokens.refreshToken })
log('refresh rotation works', r1.status === 201 || r1.status === 200, `status ${r1.status}`)
const r2 = await post('/auth/refresh', { refreshToken: tokens.refreshToken })
log('refresh token replay rejected', r2.status === 401, `status ${r2.status}`)

// 6. Access revocation: old access token dies instantly after logout.
// Sleep 1s so the new access token's `iat` strictly precedes the
// second-resolution revocation cutoff set by logout.
const oldAccess = r1.data.accessToken
const pre = await fetch(BASE + '/sp/dashboard', { headers: { Authorization: `Bearer ${oldAccess}` } })
await new Promise(resolve => setTimeout(resolve, 1100))
const lo = await post(
  '/auth/logout',
  { refreshToken: r1.data.refreshToken },
  { Authorization: `Bearer ${r1.data.accessToken}` },
)
const after = await fetch(BASE + '/sp/dashboard', { headers: { Authorization: `Bearer ${oldAccess}` } })
log('logout returns ok', lo.status === 201 || lo.status === 200, `status ${lo.status}`)
log('access token revoked instantly after logout', pre.status === 200 && after.status === 401, `before=${pre.status} after=${after.status}`)

// 7. Re-login after revocation works (cutoff doesn't lock the user out).
await new Promise(resolve => setTimeout(resolve, 1100))
const relog = await post('/auth/login', { email: 'city-medical-centre@example.com', password: 'Password1', role: 'sp' })
const reDash = await fetch(BASE + '/sp/dashboard', { headers: { Authorization: `Bearer ${relog.data.accessToken}` } })
log('fresh login after revocation works', reDash.status === 200, `status ${reDash.status}`)

// cleanup: logout the new session too
await post(
  '/auth/logout',
  { refreshToken: relog.data.refreshToken },
  { Authorization: `Bearer ${relog.data.accessToken}` },
)

console.log(results.join('\n'))
process.exit(results.some(line => line.startsWith('FAIL')) ? 1 : 0)
