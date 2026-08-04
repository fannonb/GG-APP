import { LegalDocumentScreen } from './LegalDocumentScreen'
import { TERMS_EFFECTIVE_DATE, TERMS_LAST_UPDATED, TERMS_INTRO, TERMS_SECTIONS } from './termsContent'

export function TermsScreen() {
  return (
    <LegalDocumentScreen
      title="Terms and Conditions"
      effectiveDate={TERMS_EFFECTIVE_DATE}
      lastUpdated={TERMS_LAST_UPDATED}
      intro={TERMS_INTRO}
      sections={TERMS_SECTIONS}
    />
  )
}
