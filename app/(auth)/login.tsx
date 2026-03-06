import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Linking,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { Colors, Typography, Spacing, Radius } from '../../lib/theme';
import { signInWithApple, signInWithGoogle, signInWithFacebook } from '../../lib/supabase';
import ListaaLogo from '../../components/shared/ListaaLogo';

WebBrowser.maybeCompleteAuthSession();

const { height } = Dimensions.get('window');

export default function LoginScreen() {
  const [loading, setLoading] = useState<'apple' | 'google' | 'facebook' | null>(null);

  async function handleGoogleLogin() {
    setLoading('google');
    try {
      const { error } = await signInWithGoogle();
      if (error) Alert.alert('Sign in failed', error.message);
    } finally {
      setLoading(null);
    }
  }

  async function handleAppleLogin() {
    setLoading('apple');
    try {
      const { error } = await signInWithApple();
      if (error) Alert.alert('Sign in failed', error.message);
    } finally {
      setLoading(null);
    }
  }

  async function handleFacebookLogin() {
    setLoading('facebook');
    try {
      const { error } = await signInWithFacebook();
      if (error) Alert.alert('Sign in failed', error.message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <View style={styles.container}>
      {/* Hero Image with gradient overlay */}
      <ImageBackground
        source={require('../../assets/hero-family.jpg')}
        style={styles.heroImage}
        resizeMode="cover"
        defaultSource={require('../../assets/icon.png')}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <ListaaLogo size="large" />
        </View>

        {/* Gradient overlay at bottom */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.72)', 'rgba(0,0,0,0.85)']}
          style={styles.gradient}
        >
          {/* Tagline */}
          <Text style={styles.tagline}>Your life partner that{'\n'}remembers everything</Text>
        </LinearGradient>
      </ImageBackground>

      {/* Auth buttons */}
      <View style={styles.authContainer}>
        <AuthButton
          icon="🍎"
          label="Continue with Apple"
          onPress={handleAppleLogin}
          loading={loading === 'apple'}
          iconType="apple"
        />
        <AuthButton
          icon="G"
          label="Continue with Google"
          onPress={handleGoogleLogin}
          loading={loading === 'google'}
          iconType="google"
        />
        <AuthButton
          icon="f"
          label="Continue with Facebook"
          onPress={handleFacebookLogin}
          loading={loading === 'facebook'}
          iconType="facebook"
        />

        <Text style={styles.legalText}>
          By signing up, you agree to our{' '}
          <Text style={styles.link} onPress={() => Linking.openURL('https://listaa.app/terms')}>Terms</Text>.{' '}
          See how we use your data in our{' '}
          <Text style={styles.link} onPress={() => Linking.openURL('https://listaa.app/privacy')}>Privacy Policy</Text>.{' '}
          We never post to Facebook.
        </Text>
      </View>
    </View>
  );
}

function AuthButton({
  label,
  onPress,
  loading,
  iconType,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  loading: boolean;
  iconType: 'apple' | 'google' | 'facebook';
}) {
  return (
    <TouchableOpacity style={styles.authButton} onPress={onPress} disabled={loading} activeOpacity={0.7}>
      {loading ? (
        <ActivityIndicator size="small" color={Colors.black} style={styles.authIcon} />
      ) : (
        <AuthIcon type={iconType} />
      )}
      <Text style={styles.authButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

function AuthIcon({ type }: { type: 'apple' | 'google' | 'facebook' }) {
  if (type === 'apple') {
    return <Text style={[styles.authIcon, { fontSize: 20 }]}>🍎</Text>;
  }
  if (type === 'google') {
    return (
      <View style={styles.authIcon}>
        <Text style={{ fontSize: 16, fontWeight: '700' }}>
          <Text style={{ color: '#4285F4' }}>G</Text>
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.authIcon, styles.facebookIcon]}>
      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>f</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  heroImage: {
    flex: 1,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: 64,
  },
  logoText: {
    fontSize: 36,
    fontFamily: 'Georgia',
    letterSpacing: 1,
  },
  logoListа: {
    color: '#9C27B0',
  },
  logоDot: {
    color: '#C2185B',
  },
  gradient: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: 80,
  },
  tagline: {
    color: Colors.white,
    fontSize: 28,
    fontFamily: 'Georgia',
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 38,
  },
  authContainer: {
    backgroundColor: Colors.black,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 36,
    gap: Spacing.sm,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.white,
    borderRadius: Radius.full,
    paddingVertical: 16,
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'transparent',
  },
  authButtonText: {
    flex: 1,
    textAlign: 'center',
    color: Colors.white,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  authIcon: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  facebookIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#1877F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalText: {
    color: Colors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  link: {
    color: Colors.white,
    textDecorationLine: 'underline',
  },
});
