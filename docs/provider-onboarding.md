# Provider import and activation

Open **Admin → SP Applications → Import providers from CSV**. Download the template, fill one provider per row, then upload and preview. Import is all-or-nothing (maximum 200 providers, 1 MB). A duplicate email, invalid row, or save failure prevents the entire batch from being committed. Preview checks existing emails again at commit time.

Import creates pending applications and locked accounts. It sends no emails and creates no public provider listing. Review the details with each provider and approve the application. A decision note is optional for approval; rejection and requests for more information require a note. Approved imports remain hidden and locked until activation. Select the approved provider in **Provider setup invitations** and click **Send setup link**. This sends to the imported primary email, never an arbitrary recipient.

The setup link expires in 24 hours and works once. Resending invalidates the old link. Only a SHA-256 digest is stored. Activation verifies email ownership, saves a bcrypt password, unlocks the account and makes the approved provider visible. The provider signs in using the Service Provider tab and updates Settings → Public profile, licence details and payouts. Setup links are password creation links, not automatic login sessions.

## CSV fields

Keep the exact headers from `provider-import-template.csv`. Quote values containing commas, quotes or newlines; double embedded quotes. UTF-8 and a UTF-8 BOM are supported. Keep phone numbers, account numbers and licence numbers as text in spreadsheet editors so leading zeros and `+` signs are preserved.

| Column | Meaning |
| --- | --- |
| practiceName | Required practice name |
| email | Required primary account email; must be unique |
| emailSecondary | Optional secondary contact email |
| phone | Required phone including country code |
| country | Kenya, Zimbabwe, Zambia, KE, ZW or ZM |
| serviceTypes | Required exact names separated by `\|`: Hospital, Clinic, Doctor, Pharmacy, Laboratory, Radiology |
| address | Required street / physical address |
| city, region, locationLabel | Optional city, county/province and short location label |
| latitude, longitude | Decimal degrees, both supplied together; zero is valid |
| googleMapsUrl | HTTPS Google Maps pin link; alternative to coordinates |
| licenseNumber | Optional legacy licence number |
| businessRegNumber, taxPin | Optional company registration and tax identification |
| credentialsJson | Optional JSON array of licence details: kind, number, holderName, expiresAt. Kinds must match the registration form for the country and services. Documents cannot be uploaded in CSV. |
| hoursJson | Optional array such as `[{"day":"Mon","status":"open","from":"08:00","to":"17:00"}]`. Blank means not recorded; no opening hours are invented. |
| payoutMethod | Optional `mpesa`, `bank` or `mobile_money`. Blank defaults to bank with no account; no payout account is created until an account number is supplied. |
| accountNumber, accountName, bankName, bankBranch, payoutSummary | Optional payout details |

Passwords, terms acceptance and file uploads are not CSV fields. Providers choose their own passwords and add files after activation. Neither import nor admin approval records consent on their behalf.

## Locations

The preview shows the extracted coordinates for manual verification. Latitude must be between -90 and 90; longitude between -180 and 180. Coordinates are stored using the existing six-decimal database fields. When both coordinates and a Maps link are supplied they must agree within 0.0001 degrees.

Supported links contain an explicit coordinate query (`query`, `q`, `destination`, or coordinate search path) or Google place-pin coordinates (`!3d…!4d…`). Google short links are expanded with a timeout and a checked allowlist on each redirect. A map camera centre (`@lat,lng`), place-ID-only link or an address-only search does **not** establish an exact provider location and is rejected with instructions to copy the pin coordinates. No geocoding or Places API account is required. See [Google Maps URL semantics](https://developers.google.com/maps/documentation/urls/get-started).

## Licences

Registration accepts no licences, tax PIN or business registration. Blank cards are skipped. Details supplied are still validated; uploading a certificate, entering an expiry date or entering a holder name is optional. Once signed in, providers can add licence details and certificates in Settings. Changed credentials return to submitted status for admin review, with existing certificate files retained unless replaced. Admins can review these under the Approved applications tab.

## Rollout and verification

1. Deploy the additive Prisma migration `202611040001_provider_import` using the normal migration workflow (`npm.cmd run db:migrate` from the workspace).
2. Regenerate the Prisma client (`npm.cmd run prisma:generate --prefix gg-app/backend`) and restart the API. Stop the local API first on Windows if its loaded Prisma DLL prevents replacement.
3. Deploy the web build and API together. Configure email delivery before inviting providers.
4. Run `npm.cmd run build:web`, `npm.cmd run build:api`, then `node --test gg-app/backend/scripts/provider-onboarding.test.cjs` from the workspace.
5. In a staging database, preview and import a test provider, verify the details, approve without a note, send a test invitation, create the password, sign in and update Settings. Check resend, expiry, and reuse rejection.

For an optional integration check against localhost only, run `node scripts/provider-onboarding-smoke.cjs` from the backend directory after building. It creates a uniquely named synthetic provider, exercises the full flow with email stubbed, and removes its records in `finally`.

The unit tests use mocked persistence and mail; they do not modify a database or send email. A production migration and real email delivery are separate rollout steps.
