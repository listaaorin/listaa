import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ImageBackground,
  Linking,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
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

const { height: SCREEN_H } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_H * 0.65;

// Swap this for your real family photo — place it at assets/hero-family.jpg
const HERO_IMAGE = require('../../assets/hero-family.jpg');

type AuthMode = 'social' | 'email';

export default function LoginScreen() {
  const [mode, setMode]         = useState<AuthMode>('social');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState<string | null>(null);

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
          [{ text: 'OK', onPress: () => setIsSignUp(false) }],
        );
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Hero photo + logo + tagline ───────────────────────── */}
      <ImageBackground
        source={HERO_IMAGE}
        style={styles.hero}
        resizeMode="cover"
      >
        {/* Logo at top */}
        <View style={styles.logoWrap}>
          <ListaaLogo size="large" />
        </View>

        {/* Gradient + tagline at bottom of photo */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.75)']}
          style={styles.heroGradient}
        >
          <Text style={styles.tagline}>
            Your life partner that{'\n'}remembers everything
          </Text>
        </LinearGradient>
      </ImageBackground>

      {/* ── Auth area — white background ──────────────────────── */}
      <ScrollView
        style={styles.authArea}
        contentContainerStyle={styles.authContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {mode === 'social' ? (
          <>
            {/* Apple */}
            <SocialButton
              label="Continue with Apple"
              onPress={() => handleSocial('apple')}
              loading={loading === 'apple'}
              icon={<AppleIcon />}
            />
            {/* Google */}
            <SocialButton
              label="Continue with Google"
              onPress={() => handleSocial('google')}
              loading={loading === 'google'}
              icon={<GoogleIcon />}
            />
            {/* Facebook */}
            <SocialButton
              label="Continue with Facebook"
              onPress={() => handleSocial('facebook')}
              loading={loading === 'facebook'}
              icon={<FacebookIcon />}
            />
            {/* Email option (for testing) */}
            <TouchableOpacity
              style={styles.emailLink}
              onPress={() => setMode('email')}
            >
              <Text style={styles.emailLinkText}>Sign in with Email →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => setMode('social')} style={styles.backBtn}>
              <Text style={styles.backBtnText}>‹ Back</Text>
            </TouchableOpacity>
            <Text style={styles.emailFormTitle}>
              {isSignUp ? 'Create account' : 'Welcome back'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={Colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
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
              style={{ alignItems: 'center', marginTop: Spacing.sm }}
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

        {/* Legal */}
        <Text style={styles.legal}>
          By signing up, you agree to our{' '}
          <Text style={styles.legalLink} onPress={() => Linking.openURL('https://listaa.app/terms')}>
            Terms
          </Text>
          .{'\n'}See how we use your data in our{' '}
          <Text style={styles.legalLink} onPress={() => Linking.openURL('https://listaa.app/privacy')}>
            Privacy Policy
          </Text>
          .{'\n'}We never post to Facebook.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Social button — white bg, dark border, black text ───────────────────────

function SocialButton({
  label, onPress, loading, icon,
}: {
  label: string;
  onPress: () => void;
  loading: boolean;
  icon: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      style={styles.socialBtn}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.75}
    >
      <View style={styles.socialBtnIcon}>
        {loading ? <ActivityIndicator size="small" color="#333" /> : icon}
      </View>
      <Text style={styles.socialBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Brand icons ──────────────────────────────────────────────────────────────

function AppleIcon() {
  return <Text style={{ fontSize: 22, color: '#000', lineHeight: 26 }}>🍎</Text>;
}

function GoogleIcon() {
  return (
    <View style={styles.gIconWrap}>
      <Text style={styles.gIconB}>G</Text>
      {/* multicolour G approximation */}
    </View>
  );
}

function FacebookIcon() {
  return (
    <View style={styles.fbIconWrap}>
      <Text style={styles.fbIconText}>f</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  /* Hero */
  hero: {
    height: HERO_HEIGHT,
    justifyContent: 'space-between',
  },
  logoWrap: {
    alignItems: 'center',
    paddingTop: 60,
  },
  heroGradient: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: 80,
  },
  tagline: {
    color: Colors.white,
    fontSize: 30,
    fontFamily: 'Georgia',
    fontWeight: '600',
    textAlign: 'left',
    lineHeight: 38,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  /* Auth area */
  authArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  authContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 24,
    gap: Spacing.sm,
  },

  /* Social buttons — white bg, thin black border */
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    borderRadius: Radius.full,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
  },
  socialBtnIcon: {
    width: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  socialBtnText: {
    flex: 1,
    textAlign: 'center',
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '400',
    marginRight: 32, // balance the icon offset so text looks truly centered
  },

  /* Google icon */
  gIconWrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gIconB: {
    fontSize: 17,
    fontWeight: '700',
    // Multicolor approximation — just use the standard "G" look
    color: '#4285F4',
  },

  /* Facebook icon */
  fbIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: '#1877F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fbIconText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },

  /* Email link */
  emailLink: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  emailLinkText: {
    color: Colors.primaryLight,
    fontSize: 14,
    fontWeight: '500',
  },

  /* Email form */
  backBtn: { alignSelf: 'flex-start' },
  backBtnText: { color: Colors.primaryLight, fontSize: 16, fontWeight: '500' },
  emailFormTitle: {
    fontFamily: 'Georgia',
    fontSize: 22,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    color: Colors.textPrimary,
    fontSize: 16,
    backgroundColor: Colors.surface,
  },
  emailSubmitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  emailSubmitText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  switchText: { color: Colors.textSecondary, fontSize: 13 },

  /* Legal */
  legal: {
    color: Colors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  legalLink: {
    color: Colors.textPrimary,
    textDecorationLine: 'underline',
  },
});
