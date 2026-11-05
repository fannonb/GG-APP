import type { ReactNode } from 'react'
import { GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'

export interface PinChangeSummaryProps {
  mode: 'create' | 'change' | 'reset'      // reset = "forgot PIN" flow using account password
  /** Names of providers who can currently see the history (empty when none). */
  activeProviders: string[]
  /** e.g. "3 Feb 2027", or null when the PIN never expires. */
  expiresOn: string | null
}

type IconName = 'key' | 'user-x' | 'lock' | 'calendar' | 'eye'

interface Tone {
  fg: string
  bg: string
}

interface SummaryItem {
  icon: IconName
  tone: Tone
  title: string
  detail: string
}

const BLUE: Tone = { fg: '#0B7BC0', bg: C.blue100 }
const GREEN: Tone = { fg: '#15803D', bg: 'rgba(34,197,94,0.12)' }
const AMBER: Tone = { fg: '#B45309', bg: 'rgba(245,166,35,0.14)' }
const NEUTRAL: Tone = { fg: C.textSub, bg: C.bg }

const ICON_PATHS: Record<IconName, ReactNode> = {
  key: (
    <>
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </>
  ),
  'user-x': (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M18 8l5 5M23 8l-5 5" />
    </>
  ),
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  eye: (
    <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
}

/** "A", "A and B", "A, B and C" */
function joinNames(names: string[]): string {
  if (names.length < 2) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

function buildItems({ mode, activeProviders, expiresOn }: PinChangeSummaryProps): SummaryItem[] {
  const isCreate = mode === 'create'

  const items: SummaryItem[] = [
    {
      icon: 'key',
      tone: BLUE,
      title: isCreate ? 'Your PIN works straight away' : 'Your new PIN works straight away',
      detail: isCreate
        ? 'Give it to a provider when you want them to see your history.'
        : 'Your old PIN stops working the moment you save.',
    },
  ]

  if (!isCreate) {
    const count = activeProviders.length
    if (count === 0) {
      items.push({
        icon: 'lock',
        tone: GREEN,
        title: 'No one loses access',
        detail: 'Nobody can see your history right now.',
      })
    } else if (count === 1) {
      items.push({
        icon: 'user-x',
        tone: AMBER,
        title: `${activeProviders[0]} loses access`,
        detail: 'They’ll need your new PIN to open your history again.',
      })
    } else {
      items.push({
        icon: 'user-x',
        tone: AMBER,
        title: `${count} providers lose access`,
        detail: joinNames(activeProviders),
      })
    }
  }

  items.push({
    icon: 'calendar',
    tone: NEUTRAL,
    title: expiresOn ? `Stops working on ${expiresOn}` : 'No end date',
    detail: expiresOn
      ? 'After that, set a new one before a provider can open your history.'
      : 'It keeps working until you change or turn it off.',
  })

  items.push({
    icon: 'eye',
    tone: NEUTRAL,
    title: 'You’ll see every use',
    detail: 'Each time a provider opens your history, it shows in your activity.',
  })

  return items
}

export function PinChangeSummary(props: PinChangeSummaryProps) {
  const { isMobile } = useResponsive()
  const items = buildItems(props)

  return (
    <GGCard padding={isMobile ? '18px 16px' : '22px 24px'}>
      <div style={{ fontFamily: font.family }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text }}>What happens when you save</h2>

        <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(item => (
            <li key={item.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: radius.full,
                  background: item.tone.bg,
                  color: item.tone.fg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {ICON_PATHS[item.icon]}
                </svg>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{item.title}</div>
                <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5, marginTop: 2 }}>{item.detail}</div>
              </div>
            </li>
          ))}
        </ul>

        <div aria-hidden="true" style={{ height: 1, background: C.border, margin: '16px 0 12px' }} />

        <p style={{ margin: 0, fontSize: 12, color: C.textSub, lineHeight: 1.5 }}>
          We never show your PIN to anyone, including our support team. If you forget it, you can reset it with your account password.
        </p>
      </div>
    </GGCard>
  )
}
