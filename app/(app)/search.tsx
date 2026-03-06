import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius, Shadow } from '../../lib/theme';
import { useAuth } from '../../lib/auth-context';
import { getArcs, getVaultItems } from '../../lib/supabase';
import { Arc, VaultItem } from '../../lib/types';

export default function SearchScreen() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [arcResults, setArcResults] = useState<Arc[]>([]);
  const [vaultResults, setVaultResults] = useState<VaultItem[]>([]);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (!user || !query.trim()) return;
    setLoading(true);
    setSearched(true);

    const [arcsRes, vaultRes] = await Promise.all([
      getArcs(user.id),
      getVaultItems(user.id),
    ]);

    const q = query.toLowerCase();

    const filteredArcs = (arcsRes.data ?? []).filter((a: any) =>
      a.title?.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q)
    ) as Arc[];

    const filteredVault = (vaultRes.data ?? []).filter((v: any) =>
      v.title?.toLowerCase().includes(q) ||
      v.content?.toLowerCase().includes(q) ||
      v.tags?.some((t: string) => t.toLowerCase().includes(q))
    ) as VaultItem[];

    setArcResults(filteredArcs);
    setVaultResults(filteredVault);
    setLoading(false);
  }

  const hasResults = arcResults.length > 0 || vaultResults.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Search</Text>

      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search your Arc and Vault..."
          placeholderTextColor={Colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setSearched(false); }}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />}

      {!loading && searched && !hasResults && (
        <View style={styles.emptySearch}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyText}>Nothing found for "{query}"</Text>
          <Text style={styles.emptyHint}>Try different keywords or check your Vault</Text>
        </View>
      )}

      {!loading && hasResults && (
        <ScrollView contentContainerStyle={styles.results} showsVerticalScrollIndicator={false}>
          {arcResults.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>In The Arc</Text>
              {arcResults.map(arc => (
                <TouchableOpacity
                  key={arc.id}
                  style={styles.resultCard}
                  onPress={() => router.push(`/(app)/arc/${arc.id}`)}
                >
                  <View style={styles.resultBadge}>
                    <Text style={styles.resultBadgeText}>⚡ Arc</Text>
                  </View>
                  <Text style={styles.resultTitle}>{arc.title}</Text>
                  {arc.description && <Text style={styles.resultSub} numberOfLines={1}>{arc.description}</Text>}
                </TouchableOpacity>
              ))}
            </>
          )}

          {vaultResults.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>In The Vault</Text>
              {vaultResults.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.resultCard}
                  onPress={() => router.push(`/(app)/vault/${item.id}`)}
                >
                  <View style={[styles.resultBadge, styles.resultBadgeVault]}>
                    <Text style={styles.resultBadgeText}>🗄 Vault</Text>
                  </View>
                  <Text style={styles.resultTitle}>{item.title}</Text>
                  <Text style={styles.resultSub} numberOfLines={1}>{item.content}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 56,
    paddingHorizontal: Spacing.lg,
  },
  headerTitle: {
    fontFamily: 'Georgia',
    fontSize: 28,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    ...Shadow.sm,
  },
  searchIcon: { fontSize: 18 },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  clearBtn: {
    fontSize: 16,
    color: Colors.textTertiary,
    padding: 4,
  },
  emptySearch: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  emptyHint: { fontSize: 14, color: Colors.textSecondary },
  results: { paddingBottom: 48, gap: Spacing.sm },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: Spacing.md,
    marginBottom: 4,
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 4,
    ...Shadow.sm,
  },
  resultBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEE8F0',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  resultBadgeVault: {
    backgroundColor: '#EDE7F6',
  },
  resultBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  resultTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  resultSub: { fontSize: 13, color: Colors.textSecondary },
});
