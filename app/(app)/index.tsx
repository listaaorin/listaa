import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Shadow } from '../../lib/theme';
import { useAuth } from '../../lib/auth-context';
import { getBubbles, getArcs } from '../../lib/supabase';
import { Bubble } from '../../lib/types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const CIRCLE_SIZE = Math.min(SCREEN_W * 0.72, 280);
const OVERLAP     = CIRCLE_SIZE * 0.44;
const STEP        = CIRCLE_SIZE - OVERLAP;

const BUBBLE_COLORS = [
  '#C2185B', '#7B2D8B', '#1565C0', '#2E7D32',
  '#E65100', '#4527A0', '#00695C', '#AD1457',
];

interface ListaaItem {
  id: string;
  name: string;
  emoji?: string;
  cover_url?: string;
  count?: number;
  isVault?: boolean;
  isAdd?: boolean;
  colorIndex?: number;
}

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [items, setItems]       = useState<ListaaItem[]>([]);
  const [focusedIdx, setFocusedIdx] = useState(0);

  async function load() {
    if (!user) return;
    const [bubblesRes, arcsRes] = await Promise.all([
      getBubbles(user.id),
      getArcs(user.id),
    ]);
    const bubbles = (bubblesRes.data ?? []) as Bubble[];
    const arcs    = (arcsRes.data ?? []) as any[];

    const counts: Record<string, number> = {};
    arcs.forEach(a => {
      if (a.bubble_id) counts[a.bubble_id] = (counts[a.bubble_id] ?? 0) + 1;
    });

    const listaaItems: ListaaItem[] = [
      ...bubbles.map((b, i) => ({
        id: b.id,
        name: b.name,
        emoji: b.emoji,
        count: counts[b.id],
        colorIndex: i % BUBBLE_COLORS.length,
      })),
      { id: '__vault__', name: 'Vault', isVault: true },
      { id: '__add__',   name: 'New Listaa', isAdd: true },
    ];
    setItems(listaaItems);
  }

  useFocusEffect(useCallback(() => { load(); }, [user]));

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const y   = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / STEP);
    setFocusedIdx(Math.max(0, Math.min(idx, items.length - 1)));
  }

  function onItemPress(item: ListaaItem) {
    if (item.isAdd)   { router.push('/(app)/new-listaa'); return; }
    if (item.isVault) { router.push('/(app)/search');     return; }
    // Open listaa content (arcs + vault items for this bubble)
    router.push({ pathname: '/(app)/arc/[id]', params: { id: item.id } });
  }

  const focused = items[focusedIdx];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuBtn}>
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>My Listaas</Text>

        <TouchableOpacity onPress={() => router.push('/(app)/partner-invite')}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {(profile?.first_name ?? '?')[0].toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Floating label for focused circle */}
      {focused && !focused.isAdd && (
        <View style={styles.labelRow} pointerEvents="box-none">
          <Text style={styles.focusedLabel}>
            {focused.name}{focused.count ? ` (${focused.count})` : ''}
          </Text>
          <TouchableOpacity
            onPress={() => Alert.alert(focused.name, 'Rename, share, or delete this Listaa')}
          >
            <Text style={styles.dotsText}>•••</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stacked circles */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        snapToInterval={STEP}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {items.map((item, idx) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.88}
            onPress={() => onItemPress(item)}
            style={[styles.circleWrapper, idx > 0 && { marginTop: -OVERLAP }]}
          >
            {item.isAdd ? (
              <View style={[styles.circle, styles.addCircle]}>
                <Text style={styles.addPlus}>+</Text>
              </View>
            ) : item.isVault ? (
              <VaultCircle />
            ) : item.cover_url ? (
              <Image source={{ uri: item.cover_url }} style={styles.circle} />
            ) : (
              <View style={[styles.circle, { backgroundColor: BUBBLE_COLORS[item.colorIndex ?? 0] }]}>
                {item.emoji ? (
                  <Text style={styles.bubbleEmoji}>{item.emoji}</Text>
                ) : (
                  <Text style={styles.bubbleInitial}>{item.name[0]?.toUpperCase()}</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* FABs */}
      <View style={styles.fabArea} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push({ pathname: '/(app)/capture', params: { type: 'voice' } })}
        >
          <Text style={styles.fabMicText}>🎙</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/(app)/capture')}
        >
          <Text style={styles.fabPlusText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Vault Circle ─────────────────────────────────────────────────────────────

function VaultCircle() {
  const ticks = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <View style={[styles.circle, styles.vaultCircle]}>
      <View style={styles.vaultRing}>
        {ticks.map(angle => (
          <View
            key={angle}
            style={[
              styles.vaultTick,
              { transform: [{ rotate: `${angle}deg` }, { translateY: -(CIRCLE_SIZE * 0.36) }] },
            ]}
          />
        ))}
        <View style={styles.vaultCenter}>
          <View style={styles.vaultInner} />
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
    zIndex: 10,
  },
  menuBtn: {
    gap: 5,
    paddingVertical: 4,
    width: 44,
  },
  menuLine: {
    width: 24,
    height: 2,
    backgroundColor: Colors.textPrimary,
    borderRadius: 1,
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Georgia',
    fontSize: 28,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  labelRow: {
    position: 'absolute',
    top: SCREEN_H * 0.50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    zIndex: 20,
  },
  focusedLabel: {
    fontFamily: 'Georgia',
    fontSize: 22,
    color: Colors.textPrimary,
    flex: 1,
  },
  dotsText: {
    fontSize: 18,
    color: Colors.textPrimary,
    letterSpacing: 2,
    padding: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: SCREEN_H * 0.35,
  },
  circleWrapper: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Shadow.md,
  },
  bubbleEmoji: {
    fontSize: 72,
  },
  bubbleInitial: {
    fontSize: 80,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Georgia',
  },
  // Vault
  vaultCircle: {
    backgroundColor: '#1C1C1E',
  },
  vaultRing: {
    width: CIRCLE_SIZE * 0.9,
    height: CIRCLE_SIZE * 0.9,
    borderRadius: CIRCLE_SIZE * 0.45,
    borderWidth: 10,
    borderColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultTick: {
    position: 'absolute',
    width: 2,
    height: 10,
    backgroundColor: '#5A5A5A',
    borderRadius: 1,
  },
  vaultCenter: {
    width: CIRCLE_SIZE * 0.42,
    height: CIRCLE_SIZE * 0.42,
    borderRadius: CIRCLE_SIZE * 0.21,
    backgroundColor: '#111',
    borderWidth: 4,
    borderColor: '#3A3A3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultInner: {
    width: CIRCLE_SIZE * 0.16,
    height: CIRCLE_SIZE * 0.16,
    borderRadius: CIRCLE_SIZE * 0.08,
    backgroundColor: '#222',
    borderWidth: 3,
    borderColor: '#4A4A4A',
  },
  // Add circle
  addCircle: {
    backgroundColor: Colors.surfaceDim,
  },
  addPlus: {
    fontSize: 56,
    color: Colors.textTertiary,
    fontWeight: '200',
    lineHeight: 60,
  },
  // FABs
  fabArea: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: 96,
    alignItems: 'center',
    gap: Spacing.md,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  fabMicText: {
    fontSize: 24,
  },
  fabPlusText: {
    fontSize: 32,
    color: Colors.textPrimary,
    lineHeight: 36,
    fontWeight: '300',
  },
});
