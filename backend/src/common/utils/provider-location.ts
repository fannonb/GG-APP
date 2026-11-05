const GOOGLE_HOSTS = new Set(['google.com', 'www.google.com', 'maps.google.com', 'maps.app.goo.gl', 'goo.gl', 'www.google.co.ke', 'www.google.co.zw', 'www.google.co.zm', 'www.google.co.uk'])

export function googleMapsUrl(value: string): URL {
  const url = new URL(value)
  if (url.protocol !== 'https:' || !GOOGLE_HOSTS.has(url.hostname) || url.username || url.password || url.port) throw new Error('Use an HTTPS Google Maps link')
  if (url.hostname === 'goo.gl' && !url.pathname.startsWith('/maps/')) throw new Error('Use a Google Maps link')
  return url
}

export function coordinatePair(lat: string | number, lng: string | number) {
  if (String(lat).trim() === '' || String(lng).trim() === '') throw new Error('Provide both latitude and longitude')
  const pair = { lat: Number(lat), lng: Number(lng) }
  if (!Number.isFinite(pair.lat) || !Number.isFinite(pair.lng) || Math.abs(pair.lat) > 90 || Math.abs(pair.lng) > 180) throw new Error('Coordinates must be latitude -90…90 and longitude -180…180')
  return pair
}

export function coordinatesFromMapsUrl(value: string) {
  const url = googleMapsUrl(value)
  const text = decodeURIComponent(url.href)
  // Place coordinates take precedence over @lat,lng, which is only the camera centre.
  const pin = text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
  if (pin) return coordinatePair(pin[1], pin[2])
  for (const key of ['query', 'q', 'destination']) {
    const match = url.searchParams.get(key)?.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/)
    if (match) return coordinatePair(match[1], match[2])
  }
  const search = url.pathname.match(/\/search\/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)
  return search ? coordinatePair(search[1], search[2]) : null
}

export async function resolveMapsCoordinates(value: string) {
  let url = googleMapsUrl(value)
  for (let i = 0; i < 5; i++) {
    const point = coordinatesFromMapsUrl(url.href)
    if (point) return point
    // Only short links require a network request. Every redirect is checked before fetching.
    if (!['maps.app.goo.gl', 'goo.gl'].includes(url.hostname)) break
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(5000) })
    await response.body?.cancel()
    const location = response.headers.get('location')
    if (!location || response.status < 300 || response.status >= 400) break
    url = googleMapsUrl(new URL(location, url).href)
  }
  throw new Error('This Maps link does not contain an exact place pin. Open it and copy the pin coordinates into latitude and longitude')
}
