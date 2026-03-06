import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius, Shadow } from '../../lib/theme';
import { useAuth } from '../../lib/auth-context';
import { getArcs } from '../../lib/supabase';
import { Arc } from '../../lib/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarScreen() {
  const { user } = useAuth();
  const [arcs, setArcs] = useState<Arc[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data } = await getArcs(user.id);
      setArcs((data ?? []) as Arc[]);
      setLoading(false);
    }
    load();
  }, [user]);

  // Build calendar grid for current month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  );

  // Get arcs with deadlines in this month
  const arcsByDay: Record<number, Arc[]> = {};
  arcs.forEach(arc => {
    if (!arc.deadline) return;
    const d = new Date(arc.deadline);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const day = d.getDate();
      arcsByDay[day] = [...(arcsByDay[day] ?? []), arc];
    }
  });

  const selectedArcs = arcsByDay[selectedDay] ?? [];

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Calendar</Text>
      <Text style={styles.monthLabel}>{MONTHS[month]} {year}</Text>

      {/* Day headers */}
      <View style={styles.dayHeaders}>
        {DAYS.map(d => (
          <Text key={d} style={styles.dayHeader}>{d}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`empty-${i}`} style={styles.cell} />;
          const isToday = day === currentDate.getDate();
          const isSelected = day === selectedDay;
          const hasEvents = !!arcsByDay[day]?.length;
          return (
            <TouchableOpacity
              key={day}
              style={[styles.cell, isSelected && styles.cellSelected, isToday && !isSelected && styles.cellToday]}
              onPress={() => setSelectedDay(day)}
            >
              <Text style={[styles.cellText, isSelected && styles.cellTextSelected, isToday && !isSelected && styles.cellTextToday]}>
                {day}
              </Text>
              {hasEvents && <View style={[styles.eventDot, isSelected && styles.eventDotSelected]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected day arcs */}
      <View style={styles.selectedDay}>
        <Text style={styles.selectedDayLabel}>
          {DAYS[new Date(year, month, selectedDay).getDay()]}, {MONTHS[month]} {selectedDay}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.lg }} />
      ) : selectedArcs.length === 0 ? (
        <View style={styles.emptyDay}>
          <Text style={styles.emptyDayText}>No loops due on this day</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/capture')}>
            <Text style={styles.addLink}>+ Add a loop with this deadline</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.arcList}>
          {selectedArcs.map(arc => (
            <TouchableOpacity
              key={arc.id}
              style={styles.arcItem}
              onPress={() => router.push(`/(app)/arc/${arc.id}`)}
            >
              <View style={[styles.arcStatusDot, {
                backgroundColor: arc.status === 'open' ? Colors.statusOpen
                  : arc.status === 'in_progress' ? Colors.statusInProgress
                  : Colors.statusClosed
              }]} />
              <Text style={styles.arcTitle}>{arc.title}</Text>
            </TouchableOpacity>
          ))}
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
    marginBottom: 4,
  },
  monthLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.lg,
  },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  cellSelected: {
    backgroundColor: Colors.primary,
  },
  cellToday: {
    backgroundColor: Colors.primaryPale,
  },
  cellText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  cellTextSelected: {
    color: Colors.white,
    fontWeight: '700',
  },
  cellTextToday: {
    color: Colors.primary,
    fontWeight: '700',
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.primaryLight,
    marginTop: 1,
  },
  eventDotSelected: {
    backgroundColor: Colors.white,
  },
  selectedDay: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.md,
  },
  selectedDayLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  emptyDay: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyDayText: { fontSize: 14, color: Colors.textTertiary },
  addLink: { fontSize: 14, color: Colors.primaryLight, fontWeight: '600' },
  arcList: { gap: Spacing.sm, paddingBottom: 80 },
  arcItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  arcStatusDot: { width: 10, height: 10, borderRadius: 5 },
  arcTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
});
