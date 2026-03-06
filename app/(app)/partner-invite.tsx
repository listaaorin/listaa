import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius, Shadow } from '../../lib/theme';
import { useAuth } from '../../lib/auth-context';
import { generateInviteCode, acceptInvite } from '../../lib/supabase';

export default function PartnerInviteScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const [inviteCode, setInviteCode] = useState(profile?.partner_invite_code ?? '');
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);

  async function handleGenerateCode() {
    if (!user) return;
    setLoading(true);
    const code = await generateInviteCode(user.id);
    setInviteCode(code);
    await refreshProfile();
    setLoading(false);
  }

  async function handleShare() {
    await Share.share({
      message: `Join me on Listaa — the family efficiency app!\n\nUse my invite code: ${inviteCode}\n\nDownload: https://listaa.app`,
    });
  }

  async function handleJoin() {
    if (!user || !inputCode.trim()) return;
    setJoining(true);
    const { error } = await acceptInvite(inputCode.trim().toUpperCase(), user.id);
    if (error) {
      Alert.alert('Invalid code', 'Could not find that invite code. Check with your partner.');
    } else {
      await refreshProfile();
      Alert.alert('Connected!', "You're now synced with your partner.", [
        { text: 'Great!', onPress: () => router.back() }
      ]);
    }
    setJoining(false);
  }

  const hasPartner = !!profile?.partner_id;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Back</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Invite Your Partner</Text>
      <Text style={styles.subtitle}>
        Share your Arc and Vault with your partner. See each other's loops and stay in sync — no more "Did you handle it?"
      </Text>

      {hasPartner ? (
        <View style={styles.connectedCard}>
          <Text style={styles.connectedEmoji}>🔗</Text>
          <Text style={styles.connectedTitle}>Partner Connected</Text>
          <Text style={styles.connectedText}>You're synced with your partner. Shared loops and Vault items are visible to both of you.</Text>
        </View>
      ) : (
        <>
          {/* Generate invite */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Send an invite</Text>
            {inviteCode ? (
              <View style={styles.codeCard}>
                <Text style={styles.codeLabel}>Your invite code</Text>
                <Text style={styles.code}>{inviteCode}</Text>
                <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                  <Text style={styles.shareBtnText}>Share Code 📤</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.generateBtn} onPress={handleGenerateCode} disabled={loading}>
                {loading ? <ActivityIndicator color={Colors.white} /> : (
                  <Text style={styles.generateBtnText}>Generate Invite Code</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Join with code */}
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Have a code?</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="Enter partner's code"
              placeholderTextColor={Colors.textTertiary}
              value={inputCode}
              onChangeText={setInputCode}
              autoCapitalize="characters"
              maxLength={6}
            />
            <TouchableOpacity
              style={[styles.joinBtn, !inputCode.trim() && styles.joinBtnDisabled]}
              onPress={handleJoin}
              disabled={joining || !inputCode.trim()}
            >
              {joining ? <ActivityIndicator color={Colors.white} /> : (
                <Text style={styles.joinBtnText}>Connect with Partner</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
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
  header: { marginBottom: Spacing.lg },
  backBtn: { fontSize: 17, color: Colors.primary, fontWeight: '500' },
  title: { fontFamily: 'Georgia', fontSize: 30, color: Colors.textPrimary, marginBottom: Spacing.sm },
  subtitle: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.xl },
  connectedCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadow.md,
  },
  connectedEmoji: { fontSize: 48 },
  connectedTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  connectedText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  section: { gap: Spacing.sm, marginBottom: Spacing.md },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textTertiary, letterSpacing: 0.5, textTransform: 'uppercase' },
  codeCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  codeLabel: { fontSize: 13, color: Colors.textTertiary },
  code: { fontSize: 32, fontWeight: '800', color: Colors.primary, letterSpacing: 6 },
  shareBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    marginTop: Spacing.sm,
  },
  shareBtnText: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  generateBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: 'center',
  },
  generateBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginVertical: Spacing.lg },
  divider: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 13, color: Colors.textTertiary },
  codeInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 6,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  joinBtn: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: 'center',
  },
  joinBtnDisabled: { opacity: 0.4 },
  joinBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
});
