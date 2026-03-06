# Listaa — Setup Guide for Non-Technical Founders

## What Was Built
A complete React Native mobile app (iOS + Android) with:
- Full authentication (Apple, Google, Facebook login)
- 4-step onboarding (profile → kids → calendar → tutorial)
- The Arc: action loops with ownership, 3 status states, partner sharing
- The Vault: knowledge library with categories, tags, search
- AI-powered capture (text, camera, voice) via Claude API
- Real-time partner sync via Supabase
- Calendar view of deadlines
- Partner invite system with 6-digit codes
- Smart notifications (Pings) foundation

---

## Step 1: Create Your Supabase Account (Free)

1. Go to **https://supabase.com** and click "Start your project"
2. Sign in with GitHub (or create an account)
3. Click "New project"
4. Give it a name: **listaa-prod**
5. Choose a region close to your users (e.g., Europe West for Israel)
6. Click "Create new project" and wait ~2 minutes

**After it's created:**
1. Go to **Settings → API** in the left sidebar
2. Copy the **Project URL** (looks like `https://abc123.supabase.co`)
3. Copy the **anon public** key (long string starting with `eyJ...`)

---

## Step 2: Set Up Your Database

1. In Supabase, click **SQL Editor** in the left sidebar
2. Click "New query"
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste it into the editor
5. Click **Run** (green button)
6. You should see "Success. No rows returned."

**Enable Google/Apple/Facebook login:**
1. Go to **Authentication → Providers**
2. Enable **Google** → add your Google Client ID and Secret
3. Enable **Apple** → add your Apple credentials
4. Enable **Facebook** → add your Facebook App ID and Secret

*(Each provider has a link to their respective developer console)*

---

## Step 3: Get Your Anthropic API Key

1. Go to **https://console.anthropic.com**
2. Sign in or create an account
3. Click **API Keys → Create Key**
4. Copy the key (starts with `sk-ant-...`)
5. Add $10 credit to start

---

## Step 4: Configure the App

1. In the project folder, create a file called `.env`
2. Fill it in with your actual keys:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJyour-actual-anon-key
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-your-actual-key
```

---

## Step 5: Run the App

You need someone technical to do this part, OR use **Expo EAS** (recommended):

### Option A: Preview on Your Phone (Fastest)
1. Install **Expo Go** from the App Store / Play Store on your phone
2. Run `npm start` in the project folder
3. Scan the QR code with your phone

### Option B: Build for TestFlight/Beta (Production-ready)
1. Run `npx eas build --platform ios --profile preview`
2. Follow the prompts — it builds in the cloud
3. Download and install the .ipa file

---

## Tech Stack Summary (for your developers)

| Layer | Tech | Purpose |
|-------|------|---------|
| App | React Native + Expo | iOS + Android from one codebase |
| Navigation | Expo Router | File-based routing |
| Backend | Supabase | Auth, database, real-time sync, storage |
| AI | Claude Sonnet 4.6 | Content analysis, classification, OCR |
| Language | TypeScript | Type-safe development |

---

## Next Steps (v2 Features)

- [ ] Share Extension (receive from WhatsApp, Safari, etc.)
- [ ] Full OCR from camera using Claude Vision
- [ ] Voice transcription with Whisper
- [ ] Google Calendar event auto-creation
- [ ] Push notification delivery (Expo Push)
- [ ] Bubble management screen (create/edit/delete bubbles)
- [ ] Proximity-based Vault alerts
- [ ] Analytics dashboard
