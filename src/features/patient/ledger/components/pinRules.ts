export interface LedgerPinCheck {
  id: 'length' | 'pattern' | 'year'
  label: string
  /** true = passes, false = fails. */
  ok: boolean
  /** Blocking checks must pass before the PIN can be saved. 'year' is advisory only. */
  blocking: boolean
}

/** One repeated digit (1111), or a straight run where every step is +1 (1234) or every step is -1 (4321). */
function isEasyPattern(pin: string): boolean {
  if (pin.length < 4 || !/^\d+$/.test(pin)) return false
  const digits = Array.from(pin, Number)
  const steps = digits.slice(1).map((digit, index) => digit - digits[index])
  return steps.every(step => step === 0) || steps.every(step => step === 1) || steps.every(step => step === -1)
}

/** A 4-digit PIN between 1900 and 2099, such as a birth year. */
function isYearLike(pin: string): boolean {
  if (!/^\d{4}$/.test(pin)) return false
  const value = Number(pin)
  return value >= 1900 && value <= 2099
}

/** Pure function, no React. */
export function checkLedgerPin(pin: string): LedgerPinCheck[] {
  return [
    { id: 'length', label: '4 to 6 digits', ok: /^\d{4,6}$/.test(pin), blocking: true },
    { id: 'pattern', label: 'Not an easy pattern like 1234 or 1111', ok: !isEasyPattern(pin), blocking: true },
    { id: 'year', label: 'Not a year, like your birth year', ok: !isYearLike(pin), blocking: false },
  ]
}

/** True when every blocking check passes. */
export function isLedgerPinAcceptable(pin: string): boolean {
  return checkLedgerPin(pin).every(check => !check.blocking || check.ok)
}
