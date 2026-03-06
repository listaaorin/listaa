-- ─── Listaa Database Schema ───────────────────────────────────────────────────
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Profiles ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  avatar_url TEXT,
  parent_status TEXT CHECK (parent_status IN ('working_parent', 'stay_at_home', 'co_parent', 'single_parent', 'expecting', 'other')),
  partner_id UUID REFERENCES profiles(id),
  partner_invite_code TEXT UNIQUE,
  calendar_connected BOOLEAN DEFAULT FALSE,
  calendar_token TEXT,
  push_token TEXT,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Children ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Bubbles (Context Categories) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bubbles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('home', 'personal', 'child', 'custom')),
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  emoji TEXT DEFAULT '📁',
  color TEXT,
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Things (Raw Captured Inputs) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS things (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('text', 'image', 'voice', 'link', 'document')),
  raw_content TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  deadline TIMESTAMPTZ,
  location TEXT,
  tags TEXT[] DEFAULT '{}',
  destination TEXT DEFAULT 'unclassified' CHECK (destination IN ('arc', 'vault', 'unclassified')),
  bubble_id UUID REFERENCES bubbles(id) ON DELETE SET NULL,
  ai_processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Arcs (Action Loops) ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS arcs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bubble_id UUID REFERENCES bubbles(id) ON DELETE SET NULL,
  thing_id UUID REFERENCES things(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMPTZ,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  owner TEXT DEFAULT 'me' CHECK (owner IN ('me', 'partner', 'teen')),
  owner_user_id UUID REFERENCES profiles(id),
  calendar_event_id TEXT,
  is_shared BOOLEAN DEFAULT FALSE,
  ping_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Arc Sub-Tasks ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sub_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  arc_id UUID NOT NULL REFERENCES arcs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Vault Items (Knowledge Library) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vault_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bubble_id UUID REFERENCES bubbles(id) ON DELETE SET NULL,
  thing_id UUID REFERENCES things(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  raw_content TEXT,
  category TEXT DEFAULT 'other' CHECK (category IN ('contacts', 'documents', 'discoveries', 'memories', 'other')),
  tags TEXT[] DEFAULT '{}',
  file_url TEXT,
  is_shared BOOLEAN DEFAULT FALSE,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Pings (Notifications) ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  arc_id UUID REFERENCES arcs(id) ON DELETE CASCADE,
  vault_item_id UUID REFERENCES vault_items(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('deadline', 'stale_loop', 'status_change', 'proximity', 'partner_claim')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE bubbles ENABLE ROW LEVEL SECURITY;
ALTER TABLE things ENABLE ROW LEVEL SECURITY;
ALTER TABLE arcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pings ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/write their own profile
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "profiles_partner_read" ON profiles FOR SELECT USING (
  auth.uid() = id OR auth.uid() = partner_id
);

-- Children: own or partner
CREATE POLICY "children_own" ON children FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "children_partner" ON children FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND partner_id = children.user_id)
);

-- Bubbles: own or shared partner
CREATE POLICY "bubbles_own" ON bubbles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "bubbles_shared" ON bubbles FOR SELECT USING (
  is_shared = TRUE AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND partner_id = bubbles.user_id
  )
);

-- Things: own only
CREATE POLICY "things_own" ON things FOR ALL USING (auth.uid() = user_id);

-- Arcs: own or shared
CREATE POLICY "arcs_own" ON arcs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "arcs_shared" ON arcs FOR SELECT USING (
  is_shared = TRUE AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND partner_id = arcs.user_id
  )
);
CREATE POLICY "arcs_partner_update" ON arcs FOR UPDATE USING (
  is_shared = TRUE AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND partner_id = arcs.user_id
  )
);

-- Sub-tasks: follow arc permissions
CREATE POLICY "sub_tasks_own" ON sub_tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM arcs WHERE id = sub_tasks.arc_id AND user_id = auth.uid())
);

-- Vault items: own or shared
CREATE POLICY "vault_own" ON vault_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "vault_shared" ON vault_items FOR SELECT USING (
  is_shared = TRUE AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND partner_id = vault_items.user_id
  )
);

-- Pings: own only
CREATE POLICY "pings_own" ON pings FOR ALL USING (auth.uid() = user_id);

-- ─── Realtime ────────────────────────────────────────────────────────────────

-- Enable realtime for partner sync
ALTER PUBLICATION supabase_realtime ADD TABLE arcs;
ALTER PUBLICATION supabase_realtime ADD TABLE vault_items;
ALTER PUBLICATION supabase_realtime ADD TABLE pings;

-- ─── Updated At Trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER arcs_updated_at BEFORE UPDATE ON arcs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER vault_items_updated_at BEFORE UPDATE ON vault_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Auto-create profile on signup ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
