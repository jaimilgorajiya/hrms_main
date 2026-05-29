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
import { signInWithPhoneNumber, signOut } from 'firebase/auth';
import { auth, firebaseConfig } from '../../utils/firebase';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { useAuth } from '../../context/AuthContext';
import { SIZES, RADIUS, SHADOW } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

export default function LoginScreen() {
  const { colors, theme, isDarkMode } = useTheme();
  const { loginWithOTP, checkPhoneStatus } = useAuth();
  const router = useRouter();
  
  // State
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [loading, setLoading] = useState(false);
  const otpInput = useRef(null);
  const recaptchaVerifier = useRef(null);

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

  // Phone Auth Logic
  const handleSendOTP = async () => {
    if (!phone.trim() || phone.length < 10) {
      Toast.show({ type: 'error', text1: 'Invalid Phone Number' });
      return;
    }
    setLoading(true);
    try {
      // 1. Check if phone is registered in our database
      const checkRes = await checkPhoneStatus(phone);
      if (!checkRes.success) {
        Toast.show({ 
          type: 'error', 
          text1: 'Access Denied', 
          text2: checkRes.message || 'Mobile number not registered.' 
        });
        setLoading(false);
        return;
      }

      // 2. If registered, proceed with Firebase OTP
      // 2. If registered, proceed with Firebase OTP (or mock bypass in development)
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      
      // __DEV__ mock OTP bypass removed to send real SMS OTPs.
      
      // JS SDK implementation
      console.log('DEBUG: auth object is:', auth);
      console.log('DEBUG: typeof auth is:', typeof auth);
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier.current);
      setConfirm(confirmation);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'OTP Sent', text2: 'Please check your messages' });
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Failed to send OTP', text2: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!code.trim() || code.length < 6) {
      Toast.show({ type: 'error', text1: 'Enter valid 6-digit code' });
      return;
    }
    setLoading(true);
    try {
      const result = await confirm.confirm(code);
      if (result) {
        let idToken;
        const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
        
        if (!auth.currentUser) {
          // If we bypassed Firebase, send the mock token
          idToken = `mock-token-${formattedPhone}`;
        } else {
          const user = auth.currentUser;
          if (!user) throw new Error('No user found');
          idToken = await user.getIdToken();
        }
        
        const apiResult = await loginWithOTP(idToken);
        
        if (apiResult.success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace('/(tabs)/dashboard');
        } else {
          Toast.show({ type: 'error', text1: 'Login Failed', text2: apiResult.message });
          // Sign out from Firebase if backend rejects
          if (auth.currentUser) {
            await signOut(auth);
          }
        }
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Invalid Code', text2: 'The verification code is incorrect.' });
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
              <Text style={[styles.appSub, { color: colors.textMuted }]}>Employee Management Workspace</Text>
            </Animated.View>

            <Animated.View style={[styles.card, SHADOW.medium, { opacity: fadeAnim, backgroundColor: colors.bgCard, borderColor: colors.borderLight }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.textDark }]}>Secure Access</Text>
                <View style={[styles.accentBar, { backgroundColor: colors.primary }]} />
              </View>
              
              <Text style={[styles.cardSub, { color: colors.textLight }]}>
                {confirm ? 'Verify the authentication code' : 'Join using your secure mobile gateway'}
              </Text>

              {/* OTP View */}
              <View>
                {!confirm ? (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textDark }]}>Mobile Number</Text>
                    <View style={[styles.inputWrap, { backgroundColor: colors.bgMain, borderColor: colors.borderLight }]}>
                      <Ionicons name="phone-portrait" size={18} color={colors.primary} />
                      <TextInput
                        style={[styles.input, { color: colors.textDark }]}
                        placeholder="Registered Contact Number"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        maxLength={10}
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>
                ) : (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textDark }]}>Enter 6-Digit PIN</Text>
                    <TouchableOpacity 
                      style={styles.otpContainer} 
                      activeOpacity={1}
                      onPress={() => otpInput.current?.focus()}
                    >
                      {[...Array(6)].map((_, i) => (
                        <View key={i} style={styles.otpDigitContainer}>
                          <Text style={[styles.otpDigitText, { color: colors.textMuted }, code[i] && [styles.otpDigitTextFilled, { color: colors.textDark }]]}>
                            {code[i] || ''}
                          </Text>
                          <View style={[
                            styles.otpUnderline,
                            { backgroundColor: colors.borderLight },
                            code.length === i && [styles.otpUnderlineActive, { backgroundColor: colors.primary }],
                            code[i] && [styles.otpUnderlineFilled, { backgroundColor: colors.primaryDark }]
                          ]} />
                        </View>
                      ))}
                      <TextInput
                        ref={otpInput}
                        style={styles.hiddenInput}
                        value={code}
                        onChangeText={setCode}
                        keyboardType="number-pad"
                        maxLength={6}
                        textContentType="oneTimeCode"
                        autoComplete="sms-otp"
                      />
                    </TouchableOpacity>
                  </View>
                )}


                
                <TouchableOpacity 
                  style={styles.loginBtn} 
                  onPress={confirm ? handleVerifyOTP : handleSendOTP} 
                  disabled={loading} 
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={isDarkMode ? ['#4338CA', '#312E81'] : ['#6366F1', '#4338CA']} style={styles.btnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                    {loading ? <ActivityIndicator color="#fff" /> : (
                      <>
                        <Text style={[styles.btnText, { color: '#fff' }]}>{confirm ? 'Confirm & Finalize' : 'Authorize with OTP'}</Text>
                        <Ionicons name="rocket" size={18} color="#fff" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {confirm && (
                  <TouchableOpacity style={styles.resendLink} onPress={() => setConfirm(null)}>
                    <Text style={[styles.resendText, { color: colors.textMuted }]}>Back to Mobile Entry</Text>
                  </TouchableOpacity>
                )}
              </View></Animated.View>

            <View style={styles.footerBranding}>
              <Text style={[styles.footerText, { color: colors.textLight }]}>SECURE ACCESS</Text>
              <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
              <Text style={[styles.footerText, { color: colors.textLight }]}>IFLORA HRMS 2026</Text>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}
        attemptInvisible={true}
      />
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
  loginBtn: { marginTop: 10, borderRadius: 20, overflow: 'hidden' },
  btnGrad: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  btnText: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  resendLink: { marginTop: 16, alignItems: 'center' },
  resendText: { fontSize: 13, fontWeight: '600' },
  footerBranding: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 40, opacity: 0.5 },
  footerText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  dot: { width: 4, height: 4, borderRadius: 2 },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    height: 60,
    paddingHorizontal: 10,
  },
  otpDigitContainer: {
    width: 40,
    height: 55,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  otpDigitText: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  otpDigitTextFilled: {
  },
  otpUnderline: {
    width: '100%',
    height: 3,
    borderRadius: 1.5,
  },
  otpUnderlineActive: {
    height: 4,
    ...SHADOW.premium,
  },
  otpUnderlineFilled: {
  },
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    zIndex: 1,
  },
});