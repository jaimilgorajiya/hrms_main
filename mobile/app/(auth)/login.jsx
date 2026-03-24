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
import { getAuth, signInWithPhoneNumber, signOut } from '@react-native-firebase/auth';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES, RADIUS, SHADOW, GRADIENTS } from '../../constants/theme';

export default function LoginScreen() {
  const { login, loginWithOTP, checkPhoneStatus } = useAuth();
  const router = useRouter();
  
  // State
  const [loginType, setLoginType] = useState('otp'); // 'otp' or 'email'
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const otpInput = useRef(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, bounciness: 4, useNativeDriver: true }),
    ]).start();
  }, []);

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
      const auth = getAuth();
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone);
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
        const auth = getAuth();
        const idToken = await auth.currentUser.getIdToken();
        const apiResult = await loginWithOTP(idToken);
        
        if (apiResult.success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace('/(tabs)/dashboard');
        } else {
          Toast.show({ type: 'error', text1: 'Login Failed', text2: apiResult.message });
          // Sign out from Firebase if backend reject
          const auth = getAuth();
          await signOut(auth);
        }
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Invalid Code', text2: 'The verification code is incorrect.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({ type: 'error', text1: 'Missing Fields' });
      return;
    }
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)/dashboard');
      } else {
        Toast.show({ type: 'error', text1: 'Login Failed', text2: result.message });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Server unreachable.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            
            <Animated.View style={[styles.headerSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.logoBox}>
                <LinearGradient colors={GRADIENTS.primary} style={styles.logoGrad}>
                  <Ionicons name="people" size={32} color={COLORS.white} />
                </LinearGradient>
              </View>
              <Text style={styles.appName}>HRMS Portal</Text>
              <Text style={styles.appSub}>Employee Management System</Text>
            </Animated.View>

            <Animated.View style={[styles.card, SHADOW.medium, { opacity: fadeAnim }]}>
              <Text style={styles.cardTitle}>{loginType === 'otp' ? 'Login with OTP' : 'Sign In'}</Text>
              <Text style={styles.cardSub}>
                {loginType === 'otp' 
                  ? (confirm ? 'Enter the code sent to your mobile' : 'Enter your mobile number to continue')
                  : 'Enter your workplace credentials'}
              </Text>

              {loginType === 'otp' ? (
                // OTP View
                <View>
                  {!confirm ? (
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Phone Number</Text>
                      <View style={styles.inputWrap}>
                        <Ionicons name="call-outline" size={18} color={COLORS.textLight} />
                        <TextInput
                          style={styles.input}
                          placeholder="9876543210"
                          value={phone}
                          onChangeText={setPhone}
                          keyboardType="phone-pad"
                          maxLength={10}
                        />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Verification Code</Text>
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
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={GRADIENTS.primary} style={styles.btnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                      {loading ? <ActivityIndicator color={COLORS.white} /> : (
                        <>
                          <Text style={styles.btnText}>{confirm ? 'Verify & Login' : 'Send OTP'}</Text>
                          <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {confirm && (
                    <TouchableOpacity style={styles.resendLink} onPress={() => setConfirm(null)}>
                      <Text style={styles.resendText}>Change Phone Number</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                // Email View
                <View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email address</Text>
                    <View style={styles.inputWrap}>
                      <Ionicons name="mail-outline" size={18} color={COLORS.textLight} />
                      <TextInput
                        style={styles.input}
                        placeholder="name@company.com"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.inputWrap}>
                      <Ionicons name="lock-closed-outline" size={18} color={COLORS.textLight} />
                      <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        secureTextEntry={!showPwd}
                        value={password}
                        onChangeText={setPassword}
                      />
                      <TouchableOpacity onPress={() => setShowPwd(!showPwd)}>
                        <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textLight} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
                    <LinearGradient colors={GRADIENTS.primary} style={styles.btnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                      {loading ? <ActivityIndicator color={COLORS.white} /> : (
                        <>
                          <Text style={styles.btnText}>Login Now</Text>
                          <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.otpLink} 
                onPress={() => {
                  setLoginType(loginType === 'otp' ? 'email' : 'otp');
                  setConfirm(null);
                  setCode('');
                }}
              >
                <Text style={styles.otpText}>
                  {loginType === 'otp' ? 'Login with Password instead' : 'Login with OTP instead'}
                </Text>
              </TouchableOpacity>
            </Animated.View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <View style={styles.bottomGraphic} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMain },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  headerSection: { alignItems: 'center', marginBottom: 40 },
  logoBox: { width: 72, height: 72, borderRadius: 24, overflow: 'hidden', ...SHADOW.soft, marginBottom: 16 },
  logoGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  appName: { fontSize: SIZES.xxl, fontWeight: '800', color: COLORS.textDark },
  appSub: { fontSize: SIZES.sm, color: COLORS.textLight, marginTop: 4 },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: 28 },
  cardTitle: { fontSize: SIZES.xl, fontWeight: '800', color: COLORS.textDark, marginBottom: 6 },
  cardSub: { fontSize: SIZES.sm, color: COLORS.textLight, marginBottom: 30 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: SIZES.sm, fontWeight: '700', color: COLORS.textMain, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgMain, borderRadius: 14,
    paddingHorizontal: 16, height: 56, gap: 12,
  },
  input: { flex: 1, fontSize: 15, color: COLORS.textDark },
  loginBtn: { marginTop: 10, borderRadius: 16, overflow: 'hidden', ...SHADOW.medium },
  btnGrad: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  otpLink: { marginTop: 20, alignItems: 'center' },
  otpText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  resendLink: { marginTop: 16, alignItems: 'center' },
  resendText: { fontSize: 13, color: COLORS.textMuted },
  bottomGraphic: {
    position: 'absolute', bottom: -50, right: -50,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: COLORS.primaryLight, opacity: 0.5, zIndex: -1,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    position: 'relative',
    height: 55,
    gap: 8,
  },
  otpBox: {
    width: 38,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.bgMain,
    backgroundColor: COLORS.bgMain,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.soft,
  },
  otpBoxActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
    borderWidth: 2,
  },
  otpBoxFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  otpBoxText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    zIndex: 1,
  },
});
