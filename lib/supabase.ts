import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

const isWeb = Platform.OS === 'web';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isWeb ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isWeb,
  },
});

function getRedirectTo() {
  if (isWeb && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'listaa://auth/callback';
}

// ─── Auth Helpers ─────────────────────────────────────────────────────────────

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getRedirectTo(),
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
        scope: 'email profile https://www.googleapis.com/auth/calendar',
      },
    },
  });
  return { data, error };
}

export async function signInWithApple() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: getRedirectTo(),
    },
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data, error };
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ─── Profile Helpers ──────────────────────────────────────────────────────────

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
}

export async function upsertProfile(profile: Partial<{ id: string; first_name: string; email: string; parent_status: string; avatar_url: string; calendar_connected: boolean }>) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'id' })
    .select()
    .single();
  return { data, error };
}

// ─── Children Helpers ─────────────────────────────────────────────────────────

export async function getChildren(userId: string) {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  return { data, error };
}

export async function addChild(child: { user_id: string; name: string; photo_url?: string }) {
  const { data, error } = await supabase
    .from('children')
    .insert(child)
    .select()
    .single();
  return { data, error };
}

// ─── Bubble Helpers ───────────────────────────────────────────────────────────

export async function getBubbles(userId: string) {
  const { data, error } = await supabase
    .from('bubbles')
    .select('*')
    .or(`user_id.eq.${userId}`)
    .order('created_at', { ascending: true });
  return { data, error };
}

export async function createBubble(bubble: { user_id: string; name: string; type: string; emoji?: string; is_shared?: boolean; child_id?: string }) {
  const { data, error } = await supabase
    .from('bubbles')
    .insert({ ...bubble, is_shared: bubble.is_shared ?? false })
    .select()
    .single();
  return { data, error };
}

// ─── Arc Helpers ──────────────────────────────────────────────────────────────

export async function getArcs(userId: string, bubbleId?: string) {
  let query = supabase
    .from('arcs')
    .select('*, bubble:bubbles(*)')
    .or(`user_id.eq.${userId}`)
    .neq('status', 'closed')
    .order('created_at', { ascending: false });

  if (bubbleId) {
    query = query.eq('bubble_id', bubbleId);
  }

  const { data, error } = await query;
  return { data, error };
}

export async function createArc(arc: {
  user_id: string;
  title: string;
  description?: string;
  deadline?: string;
  bubble_id?: string;
  owner?: string;
  is_shared?: boolean;
}) {
  const { data, error } = await supabase
    .from('arcs')
    .insert({ ...arc, status: 'open', owner: arc.owner ?? 'me', is_shared: arc.is_shared ?? false, ping_sent: false })
    .select()
    .single();
  return { data, error };
}

export async function updateArcStatus(arcId: string, status: 'open' | 'in_progress' | 'closed') {
  const { data, error } = await supabase
    .from('arcs')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', arcId)
    .select()
    .single();
  return { data, error };
}

export async function claimArc(arcId: string, userId: string, owner: 'me' | 'partner' | 'teen') {
  const { data, error } = await supabase
    .from('arcs')
    .update({ owner, owner_user_id: userId, status: 'in_progress', updated_at: new Date().toISOString() })
    .eq('id', arcId)
    .select()
    .single();
  return { data, error };
}

// ─── Vault Helpers ────────────────────────────────────────────────────────────

export async function getVaultItems(userId: string, bubbleId?: string) {
  let query = supabase
    .from('vault_items')
    .select('*, bubble:bubbles(*)')
    .or(`user_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (bubbleId) {
    query = query.eq('bubble_id', bubbleId);
  }

  const { data, error } = await query;
  return { data, error };
}

export async function createVaultItem(item: {
  user_id: string;
  title: string;
  content: string;
  category: string;
  bubble_id?: string;
  tags?: string[];
  file_url?: string;
  is_shared?: boolean;
}) {
  const { data, error } = await supabase
    .from('vault_items')
    .insert({ ...item, is_shared: item.is_shared ?? false })
    .select()
    .single();
  return { data, error };
}

// ─── Thing Helpers ────────────────────────────────────────────────────────────

export async function createThing(thing: {
  user_id: string;
  type: string;
  raw_content: string;
  destination?: string;
  bubble_id?: string;
}) {
  const { data, error } = await supabase
    .from('things')
    .insert({ ...thing, destination: thing.destination ?? 'unclassified', ai_processed: false })
    .select()
    .single();
  return { data, error };
}

// ─── Partner Helpers ──────────────────────────────────────────────────────────

export async function generateInviteCode(userId: string) {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  await supabase
    .from('profiles')
    .update({ partner_invite_code: code })
    .eq('id', userId);
  return code;
}

export async function acceptInvite(code: string, userId: string) {
  const { data: partner } = await supabase
    .from('profiles')
    .select('id')
    .eq('partner_invite_code', code)
    .single();

  if (!partner) return { error: new Error('Invalid invite code') };

  // Link both users
  await supabase.from('profiles').update({ partner_id: partner.id }).eq('id', userId);
  await supabase.from('profiles').update({ partner_id: userId, partner_invite_code: null }).eq('id', partner.id);

  return { error: null };
}
