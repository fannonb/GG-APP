const multipliers: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
}

export function parseDurationToMs(value: string) {
  const trimmed = value.trim()
  const match = trimmed.match(/^(\d+)([smhd])$/i)

  if (!match) {
    const asNumber = Number(trimmed)
    if (!Number.isNaN(asNumber)) return asNumber
    throw new Error(`Unsupported duration value: ${value}`)
  }

  const amount = Number(match[1])
  const unit = match[2].toLowerCase()
  return amount * multipliers[unit]
}

export function parseDurationToSeconds(value: string) {
  return Math.floor(parseDurationToMs(value) / 1000)
}
