/**
 * Listaa Detail Screen
 * Shows a single Listaa (bubble) with:
 *  - Arc mode: curved arc tracks per action item
 *  - Vault mode: saved items list
 * Toggle at bottom switches between modes.
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Radius, Shadow } from '../../../lib/theme';
import { useAuth } from '../../../lib/auth-context';
import { supabase, getArcs, getVaultItems } from '../../../lib/supabase';
import { Arc, Bubble, VaultItem } from '../../../lib/types';
import ArcTrack from '../../../components/arc/ArcTrack';

type Mode = 'listaa' | 'arc';

export default function ListaaDetailScreen() {
  const { id }       = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();

  const [bubble, setBubble]   = useState<Bubble | null>(null);
  const [arcs, setArcs]       = useState<Arc[]>([]);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [mode, setMode]       = useState<Mode>('arc');
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user || !id) return;

    const [bubbleRes, arcsRes, vaultRes] = await Promise.all([
      supabase.from('bubbles').select('*').eq('id', id).single(),
      getArcs(user.id, id),
      getVaultItems(user.id, id),
    ]);

    if (bubbleRes.data) setBubble(bubbleRes.data as Bubble);
    if (arcsRes.data)   setArcs(arcsRes.data as Arc[]);
    if (vaultRes.data)  setVaultItems(vaultRes.data as VaultItem[]);
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { load(); }, [user, id]));

  const listaaName = bubble?.name ?? 'Listaa';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{listaaName}</Text>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => router.push('/(app)/partner-invite')}
          >
            <Text style={styles.headerIconText}>👤+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn}>
            <FilterIcon />
          </TouchableOpacity>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {(profile?.first_name ?? '?')[0].toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {mode === 'arc' ? (
            arcs.length === 0 ? (
              /* Empty Arc state */
              <View style={styles.emptyArc}>
                <TouchableOpacity
                  style={styles.addArcBtn}
                  onPress={() => router.push({
                    pathname: '/(app)/add-arc',
                    params: { prefill: '' },
                  })}
                >
                  <Text style={styles.addArcBtnText}>+ Add new </Text>
                  <ArcWord />
                </TouchableOpacity>
                <Text style={styles.emptyHint}>This helps you keep track of things</Text>
              </View>
            ) : (
              <>
                {arcs.map((arc, i) => (
                  <TouchableOpacity
                    key={arc.id}
                    onPress={() => router.push(`/(app)/arc/${arc.id}`)}
                    activeOpacity={0.85}
                  >
                    <ArcTrack
                      title={arc.title}
                      deadline={arc.deadline}
                      status={arc.status}
                      ownerAvatarUrl={profile?.avatar_url}
                      ownerName={profile?.first_name}
                      ownerColorIndex={i}
                    />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.addArcLink}
                  onPress={() => router.push({
                    pathname: '/(app)/add-arc',
                    params: { prefill: '' },
                  })}
                >
                  <Text style={styles.addArcLinkText}>+ Add new Arc</Text>
                </TouchableOpacity>
              </>
            )
          ) : (
            /* Vault / Listaa items mode */
            vaultItems.length === 0 ? (
              <View style={styles.emptyArc}>
                <TouchableOpacity
                  style={styles.addArcBtn}
                  onPress={() => router.push('/(app)/capture')}
                >
                  <Text style={styles.addArcBtnText}>+ Save something here</Text>
                </TouchableOpacity>
                <Text style={styles.emptyHint}>Recipes, links, notes, photos…</Text>
              </View>
            ) : (
              vaultItems.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.vaultRow}
                  onPress={() => router.push(`/(app)/vault/${item.id}`)}
                >
                  <View style={styles.vaultThumb}>
                    <Text style={styles.vaultThumbText}>
                      {{ contacts: '📞', documents: '📄', discoveries: '✨', memories: '💛', other: '📁' }[item.category] ?? '📁'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vaultTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.vaultSub}   numberOfLines={2}>{item.content}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )
          )}
        </ScrollView>
      )}

      {/* Bottom FABs + Toggle */}
      <View style={styles.bottomArea} pointerEvents="box-none">
        {/* Mic + Plus FABs */}
        <View style={styles.fabColumn} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.fabBtn}
            onPress={() => router.push({ pathname: '/(app)/capture', params: { type: 'voice' } })}
          >
            <Text style={styles.fabMic}>🎙</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fabBtn}
            onPress={() => router.push('/(app)/add-arc')}
          >
            <Text style={styles.fabPlus}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Toggle pill */}
        <View style={styles.toggleRow} pointerEvents="box-none">
          <View style={styles.togglePill}>
            <TouchableOpacity
              style={[styles.toggleOpt, mode === 'listaa' && styles.toggleOptDark]}
              onPress={() => setMode('listaa')}
            >
              <Text style={[styles.toggleText, mode === 'listaa' && styles.toggleTextDark]}>
                {listaaName}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleOpt, mode === 'arc' && styles.toggleOptLight]}
              onPress={() => setMode('arc')}
            >
              <Text style={[styles.toggleText, mode === 'arc' && styles.toggleTextLight]}>
                Arc
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── "Arc" word with overhead curve ──────────────────────────────────────────

function ArcWord({ light }: { light?: boolean }) {
  const color = light ? Colors.white : Colors.white;
  return (
    <View style={arcWordStyles.wrap}>
      <View style={arcWordStyles.curveBox}>
        <View style={[arcWordStyles.curve, { borderColor: color }]} />
      </View>
      <Text style={[arcWordStyles.text, { color }]}>Arc</Text>
    </View>
  );
}

const arcWordStyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'flex-end' },
  curveBox: { height: 12, width: 42, overflow: 'hidden', marginBottom: -3 },
  curve: {
    width: 42, height: 42, borderRadius: 21,
    borderWidth: 2.5, position: 'absolute', top: 0,
    backgroundColor: 'transparent',
  },
  text: { fontFamily: 'Georgia', fontSize: 18, fontWeight: '600', color: Colors.white },
});

// ─── Filter icon ──────────────────────────────────────────────────────────────

function FilterIcon() {
  return (
    <View style={{ gap: 3 }}>
      <View style={{ width: 18, height: 2, backgroundColor: Colors.textSecondary, borderRadius: 1 }} />
      <View style={{ width: 13, height: 2, backgroundColor: Colors.textSecondary, borderRadius: 1, alignSelf: 'center' }} />
      <View style={{ width: 8,  height: 2, backgroundColor: Colors.textSecondary, borderRadius: 1, alignSelf: 'center' }} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background },
  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  backArrow: { fontSize: 32, color: Colors.primary, lineHeight: 36, marginRight: Spacing.sm },
  headerTitle: {
    flex: 1, fontFamily: 'Georgia', fontSize: 26,
    color: Colors.textPrimary, textAlign: 'center',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerIconBtn: { padding: 4 },
  headerIconText: { fontSize: 20 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  scrollContent: { paddingBottom: 160 },
  // Empty arc
  emptyArc: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: '40%',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  addArcBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 20,
    paddingHorizontal: Spacing.xl,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
  },
  addArcBtnText: { color: Colors.white, fontSize: 18, fontWeight: '600', fontFamily: 'Georgia' },
  emptyHint: { fontSize: 14, color: Colors.textSecondary, paddingLeft: 4 },
  // Add arc link
  addArcLink: { padding: Spacing.lg },
  addArcLinkText: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
  // Vault rows
  vaultRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md,
  },
  vaultThumb: {
    width: 44, height: 44, borderRadius: 8,
    backgroundColor: Colors.surfaceDim,
    alignItems: 'center', justifyContent: 'center',
  },
  vaultThumbText: { fontSize: 22 },
  vaultTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  vaultSub: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  // Bottom
  bottomArea: {
    position: 'absolute', bottom: 80, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
  },
  fabColumn: { marginLeft: 'auto', gap: Spacing.sm, alignItems: 'center' },
  fabBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    ...Shadow.md,
  },
  fabMic: { fontSize: 22 },
  fabPlus: { fontSize: 30, color: Colors.textPrimary, lineHeight: 34, fontWeight: '300' },
  toggleRow: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
  togglePill: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: Radius.full,
    padding: 3,
  },
  toggleOpt: {
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: Radius.full,
  },
  toggleOptDark: { /* active = dark bg — it's already on dark pill */ },
  toggleOptLight: { backgroundColor: Colors.surface },
  toggleText: { fontSize: 15, fontWeight: '500', color: 'rgba(255,255,255,0.5)' },
  toggleTextDark: { color: Colors.white, fontWeight: '700' },
  toggleTextLight: { color: Colors.textPrimary, fontWeight: '700' },
});
