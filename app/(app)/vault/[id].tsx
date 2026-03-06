import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Radius, Shadow } from '../../../lib/theme';
import { supabase } from '../../../lib/supabase';
import { VaultItem } from '../../../lib/types';

const CATEGORY_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  contacts: { label: 'Contacts', emoji: '📞', color: '#1565C0' },
  documents: { label: 'Documents', emoji: '📄', color: '#4527A0' },
  discoveries: { label: 'Discoveries', emoji: '✨', color: '#F57F17' },
  memories: { label: 'Memories', emoji: '💛', color: '#E65100' },
  other: { label: 'Other', emoji: '📁', color: Colors.textSecondary },
};

export default function VaultDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<VaultItem | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from('vault_items')
      .select('*, bubble:bubbles(*)')
      .eq('id', id)
      .single();
    if (data) setItem(data as any);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function handleDelete() {
    Alert.alert('Delete Vault Item', 'Remove this from your Vault?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await supabase.from('vault_items').delete().eq('id', id);
          router.back();
        }
      }
    ]);
  }

  if (loading) return <View style={styles.centered}><ActivityIndicator color={Colors.primary} /></View>;
  if (!item) return <View style={styles.centered}><Text>Item not found</Text></View>;

  const cat = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.other;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete}>
          <Text style={styles.deleteBtn}>Delete</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Category badge */}
        <View style={[styles.catBadge, { backgroundColor: `${cat.color}18` }]}>
          <Text style={styles.catEmoji}>{cat.emoji}</Text>
          <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label}</Text>
        </View>

        <Text style={styles.title}>{item.title}</Text>

        <View style={styles.contentCard}>
          <Text style={styles.contentText}>{item.content}</Text>
        </View>

        {item.bubble && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Bubble</Text>
            <Text style={styles.metaValue}>{(item.bubble as any).emoji} {(item.bubble as any).name}</Text>
          </View>
        )}

        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.map(tag => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {item.file_url && (
          <TouchableOpacity style={styles.fileLink} onPress={() => Linking.openURL(item.file_url!)}>
            <Text style={styles.fileLinkText}>📎 Open attachment</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.createdAt}>
          Saved {new Date(item.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: 56 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  backBtn: { fontSize: 17, color: Colors.primary, fontWeight: '500' },
  deleteBtn: { fontSize: 15, color: Colors.error },
  content: { padding: Spacing.lg, paddingBottom: 48, gap: Spacing.md },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
  },
  catEmoji: { fontSize: 16 },
  catLabel: { fontSize: 13, fontWeight: '700' },
  title: { fontFamily: 'Georgia', fontSize: 26, color: Colors.textPrimary, lineHeight: 34 },
  contentCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  contentText: { fontSize: 15, color: Colors.textPrimary, lineHeight: 24 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  metaLabel: { fontSize: 13, color: Colors.textTertiary, width: 70 },
  metaValue: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: Colors.primaryPale,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tagText: { fontSize: 12, color: Colors.primaryLight, fontWeight: '500' },
  fileLink: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fileLinkText: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
  createdAt: { fontSize: 12, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.lg },
});
