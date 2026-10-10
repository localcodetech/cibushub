# Google and Apple sign-in: setup

How to switch on "Continue with Google" and "Continue with Apple". The code is already in place. A button stays hidden, and the server answers `503 SOCIAL_LOGIN_UNAVAILABLE`, until its ID is set.

Addresses used below:

| Where | Address |
|---|---|
| App (production) | `https://app.cibushubgh.com` |
| API (production) | `https://api.cibushubgh.com` |
| Laptop through a tunnel (testing) | `https://dev.cibushubgh.com` |
| Laptop (normal development) | `http://localhost:5173` |

Apple does not accept `localhost` or `http`, so you test Apple through the tunnel. Google works on `localhost` too.

---

## 1. Google

Free. Takes about 15 minutes.

1. Open [console.cloud.google.com](https://console.cloud.google.com) and create a project named **CibusHub**, or pick the existing one you use for Maps.
2. Go to **Google Auth Platform → Branding** and fill in:
   - App name: `CibusHub`
   - User support email: your email
   - App logo: optional (adding one can trigger a short Google review)
   - App home page: `https://app.cibushubgh.com`
   - Privacy policy: `https://app.cibushubgh.com/privacy`
   - Terms of service: `https://app.cibushubgh.com/terms`
   - Authorised domain: `cibushubgh.com`
   - Developer contact: your email
3. **Audience:** choose **External**. While it is in **Testing**, only the Google accounts you add under "Test users" can sign in, so add your own. Click **Publish app** before launch. We only ask for name and email, so no Google verification is needed.
4. **Data access:** keep the defaults (`openid`, `email`, `profile`).
5. **Clients → Create client → Web application**, name it `CibusHub Web`. Under **Authorised JavaScript origins**, add all four:
   - `http://localhost`
   - `http://localhost:5173`
   - `https://dev.cibushubgh.com`
   - `https://app.cibushubgh.com`

   Leave **Authorised redirect URIs** empty. The button hands the token straight to the page.
6. Copy the **Client ID**. It ends in `.apps.googleusercontent.com` and is public (not a secret). Put the same value in two places:
   - `server/.env`: `GOOGLE_CLIENT_ID=...`
   - `client/.env`: `VITE_GOOGLE_CLIENT_ID=...`

---

## 2. Apple

Needs the Apple Developer Program (USD 99 a year). Enrolment can take a day or two.

All of this is in [developer.apple.com/account](https://developer.apple.com/account) → **Certificates, Identifiers & Profiles → Identifiers**.

1. **App ID.** Apple needs one even for a website.
   - Click **+ → App IDs → App**.
   - Description: `CibusHub`. Bundle ID (Explicit): `com.cibushubgh.app`.
   - Under Capabilities, tick **Sign In with Apple**, then **Continue → Register**.
2. **Services ID.** This is what the website uses.
   - Click **+ → Services IDs**.
   - Description: `CibusHub Web`. Identifier: `com.cibushub.web`.
   - Register it, open it again, tick **Sign In with Apple** and click **Configure**:
     - Primary App ID: `com.cibushubgh.app`
     - Domains and Subdomains: `app.cibushubgh.com`, `dev.cibushubgh.com`
     - Return URLs: `https://app.cibushubgh.com/login`, `https://dev.cibushubgh.com/login`
   - **Next → Done → Continue → Save**.
3. Put the Services ID (`com.cibushub.web`) in:
   - `server/.env`: `APPLE_SERVICE_ID=com.cibushub.web`
   - `client/.env`: `VITE_APPLE_SERVICE_ID=com.cibushub.web`
   - `client/.env`: `VITE_APPLE_REDIRECT_URI=https://dev.cibushubgh.com/login` (on the live server: `https://app.cibushubgh.com/login`)

Apple may give us a **private relay** email (`...@privaterelay.appleid.com`). To send emails to those addresses later (Step 12), register the sending domain under **Sign in with Apple for Email Communication** in the same Apple account.

---

## 3. The https tunnel for testing (`dev.cibushubgh.com`)

The same tunnel serves the Paystack test still owed from Step 9.

One-time setup:

1. Add `cibushubgh.com` to a free [Cloudflare](https://dash.cloudflare.com) account and switch the domain's nameservers to Cloudflare's at the place where you bought it. This can take a few hours to take effect.
2. Install `cloudflared` on your laptop (not in Docker) and run:

   ```bash
   cloudflared tunnel login
   cloudflared tunnel create cibushub-dev
   cloudflared tunnel route dns cibushub-dev dev.cibushubgh.com
   ```

Each time you test:

```bash
cloudflared tunnel run --url http://localhost:5173 cibushub-dev
```

Then open `https://dev.cibushubgh.com`. The Vite proxy still forwards `/api` to the server, so the browser sees one address, just like on `localhost`.

While testing through the tunnel, set `CLIENT_URL=https://dev.cibushubgh.com` in `server/.env`. The server only accepts form posts from `CLIENT_URL` (CSRF check). Set it back to `http://localhost:5173` afterwards.

Quick option without Cloudflare DNS: `cloudflared tunnel --url http://localhost:5173` gives a random `https://...trycloudflare.com` address. The address changes every run, so you would have to re-enter it in the Apple Services ID each time.

---

## 4. Apply the new settings

Containers read `.env` only when they are created. Recreate just the server and client. `--no-deps` stops MySQL from restarting.

```bash
docker compose up -d --no-deps --force-recreate server client
```

## 5. Check it works

- **Google** (`http://localhost:5173`): the sign-up page shows Google's button. Choose a role, tick the Terms box and continue with Google. You should be asked to add your phone, then enter the SMS code.
- **Google, returning user**: log out, then use the button on the login page. You should land on your dashboard.
- **Apple** (`https://dev.cibushubgh.com`): same flow. On the first sign-in Apple asks whether to share or hide your email.
- **New person on the login page**: shows "No account yet. Sign up first…" with a link to sign up.

## Settings summary

| Setting | File | Public? |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `server/.env` | yes (same value as below) |
| `VITE_GOOGLE_CLIENT_ID` | `client/.env` | yes |
| `APPLE_SERVICE_ID` | `server/.env` | yes (same value as below) |
| `VITE_APPLE_SERVICE_ID` | `client/.env` | yes |
| `VITE_APPLE_REDIRECT_URI` | `client/.env` | yes |

No secrets are needed. The server only checks the tokens' signatures against Google's and Apple's public keys.
