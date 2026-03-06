/**
 * Capture Screen — The Hand-Off
 * Matches the design:
 *  - Header: ‹ back  |  🔔+ SAVE TO
 *  - Large "Title/Paste URL here" editable heading
 *  - "Type here" multiline body
 *  - Bottom toolbar: image | mic | checklist icons
 *  - Modes: text (default), checklist, voice
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { Colors, Spacing, Radius, Shadow } from '../../lib/theme';
import { useAuth } from '../../lib/auth-context';
import { createThing, createArc, createVaultItem, getBubbles } from '../../lib/supabase';
import { analyzeContent, ThingAnalysis } from '../../lib/claude';
import { Bubble } from '../../lib/types';

type InputMode  = 'text' | 'checklist' | 'voice';
type Stage      = 'input' | 'analyzing' | 'saveto';

interface CheckItem { id: string; text: string; done: boolean }

export default function CaptureScreen() {
  const { user }  = useAuth();
  const params    = useLocalSearchParams<{ type?: string; sharedText?: string }>();

  const [inputMode, setInputMode] = useState<InputMode>(
    params.type === 'voice' ? 'voice' : 'text'
  );
  const [stage, setStage]       = useState<Stage>('input');
  const [title, setTitle]       = useState(params.sharedText ?? '');
  const [body, setBody]         = useState('');
  const [checkItems, setCheckItems] = useState<CheckItem[]>([
    { id: '1', text: '', done: false },
  ]);
  const [analysis, setAnalysis] = useState<ThingAnalysis | null>(null);
  const [destination, setDestination] = useState<'arc' | 'vault'>('vault');
  const [bubbles, setBubbles]   = useState<Bubble[]>([]);
  const [selectedBubble, setSelectedBubble] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (user) getBubbles(user.id).then(r => { if (r.data) setBubbles(r.data as Bubble[]); });
    // Auto-trigger voice if launched in voice mode
    if (params.type === 'voice') startRecording();
  }, [user]);

  // ─── Voice ──────────────────────────────────────────────────────────────────
  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
    } catch { Alert.alert('Error', 'Could not start recording'); }
  }

  async function stopRecording() {
    if (!recording) return;
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    setRecording(null);
    setTitle(prev => prev || 'Voice note');
    setBody('[Voice note captured]');
  }

  // ─── Image pick ─────────────────────────────────────────────────────────────
  async function pickImage() {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!res.canceled && res.assets[0]) {
      setTitle(prev => prev || 'Image capture');
      setBody(res.assets[0].uri);
    }
  }

  // ─── Proceed to SAVE TO ──────────────────────────────────────────────────────
  async function handleSaveTo() {
    const content = title || body || checkItems.map(c => c.text).join(', ');
    if (!content.trim()) {
      Alert.alert('Nothing to save', 'Add a title or some content first.');
      return;
    }
    setStage('analyzing');
    try {
      const result = await analyzeContent(content, 'text');
      setAnalysis(result);
      setDestination(result.destination);
    } catch {
      // Fallback: just show the save-to UI manually
    }
    setStage('saveto');
  }

  // ─── Final save ──────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      const rawContent = inputMode === 'checklist'
        ? checkItems.map(c => (c.done ? '☑ ' : '☐ ') + c.text).join('\n')
        : [title, body].filter(Boolean).join('\n');

      await createThing({
        user_id: user.id,
        type: 'text',
        raw_content: rawContent,
        destination,
        bubble_id: selectedBubble ?? undefined,
      });

      if (destination === 'arc') {
        await createArc({
          user_id: user.id,
          title: analysis?.title ?? title,
          description: analysis?.summary ?? body,
          deadline: analysis?.deadline ?? undefined,
          bubble_id: selectedBubble ?? undefined,
        });
      } else {
        await createVaultItem({
          user_id: user.id,
          title: analysis?.title ?? title,
          content: analysis?.summary ?? rawContent,
          category: (analysis?.category as any) ?? 'other',
          tags: analysis?.tags ?? [],
          bubble_id: selectedBubble ?? undefined,
        });
      }
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  // ─── Checklist helpers ────────────────────────────────────────────────────────
  function addCheckItem() {
    setCheckItems(prev => [...prev, { id: Date.now().toString(), text: '', done: false }]);
  }
  function updateCheckItem(id: string, text: string) {
    setCheckItems(prev => prev.map(c => c.id === id ? { ...c, text } : c));
  }
  function toggleCheckItem(id: string) {
    setCheckItems(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c));
  }

  // ─── ANALYZING state ──────────────────────────────────────────────────────────
  if (stage === 'analyzing') {
    return (
      <View style={styles.analyzingScreen}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.analyzingText}>Reading your Thing…</Text>
      </View>
    );
  }

  // ─── SAVE TO state ────────────────────────────────────────────────────────────
  if (stage === 'saveto') {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setStage('input')}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.saveToModalTitle}>Listaa</Text>
            {saving ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <TouchableOpacity onPress={handleSave}>
                <Text style={styles.saveBtn}>Save</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView contentContainerStyle={styles.saveToContent} keyboardShouldPersistTaps="handled">
            {/* SAVE TO toggle */}
            <Text style={styles.sectionLabel}>SAVE TO</Text>
            <View style={styles.destToggle}>
              <TouchableOpacity
                style={[styles.destToggleOpt, destination === 'vault' && styles.destToggleOptDark]}
                onPress={() => setDestination('vault')}
              >
                <Text style={[styles.destToggleText, destination === 'vault' && styles.destToggleTextDark]}>
                  My Listaas
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.destToggleOpt, destination === 'arc' && styles.destToggleOptDark]}
                onPress={() => setDestination('arc')}
              >
                <Text style={[styles.destToggleText, destination === 'arc' && styles.destToggleTextDark]}>
                  Arc
                </Text>
              </TouchableOpacity>
            </View>

            {/* AI-extracted title */}
            {analysis?.title && (
              <>
                <Text style={styles.sectionLabel}>TITLE</Text>
                <View style={styles.titleRow}>
                  <Text style={styles.titleText}>{analysis.title}</Text>
                  <TouchableOpacity><Text style={styles.editPencil}>✏️</Text></TouchableOpacity>
                </View>
              </>
            )}

            {/* Tags */}
            {analysis?.tags && analysis.tags.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>TAGS</Text>
                <View style={styles.tagsWrap}>
                  {analysis.tags.map(tag => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>#{tag}</Text>
                      <Text style={styles.tagRemove}>×</Text>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.tag}>
                    <Text style={styles.tagText}>+add</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Which Listaa? */}
            <Text style={styles.sectionLabel}>
              {destination === 'arc' ? 'SELECT KID/LISTAA' : 'SAVE TO LISTAA'}
            </Text>
            {bubbles.map(b => (
              <TouchableOpacity
                key={b.id}
                style={styles.listaaRow}
                onPress={() => setSelectedBubble(b.id === selectedBubble ? null : b.id)}
              >
                <View style={[styles.listaaAvatar, { backgroundColor: Colors.primary }]}>
                  <Text style={{ fontSize: 18 }}>{b.emoji ?? '📁'}</Text>
                </View>
                <Text style={styles.listaaName}>{b.name}</Text>
                <View style={[styles.listaaCheck, selectedBubble === b.id && styles.listaaCheckSelected]}>
                  {selectedBubble === b.id && <Text style={styles.listaaCheckMark}>✓</Text>}
                </View>
              </TouchableOpacity>
            ))}

            {/* New Listaa */}
            <TouchableOpacity style={styles.listaaRow}>
              <View style={[styles.listaaAvatar, { backgroundColor: '#1A1A1A' }]}>
                <Text style={{ fontSize: 18, color: Colors.white }}>+</Text>
              </View>
              <Text style={styles.listaaName}>New Listaa</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ─── INPUT state ──────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.saveToBtn} onPress={handleSaveTo}>
            <Text style={styles.saveToBell}>🔔</Text>
            <Text style={styles.saveToText}>SAVE TO</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.inputScroll}
          contentContainerStyle={styles.inputContent}
          keyboardShouldPersistTaps="handled"
        >
          {inputMode === 'text' && (
            <>
              <TextInput
                style={styles.titleInput}
                placeholder="Title/Paste URL here"
                placeholderTextColor={Colors.textSecondary}
                value={title}
                onChangeText={setTitle}
                multiline
                autoFocus
              />
              <TextInput
                style={styles.bodyInput}
                placeholder="Type here"
                placeholderTextColor={Colors.textTertiary}
                value={body}
                onChangeText={setBody}
                multiline
                textAlignVertical="top"
              />
            </>
          )}

          {inputMode === 'checklist' && (
            <>
              <TextInput
                style={styles.titleInput}
                placeholder="Title"
                placeholderTextColor={Colors.textSecondary}
                value={title}
                onChangeText={setTitle}
              />
              {checkItems.map((item, i) => (
                <View key={item.id} style={styles.checkRow}>
                  {/* Drag handle */}
                  <View style={styles.dragHandle}>
                    <View style={styles.dragDot} /><View style={styles.dragDot} />
                    <View style={styles.dragDot} /><View style={styles.dragDot} />
                    <View style={styles.dragDot} /><View style={styles.dragDot} />
                  </View>
                  <TouchableOpacity
                    style={[styles.checkbox, item.done && styles.checkboxDone]}
                    onPress={() => toggleCheckItem(item.id)}
                  >
                    {item.done && <Text style={styles.checkboxTick}>✓</Text>}
                  </TouchableOpacity>
                  <TextInput
                    style={styles.checkInput}
                    placeholder="Add item"
                    placeholderTextColor={Colors.textTertiary}
                    value={item.text}
                    onChangeText={t => updateCheckItem(item.id, t)}
                    autoFocus={i === 0}
                    returnKeyType="next"
                    onSubmitEditing={addCheckItem}
                  />
                </View>
              ))}
              <TouchableOpacity style={styles.addItemBtn} onPress={addCheckItem}>
                <Text style={styles.addItemText}>+ Add item</Text>
              </TouchableOpacity>
            </>
          )}

          {inputMode === 'voice' && (
            <View style={styles.voiceArea}>
              <TouchableOpacity
                style={[styles.voiceCircle, isRecording && styles.voiceCircleActive]}
                onPress={isRecording ? stopRecording : startRecording}
              >
                <Text style={styles.voiceMic}>🎙</Text>
              </TouchableOpacity>
              <Text style={styles.voiceHint}>
                {isRecording ? 'Recording… tap to stop' : 'Tap to start recording'}
              </Text>
              {body ? <Text style={styles.voiceTranscript}>{body}</Text> : null}
            </View>
          )}
        </ScrollView>

        {/* Bottom toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={pickImage}>
            <ImageIcon active={false} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setInputMode(inputMode === 'voice' ? 'text' : 'voice')}>
            <MicIcon active={inputMode === 'voice'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setInputMode(inputMode === 'checklist' ? 'text' : 'checklist')}>
            <ChecklistIcon active={inputMode === 'checklist'} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Toolbar icons ────────────────────────────────────────────────────────────

function ImageIcon({ active }: { active: boolean }) {
  const c = active ? Colors.primary : Colors.primaryLight;
  return (
    <View style={iconStyles.wrap}>
      <View style={[iconStyles.imgOuter, { borderColor: c }]}>
        <View style={[iconStyles.imgInner, { backgroundColor: c }]} />
        <View style={[iconStyles.imgMountain, { borderBottomColor: c }]} />
      </View>
    </View>
  );
}

function MicIcon({ active }: { active: boolean }) {
  const c = active ? Colors.primary : Colors.primaryLight;
  return (
    <View style={iconStyles.wrap}>
      <View style={[iconStyles.micHead, { borderColor: c }]} />
      <View style={[iconStyles.micBody, { borderColor: c }]} />
      <View style={[iconStyles.micBase, { backgroundColor: c }]} />
    </View>
  );
}

function ChecklistIcon({ active }: { active: boolean }) {
  const c = active ? Colors.primary : Colors.primaryLight;
  return (
    <View style={iconStyles.wrap}>
      <View style={[iconStyles.checkBox, { borderColor: c }]}>
        <Text style={[iconStyles.checkTick, { color: c }]}>✓</Text>
      </View>
    </View>
  );
}

const iconStyles = StyleSheet.create({
  wrap: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  imgOuter: { width: 22, height: 18, borderWidth: 2, borderRadius: 3, overflow: 'hidden', position: 'relative' },
  imgInner: { width: 6, height: 6, borderRadius: 3, position: 'absolute', top: 3, left: 3 },
  imgMountain: { width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', position: 'absolute', bottom: 0, right: 4 },
  micHead: { width: 10, height: 14, borderRadius: 5, borderWidth: 2, backgroundColor: 'transparent' },
  micBody: { width: 18, height: 8, borderBottomLeftRadius: 9, borderBottomRightRadius: 9, borderWidth: 2, borderTopWidth: 0, marginTop: -1 },
  micBase: { width: 2, height: 5, borderRadius: 1, marginTop: 1 },
  checkBox: { width: 20, height: 20, borderWidth: 2, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  checkTick: { fontSize: 12, fontWeight: '700' },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  backArrow: { fontSize: 32, color: Colors.primary, lineHeight: 36 },
  closeBtn:  { fontSize: 22, color: Colors.textSecondary, padding: 4 },
  saveToBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  saveToBell: { fontSize: 20 },
  saveToText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1,
  },
  // Input area
  inputScroll: { flex: 1 },
  inputContent: { padding: Spacing.lg, gap: Spacing.sm },
  titleInput: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 30,
    minHeight: 40,
  },
  bodyInput: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
    minHeight: 200,
  },
  // Checklist
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  dragHandle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 14,
    gap: 3,
  },
  dragDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.textTertiary },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: Colors.primaryLight },
  checkboxTick: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  checkInput: { flex: 1, fontSize: 16, color: Colors.textPrimary },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingLeft: 38 },
  addItemText: { fontSize: 15, color: Colors.textSecondary },
  // Voice
  voiceArea: { alignItems: 'center', paddingTop: 60, gap: Spacing.lg },
  voiceCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.surfaceDim,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.md,
  },
  voiceCircleActive: { backgroundColor: '#FEE8F0' },
  voiceMic: { fontSize: 44 },
  voiceHint: { fontSize: 15, color: Colors.textSecondary },
  voiceTranscript: { fontSize: 14, color: Colors.textPrimary, lineHeight: 22, paddingHorizontal: Spacing.lg, textAlign: 'center' },
  // Toolbar
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.xl,
    backgroundColor: Colors.background,
  },
  // Analyzing
  analyzingScreen: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  analyzingText: { fontFamily: 'Georgia', fontSize: 22, color: Colors.textPrimary },
  // Save-to modal
  saveToModalTitle: {
    flex: 1, textAlign: 'center',
    fontFamily: 'Georgia', fontSize: 22, color: Colors.textPrimary,
  },
  saveBtn: { fontSize: 16, fontWeight: '600', color: Colors.primary },
  saveToContent: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 48 },
  sectionLabel: {
    fontSize: 12, fontWeight: '800', color: Colors.textTertiary,
    letterSpacing: 1.5, textAlign: 'center',
  },
  destToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    padding: 3,
    alignSelf: 'center',
    ...Shadow.sm,
  },
  destToggleOpt: {
    paddingHorizontal: 28, paddingVertical: 10, borderRadius: Radius.full,
  },
  destToggleOptDark: { backgroundColor: '#1A1A1A' },
  destToggleText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  destToggleTextDark: { color: Colors.white },
  // AI title row
  titleRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    gap: Spacing.md, ...Shadow.sm,
  },
  titleText: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  editPencil: { fontSize: 16 },
  // Tags
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: Colors.surface,
  },
  tagText: { fontSize: 13, color: Colors.textPrimary },
  tagRemove: { fontSize: 14, color: Colors.textTertiary },
  // Listaa rows
  listaaRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  listaaAvatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  listaaName: { flex: 1, fontSize: 17, color: Colors.textPrimary, fontWeight: '500' },
  listaaCheck: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  listaaCheckSelected: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  listaaCheckMark: { color: Colors.white, fontSize: 14, fontWeight: '700' },
});
