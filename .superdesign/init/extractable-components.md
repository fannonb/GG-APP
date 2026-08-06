# Extractable reusable components

Catalog of shared layout and basic components suitable for Superdesign DraftComponents. Only state/navigation differences should become props; brand assets and visual styling remain hardcoded.

## AuthCompactBrandHeader
- Source: `src/features/auth/components/AuthCompactBrandHeader.tsx`
- Category: layout
- Description: Mobile/tablet GG’APP brand lockup with role-aware accent and tagline.
- Extractable props: tab
- Hardcoded: Logo path, GG’APP wordmark, atmospheric glows, typography, spacing, accent rail

## AuthBrandPanel
- Source: `src/features/auth/components/AuthBrandPanel.tsx`
- Category: layout
- Description: Desktop authentication hero panel with brand story, feature cards, and role-aware preview widget.
- Extractable props: tab
- Hardcoded: Logo, benefit copy, preview values, icons, navy background, motion

## EntityTabBar
- Source: `src/features/auth/components/EntityTabBar.tsx`
- Category: basic
- Description: Patient/service-provider segmented role control.
- Extractable props: tab, setTab
- Hardcoded: Labels, two-option geometry, easing, surface treatment

## AppLayout
- Source: `src/layouts/patient/AppLayout.tsx`
- Category: layout
- Description: Responsive patient portal shell.
- Extractable props: pageTitle/active state and navigation callbacks exposed by source
- Hardcoded: Breakpoints and portal chrome

## AppSidebar
- Source: `src/layouts/patient/AppSidebar.tsx`
- Category: layout
- Description: Patient desktop navigation sidebar.
- Extractable props: active route, notification/badge state where exposed
- Hardcoded: Logo, navigation labels, icon set, CSS

## AppTopBar
- Source: `src/layouts/patient/AppTopBar.tsx`
- Category: layout
- Description: Patient top bar with page controls.
- Extractable props: dynamic title and user/notification state where exposed
- Hardcoded: Iconography and surface styling

## SPLayout
- Source: `src/layouts/sp/SPLayout.tsx`
- Category: layout
- Description: Responsive service-provider portal shell.
- Extractable props: active navigation and children
- Hardcoded: Breakpoints and shell styling

## SPSidebar
- Source: `src/layouts/sp/SPSidebar.tsx`
- Category: layout
- Description: Provider desktop navigation.
- Extractable props: active item and badge state where exposed
- Hardcoded: Logo, labels, icons, color treatment

## SPBottomNav
- Source: `src/layouts/sp/SPBottomNav.tsx`
- Category: layout
- Description: Provider mobile bottom navigation.
- Extractable props: active item
- Hardcoded: Labels, icon set, fixed positioning

## AdminLayout
- Source: `src/layouts/admin/AdminLayout.tsx`
- Category: layout
- Description: Administration portal shell.
- Extractable props: children and active navigation where exposed
- Hardcoded: Admin chrome and responsive behavior

## GGButton
- Source: `src/design-system/GGButton.tsx`
- Category: basic
- Description: Shared branded action control.
- Extractable props: variant, size, loading, fullWidth, disabled, children
- Hardcoded: Variant CSS, font, radii

## GGInput
- Source: `src/design-system/GGInput.tsx`
- Category: basic
- Description: Shared labeled form input.
- Extractable props: label, error, adornments, focusColor, focusShadow, input props
- Hardcoded: Field geometry and base typography

## GGSelect
- Source: `src/design-system/GGSelect.tsx`
- Category: basic
- Description: Shared labeled select field.
- Extractable props: label, options/value, error, placeholder, disabled
- Hardcoded: Field geometry and chevron treatment

## GGCard
- Source: `src/design-system/GGCard.tsx`
- Category: basic
- Description: Shared surface container.
- Extractable props: children and supported visual variants
- Hardcoded: Base surface, border, radius, shadow

## GGBadge
- Source: `src/design-system/GGBadge.tsx`
- Category: basic
- Description: Compact semantic status label.
- Extractable props: variant/status and children
- Hardcoded: Badge sizing and type treatment

## GGAvatar
- Source: `src/design-system/GGAvatar.tsx`
- Category: basic
- Description: User/provider image with fallback.
- Extractable props: src, alt/name, size
- Hardcoded: Fallback treatment

## StepIndicator
- Source: `src/design-system/StepIndicator.tsx`
- Category: basic
- Description: Registration/onboarding step progress.
- Extractable props: current step and step collection
- Hardcoded: Connector and indicator styling
