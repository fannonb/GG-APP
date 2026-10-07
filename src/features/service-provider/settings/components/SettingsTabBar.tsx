import { UnderlineTabs } from '@/components/UnderlineTabs'
import { SETTINGS_TABS, type SettingsTabId } from '../settings.helpers'

export function SettingsTabBar({
  tab,
  onChange,
}: {
  tab: SettingsTabId
  onChange: (next: SettingsTabId) => void
}) {
  return <UnderlineTabs tabs={SETTINGS_TABS} active={tab} onChange={onChange} />
}
