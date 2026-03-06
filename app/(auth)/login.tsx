import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { Colors, Spacing, Radius } from '../../lib/theme';
import {
  signInWithApple,
  signInWithGoogle,
  signInWithFacebook,
  signInWithEmail,
  signUpWithEmail,
} from '../../lib/supabase';
import ListaaLogo from '../../components/shared/ListaaLogo';

WebBrowser.maybeCompleteAuthSession();

type AuthMode = 'social' | 'email';

export default function LoginScreen() {
  const [mode, setMode]         = useState<AuthMode>('social');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState<string | null>(null);

  // ─── Social auth ────────────────────────────────────────────────────────────
  async function handleSocial(provider: 'google' | 'apple' | 'facebook') {
    setLoading(provider);
    try {
      const fn = provider === 'google'   ? signInWithGoogle
               : provider === 'apple'    ? signInWithApple
               : signInWithFacebook;
      const { error } = await fn();
      if (error) Alert.alert('Sign in failed', error.message);
    } finally {
      setLoading(null);
    }
  }

  // ─── Email auth ──────────────────────────────────────────────────────────────
  async function handleEmailAuth() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading('email');
    try {
      const { error } = isSignUp
        ? await signUpWithEmail(email.trim(), password)
        : await signInWithEmail(email.trim(), password);

      if (error) {
        Alert.alert(isSignUp ? 'Sign up failed' : 'Sign in failed', error.message);
      } else if (isSignUp) {
        Alert.alert(
          'Check your email',
          'We sent you a confirmation link. Open it, then come back and sign in.',
          [{ text: 'OK', onPress: () => setIsSignUp(false) }]
        );
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* Hero gradient top area */}
        <LinearGradient
          colors={['#1A0A2E', '#3B0A4A', '#7B1244', '#1A0A2E']}
          locations={[0, 0.3, 0.65, 1]}
          style={styles.hero}
        >
          {/* Logo */}
          <View style={styles.logoWrap}>
            <ListaaLogo size="xl" />
          </View>

          {/* Tagline */}
          <Text style={styles.tagline}>
            Your life partner that{'\n'}remembers everything
          </Text>
        </LinearGradient>

        {/* Auth area */}
        <ScrollView
          style={styles.authArea}
          contentContainerStyle={styles.authContent}
          keyboardShouldPersistTaps="handled"
        >
          {mode === 'social' ? (
            <>
              <SocialButton
                label="Continue with Apple"
                icon="🍎"
                onPress={() => handleSocial('apple')}
                loading={loading === 'apple'}
              />
              <SocialButton
                label="Continue with Google"
                icon="G"
                googleStyle
                onPress={() => handleSocial('google')}
                loading={loading === 'google'}
              />
              <SocialButton
                label="Continue with Facebook"
                icon="f"
                facebookStyle
                onPress={() => handleSocial('facebook')}
                loading={loading === 'facebook'}
              />

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.emailToggleBtn}
                onPress={() => setMode('email')}
              >
                <Text style={styles.emailToggleText}>Continue with Email</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.backToSocial}
                onPress={() => setMode('social')}
              >
                <Text style={styles.backToSocialText}>‹ Back</Text>
              </TouchableOpacity>

              <Text style={styles.emailTitle}>
                {isSignUp ? 'Create your account' : 'Welcome back'}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={isSignUp ? 'new-password' : 'password'}
              />

              <TouchableOpacity
                style={styles.emailSubmitBtn}
                onPress={handleEmailAuth}
                disabled={loading === 'email'}
              >
                {loading === 'email' ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.emailSubmitText}>
                    {isSignUp ? 'Create Account' : 'Sign In'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={{ alignItems: 'center', marginTop: Spacing.md }}
                onPress={() => setIsSignUp(v => !v)}
              >
                <Text style={styles.switchText}>
                  {isSignUp
                    ? 'Already have an account? Sign in'
                    : "Don't have an account? Sign up"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <Text style={styles.legalText}>
            By signing up, you agree to our{' '}
            <Text
              style={styles.legalLink}
              onPress={() => Linking.openURL('https://listaa.app/terms')}
            >
              Terms
            </Text>
            {' '}and{' '}
            <Text
              style={styles.legalLink}
              onPress={() => Linking.openURL('https://listaa.app/privacy')}
            >
              Privacy Policy
            </Text>
            .
          </Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Social Button ────────────────────────────────────────────────────────────

function SocialButton({
  label, icon, onPress, loading, googleStyle, facebookStyle,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  loading: boolean;
  googleStyle?: boolean;
  facebookStyle?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.socialBtn}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator size="small" color={Colors.white} style={styles.socialIcon} />
      ) : facebookStyle ? (
        <View style={[styles.socialIcon, styles.fbIconWrap]}>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>f</Text>
        </View>
      ) : googleStyle ? (
        <View style={styles.socialIcon}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#4285F4' }}>G</Text>
        </View>
      ) : (
        <Text style={[styles.socialIcon, { fontSize: 20 }]}>{icon}</Text>
      )}
      <Text style={styles.socialBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0018',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 72,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  logoWrap: {
    alignItems: 'center',
  },
  tagline: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 26,
    fontFamily: 'Georgia',
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 36,
  },
  authArea: {
    backgroundColor: '#0D0018',
    maxHeight: '55%',
  },
  authContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 36,
    gap: Spacing.sm,
  },
  // Social buttons
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: Radius.full,
    paddingVertical: 15,
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'transparent',
  },
  socialIcon: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fbIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#1877F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBtnText: {
    flex: 1,
    textAlign: 'center',
    color: Colors.white,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginVertical: Spacing.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  dividerText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  // Email toggle
  emailToggleBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingVertical: 15,
    alignItems: 'center',
  },
  emailToggleText: {
    color: Colors.primaryLight,
    fontSize: 16,
    fontWeight: '600',
  },
  // Email form
  backToSocial: { alignSelf: 'flex-start' },
  backToSocialText: { color: Colors.primaryLight, fontSize: 16, fontWeight: '500' },
  emailTitle: {
    color: Colors.white,
    fontFamily: 'Georgia',
    fontSize: 22,
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.lg,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    color: Colors.white,
    fontSize: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  emailSubmitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  emailSubmitText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  switchText: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  // Legal
  legalText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  legalLink: { color: 'rgba(255,255,255,0.6)', textDecorationLine: 'underline' },
});
