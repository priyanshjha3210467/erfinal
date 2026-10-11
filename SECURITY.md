# ExamReady Security and Deployment

## Current boundary

The public site reads study content from Firebase Realtime Database. Admin writes now require a Firebase Authentication ID token, and the included database rules deny writes except for one configured Firebase UID. The old browser-only default password is no longer used. Browser storage, HTML, and JavaScript are user-controlled and must never be treated as an authorization boundary.

The admin page accepts one shared password and checks it against each allowlisted Firebase team account. Live admin sync requires Email/Password auth and deployed database rules. Do not enable public database writes to make sync work.

## Firebase setup required before launch

1. In Firebase Authentication, enable Email/Password and create one account for each authorized admin listed in `examready-config.js`.
2. Set the same strong password on all listed accounts. The admin page checks that shared password with Firebase. The Web API key identifies the Firebase project; it is not the admin password. Restrict the key to the Firebase APIs and domains used by the site.
3. The account UID allowlist in `database.rules.json` must match `firebase.adminAccounts` exactly.
4. Select the intended Firebase project with `firebase use --add` or pass `--project <YOUR_FIREBASE_PROJECT_ID>`, then deploy with `firebase deploy --only database`. The included `firebase.json` points the CLI at this rules file. Verify in Firebase Console that the deployed rules match it.
5. Serve the site over HTTPS. Test a public read, a valid admin write, a signed-in non-admin write, and an unauthenticated write. Only the first two should succeed.

The rule set grants public reads only below `/siteData`; all other paths are denied. Writes to `/siteData` require one of the configured admin UIDs. Do not replace this with `.write: true`.

## Hosting protections

Use host-level response headers where supported: a restrictive Content-Security-Policy, `Strict-Transport-Security` on HTTPS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`. `X-Frame-Options` and CSP `frame-ancestors` must be response headers; HTML meta tags do not enforce them. Tailor CSP to the site's required analytics, fonts, ads, and Firebase origins, then test all pages before enforcing it.

Admin-managed ad snippets execute in visitors' browsers. Only trusted ad code should be added, and admin Firebase accounts must use unique, strong passwords with MFA where available.

Do not run `security-patch.sh` or inject `security.js`. That legacy browser script mutates JavaScript prototypes and advertises protections that cannot enforce server authorization; host headers and Firebase rules are the actual controls.

## Local verification

Run `node firebase-auth.test.js` and `node student-storage.test.js`. These test client logic only; Firebase Console rules and deployed hosting headers still require independent verification.
