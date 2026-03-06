import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Radius, Shadow } from '../../../lib/theme';
import { useAuth } from '../../../lib/auth-context';
import { supabase, updateArcStatus, claimArc } from '../../../lib/supabase';
import { Arc, LoopStatus } from '../../../lib/types';

const STATUS_CONFIG: Record<LoopStatus, { label: string; color: string; bg: string }> = {
  open: { label: 'Open', color: Colors.statusOpen, bg: '#FEE8F0' },
  in_progress: { label: 'In Progress', color: Colors.statusInProgress, bg: '#FFF8E7' },
  closed: { label: 'Closed', color: Colors.statusClosed, bg: '#E8F5E9' },
};

export default function ArcDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [arc, setArc] = useState<Arc | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  async function load() {
    const { data } = await supabase
      .from('arcs')
      .select('*, bubble:bubbles(*), sub_tasks(*)')
      .eq('id', id)
      .single();
    if (data) setArc(data as any);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function handleStatusChange(status: LoopStatus) {
    if (!arc) return;
    setUpdating(true);
    await updateArcStatus(arc.id, status);
    await load();
    setUpdating(false);
  }

  async function handleClaim(owner: 'me' | 'partner' | 'teen') {
    if (!arc || !user) return;
    setUpdating(true);
    await claimArc(arc.id, user.id, owner);
    await load();
    setUpdating(false);
  }

  async function handleDelete() {
    Alert.alert('Delete Loop', 'Are you sure you want to delete this loop?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await supabase.from('arcs').delete().eq('id', id);
          router.back();
        }
      }
    ]);
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={Colors.primary} /></View>;
  }

  if (!arc) {
    return <View style={styles.centered}><Text>Loop not found</Text></View>;
  }

  const config = STATUS_CONFIG[arc.status];
  const daysLeft = arc.deadline
    ? Math.ceil((new Date(arc.deadline).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete}>
          <Text style={styles.deleteBtn}>Delete</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
          <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{arc.title}</Text>

        {arc.description && (
          <Text style={styles.description}>{arc.description}</Text>
        )}

        {/* Bubble */}
        {arc.bubble && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Bubble</Text>
            <Text style={styles.metaValue}>{(arc.bubble as any).emoji} {(arc.bubble as any).name}</Text>
          </View>
        )}

        {/* Deadline */}
        {arc.deadline && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Deadline</Text>
            <Text style={[styles.metaValue, daysLeft !== null && daysLeft <= 1 && styles.urgentText]}>
              {new Date(arc.deadline).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {daysLeft !== null && ` (${daysLeft <= 0 ? 'Today!' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d left`})`}
            </Text>
          </View>
        )}

        {/* Ownership */}
        <Text style={styles.sectionLabel}>Ownership</Text>
        <View style={styles.ownerRow}>
          {(['me', 'partner', 'teen'] as const).map(o => (
            <TouchableOpacity
              key={o}
              style={[styles.ownerBtn, arc.owner === o && styles.ownerBtnActive]}
              onPress={() => handleClaim(o)}
              disabled={updating}
            >
              <Text style={styles.ownerBtnIcon}>
                {o === 'me' ? '🙋' : o === 'partner' ? '👥' : '👦'}
              </Text>
              <Text style={[styles.ownerBtnText, arc.owner === o && styles.ownerBtnTextActive]}>
                {o === 'me' ? 'Me' : o === 'partner' ? 'Partner' : 'Teen'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sub-tasks */}
        {arc.sub_tasks && arc.sub_tasks.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Steps</Text>
            <View style={styles.subTasks}>
              {arc.sub_tasks.map((task: any) => (
                <View key={task.id} style={styles.subTask}>
                  <View style={[styles.subTaskDot, task.completed && styles.subTaskDotDone]} />
                  <Text style={[styles.subTaskText, task.completed && styles.subTaskTextDone]}>
                    {task.title}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Status actions */}
        <Text style={styles.sectionLabel}>Move Loop</Text>
        <View style={styles.statusActions}>
          {(['open', 'in_progress', 'closed'] as LoopStatus[]).map(s => (
            <TouchableOpacity
              key={s}
              style={[
                styles.statusBtn,
                { borderColor: STATUS_CONFIG[s].color },
                arc.status === s && { backgroundColor: STATUS_CONFIG[s].bg },
              ]}
              onPress={() => handleStatusChange(s)}
              disabled={updating || arc.status === s}
            >
              <Text style={[styles.statusBtnText, { color: STATUS_CONFIG[s].color }]}>
                {STATUS_CONFIG[s].label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {updating && <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.md }} />}
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
  backBtn: {},
  backBtnText: { fontSize: 17, color: Colors.primary, fontWeight: '500' },
  deleteBtn: { fontSize: 15, color: Colors.error },
  content: { padding: Spacing.lg, paddingBottom: 48, gap: Spacing.md },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  statusText: { fontSize: 13, fontWeight: '700' },
  title: { fontFamily: 'Georgia', fontSize: 28, color: Colors.textPrimary, lineHeight: 36 },
  description: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  metaLabel: { fontSize: 13, color: Colors.textTertiary, width: 70 },
  metaValue: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500', flex: 1 },
  urgentText: { color: Colors.statusOpen, fontWeight: '700' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textTertiary, letterSpacing: 1, textTransform: 'uppercase', marginTop: Spacing.sm },
  ownerRow: { flexDirection: 'row', gap: Spacing.sm },
  ownerBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 4,
    ...Shadow.sm,
  },
  ownerBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryPale,
  },
  ownerBtnIcon: { fontSize: 24 },
  ownerBtnText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  ownerBtnTextActive: { color: Colors.primary, fontWeight: '700' },
  subTasks: { gap: 8 },
  subTask: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  subTaskDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: Colors.primary },
  subTaskDotDone: { backgroundColor: Colors.primary },
  subTaskText: { fontSize: 14, color: Colors.textPrimary },
  subTaskTextDone: { color: Colors.textTertiary, textDecorationLine: 'line-through' },
  statusActions: { flexDirection: 'row', gap: Spacing.sm },
  statusBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    backgroundColor: Colors.surface,
  },
  statusBtnText: { fontSize: 12, fontWeight: '700' },
});
