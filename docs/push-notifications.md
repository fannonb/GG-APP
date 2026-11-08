# Push notifications: web and API

The checked local API environment has no VAPID public/private key pair. Production already had a complete VAPID configuration; those keys were preserved. API deployment `e935a361-99bf-4ba1-9c17-dacf31cba709` applied migration `202611080004_push_delivery` successfully, reports Web Push enabled, and passes database/Redis readiness checks. Live-device delivery has not been tested.

## What is implemented

The API stores each browser Web Push subscription and each mobile Expo token in `PushDevice`. Existing business events create inbox `Notification` records. The delivery worker polls committed records every five seconds and sends to all the user's registered devices. This covers ordinary creates, bulk inserts and nested writes, without matching records by title or guessing when a transaction commits.

Delivery state is persisted on the notification. An atomic claim prevents normal concurrent processing by separate API instances; an abandoned or failed claim becomes eligible again after ten minutes. Pending pushes expire after one hour. The database migration marks historical notifications processed so deployment does not replay old inboxes. Delivery is best effort and may repeat after a partial failure or a crash after sending. In-app notifications remain the authoritative history.

Expo messages use the `ggapp-alerts` Android channel and are split into supported batches. Accepted Expo ticket IDs are persisted and checked after fifteen minutes, including after an API restart. `DeviceNotRegistered` responses remove dead devices; credential errors are logged. Receipt acceptance means acceptance by FCM/APNs, not proof the user saw an alert. Receipts are retained for at most 24 hours.

## Enable the API

From `gg-app/backend`:

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:deploy
npm.cmd run build
```

Apply migration `202611080004_push_delivery` before running the updated API. If a running Windows API locks the Prisma engine DLL, stop that local API process before regenerating the client, then restart it after the migration and build. Do not run an older API beside the new worker during rollout: the older middleware can send the same notification independently.

Generate a VAPID pair once:

```powershell
npx.cmd web-push generate-vapid-keys
```

Set the API environment variables `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` (for example `mailto:support@gatewayglobal.africa`). Keep the private key on the API and keep the pair stable across deployments and instances. Restart the API. Its log should say `Web Push (VAPID) delivery enabled.`

The web app fetches the public key from the authenticated API. `VITE_VAPID_PUBLIC_KEY` is an optional build-time override; if set, it must match the API key. Mobile uses `EXPO_ACCESS_TOKEN` only if enhanced push security is enabled in the Expo project. Android also needs Firebase/FCM setup; see the mobile repository's `apps/mobile/docs/push-notifications.md`.

## Enable and test web notifications

1. Deploy the production web build over HTTPS with access to `/sw.js`. The Vite development server intentionally removes service workers, so use the deployed build or a production preview for testing.
2. Sign in as a patient and open **My Profile → Notifications on this device**. Providers use **Settings → Notifications on this device**. Press **Turn on notifications** and allow the browser prompt.
3. Trigger a real event from another account, such as an invoice or appointment update. Confirm the inbox entry and the device alert, then tap the alert and check its destination. Repeat with the app tab closed.
4. Turn notifications off, reload, and sign out/in. They should remain off until explicitly enabled. Signing out by itself removes the browser subscription while preserving the user's preference for their next sign-in.
5. On iPhone/iPad, install the web app on the Home Screen and enable notifications from that installed app.

The control checks the actual browser subscription, rather than treating notification permission as proof of registration. A failed public-key request can be retried. Device-side unsubscribe happens before API cleanup, so an unreachable API does not keep a browser receiving alerts. Notification links are restricted to the app origin.

## Verification commands

```powershell
# In gg-app
npm.cmd run build
node --test scripts/push-notifications.test.cjs

# In gg-app/backend
npm.cmd run build
npx.cmd prisma validate
node --test scripts/push-notifications.test.cjs
```

These checks do not send real pushes. Live delivery still needs deployed credentials, the database migration, browser permission, and a registered device.

References: [Expo push delivery and receipts](https://docs.expo.dev/push-notifications/sending-notifications/), [Android FCM credentials](https://docs.expo.dev/push-notifications/fcm-credentials/).
