import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Radius, Shadow } from '../../lib/theme';
import { useAuth } from '../../lib/auth-context';
import { getBubbles, getArcs, getVaultItems } from '../../lib/supabase';
import { Arc, Bubble, VaultItem } from '../../lib/types';
import ArcCard from '../../components/arc/ArcCard';
import BubblePill from '../../components/shared/BubblePill';
import EmptyState from '../../components/shared/EmptyState';

type ToggleMode = 'arc' | 'vault';

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<ToggleMode>('arc');
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [selectedBubble, setSelectedBubble] = useState<string | null>(null);
  const [arcs, setArcs] = useState<Arc[]>([]);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    if (!user) return;
    const [bubblesRes, arcsRes, vaultRes] = await Promise.all([
      getBubbles(user.id),
      getArcs(user.id, selectedBubble ?? undefined),
      getVaultItems(user.id, selectedBubble ?? undefined),
    ]);
    if (bubblesRes.data) setBubbles(bubblesRes.data as Bubble[]);
    if (arcsRes.data) setArcs(arcsRes.data as Arc[]);
    if (vaultRes.data) setVaultItems(vaultRes.data as VaultItem[]);
    setLoading(false);
    setRefreshing(false);
  }

  useFocusEffect(useCallback(() => { load(); }, [user, selectedBubble]));

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  const displayName = profile?.first_name || 'there';
  const activeItems = mode === 'arc' ? arcs : vaultItems;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => router.push('/(app)/partner-invite')}>
          <View style={styles.partnerInviteBtn}>
            <Text style={styles.partnerInviteIcon}>👤+</Text>
          </View>
        </TouchableOpacity>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>{displayName[0]?.toUpperCase()}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Bubble pills */}
          {bubbles.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bubblesRow} contentContainerStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.lg }}>
              <BubblePill
                label="All"
                selected={selectedBubble === null}
                onPress={() => setSelectedBubble(null)}
              />
              {bubbles.map(b => (
                <BubblePill
                  key={b.id}
                  label={`${b.emoji ?? ''} ${b.name}`}
                  selected={selectedBubble === b.id}
                  onPress={() => setSelectedBubble(b.id)}
                />
              ))}
            </ScrollView>
          )}

          {/* Content list */}
          {activeItems.length === 0 ? (
            <EmptyState mode={mode} onAdd={() => router.push('/(app)/capture')} />
          ) : (
            <View style={styles.list}>
              {mode === 'arc'
                ? (arcs as Arc[]).map(arc => (
                    <ArcCard key={arc.id} arc={arc} onPress={() => router.push(`/(app)/arc/${arc.id}`)} onRefresh={load} />
                  ))
                : (vaultItems as VaultItem[]).map(item => (
                    <VaultCard key={item.id} item={item} onPress={() => router.push(`/(app)/vault/${item.id}`)} />
                  ))
              }
            </View>
          )}
        </ScrollView>
      )}

      {/* FAB area: mic + plus */}
      <View style={styles.fabArea}>
        <TouchableOpacity style={styles.micFab} onPress={() => router.push({ pathname: '/(app)/capture', params: { type: 'voice' } })}>
          <Text style={styles.fabIcon}>🎙</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.plusFab} onPress={() => router.push('/(app)/capture')}>
          <Text style={styles.fabPlusIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Mode toggle + FABs row */}
      <View style={styles.bottomBar}>
        <View style={styles.togglePill}>
          <TouchableOpacity
            style={[styles.toggleOption, mode === 'vault' && styles.toggleOptionActive]}
            onPress={() => setMode('vault')}
          >
            <Text style={[styles.toggleText, mode === 'vault' && styles.toggleTextActive]}>Vault</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleOption, mode === 'arc' && styles.toggleOptionActive]}
            onPress={() => setMode('arc')}
          >
            <Text style={[styles.toggleText, mode === 'arc' && styles.toggleTextActive]}>Arc</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Inline VaultCard (small) ─────────────────────────────────────────────────

function VaultCard({ item, onPress }: { item: VaultItem; onPress: () => void }) {
  const categoryEmoji: Record<string, string> = {
    contacts: '📞',
    documents: '📄',
    discoveries: '✨',
    memories: '💛',
    other: '📁',
  };
  return (
    <TouchableOpacity style={styles.vaultCard} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.vaultEmoji}>{categoryEmoji[item.category] ?? '📁'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.vaultTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.vaultContent} numberOfLines={2}>{item.content}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  backButton: {
    width: 32,
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 28,
    color: Colors.textPrimary,
    lineHeight: 32,
  },
  partnerInviteBtn: {
    marginRight: Spacing.sm,
  },
  partnerInviteIcon: {
    fontSize: 22,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  bubblesRow: {
    marginBottom: Spacing.md,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  fabArea: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: 100,
    gap: Spacing.md,
    alignItems: 'center',
  },
  micFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  fabIcon: {
    fontSize: 22,
  },
  plusFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  fabPlusIcon: {
    fontSize: 28,
    color: Colors.textPrimary,
    lineHeight: 32,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  togglePill: {
    flexDirection: 'row',
    backgroundColor: Colors.toggleBg,
    borderRadius: Radius.full,
    padding: 3,
  },
  toggleOption: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  toggleOptionActive: {
    backgroundColor: Colors.surface,
    ...Shadow.sm,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.toggleInactive,
  },
  toggleTextActive: {
    color: Colors.toggleActive,
    fontWeight: '700',
  },
  // Vault card
  vaultCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  vaultEmoji: {
    fontSize: 24,
    marginTop: 2,
  },
  vaultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  vaultContent: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
