# Key page dependency trees

These are the complete local design/rendering candidate trees for the authentication pages currently in scope. Third-party packages are omitted. For barrel imports, only the exports actually consumed by the page are expanded; shared infrastructure behind the auth mutation layer is grouped under that layer to keep the design payload practical.

## /login (Login)
Entry: `src/features/auth/LoginScreen.tsx`

Dependencies:
- `src/design-system/index.ts` (selected export: `GGInput`)
  - `src/design-system/GGInput.tsx`
    - `src/design-system/tokens.ts`
- `src/design-system/tokens.ts` (already listed)
- `src/hooks/useResponsive.ts`
  - `src/hooks/useMediaQuery.ts`
- `src/router/routes.ts`
- `src/lib/google-pkce.ts`
- `src/features/auth/components/AuthBrandPanel.tsx`
  - `src/design-system/tokens.ts` (already listed)
  - `src/router/routes.ts` (already listed)
  - `src/hooks/useResponsive.ts` (already listed)
- `src/features/auth/components/AuthCompactBrandHeader.tsx`
  - `src/design-system/tokens.ts` (already listed)
  - `src/router/routes.ts` (already listed)
  - `src/hooks/useResponsive.ts` (already listed)
- `src/features/auth/components/EntityTabBar.tsx`
  - `src/design-system/tokens.ts` (already listed)
- `src/schemas/auth.schema.ts`
- `src/hooks/api/index.ts` (selected exports: login and Google auth mutations)
  - `src/hooks/api/useAuthMutations.ts`
    - `src/api/services/auth.service.ts`
    - `src/store/auth.store.ts`
    - `src/store/notifications.store.ts`
    - `src/store/user.store.ts`
    - `src/lib/query-client.ts`
    - `src/router/routes.ts` (already listed)
    - `src/api/types.ts`
    - `src/api/client.ts`
    - `src/api/config.ts`
    - `src/lib/google-pkce.ts` (already listed)
- `src/api/types.ts` (already listed)

## /register (Registration)
Entry: `src/features/auth/RegisterScreen.tsx`

Dependencies:
- `src/design-system/tokens.ts`
- `src/router/routes.ts`
- `src/hooks/useResponsive.ts`
  - `src/hooks/useMediaQuery.ts`
- `src/features/auth/components/AuthBrandPanel.tsx`
  - `src/design-system/tokens.ts` (already listed)
  - `src/router/routes.ts` (already listed)
  - `src/hooks/useResponsive.ts` (already listed)
- `src/features/auth/components/AuthCompactBrandHeader.tsx`
  - `src/design-system/tokens.ts` (already listed)
  - `src/router/routes.ts` (already listed)
  - `src/hooks/useResponsive.ts` (already listed)
- `src/features/auth/components/EntityTabBar.tsx`
  - `src/design-system/tokens.ts` (already listed)
- `src/features/auth/components/PatientRegisterFlow.tsx`
  - `src/design-system/index.ts` (selected exports: `GGInput`, `GGButton`, `GGDatePicker`)
    - `src/design-system/GGInput.tsx`
    - `src/design-system/GGButton.tsx`
    - `src/design-system/GGDatePicker.tsx`
    - `src/design-system/tokens.ts` (already listed)
  - `src/hooks/useResponsive.ts` (already listed)
  - `src/features/auth/components/PasswordStrength.tsx`
    - `src/design-system/tokens.ts` (already listed)
  - `src/features/auth/components/CountryPhoneInput.tsx`
    - `src/design-system/tokens.ts` (already listed)
    - `src/config/countries.ts`
    - `src/components/FlagImg.tsx`
  - `src/schemas/auth.schema.ts`
  - `src/hooks/api/useAuthMutations.ts`
    - `src/api/services/auth.service.ts`
    - `src/store/auth.store.ts`
    - `src/store/notifications.store.ts`
    - `src/store/user.store.ts`
    - `src/lib/query-client.ts`
    - `src/router/routes.ts` (already listed)
    - `src/api/types.ts`
    - `src/api/client.ts`
    - `src/api/config.ts`
    - `src/lib/google-pkce.ts`
- `src/features/auth/components/SPRegisterFlow.tsx`
  - `src/design-system/index.ts` (selected exports: `GGButton`, `GGInput`; already listed)
  - `src/design-system/tokens.ts` (already listed)
  - `src/api/types.ts` (already listed)
  - `src/hooks/api/useAuthMutations.ts` (already listed)
  - `src/hooks/useResponsive.ts` (already listed)
  - `src/features/auth/components/CountryPhoneInput.tsx` (already listed)
  - `src/features/auth/components/LocationPickerInput.tsx`
    - `src/design-system/tokens.ts` (already listed)
  - `src/features/auth/components/PasswordStrength.tsx` (already listed)

## /forgot-password (Forgot password)
Entry: `src/features/auth/ForgotPasswordScreen.tsx`

Dependencies:
- `src/design-system/index.ts` (selected exports: `GGButton`, `GGInput`)
  - `src/design-system/GGButton.tsx`
  - `src/design-system/GGInput.tsx`
  - `src/design-system/tokens.ts`
- `src/hooks/api/index.ts` (selected export: forgot-password mutation)
  - `src/hooks/api/useAuthMutations.ts`
    - `src/api/services/auth.service.ts`
    - `src/api/types.ts`
    - `src/api/client.ts`
    - `src/api/config.ts`
- `src/hooks/useResponsive.ts`
  - `src/hooks/useMediaQuery.ts`
- `src/router/routes.ts`
- `src/api/types.ts` (already listed)
- `src/features/auth/components/AuthBrandPanel.tsx`
  - `src/design-system/tokens.ts` (already listed)
  - `src/router/routes.ts` (already listed)
  - `src/hooks/useResponsive.ts` (already listed)

## /reset-password (Reset password)
Entry: `src/features/auth/ResetPasswordScreen.tsx`

Dependencies:
- `src/design-system/index.ts` (selected exports: `GGButton`, `GGInput`)
  - `src/design-system/GGButton.tsx`
  - `src/design-system/GGInput.tsx`
  - `src/design-system/tokens.ts`
- `src/api/types.ts`
- `src/api/config.ts`
- `src/hooks/api/index.ts` (selected export: reset-password mutation)
  - `src/hooks/api/useAuthMutations.ts`
    - `src/api/services/auth.service.ts`
    - `src/api/client.ts`
- `src/hooks/useResponsive.ts`
  - `src/hooks/useMediaQuery.ts`
- `src/router/routes.ts`
- `src/features/auth/components/AuthBrandPanel.tsx`
  - `src/design-system/tokens.ts` (already listed)
  - `src/router/routes.ts` (already listed)
  - `src/hooks/useResponsive.ts` (already listed)

## /verify (Email verification)
Entry: `src/features/auth/EmailVerifyScreen.tsx`

Dependencies:
- `src/design-system/index.ts` (selected exports: `GGInput`, `GGButton`)
  - `src/design-system/GGInput.tsx`
  - `src/design-system/GGButton.tsx`
  - `src/design-system/tokens.ts`
- `src/api/config.ts`
- `src/api/types.ts`
- `src/hooks/api/index.ts` (selected export: email-verification mutation)
  - `src/hooks/api/useAuthMutations.ts`
    - `src/api/services/auth.service.ts`
    - `src/api/client.ts`
- `src/hooks/useResponsive.ts`
  - `src/hooks/useMediaQuery.ts`
- `src/router/routes.ts`
- `src/features/auth/components/AuthBrandPanel.tsx`
  - `src/design-system/tokens.ts` (already listed)
  - `src/router/routes.ts` (already listed)
  - `src/hooks/useResponsive.ts` (already listed)

## /onboarding (Patient onboarding)
Entry: `src/features/auth/OnboardingScreen.tsx`

Dependencies:
- `src/design-system/index.ts` (selected exports: `GGInput`, `GGButton`)
  - `src/design-system/GGInput.tsx`
  - `src/design-system/GGButton.tsx`
  - `src/design-system/tokens.ts`
- `src/design-system/tokens.ts` (already listed)
- `src/router/routes.ts`
- `src/hooks/useResponsive.ts`
  - `src/hooks/useMediaQuery.ts`
