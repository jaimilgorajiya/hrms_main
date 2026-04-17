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
import auth from '@react-native-firebase/auth';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES, RADIUS, SHADOW, GRADIENTS } from '../../constants/theme';

export default function LoginScreen() {
  const { loginWithOTP, checkPhoneStatus } = useAuth();
  const router = useRouter();
  
  // State
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [loading, setLoading] = useState(false);
  const otpInput = useRef(null);

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
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const confirmation = await auth().signInWithPhoneNumber(formattedPhone);
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
        const idToken = await auth().currentUser.getIdToken();
        const apiResult = await loginWithOTP(idToken);
        
        if (apiResult.success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace('/(tabs)/dashboard');
        } else {
          Toast.show({ type: 'error', text1: 'Login Failed', text2: apiResult.message });
          // Sign out from Firebase if backend reject
          await auth().signOut();
        }
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Invalid Code', text2: 'The verification code is incorrect.' });
    } finally {
      setLoading(false);
    }
  };



  return (
    <View style={styles.container}>
      {/* Dynamic Background */}
      <LinearGradient colors={['#F8FAFC', '#F1F5F9', '#E2E8F0']} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.blob, styles.blob1, { transform: [{ translateY: b1Translate }] }]} />
      <Animated.View style={[styles.blob, styles.blob2, { transform: [{ translateX: b2Translate }] }]} />
      
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            
            <Animated.View style={[styles.headerSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={[styles.logoBox, { elevation: 0, shadowOpacity: 0 }]}>
                <View style={styles.logoGrad}>
                  <Animated.Image 
                    source={require('../../assets/icon.png')} 
                    style={{ width: '100%', height: '100%', borderRadius: 28 }} 
                    resizeMode="contain"
                  />
                </View>
              </View>
              <Text style={styles.appSub}>Employee Management Workspace</Text>
            </Animated.View>

            <Animated.View style={[styles.card, SHADOW.medium, { opacity: fadeAnim }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Secure Access</Text>
                <View style={styles.accentBar} />
              </View>
              
              <Text style={styles.cardSub}>
                {confirm ? 'Verify the authentication code' : 'Join using your secure mobile gateway'}
              </Text>

              {/* OTP View */}
              <View>
                {!confirm ? (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Mobile Number</Text>
                    <View style={styles.inputWrap}>
                      <Ionicons name="phone-portrait" size={18} color={COLORS.primary} />
                      <TextInput
                        style={styles.input}
                        placeholder="Registered Contact Number"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        maxLength={10}
                        placeholderTextColor={COLORS.textPlaceholder}
                      />
                    </View>
                  </View>
                ) : (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Enter 6-Digit PIN</Text>
                    <TouchableOpacity 
                      style={styles.otpContainer} 
                      activeOpacity={1}
                      onPress={() => otpInput.current?.focus()}
                    >
                      {[...Array(6)].map((_, i) => (
                        <View 
                          key={i} 
                          style={[
                            styles.otpBox, 
                            code.length === i && styles.otpBoxActive,
                            code[i] && styles.otpBoxFilled
                          ]}
                        >
                          <Text style={styles.otpBoxText}>{code[i] || ''}</Text>
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
                  <LinearGradient colors={GRADIENTS.primary} style={styles.btnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                    {loading ? <ActivityIndicator color={COLORS.white} /> : (
                      <>
                        <Text style={styles.btnText}>{confirm ? 'Confirm & Finalize' : 'Authorize with OTP'}</Text>
                        <Ionicons name="rocket" size={18} color={COLORS.white} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {confirm && (
                  <TouchableOpacity style={styles.resendLink} onPress={() => setConfirm(null)}>
                    <Text style={styles.resendText}>Back to Mobile Entry</Text>
                  </TouchableOpacity>
                )}
              </View></Animated.View>

            <View style={styles.footerBranding}>
              <Text style={styles.footerText}>SECURE ACCESS</Text>
              <View style={styles.dot} />
              <Text style={styles.footerText}>IFLORA HRMS 2026</Text>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMain },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.1,
    zIndex: -1,
  },
  blob1: {
    width: 300,
    height: 300,
    backgroundColor: COLORS.primary,
    top: -100,
    left: -120,
  },
  blob2: {
    width: 250,
    height: 250,
    backgroundColor: COLORS.purple,
    bottom: -50,
    right: -80,
  },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  headerSection: { alignItems: 'center', marginBottom: 35 },
  logoBox: { width: 88, height: 88, borderRadius: 30, overflow: 'hidden', backgroundColor: COLORS.white, padding: 2, marginBottom: 14 },
  logoGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  appSub: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.5 },
  card: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 36, padding: 28, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.6)' },
  cardHeader: { marginBottom: 10, alignItems: 'center' },
  cardTitle: { fontSize: 28, fontWeight: '900', color: COLORS.textDark, letterSpacing: -1 },
  accentBar: { width: 50, height: 4, backgroundColor: COLORS.primary, borderRadius: 2, marginTop: 4 },
  cardSub: { fontSize: 13, color: COLORS.textLight, marginBottom: 32, textAlign: 'center', fontWeight: '500' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 10, fontWeight: '900', color: COLORS.textDark, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1.2 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F1F5F9', borderRadius: 16,
    paddingHorizontal: 16, height: 62, gap: 12,
    borderWidth: 1, borderColor: '#F1F5F9'
  },
  input: { flex: 1, fontSize: 15, color: COLORS.textDark, fontWeight: '700' },
  loginBtn: { marginTop: 10, borderRadius: 20, overflow: 'hidden', ...SHADOW.medium },
  btnGrad: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  btnText: { color: COLORS.white, fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },

  resendLink: { marginTop: 16, alignItems: 'center' },
  resendText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  footerBranding: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 40, opacity: 0.5 },
  footerText: { fontSize: 10, fontWeight: '800', color: COLORS.textLight, textTransform: 'uppercase' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.textMuted },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
    height: 62,
  },
  otpBox: {
    width: 42,
    height: 58,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  otpBoxFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  otpBoxText: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textDark,
  },
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    zIndex: 1,
  },
});