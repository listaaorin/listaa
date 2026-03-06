// ─── User & Auth ─────────────────────────────────────────────────────────────

export type ParentStatus =
  | 'working_parent'
  | 'stay_at_home'
  | 'co_parent'
  | 'single_parent'
  | 'expecting'
  | 'other';

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  avatar_url?: string;
  parent_status?: ParentStatus;
  partner_id?: string;
  partner_invite_code?: string;
  calendar_connected: boolean;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface Child {
  id: string;
  user_id: string;
  name: string;
  photo_url?: string;
  created_at: string;
}

// ─── Bubbles (Context Categories) ────────────────────────────────────────────

export type BubbleType = 'home' | 'personal' | 'child' | 'custom';

export interface Bubble {
  id: string;
  user_id: string;
  name: string;
  type: BubbleType;
  child_id?: string;
  emoji?: string;
  color?: string;
  is_shared: boolean;
  created_at: string;
}

// ─── Things (Raw Inputs) ─────────────────────────────────────────────────────

export type ThingType = 'text' | 'image' | 'voice' | 'link' | 'document';
export type ThingDestination = 'arc' | 'vault' | 'unclassified';

export interface Thing {
  id: string;
  user_id: string;
  type: ThingType;
  raw_content: string;      // Original text, URL, or file path
  title?: string;           // AI-extracted title
  summary?: string;         // AI-generated summary
  deadline?: string;        // AI-extracted date (ISO)
  location?: string;        // AI-extracted location
  tags?: string[];          // AI-generated tags
  destination: ThingDestination;
  bubble_id?: string;
  ai_processed: boolean;
  created_at: string;
}

// ─── Arc (Actions / Loops) ───────────────────────────────────────────────────

export type LoopStatus = 'open' | 'in_progress' | 'closed';
export type OwnerType = 'me' | 'partner' | 'teen';

export interface Arc {
  id: string;
  user_id: string;
  bubble_id?: string;
  thing_id?: string;
  title: string;
  description?: string;
  deadline?: string;
  status: LoopStatus;
  owner: OwnerType;
  owner_user_id?: string;
  calendar_event_id?: string;
  sub_tasks?: SubTask[];
  is_shared: boolean;
  ping_sent: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  bubble?: Bubble;
}

export interface SubTask {
  id: string;
  arc_id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

// ─── Vault (Knowledge Library) ───────────────────────────────────────────────

export type VaultCategory = 'contacts' | 'documents' | 'discoveries' | 'memories' | 'other';

export interface VaultItem {
  id: string;
  user_id: string;
  bubble_id?: string;
  thing_id?: string;
  title: string;
  content: string;           // Summarized/processed content
  raw_content?: string;      // Original
  category: VaultCategory;
  tags?: string[];
  file_url?: string;         // For documents/images
  is_shared: boolean;
  location?: string;         // For geo-triggered pings
  created_at: string;
  updated_at: string;
  // Joined
  bubble?: Bubble;
}

// ─── Notifications (Pings) ───────────────────────────────────────────────────

export type PingType = 'deadline' | 'stale_loop' | 'status_change' | 'proximity' | 'partner_claim';

export interface Ping {
  id: string;
  user_id: string;
  arc_id?: string;
  vault_item_id?: string;
  type: PingType;
  title: string;
  body: string;
  scheduled_for?: string;
  sent_at?: string;
  read: boolean;
  created_at: string;
}

// ─── Navigation Types ─────────────────────────────────────────────────────────

export type RootStackParamList = {
  '(auth)/login': undefined;
  '(auth)/onboarding': undefined;
  '(app)': undefined;
};

// ─── UI State ─────────────────────────────────────────────────────────────────

export type ThingMode = 'food' | 'arc';
