import { useNavigate } from 'react-router-dom'
import { C, font, radius } from '@/design-system/tokens'
import { LOGO, ROUTES } from '@/router/routes'

export interface LegalSubsection {
  heading?: string
  intro?: string
  bullets?: string[]
  body?: string[]
}

export interface LegalSection {
  heading: string
  intro?: string
  bullets?: string[]
  body?: string[]
  subsections?: LegalSubsection[]
}

interface LegalDocumentScreenProps {
  title: string
  effectiveDate: string
  lastUpdated: string
  intro: string
  sections: LegalSection[]
}

function Paragraphs({ items }: { items?: string[] }) {
  if (!items) return null
  return (
    <>
      {items.map((paragraph, i) => (
        <p key={i} style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.7, marginBottom: '8px' }}>{paragraph}</p>
      ))}
    </>
  )
}

function Bullets({ items }: { items?: string[] }) {
  if (!items) return null
  return (
    <ul style={{ margin: '6px 0 10px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {items.map((bullet, i) => (
        <li key={i} style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6 }}>{bullet}</li>
      ))}
    </ul>
  )
}

export function LegalDocumentScreen({ title, effectiveDate, lastUpdated, intro, sections }: LegalDocumentScreenProps) {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: font.family }}>
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(ROUTES.REGISTER))}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600, color: C.textSub, fontFamily: font.family, padding: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back
          </button>
          <img src={LOGO} alt="GG'APP" style={{ height: 28, objectFit: 'contain' }} />
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 800, color: C.text, letterSpacing: '-0.03em', margin: 0 }}>{title}</h1>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '10px', marginBottom: '28px' }}>
          <span style={{ fontSize: '12px', color: C.textSub }}>Effective Date: <strong style={{ color: C.text }}>{effectiveDate}</strong></span>
          <span style={{ fontSize: '12px', color: C.textSub }}>Last Updated: <strong style={{ color: C.text }}>{lastUpdated}</strong></span>
        </div>

        <p style={{ fontSize: '14px', color: C.textSub, lineHeight: 1.7, marginBottom: '32px' }}>{intro}</p>

        {sections.map((section, index) => (
          <section key={section.heading} style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: index < sections.length - 1 ? `1px solid ${C.border}` : 'none' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: C.navy800, letterSpacing: '-0.01em', marginBottom: '10px' }}>
              {index + 1}. {section.heading}
            </h2>
            {section.intro && (
              <p style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.7, marginBottom: '8px' }}>{section.intro}</p>
            )}
            <Bullets items={section.bullets} />
            <Paragraphs items={section.body} />
            {section.subsections?.map((sub, subIndex) => (
              <div key={subIndex} style={{ marginTop: subIndex === 0 ? '4px' : '16px' }}>
                {sub.heading && (
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: C.text, marginBottom: '6px' }}>{sub.heading}</h3>
                )}
                {sub.intro && (
                  <p style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.7, marginBottom: '8px' }}>{sub.intro}</p>
                )}
                <Bullets items={sub.bullets} />
                <Paragraphs items={sub.body} />
              </div>
            ))}
          </section>
        ))}

        <div style={{ padding: '16px 18px', background: C.blue100, borderRadius: radius.sm, fontSize: '12px', color: '#1A5D8A', lineHeight: 1.6 }}>
          GG'APP · Gateway Global Healthcare Platform
        </div>
      </div>
    </div>
  )
}
