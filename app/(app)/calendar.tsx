import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius, Shadow } from '../../lib/theme';
import { useAuth } from '../../lib/auth-context';
import { getArcs } from '../../lib/supabase';
import { Arc } from '../../lib/types';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

// Colors per event "category" / bubble index
const EVENT_COLORS = [
  '#2E7D32',  // green
  '#6A1B9A',  // purple
  '#F57F17',  // gold
  '#212121',  // dark
  '#880E4F',  // berry/magenta
  '#1565C0',  // blue
  '#BF360C',  // deep orange
  '#004D40',  // teal
];

// Emoji for different bubble types
const BUBBLE_EMOJIS: Record<string, string> = {
  work: '🤖',
  school: '📚',
  food: '🍳',
  health: '🦷',
  travel: '✈️',
  birthday: '😘',
  meeting: '🤝',
  default: '📅',
};

interface CalEvent {
  id: string;
  title: string;
  startTime?: string;
  endTime?: string;
  color: string;
  emoji: string;
  assigneeAvatar?: string;
  isRecurring?: boolean;
  arcId?: string;
}

export default function CalendarScreen() {
  const { user, profile } = useAuth();
  const [viewDate, setViewDate]   = useState(new Date());
  const [events, setEvents]       = useState<CalEvent[]>([]);

  useEffect(() => {
    loadEvents();
  }, [user, viewDate]);

  async function loadEvents() {
    if (!user) return;
    const { data } = await getArcs(user.id);
    const arcs = (data ?? []) as Arc[];

    // Filter arcs with deadlines on this date
    const dateStr = viewDate.toDateString();
    const dayArcs = arcs.filter(a => {
      if (!a.deadline) return false;
      return new Date(a.deadline).toDateString() === dateStr;
    });

    // Convert arcs to events
    const arcEvents: CalEvent[] = dayArcs.map((arc, i) => ({
      id: arc.id,
      title: arc.title,
      startTime: arc.deadline
        ? new Date(arc.deadline).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
        : undefined,
      color: EVENT_COLORS[i % EVENT_COLORS.length],
      emoji: BUBBLE_EMOJIS.default,
      arcId: arc.id,
    }));

    setEvents(arcEvents);
  }

  function goToPrev() {
    const d = new Date(viewDate);
    d.setDate(d.getDate() - 1);
    setViewDate(d);
  }

  function goToNext() {
    const d = new Date(viewDate);
    d.setDate(d.getDate() + 1);
    setViewDate(d);
  }

  function goToToday() {
    setViewDate(new Date());
  }

  const isToday = viewDate.toDateString() === new Date().toDateString();
  const dayLabel = isToday
    ? 'Today'
    : DAYS[viewDate.getDay()].slice(0, 3) + ', ' + viewDate.getDate() + ' ' + MONTHS[viewDate.getMonth()].slice(0, 3);
  const subLabel = DAYS[viewDate.getDay()] + ', ' + viewDate.getDate() + ' ' + MONTHS[viewDate.getMonth()];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => {}}>
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
        </TouchableOpacity>

        <View style={styles.dateNav}>
          <TouchableOpacity onPress={goToPrev} style={styles.navArrowBtn}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToToday}>
            <Text style={styles.dateTitle}>{isToday ? 'Today' : dayLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToNext} style={styles.navArrowBtn}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

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

      <Text style={styles.subDate}>{subLabel}</Text>

      {/* Events list */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.eventsContent}
      >
        {events.length === 0 ? (
          <View style={styles.emptyDay}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyTitle}>Nothing scheduled</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/add-arc')}>
              <Text style={styles.emptyAction}>+ Add an Arc with a deadline</Text>
            </TouchableOpacity>
          </View>
        ) : (
          events.map(ev => (
            <TouchableOpacity
              key={ev.id}
              style={[styles.eventBlock, { backgroundColor: ev.color }]}
              onPress={() => ev.arcId && router.push(`/(app)/arc/${ev.arcId}`)}
              activeOpacity={0.85}
            >
              <View style={styles.eventLeft}>
                <Text style={styles.eventEmoji}>{ev.emoji}</Text>
              </View>
              <View style={styles.eventCenter}>
                <Text style={styles.eventTitle}>{ev.title}</Text>
                <View style={styles.eventTimeRow}>
                  {ev.isRecurring && (
                    <Text style={styles.eventRepeat}>↻ </Text>
                  )}
                  {ev.startTime && (
                    <Text style={styles.eventTime}>
                      {ev.startTime}{ev.endTime ? ` - ${ev.endTime}` : ''}
                    </Text>
                  )}
                </View>
              </View>
              {ev.assigneeAvatar && (
                <Image source={{ uri: ev.assigneeAvatar }} style={styles.eventAvatar} />
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* FABs */}
      <View style={styles.fabArea} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.fab, styles.micFab]}
          onPress={() => router.push({ pathname: '/(app)/capture', params: { type: 'voice' } })}
        >
          <Text style={styles.fabIcon}>🎙</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fab, styles.plusFab]}
          onPress={() => router.push('/(app)/add-arc')}
        >
          <Text style={styles.fabPlusText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    paddingTop: 56,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  menuBtn: { gap: 5, paddingVertical: 4, width: 44 },
  menuLine: { width: 24, height: 2, backgroundColor: Colors.textPrimary, borderRadius: 1 },
  dateNav: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  navArrowBtn: { padding: 4 },
  navArrow: { fontSize: 28, color: Colors.textPrimary, lineHeight: 32 },
  dateTitle: {
    fontFamily: 'Georgia',
    fontSize: 28,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  subDate: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  eventsContent: {
    paddingBottom: 120,
    gap: 2,
  },
  eventBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    minHeight: 100,
    gap: Spacing.md,
  },
  eventLeft: {
    width: 44,
    alignItems: 'center',
  },
  eventEmoji: {
    fontSize: 32,
  },
  eventCenter: {
    flex: 1,
  },
  eventTitle: {
    fontFamily: 'Georgia',
    fontSize: 22,
    color: Colors.white,
    fontWeight: '600',
    lineHeight: 28,
  },
  eventTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  eventRepeat: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  eventTime: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
  },
  eventAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  // Empty
  emptyDay: {
    alignItems: 'center',
    paddingTop: 80,
    gap: Spacing.md,
  },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: Colors.textPrimary },
  emptyAction: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
  // FABs
  fabArea: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: 96,
    alignItems: 'center',
    gap: Spacing.md,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  micFab: { backgroundColor: Colors.surface },
  plusFab: { backgroundColor: Colors.surface },
  fabIcon: { fontSize: 26 },
  fabPlusText: { fontSize: 34, color: Colors.textPrimary, lineHeight: 38, fontWeight: '300' },
});
