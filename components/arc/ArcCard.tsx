import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Radius, Shadow } from '../../lib/theme';
import { Arc, LoopStatus } from '../../lib/types';
import { updateArcStatus } from '../../lib/supabase';

interface Props {
  arc: Arc;
  onPress: () => void;
  onRefresh: () => void;
}

const STATUS_CONFIG: Record<LoopStatus, { label: string; color: string; bg: string; next: LoopStatus | null }> = {
  open: { label: 'Open', color: Colors.statusOpen, bg: '#FEE8F0', next: 'in_progress' },
  in_progress: { label: 'In Progress', color: Colors.statusInProgress, bg: '#FFF8E7', next: 'closed' },
  closed: { label: 'Closed', color: Colors.statusClosed, bg: '#E8F5E9', next: null },
};

const OWNER_LABEL: Record<string, string> = {
  me: 'Me',
  partner: 'Partner',
  teen: 'Teen',
};

export default function ArcCard({ arc, onPress, onRefresh }: Props) {
  const config = STATUS_CONFIG[arc.status];
  const hasDeadline = arc.deadline;

  async function advanceStatus() {
    if (!config.next) return;
    await updateArcStatus(arc.id, config.next);
    onRefresh();
  }

  const daysLeft = hasDeadline
    ? Math.ceil((new Date(arc.deadline!).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: config.color }]} />
          <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
        </View>
        {arc.bubble && (
          <Text style={styles.bubbleTag}>{arc.bubble.emoji} {arc.bubble.name}</Text>
        )}
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>{arc.title}</Text>

      {/* Bottom row */}
      <View style={styles.bottomRow}>
        {/* Owner */}
        <View style={styles.ownerChip}>
          <Text style={styles.ownerText}>👤 {OWNER_LABEL[arc.owner] ?? arc.owner}</Text>
        </View>

        {/* Deadline */}
        {daysLeft !== null && (
          <Text style={[styles.deadline, daysLeft <= 1 && styles.deadlineUrgent]}>
            {daysLeft <= 0 ? 'Today!' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d left`}
          </Text>
        )}

        {/* Advance button */}
        {config.next && (
          <TouchableOpacity style={styles.advanceBtn} onPress={advanceStatus} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.advanceBtnText}>→ {STATUS_CONFIG[config.next].label}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bubbleTag: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginLeft: 'auto',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ownerChip: {
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  ownerText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  deadline: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginLeft: 'auto',
  },
  deadlineUrgent: {
    color: Colors.statusOpen,
    fontWeight: '700',
  },
  advanceBtn: {
    marginLeft: 'auto',
    backgroundColor: Colors.primaryPale,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  advanceBtnText: {
    fontSize: 12,
    color: Colors.primaryLight,
    fontWeight: '600',
  },
});
