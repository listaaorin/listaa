# Listaa — Launch Guide
## Get the app running on your phone in ~20 minutes

---

## What You Need
- A phone (iPhone or Android)
- A laptop/computer with internet access
- An email address

---

## Step 1: Install Expo Go on Your Phone (2 min)

This is the app that lets you run Listaa on your phone during development.

- **iPhone**: Open App Store → search "Expo Go" → Install
- **Android**: Open Play Store → search "Expo Go" → Install

---

## Step 2: Create Your Supabase Account (5 min)

Supabase is the database and login system that powers Listaa. It's free.

1. Open your browser and go to **https://supabase.com**
2. Click **"Start your project"**
3. Sign in with GitHub (or create a GitHub account — it's free)
4. Click **"New project"**
5. Fill in:
   - **Name**: `listaa`
   - **Database Password**: create a strong password (save it somewhere)
   - **Region**: pick the one closest to you
6. Click **"Create new project"** — wait about 2 minutes for it to set up

### Get Your API Keys
1. In the left sidebar, click **"Project Settings"** (gear icon at the bottom)
2. Click **"API"**
3. You'll see two values — copy them:
   - **Project URL** (looks like: `https://abcdefgh.supabase.co`)
   - **anon public** key (a very long string starting with `eyJ...`)

### Set Up the Database
1. In the left sidebar, click **"SQL Editor"**
2. Click **"New query"**
3. Open the file `supabase/migrations/001_initial_schema.sql` from your project folder
4. Copy ALL its contents and paste into the SQL Editor
5. Click the green **"Run"** button
6. You should see: *"Success. No rows returned."*

### Enable Email Login
1. In the left sidebar, click **"Authentication"**
2. Click **"Providers"**
3. Scroll down to find **"Email"** — it should already be enabled ✓

---

## Step 3: Get Your Claude AI Key (3 min)

This powers the smart features (auto-classification, summaries, etc.)

1. Go to **https://console.anthropic.com**
2. Click **"Sign up"** (or sign in if you have an account)
3. Go to **"API Keys"** in the left menu
4. Click **"Create Key"**
5. Give it a name: `listaa-mvp`
6. Copy the key (starts with `sk-ant-...`) — **save this, you can only see it once!**
7. Click **"Billing"** and add a payment method + $10 credit

---

## Step 4: Configure the App (2 min)

Open the file called `.env` in your project folder (use any text editor — Notepad, TextEdit, etc.)

Replace the placeholder values with your real ones:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-actual-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJyour-actual-long-key-here
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-your-actual-claude-key
```

Save the file.

---

## Step 5: Run the App (3 min)

You need to do this from your computer's Terminal (Mac) or Command Prompt (Windows).

### On Mac:
1. Open **Terminal** (press Cmd+Space, type "Terminal", press Enter)
2. Type this and press Enter:
   ```
   cd ~/listaa
   ```
3. Then type this and press Enter:
   ```
   npx expo start
   ```
4. A QR code will appear in the terminal

### On Windows:
1. Open **Command Prompt** (press Windows key, type "cmd", press Enter)
2. Navigate to your project folder with `cd`
3. Run `npx expo start`

### Scan the QR Code:
- **iPhone**: Open the Camera app → point at the QR code → tap the notification
- **Android**: Open the Expo Go app → tap "Scan QR code" → scan it

**The app will open on your phone!**

---

## Step 6: Create Your First Account

1. The app will open to the login screen
2. Tap **"Continue with Email"**
3. Tap **"Don't have an account? Sign up"**
4. Enter your email and a password
5. Check your email for a confirmation link
6. Click the confirmation link
7. Go back to the app and sign in

---

## What Works Right Now (MVP)

✅ Login with Email
✅ 4-step onboarding (profile, kids, calendar connect, tutorial)
✅ "My Listaas" home — stacked circle carousel
✅ Add an Arc (task/loop) with deadline and importance
✅ Arc status tracking: Open → In Progress → Done
✅ The visual Arc track (your avatar slides along the curve)
✅ The Vault — save knowledge
✅ Capture anything: text, checklist, voice note
✅ AI classification (sends to Arc or Vault automatically)
✅ Calendar view
✅ Search

🔜 Needs additional setup:
- Google/Apple/Facebook login (requires OAuth app setup — see below)
- Partner syncing (requires two accounts)
- Push notifications (requires Expo account)

---

## Step 7 (Optional): Set Up Google Login

Once the app is working with email login, you can add Google login:

1. Go to **https://console.cloud.google.com**
2. Create a project called "listaa"
3. Go to **APIs & Services → Credentials**
4. Click **"Create Credentials" → "OAuth 2.0 Client ID"**
5. Add this to your authorized redirect URIs:
   ```
   https://YOUR-PROJECT.supabase.co/auth/v1/callback
   ```
6. Copy the **Client ID** and **Client Secret**
7. In Supabase → Authentication → Providers → Google:
   - Paste your Client ID and Client Secret
   - Enable it

---

## Troubleshooting

**"Network request failed"** — Your Supabase URL or key in `.env` is wrong. Double-check them.

**"Cannot read property of undefined"** — The database migration didn't run. Go to Supabase SQL Editor and run it again.

**App shows white screen** — Close Expo Go, go back to Terminal, press `r` to reload.

**"Invalid API Key" for Claude** — Your Anthropic key is wrong or has no credits. Check console.anthropic.com.

---

## Sharing with Others (Beta Testing)

When you're ready to share with testers without making them run Terminal:

1. Create an Expo account at **https://expo.dev**
2. Run: `npx eas build --platform ios --profile preview`
3. Follow the prompts — it builds in the cloud (~15 min)
4. Share the TestFlight/APK link with testers

---

## Next Steps After MVP

1. **Add your family photo** as the login background: replace `assets/hero-family.jpg`
2. **Set up Google/Apple login** following Step 7
3. **Invite your partner** using the invite code feature in-app
4. **Build for App Store** when ready: `npx eas build --platform ios --profile production`
