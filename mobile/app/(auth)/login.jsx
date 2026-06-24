import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import { SIZES, RADIUS, SHADOW } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

export default function LoginScreen() {
  const { colors, theme, isDarkMode } = useTheme();
  const { login, requestPasswordReset } = useAuth();
  const router = useRouter();

  // State for Email/Password login & Forgot Password flow
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isForgotPage, setIsForgotPage] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const blob1Pos = useRef(new Animated.Value(0)).current;
  const blob2Pos = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, bounciness: 5, useNativeDriver: true }),

      // Floating blobs animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(blob1Pos, { toValue: 1, duration: 5000, useNativeDriver: true }),
          Animated.timing(blob1Pos, { toValue: 0, duration: 5000, useNativeDriver: true }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(blob2Pos, { toValue: 1, duration: 6000, useNativeDriver: true }),
          Animated.timing(blob2Pos, { toValue: 0, duration: 6000, useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, []);

  const b1Translate = blob1Pos.interpolate({ inputRange: [0, 1], outputRange: [0, 50] });
  const b2Translate = blob2Pos.interpolate({ inputRange: [0, 1], outputRange: [0, -70] });

  // Handle Email & Password Login
  const handlePasswordLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) {
      Toast.show({ type: 'error', text1: 'Email Required', text2: 'Please enter your registered email.' });
      return;
    }
    if (!trimmedPassword) {
      Toast.show({ type: 'error', text1: 'Password Required', text2: 'Please enter your account password.' });
      return;
    }

    setLoading(true);
    try {
      const res = await login(trimmedEmail, trimmedPassword);
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({ type: 'success', text1: 'Welcome back!', text2: 'Login successful.' });
        router.replace('/(tabs)/dashboard');
      } else {
        Toast.show({ type: 'error', text1: 'Login Failed', text2: res.message || 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Login error:', error);
      Toast.show({ 
        type: 'error', 
        text1: 'Connection Error', 
        text2: error.message || 'Unable to connect to server.' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      Toast.show({ type: 'error', text1: 'Email Required', text2: 'Please enter your registered email.' });
      return;
    }

    setLoading(true);
    try {
      const res = await requestPasswordReset(trimmedEmail);
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({ 
          type: 'success', 
          text1: 'Reset Link Sent', 
          text2: 'Please check your email inbox to reset your password.' 
        });
        setIsForgotPage(false); // Return to login page
      } else {
        Toast.show({ type: 'error', text1: 'Request Failed', text2: res.message || 'Check your email address.' });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      Toast.show({ 
        type: 'error', 
        text1: 'Connection Error', 
        text2: error.message || 'Unable to connect to server.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgMain }]}>
      {/* Dynamic Background */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bgMain }]} />
      <Animated.View style={[styles.blob, styles.blob1, { backgroundColor: colors.primary, transform: [{ translateY: b1Translate }] }]} />
      <Animated.View style={[styles.blob, styles.blob2, { backgroundColor: colors.purple, transform: [{ translateX: b2Translate }] }]} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

            {/* Header Section (Hidden on Forgot/Reset page) */}
            {!isForgotPage && (
              <Animated.View style={[styles.headerSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <View style={[styles.logoBox, { backgroundColor: colors.bgCard, borderColor: colors.borderLight }]}>
                  <View style={styles.logoGrad}>
                    <Animated.Image
                      source={require('../../assets/icon.png')}
                      style={{ width: '100%', height: '100%', borderRadius: 28 }}
                      resizeMode="contain"
                    />
                  </View>
                </View>
                <Text style={[styles.appSub, { color: colors.textMuted }]}>
                  Employee Management Workspace
                </Text>
              </Animated.View>
            )}

            <Animated.View style={[styles.card, SHADOW.medium, { opacity: fadeAnim, backgroundColor: colors.bgCard, borderColor: colors.borderLight, marginTop: isForgotPage ? 40 : 0 }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.textDark }]}>
                  {isForgotPage ? 'Reset Access' : 'Secure Access'}
                </Text>
                <View style={[styles.accentBar, { backgroundColor: colors.primary }]} />
              </View>

              <Text style={[styles.cardSub, { color: colors.textLight }]}>
                {isForgotPage 
                  ? 'Send a password reset link to your email' 
                  : 'Sign in using your account email and password'}
              </Text>

              <View>
                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textDark }]}>Email Address</Text>
                  <View style={[styles.inputWrap, { backgroundColor: colors.bgMain, borderColor: colors.borderLight }]}>
                    <Ionicons name="mail-outline" size={18} color={colors.primary} />
                    <TextInput
                      style={[styles.input, { color: colors.textDark }]}
                      placeholder="employee@company.com"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                {/* Password Input (Only shown on Login View) */}
                {!isForgotPage && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: colors.textDark }]}>Password</Text>
                    <View style={[styles.inputWrap, { backgroundColor: colors.bgMain, borderColor: colors.borderLight }]}>
                        <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
                        <TextInput
                          style={[styles.input, { color: colors.textDark }]}
                          placeholder="Enter Password"
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                          placeholderTextColor={colors.textMuted}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Ionicons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={colors.textMuted}
                          />
                        </TouchableOpacity>
                      </View>
                        </View>

                        {/* Forgot Password Link */}
                        <TouchableOpacity 
                          onPress={() => setIsForgotPage(true)}
                          style={styles.forgotLink}
                        >
                          <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot Password?</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {/* Action Button */}
                    <TouchableOpacity
                      style={styles.loginBtn}
                      onPress={isForgotPage ? handleForgotPassword : handlePasswordLogin}
                      disabled={loading}
                      activeOpacity={0.8}
                    >
                      <LinearGradient 
                        colors={isDarkMode ? ['#4338CA', '#312E81'] : ['#6366F1', '#4338CA']} 
                        style={styles.btnGrad} 
                        start={{ x: 0, y: 0 }} 
                        end={{ x: 1, y: 0 }}
                      >
                        {loading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <Text style={[styles.btnText, { color: '#fff' }]}>
                              {isForgotPage ? 'Send Reset Link' : 'Log In'}
                            </Text>
                            <Ionicons 
                              name={isForgotPage ? "paper-plane-outline" : "enter-outline"} 
                              size={18} 
                              color="#fff" 
                            />
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
            </Animated.View>

            <View style={styles.footerBranding}>
              <Text style={[styles.footerText, { color: colors.textLight }]}>SECURE ACCESS</Text>
              <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
              <Text style={[styles.footerText, { color: colors.textLight }]}>IFLORA HRMS 2026</Text>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.1,
    zIndex: -1,
  },
  blob1: {
    width: 300,
    height: 300,
    top: -100,
    left: -120,
  },
  blob2: {
    width: 250,
    height: 250,
    bottom: -50,
    right: -80,
  },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  headerSection: { alignItems: 'center', marginBottom: 35 },
  logoBox: { width: 88, height: 88, borderRadius: 30, overflow: 'hidden', padding: 2, marginBottom: 14, borderWidth: 1 },
  logoGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  appSub: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  card: { borderRadius: 36, padding: 28, borderWidth: 1 },
  cardHeader: { marginBottom: 10, alignItems: 'center' },
  cardTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  accentBar: { width: 50, height: 4, borderRadius: 2, marginTop: 4 },
  cardSub: { fontSize: 13, marginBottom: 32, textAlign: 'center', fontWeight: '500' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 10, fontWeight: '900', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1.2 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16, height: 62, gap: 12,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15, fontWeight: '700' },
  forgotLink: { alignSelf: 'flex-end', marginTop: -8, marginBottom: 24 },
  forgotText: { fontSize: 13, fontWeight: '700' },
  loginBtn: { marginTop: 10, borderRadius: 20, overflow: 'hidden' },
  btnGrad: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  btnText: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  successContainer: { alignItems: 'center', paddingVertical: 20 },
  successIconBox: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successText: { fontSize: 14.5, textAlign: 'center', lineHeight: 22, fontWeight: '500' },
  footerBranding: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 40, opacity: 0.5 },
  footerText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  dot: { width: 4, height: 4, borderRadius: 2 },
});