import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';
import { Colors, Spacing, Radius, Shadow } from '../../lib/theme';
import { useAuth } from '../../lib/auth-context';
import { getBubbles, getChildren, createArc } from '../../lib/supabase';
import { Bubble, Child } from '../../lib/types';

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

type Importance = 'low' | 'medium' | 'high';

const IMPORTANCE_CONFIG: Record<Importance, { color: string; label: string }> = {
  low:    { color: '#F5A623', label: 'Low' },
  medium: { color: '#E65100', label: 'Medium' },
  high:   { color: '#7B1244', label: 'High' },
};

export default function AddArcScreen() {
  const { user, profile } = useAuth();
  const params = useLocalSearchParams<{ prefill?: string }>();

  const [title, setTitle]             = useState(params.prefill ?? '');
  const [bubbles, setBubbles]         = useState<Bubble[]>([]);
  const [children, setChildren]       = useState<Child[]>([]);
  const [selectedBubble, setSelectedBubble] = useState<string | null>(null);
  const [noDeadline, setNoDeadline]   = useState(false);
  const [deadlineDay, setDeadlineDay]     = useState(new Date().getDate());
  const [deadlineMonth, setDeadlineMonth] = useState(new Date().getMonth());
  const [deadlineYear, setDeadlineYear]   = useState(new Date().getFullYear());
  const [assignedTo, setAssignedTo]   = useState<string | null>(user?.id ?? null);
  const [importance, setImportance]   = useState<Importance>('low');
  const [instructions, setInstructions] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording]     = useState<Audio.Recording | null>(null);
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([getBubbles(user.id), getChildren(user.id)]).then(([b, c]) => {
      if (b.data) setBubbles(b.data as Bubble[]);
      if (c.data) setChildren(c.data as Child[]);
    });
  }, [user]);

  // ─── Assign-to items: self + partner + kids ───────────────────────────────
  const assignees = [
    ...(user ? [{ id: user.id, name: 'Me', avatar: profile?.avatar_url }] : []),
    ...(profile?.partner_id ? [{ id: profile.partner_id, name: 'Partner', avatar: undefined }] : []),
  ];

  // ─── Voice recording ──────────────────────────────────────────────────────
  async function toggleRecording() {
    if (isRecording && recording) {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) setInstructions(prev => prev + ' [voice note]');
    } else {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
    }
  }

  // ─── Save ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!user || !title.trim()) {
      Alert.alert('What needs to be done?', 'Please enter a title for this Arc.');
      return;
    }
    setSaving(true);
    try {
      const deadline = noDeadline
        ? undefined
        : new Date(deadlineYear, deadlineMonth, deadlineDay).toISOString();

      await createArc({
        user_id: user.id,
        title: title.trim(),
        description: instructions || undefined,
        deadline,
        bubble_id: selectedBubble ?? undefined,
        owner: assignedTo === user.id ? 'me' : 'partner',
        is_shared: false,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  // ─── Date scroll pickers ──────────────────────────────────────────────────
  const days   = Array.from({ length: 31 }, (_, i) => i + 1);
  const years  = Array.from({ length: 5 },  (_, i) => new Date().getFullYear() + i);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerPlus}>+</Text>
            <Text style={styles.headerTitle}> Add new </Text>
            <ArcWordWithCurve />
          </View>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {(profile?.first_name ?? '?')[0]?.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* What needs to be done */}
          <TextInput
            style={styles.titleInput}
            placeholder="What needs to be done?"
            placeholderTextColor={Colors.textTertiary}
            value={title}
            onChangeText={setTitle}
            autoFocus={!params.prefill}
            multiline
          />

          {/* SELECT LISTAA */}
          <Text style={styles.sectionLabel}>SELECT LISTAA</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.listaasRow}>
            <View style={styles.listaasInner}>
              {bubbles.map((b, i) => (
                <TouchableOpacity
                  key={b.id}
                  style={styles.listaaCircleWrapper}
                  onPress={() => setSelectedBubble(b.id === selectedBubble ? null : b.id)}
                >
                  <View style={[
                    styles.listaaCircle,
                    { backgroundColor: Colors.primary },
                    selectedBubble === b.id && styles.listaaCircleSelected,
                  ]}>
                    <Text style={styles.listaaEmoji}>{b.emoji ?? '📁'}</Text>
                  </View>
                  <Text style={styles.listaaLabel} numberOfLines={1}>{b.name}</Text>
                </TouchableOpacity>
              ))}
              {children.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.listaaCircleWrapper}
                  onPress={() => setSelectedBubble(c.id === selectedBubble ? null : c.id)}
                >
                  {c.photo_url ? (
                    <Image source={{ uri: c.photo_url }} style={[
                      styles.listaaCircle,
                      selectedBubble === c.id && styles.listaaCircleSelected,
                    ]} />
                  ) : (
                    <View style={[
                      styles.listaaCircle,
                      { backgroundColor: '#E65100' },
                      selectedBubble === c.id && styles.listaaCircleSelected,
                    ]}>
                      <Text style={styles.listaaInitial}>{c.name[0]?.toUpperCase()}</Text>
                    </View>
                  )}
                  <Text style={styles.listaaLabel} numberOfLines={1}>{c.name}</Text>
                </TouchableOpacity>
              ))}
              {/* Add new */}
              <TouchableOpacity style={styles.listaaCircleWrapper} onPress={() => {}}>
                <View style={[styles.listaaCircle, styles.addCircle]}>
                  <Text style={styles.addPlus}>+</Text>
                </View>
                <Text style={styles.listaaLabel}>Add</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* DEADLINE */}
          <Text style={styles.sectionLabel}>DEADLINE</Text>
          {!noDeadline && (
            <View style={styles.datePickerRow}>
              <ScrollDatePicker
                items={days}
                selected={deadlineDay}
                onSelect={setDeadlineDay}
                width={60}
                format={v => String(v)}
              />
              <Text style={styles.dateSep}>/</Text>
              <ScrollDatePicker
                items={MONTHS}
                selected={deadlineMonth}
                onSelect={setDeadlineMonth}
                width={120}
                format={(_, i) => MONTHS[i as number]}
              />
              <Text style={styles.dateSep}>/</Text>
              <ScrollDatePicker
                items={years}
                selected={deadlineYear - years[0]}
                onSelect={i => setDeadlineYear(years[i as number])}
                width={70}
                format={v => String(v)}
              />
            </View>
          )}
          <TouchableOpacity
            style={styles.noDeadlineRow}
            onPress={() => setNoDeadline(v => !v)}
          >
            <View style={[styles.radioCircle, noDeadline && styles.radioCircleFilled]} />
            <Text style={styles.noDeadlineText}>No deadline</Text>
          </TouchableOpacity>

          {/* ASSIGN TO */}
          <Text style={styles.sectionLabel}>ASSIGN TO</Text>
          <View style={styles.assignRow}>
            {assignees.map(a => (
              <TouchableOpacity
                key={a.id}
                style={styles.assigneeWrapper}
                onPress={() => setAssignedTo(a.id)}
              >
                {a.avatar ? (
                  <Image
                    source={{ uri: a.avatar }}
                    style={[styles.assigneeCircle, assignedTo === a.id && styles.assigneeSelected]}
                  />
                ) : (
                  <View style={[
                    styles.assigneeCircle,
                    { backgroundColor: Colors.primary },
                    assignedTo === a.id && styles.assigneeSelected,
                  ]}>
                    <Text style={styles.assigneeInitial}>{a.name[0]}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.assigneeWrapper}
              onPress={() => router.push('/(app)/partner-invite')}
            >
              <View style={styles.addAssigneeCircle}>
                <Text style={styles.addAssigneeText}>👤+</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* SELECT IMPORTANCE */}
          <Text style={styles.sectionLabel}>SELECT IMPORTANCE</Text>
          <View style={styles.importanceRow}>
            {(Object.entries(IMPORTANCE_CONFIG) as [Importance, typeof IMPORTANCE_CONFIG['low']][]).map(([key, cfg]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.importanceDot,
                  { backgroundColor: cfg.color },
                  importance === key && styles.importanceDotSelected,
                ]}
                onPress={() => setImportance(key)}
              >
                {importance === key && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>

          {/* Instructions input */}
          <View style={styles.instructionsContainer}>
            <TextInput
              style={styles.instructionsInput}
              placeholder="Type or Record instructions to Listaa"
              placeholderTextColor={Colors.textTertiary}
              value={instructions}
              onChangeText={setInstructions}
              multiline
            />
            <TouchableOpacity
              style={[styles.micBtn, isRecording && styles.micBtnRecording]}
              onPress={toggleRecording}
            >
              <Text style={styles.micBtnText}>🎙</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.instructionsHint}>
            *Example: Ask Listaa to check if done until a specific date
          </Text>

          {/* Add Arc button */}
          <TouchableOpacity
            style={styles.addArcBtn}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <View style={styles.addArcBtnContent}>
                <Text style={styles.addArcBtnText}>+ Add </Text>
                <ArcWordWithCurve light />
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── "Arc" word with arc curve above it ──────────────────────────────────────

function ArcWordWithCurve({ light }: { light?: boolean }) {
  const color = light ? Colors.white : Colors.textPrimary;
  return (
    <View style={arcStyles.container}>
      {/* The arc/curve above "Arc" */}
      <View style={arcStyles.curveContainer}>
        <View style={[arcStyles.curve, { borderColor: color }]} />
      </View>
      <Text style={[arcStyles.text, { color }]}>Arc</Text>
    </View>
  );
}

const arcStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  curveContainer: {
    height: 10,
    width: 44,
    overflow: 'hidden',
    marginBottom: -2,
  },
  curve: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.textPrimary,
    position: 'absolute',
    top: 0,
    backgroundColor: 'transparent',
  },
  text: {
    fontFamily: 'Georgia',
    fontSize: 24,
    color: Colors.textPrimary,
  },
});

// ─── Simple scroll date picker ────────────────────────────────────────────────

function ScrollDatePicker({
  items,
  selected,
  onSelect,
  width,
  format,
}: {
  items: (string | number)[];
  selected: number;
  onSelect: (idx: number) => void;
  width: number;
  format: (v: string | number, i?: number) => string;
}) {
  const ITEM_H = 36;

  function prev() { onSelect(Math.max(0, selected - 1)); }
  function next() { onSelect(Math.min(items.length - 1, selected + 1)); }

  return (
    <View style={[pickerStyles.container, { width }]}>
      <TouchableOpacity onPress={prev} style={pickerStyles.arrow}>
        <Text style={pickerStyles.arrowText}>^</Text>
      </TouchableOpacity>
      <Text style={pickerStyles.value}>{format(items[selected], selected)}</Text>
      <TouchableOpacity onPress={next} style={pickerStyles.arrow}>
        <Text style={[pickerStyles.arrowText, { transform: [{ rotate: '180deg' }] }]}>^</Text>
      </TouchableOpacity>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  arrow: {
    padding: 4,
  },
  arrowText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  value: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
});

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
  },
  backArrow: {
    fontSize: 32,
    color: Colors.primary,
    lineHeight: 36,
    marginRight: Spacing.sm,
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerPlus: {
    fontFamily: 'Georgia',
    fontSize: 24,
    color: Colors.textPrimary,
  },
  headerTitle: {
    fontFamily: 'Georgia',
    fontSize: 24,
    color: Colors.textPrimary,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginLeft: Spacing.sm,
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
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 48,
    gap: Spacing.lg,
  },
  titleInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingVertical: 18,
    paddingHorizontal: Spacing.xl,
    fontSize: 16,
    color: Colors.textPrimary,
    textAlign: 'center',
    ...Shadow.sm,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: -Spacing.sm,
  },
  listaasRow: {
    marginHorizontal: -Spacing.lg,
  },
  listaasInner: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  listaaCircleWrapper: {
    alignItems: 'center',
    gap: 4,
    width: 64,
  },
  listaaCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  listaaCircleSelected: {
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  listaaEmoji: {
    fontSize: 24,
  },
  listaaInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
  },
  listaaLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  addCircle: {
    backgroundColor: Colors.surfaceDim,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  addPlus: {
    fontSize: 24,
    color: Colors.textTertiary,
  },
  // Date picker
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  dateSep: {
    fontSize: 24,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  noDeadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: -Spacing.sm,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.textPrimary,
  },
  radioCircleFilled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  noDeadlineText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  // Assign to
  assignRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  assigneeWrapper: {
    alignItems: 'center',
  },
  assigneeCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  assigneeSelected: {
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  assigneeInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
  },
  addAssigneeCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surfaceDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAssigneeText: {
    fontSize: 20,
  },
  // Importance
  importanceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  importanceDot: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importanceDotSelected: {
    borderWidth: 3,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  checkmark: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '700',
  },
  // Instructions
  instructionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingLeft: Spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
    ...Shadow.sm,
  },
  instructionsInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingVertical: 10,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnRecording: {
    backgroundColor: Colors.error,
  },
  micBtnText: {
    fontSize: 20,
  },
  instructionsHint: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: -Spacing.sm,
  },
  // Add Arc button
  addArcBtn: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  addArcBtnContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  addArcBtnText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Georgia',
  },
});
