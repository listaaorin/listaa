/**
 * New Listaa Screen — Create a new bubble/listaa
 * Opened when tapping the "New Listaa" (+) circle on the home screen.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius, Shadow } from '../../lib/theme';
import { useAuth } from '../../lib/auth-context';
import { createBubble } from '../../lib/supabase';
import { BubbleType } from '../../lib/types';

const EMOJI_OPTIONS = ['🏠', '👨‍👩‍👧', '💼', '🏫', '⚽', '🎵', '🏥', '✈️', '🌱', '📚', '🎨', '🍕', '💰', '❤️', '🐶'];

const TYPE_OPTIONS: { key: BubbleType; label: string; emoji: string; description: string }[] = [
  { key: 'home',     label: 'Home',     emoji: '🏠', description: 'House, chores, renovations' },
  { key: 'personal', label: 'Personal', emoji: '💼', description: 'Work, health, hobbies'      },
  { key: 'child',    label: 'Child',    emoji: '👦', description: 'School, activities, medical' },
  { key: 'custom',   label: 'Custom',   emoji: '✨', description: 'Anything else'              },
];

export default function NewListaaScreen() {
  const { user } = useAuth();

  const [name, setName]         = useState('');
  const [type, setType]         = useState<BubbleType>('custom');
  const [emoji, setEmoji]       = useState('📁');
  const [saving, setSaving]     = useState(false);

  async function handleCreate() {
    if (!user) return;
    if (!name.trim()) {
      Alert.alert('Name required', 'Please give your Listaa a name.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await createBubble({
        user_id: user.id,
        name: name.trim(),
        type,
        emoji,
        is_shared: false,
      });
      if (error) throw error;
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Listaa</Text>
          {saving ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <TouchableOpacity onPress={handleCreate}>
              <Text style={[styles.createText, !name.trim() && styles.createTextDisabled]}>
                Create
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Preview circle */}
          <View style={styles.previewWrap}>
            <View style={styles.previewCircle}>
              <Text style={styles.previewEmoji}>{emoji}</Text>
            </View>
            <Text style={styles.previewName} numberOfLines={1}>
              {name || 'My Listaa'}
            </Text>
          </View>

          {/* Name */}
          <Text style={styles.sectionLabel}>NAME</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="e.g. School, Health, Home"
            placeholderTextColor={Colors.textTertiary}
            value={name}
            onChangeText={setName}
            maxLength={30}
            autoFocus
          />

          {/* Emoji picker */}
          <Text style={styles.sectionLabel}>ICON</Text>
          <View style={styles.emojiGrid}>
            {EMOJI_OPTIONS.map(e => (
              <TouchableOpacity
                key={e}
                style={[styles.emojiBtn, emoji === e && styles.emojiBtnSelected]}
                onPress={() => setEmoji(e)}
              >
                <Text style={styles.emojiText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Type */}
          <Text style={styles.sectionLabel}>TYPE</Text>
          <View style={styles.typeGrid}>
            {TYPE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.typeCard, type === opt.key && styles.typeCardActive]}
                onPress={() => {
                  setType(opt.key);
                  // Auto-set emoji if not customized from default
                  if (emoji === '📁') setEmoji(opt.emoji);
                }}
              >
                <Text style={styles.typeEmoji}>{opt.emoji}</Text>
                <Text style={[styles.typeLabel, type === opt.key && styles.typeLabelActive]}>
                  {opt.label}
                </Text>
                <Text style={styles.typeDesc}>{opt.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  cancelText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  headerTitle: {
    fontFamily: 'Georgia',
    fontSize: 20,
    color: Colors.textPrimary,
  },
  createText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  createTextDisabled: {
    opacity: 0.4,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 48,
    gap: Spacing.lg,
  },
  previewWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  previewCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  previewEmoji: {
    fontSize: 48,
  },
  previewName: {
    fontFamily: 'Georgia',
    fontSize: 20,
    color: Colors.textPrimary,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: -Spacing.sm,
  },
  nameInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    paddingVertical: 16,
    paddingHorizontal: Spacing.lg,
    fontSize: 18,
    color: Colors.textPrimary,
    textAlign: 'center',
    ...Shadow.sm,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  emojiBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiBtnSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryPale,
  },
  emojiText: {
    fontSize: 24,
  },
  typeGrid: {
    gap: Spacing.sm,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  typeCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryPale,
  },
  typeEmoji: {
    fontSize: 24,
    width: 36,
    textAlign: 'center',
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  typeLabelActive: {
    color: Colors.primary,
  },
  typeDesc: {
    fontSize: 12,
    color: Colors.textTertiary,
    flex: 2,
    textAlign: 'right',
  },
});
