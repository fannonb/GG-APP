import { LegalDocumentScreen } from './LegalDocumentScreen'
import { PRIVACY_POLICY_EFFECTIVE_DATE, PRIVACY_POLICY_LAST_UPDATED, PRIVACY_POLICY_INTRO, PRIVACY_POLICY_SECTIONS } from './privacyPolicyContent'

export function PrivacyPolicyScreen() {
  return (
    <LegalDocumentScreen
      title="Privacy Policy"
      effectiveDate={PRIVACY_POLICY_EFFECTIVE_DATE}
      lastUpdated={PRIVACY_POLICY_LAST_UPDATED}
      intro={PRIVACY_POLICY_INTRO}
      sections={PRIVACY_POLICY_SECTIONS}
    />
  )
}
