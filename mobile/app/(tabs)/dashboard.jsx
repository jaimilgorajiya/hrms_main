import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Animated, RefreshControl, Image, Platform, LayoutAnimation, UIManager, Alert, TextInput, Modal,
} from 'react-native';
import { Svg, Circle, G, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch, getImageUrl } from '../../utils/api';
import { ENDPOINTS } from '../../constants/api';
import { COLORS, SIZES, RADIUS, SHADOW, GRADIENTS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import * as Location from 'expo-location';

import { getDistance } from '../../utils/geofence';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const StatCard = ({ icon, label, value, sub, color, bg, onPress, delay }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, tension: 50, friction: 7, delay, useNativeDriver: true }).start();
  }, [delay]);
  return (
    <Animated.View style={{ opacity: anim, transform: [{ scale: anim }], width: '48%' }}>
      <TouchableOpacity style={[styles.statCard, SHADOW.soft]} onPress={onPress} activeOpacity={0.85}>
        <View style={[styles.statIconBox, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statValue}>{value ?? '—'}</Text>
          <Text style={styles.statLabel}>{label}</Text>
          {sub ? <Text style={styles.statSub} numberOfLines={1}>{sub}</Text> : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const PunchSystem = ({ punchData, onPunch, onBreak }) => {
  const router = useRouter();
  const [elapsed, setElapsed] = useState('00:00:00');
  const [remaining, setRemaining] = useState('09:00:00');
  const [percent, setPercent] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const ringAnim = useRef(new Animated.Value(0)).current;
  const heightAnim = useRef(new Animated.Value(0)).current;

  const getWorkMs = () => {
    if (!punchData.shiftStart || !punchData.shiftEnd) return 9 * 3600 * 1000;
    const [sH, sM] = punchData.shiftStart.split(':').map(Number);
    const [eH, eM] = punchData.shiftEnd.split(':').map(Number);
    let diff = (eH * 3600000 + eM * 60000) - (sH * 3600000 + sM * 60000);
    if (diff < 0) diff += 24 * 3600000; // Overnight shift
    return diff;
  };

  const WORK_HOURS = getWorkMs();

  const formatMs = (ms) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  useEffect(() => {
    let interval;
    if (punchData?.punchedIn && punchData.startTime) {
      interval = setInterval(() => {
        const start = new Date(punchData.startTime).getTime();
        const now = new Date().getTime();
        const diff = Math.max(0, now - start);
        setElapsed(formatMs(diff));
        setRemaining(formatMs(Math.max(0, WORK_HOURS - diff)));
        const p = Math.min(1, diff / WORK_HOURS);
        setPercent(p);
      }, 1000);
    } else {
      setElapsed('00:00:00');
      setRemaining(formatMs(WORK_HOURS));
      setPercent(0);
    }
    return () => clearInterval(interval);
  }, [punchData, WORK_HOURS]);

  useEffect(() => {
    Animated.timing(ringAnim, { toValue: percent, duration: 1000, useNativeDriver: true }).start();
  }, [percent]);

  const toggleDetails = () => {
    // We use LayoutAnimation for the rest of the layout but Animated for the card's height
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    const nextState = !showDetails;
    setShowDetails(true);
    
    Animated.spring(heightAnim, {
      toValue: nextState ? 140 : 0,
      tension: 40,
      friction: 10,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!nextState && finished) setShowDetails(false);
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const size = 180;
  const stroke = 12;
  const center = size / 2;
  const radius = (size - stroke) / 2;
  const circum = 2 * Math.PI * radius;

  return (
    <View style={styles.heroSection}>
      <TouchableOpacity style={[styles.ringWrapper, SHADOW.soft]} onPress={toggleDetails} activeOpacity={0.9}>
        <Svg width={size} height={size}>
          <Defs>
            <SvgGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={COLORS.primary} />
              <Stop offset="100%" stopColor={COLORS.primaryDark} />
            </SvgGradient>
          </Defs>
          <G rotation="-90" origin={`${center}, ${center}`}>
            <Circle cx={center} cy={center} r={radius} stroke={COLORS.borderLight} strokeWidth={stroke} fill="none" />
            <AnimatedCircle
              cx={center}
              cy={center}
              r={radius}
              stroke="url(#grad)"
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={circum}
              strokeDashoffset={circum * (1 - percent)}
              strokeLinecap="round"
            />
          </G>
        </Svg>
        <View style={styles.timerOverlay}>
          <Text style={styles.timerText}>{elapsed}</Text>
          <Text style={[styles.statusBadgeText, { color: punchData?.punchedIn ? COLORS.success : COLORS.textMuted }]}>
            {punchData?.punchedIn ? 'Working' : 'Not Punched'}
          </Text>
        </View>
      </TouchableOpacity>

      <Animated.View style={[
        styles.detailsCard, 
        SHADOW.soft,
        { 
          height: heightAnim,
          opacity: heightAnim.interpolate({ inputRange: [0, 140], outputRange: [0, 1] }),
          overflow: 'hidden',
          marginTop: heightAnim.interpolate({ inputRange: [0, 140], outputRange: [0, 20] }),
        }
      ]}>
        <View style={{ padding: 20, gap: 12 }}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Working</Text>
            <Text style={styles.detailValue}>{elapsed}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Break Duration</Text>
            <Text style={styles.detailValue}>{punchData.breakDuration || '00:00:00'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Remaining</Text>
            <Text style={styles.detailValue}>{remaining}</Text>
          </View>
        </View>
      </Animated.View>

      <View style={styles.actionBtnRow}>
        <TouchableOpacity 
          style={[styles.pillBtn, punchData?.isDoneForToday && { opacity: 0.5 }]} 
          onPress={onPunch} 
          activeOpacity={0.85}
          disabled={punchData?.isDoneForToday}
        >
          <LinearGradient 
            colors={punchData?.isDoneForToday ? ['#94A3B8', '#64748B'] : (punchData?.punchedIn ? GRADIENTS.danger : GRADIENTS.success)} 
            style={styles.pillGrad} 
            start={{x:0,y:0}} 
            end={{x:1,y:0}}
          >
            <Ionicons 
              name={punchData?.isDoneForToday ? 'checkmark-circle' : (punchData?.punchedIn ? 'exit-outline' : 'log-in-outline')} 
              size={18} 
              color={COLORS.white} 
              style={{marginRight: 6}} 
            />
            <Text style={styles.pillBtnText}>
              {punchData?.isDoneForToday ? 'Punch In' : (punchData?.punchedIn ? 'Punch Out' : 'Punch In')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.pillBtn} onPress={onBreak} activeOpacity={0.85}>
          <LinearGradient colors={GRADIENTS.warning} style={styles.pillGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
            <Ionicons name="cafe-outline" size={18} color={COLORS.white} style={{marginRight: 6}} />
            <Text style={styles.pillBtnText}>Take Break</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.historyFullBtn} onPress={() => router.push('/(tabs)/attendance')} activeOpacity={0.85}>
        <LinearGradient colors={GRADIENTS.purple} style={styles.pillGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
          <Ionicons name="time-outline" size={18} color={COLORS.white} style={{marginRight: 6}} />
          <Text style={styles.pillBtnText}>View History</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [punchData, setPunchData] = useState({ punchedIn: false, startTime: null, breakDuration: '00:00:00' });
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [geofenceReason, setGeofenceReason] = useState('');
  const [showWorkSummaryModal, setShowWorkSummaryModal] = useState(false);
  const [workSummary, setWorkSummary] = useState('');
  const [showEarlyReasonModal, setShowEarlyReasonModal] = useState(false);
  const [earlyReason, setEarlyReason] = useState('');
  const [showInRangeModal, setShowInRangeModal] = useState(false);
  const [tempLocation, setTempLocation] = useState(null);
  const [currentAddress, setCurrentAddress] = useState('');
  const [modalTime, setModalTime] = useState('');

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [statsRes, attnRes] = await Promise.all([
        apiFetch(ENDPOINTS.employeeStats),
        apiFetch(ENDPOINTS.attendanceToday)
      ]);
      const statsJson = await statsRes.json();
      const attnJson = await attnRes.json();

      if (statsJson.success) {
        setData(statsJson);
      }

      if (attnRes.ok && attnJson.success) {
        const firstIn = attnJson.punches?.find(p => p.type === 'IN');
        let totalBreakMs = 0;
        (attnJson.breaks || []).forEach(b => {
          if (b.start && b.end) totalBreakMs += new Date(b.end) - new Date(b.start);
          else if (b.start) totalBreakMs += new Date() - new Date(b.start);
        });
        const bh = Math.floor(totalBreakMs / 3600000);
        const bm = Math.floor((totalBreakMs % 3600000) / 60000);
        const bs = Math.floor((totalBreakMs % 60000) / 1000);

        const lastPunch = attnJson.punches?.[attnJson.punches.length - 1];
        setPunchData({
          punchedIn: attnJson.isPunchedIn,
          isDoneForToday: lastPunch?.type === 'OUT',
          startTime: firstIn?.time,
          breakDuration: `${String(bh).padStart(2, '0')}:${String(bm).padStart(2, '0')}:${String(bs).padStart(2, '0')}`,
          shiftStart: statsJson.stats?.shiftStart,
          shiftEnd: statsJson.stats?.shiftEnd,
        });
        console.log('App Initial Load - Branch Coords:', statsJson.stats?.branchCoords);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handlePunch = async (options = {}) => {
    // If called from a direct onPress, the first arg is an event object. Ignore it.
    const params = (options && typeof options === 'object' && !options.nativeEvent) ? options : {};
    
    // Favor passed-in parameters over state to avoid state lag
    const effectiveEarlyReason = params.earlyReason || earlyReason;
    const effectiveWorkSummary = params.workSummary || workSummary;
    const effectiveGeofenceReason = params.geofenceReason || geofenceReason;
    
    const now = new Date();
    setModalTime(now.toLocaleString('en-IN', { 
      day: '2-digit', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit', hour12: true 
    }));

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLoading(true);

    try {
      const isPunchingIn = !punchData.punchedIn;

      // 0. Check Early Punch Out
      if (!isPunchingIn && punchData.shiftEnd && !effectiveEarlyReason) {
        const [h, m] = punchData.shiftEnd.split(':').map(Number);
        const now = new Date();
        const end = new Date();
        end.setHours(h, m, 0, 0);
        
        if (now < end) {
          setShowEarlyReasonModal(true);
          setLoading(false);
          return;
        }
      }

      // 0.1 If Punching OUT, ask for Work Summary first
      if (!isPunchingIn && !effectiveWorkSummary.trim()) {
        setShowWorkSummaryModal(true);
        setLoading(false);
        return;
      }

      // 1. Get Location
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'Location access is required for attendance.' });
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      console.log('Mobile Location:', { latitude, longitude });

      // 1.1 Reverse Geocode to get Building, Street, City
      let addr = 'Address not found';
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo?.[0]) {
          const { street, streetNumber, name, city, region } = geo[0];
          addr = [name, streetNumber, street, city, region].filter(Boolean).join(', ');
        }
      } catch (ge) { console.error('Geocode error:', ge); }
      console.log('Fethced Address:', addr);
      setCurrentAddress(addr);

      // 2. Check Geofence
      const target = data?.stats?.branchCoords;
      console.log('Target Branch Coords from Server:', target);
      if (target && target.latitude !== 0) {
        const distance = getDistance(latitude, longitude, target.latitude, target.longitude);
        console.log('Calculated Distance (m):', distance);
        const radius = target.radius || 500;
        console.log('Branch Radius (m):', radius);
        
        if (distance > radius && !effectiveGeofenceReason) {
          setTempLocation({ latitude, longitude });
          setShowGeofenceModal(true);
          setLoading(false);
          return;
        } else if (distance <= radius) {
          // If in range, just submit directly for a "one-click" experience
          await submitPunch(latitude, longitude, { 
            earlyReason: effectiveEarlyReason, 
            workSummary: effectiveWorkSummary,
            locationAddress: addr
          });
          return;
        }
      }

      // 3. Call API with all reasons collected
      await submitPunch(latitude, longitude, { 
        geofenceReason: effectiveGeofenceReason, 
        earlyReason: effectiveEarlyReason, 
        workSummary: effectiveWorkSummary,
        locationAddress: addr
      });
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Connection error' });
    } finally {
      setLoading(false);
    }
  };

  const submitPunch = async (latitude, longitude, reasons = {}) => {
    const res = await apiFetch(ENDPOINTS.togglePunch, { 
      method: 'POST', 
      body: JSON.stringify({ 
        latitude, 
        longitude, 
        geofenceReason: reasons.geofenceReason,
        workSummary: reasons.workSummary,
        earlyReason: reasons.earlyReason,
        locationAddress: reasons.locationAddress
      }) 
    });
    const json = await res.json();
    if (json.success) {
      setShowGeofenceModal(false);
      setShowWorkSummaryModal(false);
      setGeofenceReason('');
      setWorkSummary('');
      Toast.show({ type: 'success', text1: 'Success', text2: json.message });
      loadData();
    } else {
      Toast.show({ type: 'error', text1: 'Oops', text2: json.message });
    }
  };

  const submitWithReason = async () => {
    setShowGeofenceModal(false);
    handlePunch({ geofenceReason });
  };

  const handleBreak = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await apiFetch(ENDPOINTS.toggleBreak, { method: 'POST' });
      const json = await res.json();
      if (json.success) loadData();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Network error' });
    }
  };

  const emp = data?.employee || {};
  const stats = data?.stats || {};
  const photoUrl = getImageUrl(emp.profilePhoto);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    if (hour < 21) return 'Good Evening';
    return 'Good Night';
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={COLORS.primary} />}
      >
        <View style={[styles.header, SHADOW.soft]}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()}, {emp.name?.split(' ')[0] || 'Member'}</Text>
            <Text style={styles.subtext}>
              {new Date().getHours() < 17 ? 'Let’s have a productive day' : 'Hope you had a productive day'}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notifBtn}>
              <Ionicons name="notifications-outline" size={24} color={COLORS.textDark} />
              <View style={styles.notifDot} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
              <View style={styles.avatarBorder}>
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}><Text style={styles.avatarText}>{(emp.name || 'E')[0]}</Text></View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.body}>
          <PunchSystem punchData={punchData} onPunch={handlePunch} onBreak={handleBreak} />
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard icon="leaf-outline" label="Leaves" value={stats.totalLeaves} sub="Balance" color={COLORS.success} bg={COLORS.successLight} onPress={() => router.push('/(tabs)/leaves')} delay={0} />
            <StatCard icon="document-text-outline" label="Docs" value={stats.documentCount} sub="Files" color={COLORS.purple} bg={COLORS.purpleLight} onPress={() => router.push('/(tabs)/documents')} delay={50} />
            <StatCard icon="hourglass-outline" label="Tenure" value={`${stats.daysSinceJoining}d`} sub="Progress" color={COLORS.primary} bg={COLORS.primaryLight} delay={100} />
            <StatCard icon="moon-outline" label="Shift" value={stats.shiftName || '—'} sub={stats.shiftStart || 'Time'} color={COLORS.warning} bg={COLORS.warningLight} onPress={() => router.push('/(tabs)/shift')} delay={150} />
          </View>
          <View style={[styles.productivityCard, SHADOW.soft]}>
            <View style={styles.prodIcon}><Ionicons name="bulb-outline" size={20} color={COLORS.primary} /></View>
            <Text style={styles.prodText}>You've worked {(punchData.punchedIn ? 'some' : '0')} hrs today. Keep it up!</Text>
          </View>
        </View>
      </ScrollView>

      {/* Today's Work Summary Modal (Punch OUT) */}
      {/* Today's Work Summary Modal (Punch OUT) */}
      {/* Work Summary Modal */}
      <Modal visible={showWorkSummaryModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.alertCircle, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="document-text" size={32} color={COLORS.success} />
              </View>
              <Text style={styles.modalTitle}>Work Summary</Text>
              <Text style={styles.modalSub}>Briefly list your achievements for today before you sign off.</Text>
              
              <View style={styles.modalTimeRow}>
                <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.modalTimeText}>{modalTime}</Text>
              </View>
            </View>
            
            <TextInput
              style={styles.reasonInput}
              placeholder="e.g., Task A completed, Meeting with Client B..."
              placeholderTextColor={COLORS.textMuted}
              value={workSummary}
              onChangeText={setWorkSummary}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowWorkSummaryModal(false)}>
                <Text style={styles.cancelBtnText}>Later</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={() => {
                setShowWorkSummaryModal(false);
                handlePunch({ workSummary });
              }}>
                <LinearGradient colors={GRADIENTS.success} style={styles.submitBtnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                  <Text style={styles.submitBtnText}>Submit & Continue</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Early Punch Out Modal */}
      <Modal visible={showEarlyReasonModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.alertCircle, { backgroundColor: COLORS.warningLight }]}>
                <Ionicons name="time" size={32} color={COLORS.warning} />
              </View>
              <Text style={styles.modalTitle}>Early Departure</Text>
              <Text style={styles.modalSub}>Your shift hasn't ended. Please specify a reason for leaving early.</Text>
              
              <View style={styles.modalTimeRow}>
                <Ionicons name="alert-circle-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.modalTimeText}>Attempted at: {modalTime}</Text>
              </View>
            </View>
            
            <TextInput
              style={styles.reasonInput}
              placeholder="e.g., Finished work, Personal emergency..."
              placeholderTextColor={COLORS.textMuted}
              value={earlyReason}
              onChangeText={setEarlyReason}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowEarlyReasonModal(false); setEarlyReason(''); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={() => {
                setShowEarlyReasonModal(false);
                handlePunch({ earlyReason });
              }}>
                <LinearGradient colors={GRADIENTS.warning} style={styles.submitBtnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                  <Text style={styles.submitBtnText}>Confirm Early Out</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Geofence Alert Modal (Out of Range) */}
      <Modal visible={showGeofenceModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.alertCircle, { backgroundColor: COLORS.dangerLight }]}>
                <Ionicons name="location" size={32} color={COLORS.danger} />
              </View>
              <Text style={styles.modalTitle}>Geofence Alert</Text>
              <Text style={styles.modalSub}>You are currently outside your assigned workplace reach. Justify this log.</Text>
              
              <View style={[styles.modalTimeRow, { marginBottom: 6 }]}>
                <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
                <Text style={styles.modalTimeText}>{modalTime}</Text>
              </View>
              
              {currentAddress ? (
                <View style={styles.currentLocBadge}>
                  <Ionicons name="pin" size={14} color={COLORS.danger} />
                  <Text style={styles.currentLocText}>{currentAddress}</Text>
                </View>
              ) : null}
            </View>
            
            <TextInput
              style={styles.reasonInput}
              placeholder="e.g., Working from onsite, Field work..."
              placeholderTextColor={COLORS.textMuted}
              value={geofenceReason}
              onChangeText={setGeofenceReason}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowGeofenceModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={submitWithReason}>
                <LinearGradient colors={GRADIENTS.primary} style={styles.submitBtnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                  <Text style={styles.submitBtnText}>Submit Signature</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Verified: In Range Modal (SweetAlert Style) */}
      <Modal 
        visible={showInRangeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInRangeModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { paddingBottom: 24 }]}>
          <View style={styles.modalHeader}>
            <View style={[styles.alertCircle, { backgroundColor: COLORS.successLight, marginBottom: 12 }]}>
              <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
            </View>
            <Text style={[styles.modalTitle, { fontSize: 22 }]}>Verified: In Range</Text>
            <Text style={[styles.modalSub, { marginTop: 8 }]}>You are at the {data?.stats?.branchName || 'assigned'} branch.</Text>
            <Text style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>Distance: {Math.round(getDistance(tempLocation?.latitude || 0, tempLocation?.longitude || 0, data?.stats?.branchCoords?.latitude || 0, data?.stats?.branchCoords?.longitude || 0))}m</Text>
          </View>
          
          <View style={[styles.modalActions, { marginTop: 24 }]}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowInRangeModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={async () => {
              setShowInRangeModal(false);
              setLoading(true);
              await submitPunch(tempLocation.latitude, tempLocation.longitude, null);
            }}>
              <LinearGradient colors={GRADIENTS.success} style={styles.submitBtnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                <Text style={styles.submitBtnText}>Yes, Proceed</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgMain },
  scroll: { flex: 1 },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 24, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    zIndex: 10,
  },
  greeting: { fontSize: SIZES.lg, fontWeight: '800', color: COLORS.textDark },
  subtext: { fontSize: SIZES.sm, color: COLORS.textLight, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  notifBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.bgMain, justifyContent: 'center', alignItems: 'center' },
  notifDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger, borderWidth: 1.5, borderColor: COLORS.bgMain },
  avatarBorder: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: COLORS.primary, padding: 2, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%', borderRadius: 24 },
  avatarPlaceholder: { flex: 1, backgroundColor: COLORS.bgMain, justifyContent: 'center', alignItems: 'center', borderRadius: 24 },
  avatarText: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  body: { padding: 20, paddingBottom: 100 },
  heroSection: { alignItems: 'center', marginVertical: 20 },
  ringWrapper: { width: 200, height: 200, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 100 },
  timerOverlay: { position: 'absolute', alignItems: 'center' },
  timerText: { fontSize: SIZES.xxxl, fontWeight: '800', color: COLORS.textDark, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  statusBadgeText: { fontSize: SIZES.sm, fontWeight: '700', marginTop: 4 },
  detailsCard: { backgroundColor: COLORS.white, width: '90%', borderRadius: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 14, color: COLORS.textLight, fontWeight: '600' },
  detailValue: { fontSize: 14, color: COLORS.textDark, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  actionBtnRow: { flexDirection: 'row', gap: 12, marginTop: 32 },
  pillBtn: { flex: 1, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOW.soft },
  historyFullBtn: { width: '100%', marginTop: 12, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOW.soft },
  pillGrad: { paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  pillBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  submitBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  currentLocBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, marginTop: 10,
    width: '100%',
  },
  currentLocText: {
    fontSize: 12, fontWeight: '600', color: COLORS.danger,
    flex: 1,
  },
  modalTimeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 4,
  },
  modalTimeText: {
    fontSize: 11, color: COLORS.textMuted,
    fontWeight: '600',
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark, marginBottom: 16, marginTop: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  statCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  statContent: { flex: 1 },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.textDark },
  statLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textLight, marginTop: 2 },
  statSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  productivityCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20, marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 12 },
  prodIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  prodText: { flex: 1, fontSize: 13, color: COLORS.textMain, fontWeight: '600', lineHeight: 20 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.white, borderRadius: 24, padding: 24, paddingBottom: 30 },
  modalHeader: { alignItems: 'center', marginBottom: 20 },
  alertCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textDark, marginBottom: 8 },
  modalSub: { fontSize: 13, color: COLORS.textLight, textAlign: 'center', lineHeight: 20 },
  reasonInput: { 
    backgroundColor: COLORS.bgMain, borderRadius: 16, padding: 16, 
    height: 120, textAlignVertical: 'top', fontSize: 14, color: COLORS.textDark,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 24
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, height: 52, justifyContent: 'center', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.textLight },
  submitBtn: { flex: 2, height: 52, borderRadius: 14, overflow: 'hidden' },
  submitBtnGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
});
