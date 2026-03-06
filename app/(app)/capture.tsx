import React, { useState, useEffect } from 'react';
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
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { Colors, Spacing, Radius, Shadow } from '../../lib/theme';
import { useAuth } from '../../lib/auth-context';
import { createThing, createArc, createVaultItem, getBubbles, supabase } from '../../lib/supabase';
import { analyzeContent, ThingAnalysis } from '../../lib/claude';
import { Bubble } from '../../lib/types';

type CaptureMode = 'text' | 'camera' | 'voice';
type Stage = 'capture' | 'analyzing' | 'classify';

const { height } = Dimensions.get('window');

export default function CaptureScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ type?: string; sharedText?: string }>();

  const [stage, setStage] = useState<Stage>('capture');
  const [captureMode, setCaptureMode] = useState<CaptureMode>(
    params.type === 'voice' ? 'voice' : 'text'
  );
  const [text, setText] = useState(params.sharedText ?? '');
  const [analysis, setAnalysis] = useState<ThingAnalysis | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [selectedBubble, setSelectedBubble] = useState<string | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<'arc' | 'vault'>('arc');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      getBubbles(user.id).then(({ data }) => {
        if (data) setBubbles(data as Bubble[]);
      });
    }
  }, [user]);

  // ─── Camera capture ──────────────────────────────────────────────────────────
  async function handleCamera() {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setText(`[Photo captured: ${result.assets[0].uri}]`);
      await analyzeAndClassify(`Photo content from camera: ${result.assets[0].uri}`);
    }
  }

  // ─── Voice recording ─────────────────────────────────────────────────────────
  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
    } catch (e: any) {
      Alert.alert('Error', 'Could not start recording');
    }
  }

  async function stopRecording() {
    if (!recording) return;
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    if (uri) {
      setText(`[Voice note: ${uri}]`);
      await analyzeAndClassify('Voice note captured — transcribe and process as a family task or reminder.');
    }
  }

  // ─── AI Analysis ─────────────────────────────────────────────────────────────
  async function analyzeAndClassify(content: string) {
    setStage('analyzing');
    try {
      const result = await analyzeContent(content, 'text');
      setAnalysis(result);
      setSelectedDestination(result.destination);
      setStage('classify');
    } catch (e) {
      // Fallback: manual classify
      setStage('classify');
    }
  }

  async function handleTextSubmit() {
    if (!text.trim()) return;
    await analyzeAndClassify(text);
  }

  // ─── Save ─────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      const thingData = await createThing({
        user_id: user.id,
        type: 'text',
        raw_content: text,
        destination: selectedDestination,
        bubble_id: selectedBubble ?? undefined,
      });

      const thingId = thingData.data?.id;

      if (selectedDestination === 'arc') {
        await createArc({
          user_id: user.id,
          title: analysis?.title ?? text.substring(0, 60),
          description: analysis?.summary,
          deadline: analysis?.deadline ?? undefined,
          bubble_id: selectedBubble ?? undefined,
          is_shared: false,
        });
      } else {
        await createVaultItem({
          user_id: user.id,
          title: analysis?.title ?? text.substring(0, 60),
          content: analysis?.summary ?? text,
          category: (analysis?.category as any) ?? 'other',
          tags: analysis?.tags ?? [],
          bubble_id: selectedBubble ?? undefined,
          is_shared: false,
        });
      }

      router.back();
    } catch (e: any) {
      Alert.alert('Error saving', e.message);
    } finally {
      setSaving(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (stage === 'analyzing') {
    return (
      <View style={styles.analyzingScreen}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.analyzingTitle}>Handing off...</Text>
        <Text style={styles.analyzingSubtitle}>Listaa is reading your Thing</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {stage === 'capture' ? 'Hand it off' : 'Where does it go?'}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {stage === 'capture' && (
            <>
              {/* Mode selector */}
              <View style={styles.modeRow}>
                {(['text', 'camera', 'voice'] as CaptureMode[]).map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.modeBtn, captureMode === m && styles.modeBtnActive]}
                    onPress={() => setCaptureMode(m)}
                  >
                    <Text style={styles.modeBtnIcon}>
                      {m === 'text' ? '✏️' : m === 'camera' ? '📷' : '🎙'}
                    </Text>
                    <Text style={[styles.modeBtnText, captureMode === m && styles.modeBtnTextActive]}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {captureMode === 'text' && (
                <TextInput
                  style={styles.textArea}
                  placeholder="What's the Thing? Paste a message, type a task, share a link..."
                  placeholderTextColor={Colors.textTertiary}
                  value={text}
                  onChangeText={setText}
                  multiline
                  autoFocus
                  textAlignVertical="top"
                />
              )}

              {captureMode === 'camera' && (
                <TouchableOpacity style={styles.cameraTile} onPress={handleCamera}>
                  <Text style={styles.cameraTileIcon}>📷</Text>
                  <Text style={styles.cameraTileText}>Tap to open camera</Text>
                  <Text style={styles.cameraTileHint}>OCR will extract the content</Text>
                </TouchableOpacity>
              )}

              {captureMode === 'voice' && (
                <TouchableOpacity
                  style={[styles.voiceTile, isRecording && styles.voiceTileRecording]}
                  onPress={isRecording ? stopRecording : startRecording}
                >
                  <Text style={styles.voiceTileIcon}>{isRecording ? '⏹' : '🎙'}</Text>
                  <Text style={styles.voiceTileText}>
                    {isRecording ? 'Tap to stop' : 'Tap to record'}
                  </Text>
                  {isRecording && <View style={styles.recordingPulse} />}
                </TouchableOpacity>
              )}

              {text.trim().length > 0 && captureMode === 'text' && (
                <TouchableOpacity style={styles.handoffBtn} onPress={handleTextSubmit}>
                  <Text style={styles.handoffBtnText}>Hand it off →</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {stage === 'classify' && (
            <>
              {/* AI result preview */}
              {analysis && (
                <View style={styles.analysisCard}>
                  <Text style={styles.analysisTitle}>{analysis.title}</Text>
                  <Text style={styles.analysisSummary}>{analysis.summary}</Text>
                  {analysis.deadline && (
                    <View style={styles.analysisTag}>
                      <Text style={styles.analysisTagText}>📅 {new Date(analysis.deadline).toLocaleDateString()}</Text>
                    </View>
                  )}
                  {analysis.tags.length > 0 && (
                    <View style={styles.tagsRow}>
                      {analysis.tags.slice(0, 4).map(tag => (
                        <View key={tag} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Destination: Arc or Vault */}
              <Text style={styles.classifyLabel}>Where does this go?</Text>
              <View style={styles.destinationRow}>
                <TouchableOpacity
                  style={[styles.destCard, selectedDestination === 'arc' && styles.destCardActive]}
                  onPress={() => setSelectedDestination('arc')}
                >
                  <Text style={styles.destEmoji}>⚡</Text>
                  <Text style={styles.destTitle}>The Arc</Text>
                  <Text style={styles.destDesc}>Needs action</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.destCard, selectedDestination === 'vault' && styles.destCardActive]}
                  onPress={() => setSelectedDestination('vault')}
                >
                  <Text style={styles.destEmoji}>🗄</Text>
                  <Text style={styles.destTitle}>The Vault</Text>
                  <Text style={styles.destDesc}>Knowledge to keep</Text>
                </TouchableOpacity>
              </View>

              {/* Bubble selector */}
              {bubbles.length > 0 && (
                <>
                  <Text style={styles.classifyLabel}>Which bubble?</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bubblesScroll}>
                    <View style={styles.bubblesInner}>
                      <TouchableOpacity
                        style={[styles.bubbleChip, !selectedBubble && styles.bubbleChipActive]}
                        onPress={() => setSelectedBubble(null)}
                      >
                        <Text style={styles.bubbleChipText}>None</Text>
                      </TouchableOpacity>
                      {bubbles.map(b => (
                        <TouchableOpacity
                          key={b.id}
                          style={[styles.bubbleChip, selectedBubble === b.id && styles.bubbleChipActive]}
                          onPress={() => setSelectedBubble(b.id)}
                        >
                          <Text style={styles.bubbleChipText}>{b.emoji} {b.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              {/* Save */}
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.saveBtnText}>Handed Off ✓</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 56,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 20,
    color: Colors.textSecondary,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Georgia',
    fontWeight: '400',
    color: Colors.textPrimary,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 48,
  },
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeBtnActive: {
    backgroundColor: Colors.primaryPale,
    borderColor: Colors.primaryLight,
  },
  modeBtnIcon: {
    fontSize: 16,
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  modeBtnTextActive: {
    color: Colors.primaryLight,
    fontWeight: '700',
  },
  textArea: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.textPrimary,
    minHeight: 180,
    lineHeight: 24,
    ...Shadow.sm,
  },
  cameraTile: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  cameraTileIcon: { fontSize: 48 },
  cameraTileText: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  cameraTileHint: { fontSize: 13, color: Colors.textTertiary },
  voiceTile: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    position: 'relative',
    overflow: 'hidden',
  },
  voiceTileRecording: {
    borderColor: Colors.statusOpen,
    backgroundColor: '#FEE8F0',
  },
  voiceTileIcon: { fontSize: 48 },
  voiceTileText: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  recordingPulse: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.primaryLight,
    opacity: 0.1,
  },
  handoffBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  handoffBtnText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '600',
  },
  // Analyzing
  analyzingScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  analyzingTitle: {
    fontFamily: 'Georgia',
    fontSize: 28,
    color: Colors.textPrimary,
  },
  analyzingSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  // Classify
  analysisCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  analysisSummary: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  analysisTag: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  analysisTagText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: Colors.primaryPale,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 12,
    color: Colors.primaryLight,
    fontWeight: '500',
  },
  classifyLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  destinationRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  destCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  destCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryPale,
  },
  destEmoji: { fontSize: 32 },
  destTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  destDesc: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center' },
  bubblesScroll: {
    marginBottom: Spacing.lg,
  },
  bubblesInner: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  bubbleChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  bubbleChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveBtnText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
});
