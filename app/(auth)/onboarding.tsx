import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, Radius, Shadow } from '../../lib/theme';
import { useAuth } from '../../lib/auth-context';
import { upsertProfile, addChild } from '../../lib/supabase';
import { ParentStatus } from '../../lib/types';
import ListaaLogo from '../../components/shared/ListaaLogo';

const { width } = Dimensions.get('window');
const TOTAL_STEPS = 4;

// ─── Step dots ────────────────────────────────────────────────────────────────

function StepDots({ current }: { current: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[styles.dot, i === current && styles.dotActive]}
        />
      ))}
    </View>
  );
}

// ─── Parent Status options ────────────────────────────────────────────────────

import Svg, {
  Path, Circle as SvgCircle, Rect, Line, Polyline
} from 'react-native-svg';

const STATUS_OPTIONS: { key: ParentStatus; label: string }[] = [
  { key: 'working_parent',  label: 'Working Parent'     },
  { key: 'stay_at_home',    label: 'Stay at Home Parent'},
  { key: 'co_parent',       label: 'Co-Parent'          },
  { key: 'single_parent',   label: 'Single Parent'      },
  { key: 'expecting',       label: 'Expecting'          },
  { key: 'other',           label: 'Other'              },
];

// Line-art icons matching the design exactly
function StatusIcon({ type, active }: { type: ParentStatus; active: boolean }) {
  const color = active ? Colors.primary : Colors.primaryLight;
  const s = 36;
  switch (type) {
    case 'working_parent':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Rect x="2" y="7" width="20" height="14" rx="2" stroke={color} strokeWidth="1.8" fill="none"/>
          <Path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke={color} strokeWidth="1.8" fill="none"/>
          <Line x1="12" y1="12" x2="12" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
          <Path d="M2 12h20" stroke={color} strokeWidth="1.5"/>
        </Svg>
      );
    case 'stay_at_home':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" stroke={color} strokeWidth="1.8" fill="none"/>
          <Path d="M9 21V12h6v9" stroke={color} strokeWidth="1.8" fill="none"/>
        </Svg>
      );
    case 'co_parent':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <SvgCircle cx="9" cy="7" r="3" stroke={color} strokeWidth="1.8" fill="none"/>
          <SvgCircle cx="15" cy="7" r="3" stroke={color} strokeWidth="1.8" fill="none"/>
          <Path d="M3 21v-1a6 6 0 0 1 6-6h6a6 6 0 0 1 6 6v1" stroke={color} strokeWidth="1.8" fill="none"/>
        </Svg>
      );
    case 'single_parent':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <SvgCircle cx="12" cy="7" r="4" stroke={color} strokeWidth="1.8" fill="none"/>
          <Path d="M6 21v-1a6 6 0 0 1 12 0v1" stroke={color} strokeWidth="1.8" fill="none"/>
        </Svg>
      );
    case 'expecting':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <SvgCircle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" fill="none"/>
          <SvgCircle cx="9" cy="10" r="1" fill={color}/>
          <SvgCircle cx="15" cy="10" r="1" fill={color}/>
          <Path d="M9 15a3 3 0 0 0 6 0" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        </Svg>
      );
    case 'other':
    default:
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <SvgCircle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" fill="none"/>
          <SvgCircle cx="9" cy="10" r="1" fill={color}/>
          <SvgCircle cx="15" cy="10" r="1" fill={color}/>
          <Path d="M9 15a3 3 0 0 0 6 0" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        </Svg>
      );
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 0: Profile
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [status, setStatus] = useState<ParentStatus | null>(null);

  // Step 1: Kids
  const [kids, setKids] = useState<{ name: string; photoUri?: string }[]>([{ name: '' }]);

  // Step 2: Calendar (just intent — real OAuth happens in app)
  const [calendarConnected, setCalendarConnected] = useState(false);

  // Step 3: Tutorial (static)

  function goNext() {
    if (step < TOTAL_STEPS - 1) setStep(s => s + 1);
    else finishOnboarding();
  }

  async function finishOnboarding() {
    if (!user) return;
    setSaving(true);
    try {
      // Save profile
      await upsertProfile({
        id: user.id,
        email: email || user.email || '',
        first_name: firstName,
        parent_status: status ?? undefined,
        calendar_connected: calendarConnected,
        onboarding_complete: true,
      } as any);

      // Save kids
      const validKids = kids.filter(k => k.name.trim());
      for (const kid of validKids) {
        await addChild({ user_id: user.id, name: kid.name.trim(), photo_url: kid.photoUri });
      }

      await refreshProfile();
      router.replace('/(app)');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  function canProceed(): boolean {
    if (step === 0) return firstName.trim().length > 0 && status !== null;
    return true; // Other steps are skippable
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {/* Logo at top */}
        <View style={styles.logoRow}>
          <ListaaLogo size="small" />
        </View>
        <StepDots current={step} />

        {step === 0 && (
          <ProfileStep
            firstName={firstName}
            email={email}
            status={status}
            onFirstName={setFirstName}
            onEmail={setEmail}
            onStatus={setStatus}
          />
        )}
        {step === 1 && (
          <KidsStep kids={kids} onKids={setKids} />
        )}
        {step === 2 && (
          <CalendarStep connected={calendarConnected} onConnect={() => setCalendarConnected(true)} />
        )}
        {step === 3 && (
          <TutorialStep />
        )}

        {/* Bottom actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.nextButton, !canProceed() && styles.nextButtonDisabled]}
            onPress={goNext}
            disabled={saving || (step === 0 && !canProceed())}
          >
            {saving ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.nextButtonText}>Next</Text>
            )}
          </TouchableOpacity>

          {step > 0 && (
            <TouchableOpacity onPress={step === TOTAL_STEPS - 1 ? finishOnboarding : goNext} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Step 0: Profile ──────────────────────────────────────────────────────────

function ProfileStep({ firstName, email, status, onFirstName, onEmail, onStatus }: {
  firstName: string;
  email: string;
  status: ParentStatus | null;
  onFirstName: (v: string) => void;
  onEmail: (v: string) => void;
  onStatus: (v: ParentStatus) => void;
}) {
  return (
    <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepContentInner} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Lets get to{'\n'}know you 😊</Text>

      <TextInput
        style={styles.input}
        placeholder="First Name"
        placeholderTextColor={Colors.textTertiary}
        value={firstName}
        onChangeText={onFirstName}
        autoCapitalize="words"
        returnKeyType="next"
      />
      <TextInput
        style={styles.input}
        placeholder="Email Address"
        placeholderTextColor={Colors.textTertiary}
        value={email}
        onChangeText={onEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Text style={styles.inputHint}>*We'll only use this for login and syncing</Text>

      <Text style={styles.sectionLabel}>What's your status?</Text>
      <View style={styles.statusGrid}>
        {STATUS_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.statusCard, status === opt.key && styles.statusCardActive]}
            onPress={() => onStatus(opt.key)}
            activeOpacity={0.7}
          >
            <StatusIcon type={opt.key} active={status === opt.key} />
            <Text style={[styles.statusLabel, status === opt.key && styles.statusLabelActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Step 1: Kids ─────────────────────────────────────────────────────────────

function KidsStep({ kids, onKids }: {
  kids: { name: string; photoUri?: string }[];
  onKids: (kids: { name: string; photoUri?: string }[]) => void;
}) {
  async function pickPhoto(index: number) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const newKids = [...kids];
      newKids[index] = { ...newKids[index], photoUri: result.assets[0].uri };
      onKids(newKids);
    }
  }

  function updateName(index: number, name: string) {
    const newKids = [...kids];
    newKids[index] = { ...newKids[index], name };
    onKids(newKids);
  }

  function addKid() {
    onKids([...kids, { name: '' }]);
  }

  return (
    <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepContentInner} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Add your kids 👦</Text>
      <Text style={styles.stepSubtitle}>This helps us organize school notes, activities, and reminders by child</Text>

      {kids.map((kid, i) => (
        <View key={i} style={styles.kidForm}>
          <TouchableOpacity style={styles.photoCircle} onPress={() => pickPhoto(i)}>
            {kid.photoUri ? (
              <Image source={{ uri: kid.photoUri }} style={styles.photoCircleImage} />
            ) : (
              <Text style={styles.photoPlus}>+</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.photoHint}>Add photo (recommended!)</Text>
          <TextInput
            style={styles.input}
            placeholder="Kid's Name*"
            placeholderTextColor={Colors.textTertiary}
            value={kid.name}
            onChangeText={v => updateName(i, v)}
            autoCapitalize="words"
          />
        </View>
      ))}

      <TouchableOpacity style={styles.addKidButton} onPress={addKid}>
        <Text style={styles.addKidText}>+ Add another kid</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Step 2: Calendar ─────────────────────────────────────────────────────────

function CalendarStep({ connected, onConnect }: { connected: boolean; onConnect: () => void }) {
  return (
    <View style={[styles.stepContent, styles.stepCentered]}>
      <Text style={styles.stepTitle}>Listaa works{'\n'}for you 🤖</Text>
      <Text style={styles.stepSubtitle}>Connect Google Calendar{'\n'}to enjoy all the great features</Text>

      <TouchableOpacity
        style={[styles.calendarButton, connected && styles.calendarButtonConnected]}
        onPress={onConnect}
        activeOpacity={0.8}
      >
        <Text style={styles.calendarButtonIcon}>G</Text>
        <Text style={styles.calendarButtonText}>
          {connected ? 'CALENDAR CONNECTED ✓' : 'CONNECT CALENDAR'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Step 3: Tutorial ─────────────────────────────────────────────────────────

function TutorialStep() {
  return (
    <View style={[styles.stepContent, styles.stepCentered]}>
      <Text style={styles.stepTitle}>You're all set! 🎉</Text>
      <Text style={styles.stepSubtitle}>
        {'To capture a Thing from any app:\n\n'}
        {'1. Tap the '}
        <Text style={{ fontWeight: '700' }}>Share</Text>
        {' button\n'}
        {'2. Select '}
        <Text style={{ fontWeight: '700', color: Colors.primary }}>Listaa</Text>
        {'\n3. Done — it\'s handed off.\n\n'}
        {'You can also tap '}
        <Text style={{ fontWeight: '700' }}>+</Text>
        {' inside the app to capture directly.'}
      </Text>

      <View style={styles.tutorialCard}>
        <Text style={styles.tutorialCardTitle}>The Hand-Off</Text>
        <Text style={styles.tutorialCardText}>
          The moment a Thing appears — hand it off. No categorizing. No planning. Listaa handles the rest.
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 56,
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceDim,
  },
  dotActive: {
    backgroundColor: Colors.primary,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  stepContentInner: {
    paddingBottom: Spacing.xl,
  },
  stepCentered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontFamily: 'Georgia',
    fontSize: 38,
    fontWeight: '400',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 48,
    marginBottom: Spacing.sm,
  },
  stepSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    paddingVertical: 16,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  inputHint: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: Spacing.lg,
    paddingLeft: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  statusCard: {
    width: (width - Spacing.lg * 2 - Spacing.sm * 2) / 3,
    aspectRatio: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  statusCardActive: {
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryPale,
  },
  statusIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  statusLabelActive: {
    color: Colors.primaryLight,
    fontWeight: '600',
  },
  // Kids step
  kidForm: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  photoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.surfaceDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  photoCircleImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlus: {
    fontSize: 40,
    color: Colors.textTertiary,
    fontWeight: '300',
  },
  photoHint: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  addKidButton: {
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  addKidText: {
    color: Colors.primaryLight,
    fontSize: 16,
    fontWeight: '500',
  },
  // Calendar step
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.textPrimary,
    borderRadius: Radius.full,
    paddingVertical: 18,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  calendarButtonConnected: {
    borderColor: Colors.success,
    backgroundColor: '#E8F5E9',
  },
  calendarButtonIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
  calendarButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1,
    color: Colors.textPrimary,
  },
  // Tutorial step
  tutorialCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
    width: '100%',
    ...Shadow.sm,
  },
  tutorialCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  tutorialCardText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  // Bottom
  bottomActions: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 36,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.background,
  },
  nextButton: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingVertical: 18,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  skipText: {
    color: Colors.primaryLight,
    fontSize: 16,
    fontWeight: '600',
  },
});
