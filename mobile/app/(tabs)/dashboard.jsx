import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Animated, RefreshControl, Image, Platform, LayoutAnimation, UIManager, Alert, TextInput, Modal,
  ActivityIndicator,
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
          <Text style={styles.statValue} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.7}>
            {value ?? '—'}
          </Text>
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
  const [breakElapsed, setBreakElapsed] = useState('00:00:00');

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
        
        if (punchData.isOnBreak) {
          // Calculate live break time based on the last break start
          const lastBreak = (punchData.breaks || [])[punchData.breaks.length - 1];
          if (lastBreak?.start) {
            const bStart = new Date(lastBreak.start).getTime();
            setBreakElapsed(formatMs(now - bStart));
          }
        } else {
          // When NOT on break, we show work elapsed
          const diff = Math.max(0, now - start);
          setElapsed(formatMs(diff));
          setRemaining(formatMs(Math.max(0, WORK_HOURS - diff)));
          const p = Math.min(1, diff / WORK_HOURS);
          setPercent(p);
        }
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
          <Text style={styles.timerText}>{punchData.isOnBreak ? breakElapsed : elapsed}</Text>
          <Text style={[styles.statusBadgeText, { color: punchData.isOnBreak ? COLORS.warning : (punchData.punchedIn ? COLORS.success : COLORS.textMuted) }]}>
            {punchData.isOnBreak 
              ? (punchData.currentBreakType?.toUpperCase() || 'ON BREAK') 
              : (punchData.punchedIn ? 'WORKING' : 'NOT PUNCHED')}
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
            <Text style={styles.detailLabel}>Break Duration</Text>
            <Text style={styles.detailValue}>{punchData.breakDuration || '00:00:00'}</Text>
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

        <TouchableOpacity 
          style={[styles.pillBtn, (!punchData?.punchedIn || punchData?.isDoneForToday) && { opacity: 0.5 }]} 
          onPress={onBreak} 
          activeOpacity={0.85}
          disabled={!punchData?.punchedIn || punchData?.isDoneForToday}
        >
          <LinearGradient colors={punchData?.isOnBreak ? GRADIENTS.danger : GRADIENTS.warning} style={styles.pillGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
            <Ionicons name={punchData?.isOnBreak ? 'stop-circle-outline' : 'cafe-outline'} size={18} color={COLORS.white} style={{marginRight: 6}} />
            <Text style={styles.pillBtnText}>{punchData?.isOnBreak ? 'End Break' : 'Take Break'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.historyFullBtn} onPress={() => router.push('/(tabs)/attendance')} activeOpacity={0.85}>
        <LinearGradient colors={GRADIENTS.purple} style={styles.pillGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
          <Ionicons name="time-outline" size={18} color={COLORS.white} style={{marginRight: 6}} />
          <Text style={styles.pillBtnText}>View History</Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={[styles.productivityCard, SHADOW.soft, { marginTop: 20 }]}>
        <View style={{ ...styles.prodIcon, backgroundColor: COLORS.primaryLight }}><Ionicons name="sparkles" size={16} color={COLORS.primary} /></View>
        <Text style={styles.prodText}>
          {punchData.punchedIn 
            ? `You are currently clocked in. Have a productive day!` 
            : "Remember to log your attendance when you arrive."}
        </Text>
      </View>
    </View>
  );
};

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [punchData, setPunchData] = useState({ 
    punchedIn: false, 
    isOnBreak: false, 
    currentBreakType: null,
    startTime: null, 
    breakDuration: '00:00:00' 
  });
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [geofenceReason, setGeofenceReason] = useState('');
  const [showWorkSummaryModal, setShowWorkSummaryModal] = useState(false);
  const [workSummary, setWorkSummary] = useState('');
  const [showEarlyReasonModal, setShowEarlyReasonModal] = useState(false);
  const [earlyReason, setEarlyReason] = useState('');
  const [showLateReasonModal, setShowLateReasonModal] = useState(false);
  const [lateReason, setLateReason] = useState('');
  const [showInRangeModal, setShowInRangeModal] = useState(false);
  const [tempLocation, setTempLocation] = useState(null);
  const [currentAddress, setCurrentAddress] = useState('');
  const [modalTime, setModalTime] = useState('');
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [filteredBreaks, setFilteredBreaks] = useState([]);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);

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
          isOnBreak: attnJson.isOnBreak,
          currentBreakType: attnJson.breaks?.find(b => !b.end)?.type || null,
          isDoneForToday: lastPunch?.type === 'OUT',
          startTime: firstIn?.time,
          breaks: attnJson.breaks || [],
          breakDuration: `${String(bh).padStart(2, '0')}:${String(bm).padStart(2, '0')}:${String(bs).padStart(2, '0')}`,
          punches: attnJson.punches || [],
          shiftStart: statsJson.stats?.shiftStart,
          shiftEnd: statsJson.stats?.shiftEnd,
          lateInPenalty: attnJson.lateInPenalty?.amount || 0,
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
    const effectiveLateReason = params.lateReason || lateReason;
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

      // 0. Check Late Punch In
      if (isPunchingIn && data?.stats?.shiftStart && data?.stats?.requireLateReason && !effectiveLateReason) {
        const [h, m] = data.stats.shiftStart.split(':').map(Number);
        const lateLimit = new Date();
        lateLimit.setHours(h, m + (data.stats.maxLateInMinutes || 0), 0, 0);
        
        if (now > lateLimit) {
          setShowLateReasonModal(true);
          setLoading(false);
          return;
        }
      }

      // 0.1 Check Early Punch Out
      if (!isPunchingIn && data?.stats?.shiftEnd && data?.stats?.requireEarlyOutReason && !effectiveEarlyReason) {
        const [h, m] = data.stats.shiftEnd.split(':').map(Number);
        
        let earlyGrace = data.stats.maxEarlyOutMinutes || 0;
        if (data.stats.lateEarlyType === 'Combined') {
          // Calculate late minutes from this morning
          const firstInTime = punchData.startTime ? new Date(punchData.startTime) : null;
          const shiftStartStr = data.stats.shiftStart;
          if (firstInTime && shiftStartStr) {
            const [sh, sm] = shiftStartStr.split(':').map(Number);
            const shiftTime = new Date(firstInTime);
            shiftTime.setHours(sh, sm, 0, 0);
            const lateMs = firstInTime - shiftTime;
            const lateMins = Math.max(0, Math.floor(lateMs / 60000));
            earlyGrace = Math.max(0, (data.stats.maxLateInMinutes || 0) - lateMins);
          } else {
            earlyGrace = data.stats.maxLateInMinutes || 0;
          }
        }

        const earlyLimit = new Date();
        earlyLimit.setHours(h, m - earlyGrace, 0, 0);
        
        if (now < earlyLimit) {
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

      const loc = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.High, 
        timeout: 10000 
      });
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
        const radius = target.radius || 200;
        console.log('[GEOFENCE] Distance:', distance, 'm, Max Radius:', radius, 'm');
        
        if (distance > radius) {
          if (data?.stats?.requireOutOfRangeReason) {
            setTempLocation({ latitude, longitude });
            setShowGeofenceModal(true);
            setLoading(false);
            return;
          } else {
            // Out of range but reason is NOT required -> Proceed to InRange success screen
            setTempLocation({ latitude, longitude });
            setShowInRangeModal(true);
            setLoading(false);
            return;
          }
        } else if (distance <= radius) {
          setTempLocation({ latitude, longitude });
          setShowInRangeModal(true);
          setLoading(false);
          return;
        }
      }

      // 3. Call API with all reasons collected
      await submitPunch(latitude, longitude, { 
        geofenceReason: effectiveGeofenceReason, 
        earlyReason: effectiveEarlyReason, 
        lateReason: effectiveLateReason,
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
        lateReason: reasons.lateReason,
        locationAddress: reasons.locationAddress
      }) 
    });
    const json = await res.json();
    if (json.success) {
      setShowGeofenceModal(false);
      setShowWorkSummaryModal(false);
      setShowEarlyReasonModal(false);
      setShowLateReasonModal(false);
      setGeofenceReason('');
      setWorkSummary('');
      setEarlyReason('');
      setLateReason('');
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

  const handleBreak = async (param = null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // If param is a React Native event (from button click), reset it to null
    const selectedType = (typeof param === 'string') ? param : null;

    // If starting a break and multiple types are available, show selection modal
    if (!punchData.isOnBreak && !selectedType && stats.availableBreaks?.length > 0) {
      let finalAvailableList = stats.availableBreaks;

      if (stats.breakMode === 'Defined Minutes') {
        const now = new Date();
        const nowMins = now.getHours() * 60 + now.getMinutes();

        const parseTime = (timeStr) => {
          if (!timeStr) return null;
          const [h, m] = timeStr.split(':').map(Number);
          return h * 60 + m;
        };

        finalAvailableList = stats.availableBreaks.filter(b => {
          const typeLower = b.name.toLowerCase();
          let startMins = null, endMins = null;

          if (typeLower.includes('lunch')) {
            startMins = parseTime(stats.lunchStart);
            endMins = parseTime(stats.lunchEnd);
          } else if (typeLower.includes('tea')) {
            startMins = parseTime(stats.teaStart);
            endMins = parseTime(stats.teaEnd);
          }

          if (startMins !== null && endMins !== null) {
            return nowMins >= startMins && nowMins <= endMins;
          }
          return false;
        });

        if (finalAvailableList.length === 0) {
          Toast.show({ 
            type: 'error', 
            text1: 'No Breaks Available', 
            text2: 'Currently no breaks are scheduled for this time.' 
          });
          return;
        }
      }

      if (finalAvailableList.length === 1) {
        // Auto-select if only one type currently allowed
        return handleBreak(finalAvailableList[0].name);
      }

      setFilteredBreaks(finalAvailableList);
      setShowBreakModal(true);
      return;
    }

    try {
      setLoading(true);
      const res = await apiFetch(ENDPOINTS.toggleBreak, { 
        method: 'POST',
        body: JSON.stringify({ breakType: selectedType || 'General' })
      });
      const json = await res.json();
      if (json.success) {
        setShowBreakModal(false);
        loadData();
      } else {
        Toast.show({ type: 'error', text1: json.message });
      }
    } catch (e) {
      console.error('Break Error:', e);
      Toast.show({ type: 'error', text1: 'Break failed', text2: 'Please check your connection' });
    } finally {
      setLoading(false);
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
        contentContainerStyle={{ paddingBottom: 60 }}
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
          <Text style={styles.sectionTitle}>Monthly Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard icon="calendar-outline" label="Attendance" value={`${stats.presentDays}d`} sub="Days Present" color={COLORS.success} bg={COLORS.successLight} onPress={() => router.push('/(tabs)/attendance')} delay={50} />
            <StatCard icon="receipt-outline" label="Total Penalty" value={`₹${stats.monthPenalty || 0}`} sub="This Month" color={COLORS.danger} bg={COLORS.dangerLight} delay={100} onPress={() => setShowPenaltyModal(true)} />
            <StatCard icon="warning-outline" label="Today's Penalty" value={`₹${punchData.lateInPenalty || 0}`} sub="Late In" color={COLORS.warning} bg={COLORS.warningLight} delay={150} />
            <StatCard icon="moon-outline" label="Today's Shift" value={stats.shiftName || '—'} sub={stats.shiftStart || 'Time'} color={COLORS.purple} bg={COLORS.purpleLight} delay={200} onPress={() => setShowShiftModal(true)} />
            <StatCard icon="leaf-outline" label="Annual Leaves" value={stats.totalLeaves} sub="Quota" color={COLORS.success} bg={COLORS.successLight} onPress={() => router.push('/(tabs)/leaves')} delay={250} />
            <StatCard icon="document-text-outline" label="Documents" value={stats.documentCount || 0} sub="Uploaded" color={COLORS.primary} bg={COLORS.primaryLight} delay={300} />
          </View>

          <Text style={styles.sectionTitle}>Today's Activity</Text>
          <View style={[styles.timelineCard, SHADOW.soft]}>
            {(punchData.punches || []).length === 0 ? (
              <View style={styles.emptyActivity}>
                <Ionicons name="calendar-clear-outline" size={32} color={COLORS.border} />
                <Text style={styles.emptyText}>No activity logged for today yet.</Text>
              </View>
            ) : (
                [...punchData.punches].reverse().map((p, i) => (
                    <View key={i} style={[styles.timelineItem, i === 0 && { borderTopWidth: 0 }]}>
                        <View style={[styles.timelineDot, { backgroundColor: p.type === 'IN' ? COLORS.success : COLORS.danger }]} />
                        <View style={styles.timelineContent}>
                            <Text style={styles.timelineType}>{p.type === 'IN' ? 'Punched In' : 'Punched Out'}</Text>
                            <Text style={styles.timelineTime}>{new Date(p.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
                        </View>
                        <Ionicons name={p.type === 'IN' ? 'enter-outline' : 'exit-outline'} size={18} color={p.type === 'IN' ? COLORS.success : COLORS.danger} />
                    </View>
                ))
            )}
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

      {/* Late Punch In Modal */}
      <Modal visible={showLateReasonModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.modalCloseBtn} 
              onPress={() => { setShowLateReasonModal(false); setLateReason(''); }}
            >
              <Ionicons name="close" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
            <View style={styles.modalHeader}>
              <View style={[styles.alertCircle, { backgroundColor: COLORS.dangerLight }]}>
                <Ionicons name="time" size={32} color={COLORS.danger} />
              </View>
              <Text style={styles.modalTitle}>Late Arrival</Text>
              <Text style={styles.modalSub}>You are clocking in past your shift start time. Please provide a reason.</Text>
              
              <View style={styles.modalTimeRow}>
                <Ionicons name="alert-circle-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.modalTimeText}>Attempted at: {modalTime}</Text>
              </View>
            </View>
            
            <TextInput
              style={styles.reasonInput}
              placeholder="e.g., Heavy traffic, Personal issue, Client meeting..."
              placeholderTextColor={COLORS.textMuted}
              value={lateReason}
              onChangeText={setLateReason}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowLateReasonModal(false); setLateReason(''); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={() => {
                setShowLateReasonModal(false);
                handlePunch({ lateReason });
              }}>
                <LinearGradient colors={GRADIENTS.danger} style={styles.submitBtnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                  <Text style={styles.submitBtnText}>Confirm Late In</Text>
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
            <TouchableOpacity 
              style={styles.modalCloseBtn} 
              onPress={() => { setShowEarlyReasonModal(false); setEarlyReason(''); }}
            >
              <Ionicons name="close" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
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
            <TouchableOpacity 
              style={styles.modalCloseBtn} 
              onPress={() => setShowGeofenceModal(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
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
              
              <View style={[styles.currentLocBadge, { backgroundColor: COLORS.dangerLight, marginTop: 10 }]}>
                <Ionicons name="resize-outline" size={14} color={COLORS.danger} />
                <Text style={[styles.currentLocText, { color: COLORS.danger }]}>
                   Detected Distance: {Math.round(getDistance(tempLocation?.latitude || 0, tempLocation?.longitude || 0, data?.stats?.branchCoords?.latitude || 0, data?.stats?.branchCoords?.longitude || 0))}m 
                   (Limit: {data?.stats?.branchCoords?.radius || 200}m)
                </Text>
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
            <Text style={[styles.modalTitle, { fontSize: 22 }]}>
              {Math.round(getDistance(tempLocation?.latitude || 0, tempLocation?.longitude || 0, data?.stats?.branchCoords?.latitude || 0, data?.stats?.branchCoords?.longitude || 0)) <= (data?.stats?.branchCoords?.radius || 500) 
                ? 'You are in range' 
                : 'Remote Punch Available'}
            </Text>
          
            
            {currentAddress ? (
              <View style={[styles.currentLocBadge, { backgroundColor: COLORS.successLight, marginTop: 15 }]}>
                <Ionicons name="pin" size={14} color={COLORS.success} />
                <Text style={[styles.currentLocText, { color: COLORS.success }]}>{currentAddress}</Text>
              </View>
            ) : null}

            <Text style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 10, fontWeight: '600' }}>Distance: {Math.round(getDistance(tempLocation?.latitude || 0, tempLocation?.longitude || 0, data?.stats?.branchCoords?.latitude || 0, data?.stats?.branchCoords?.longitude || 0))}m</Text>
          </View>
          
          <View style={[styles.modalActions, { marginTop: 24 }]}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowInRangeModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={async () => {
              setShowInRangeModal(false);
              setLoading(true);
              await submitPunch(tempLocation.latitude, tempLocation.longitude, {
                earlyReason,
                lateReason,
                workSummary,
                locationAddress: currentAddress
              });
            }}>
              <LinearGradient colors={GRADIENTS.success} style={styles.submitBtnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                <Text style={styles.submitBtnText}>
                  {punchData?.punchedIn ? 'Punch Out' : 'Punch In'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          </View>
        </View>
      </Modal>
      {/* Break Selection Modal */}
      <Modal visible={showBreakModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { maxHeight: '70%', paddingBottom: 20 }]}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowBreakModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
            <View style={styles.modalHeader}>
              <View style={[styles.alertCircle, { backgroundColor: COLORS.warningLight }]}>
                <Ionicons name="cafe" size={32} color={COLORS.warning} />
              </View>
              <Text style={styles.modalTitle}>Choose Break Type</Text>
              <Text style={styles.modalSub}>Select the type of break you are taking.</Text>
            </View>

            <ScrollView style={{ marginBottom: 20 }}>
              {(filteredBreaks || []).map((b, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={styles.breakItem} 
                  onPress={() => handleBreak(b.name)}
                >
                  <View style={styles.breakItemLeft}>
                    <View style={styles.breakIconCircle}>
                      <Ionicons name={b.name?.toLowerCase().includes('lunch') ? 'fast-food-outline' : 'cafe-outline'} size={20} color={COLORS.primary} />
                    </View>
                    <View>
                      <Text style={styles.breakItemName}>{b.name}</Text>
                      {b.name?.toLowerCase().includes('lunch') && stats.lunchStart ? (
                        <Text style={styles.breakItemDur}>Window: {stats.lunchStart} - {stats.lunchEnd}</Text>
                      ) : b.name?.toLowerCase().includes('tea') && stats.teaStart ? (
                        <Text style={styles.breakItemDur}>Window: {stats.teaStart} - {stats.teaEnd}</Text>
                      ) : (
                        <Text style={styles.breakItemDur}>{b.minutes === 'As Per Shift' ? 'As per company policy' : `${b.minutes} mins allowed`}</Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.border} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowBreakModal(false)}>
              <Text style={styles.cancelBtnText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Shift Details Modal */}
      <Modal visible={showShiftModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={{ flex: 1, width: '100%' }} activeOpacity={1} onPress={() => setShowShiftModal(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetIcon, { backgroundColor: COLORS.warningLight }]}>
                <Ionicons name="time" size={24} color={COLORS.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>{stats?.shiftName || 'Shift Details'}</Text>
                <Text style={styles.sheetSub}>Full schedule and rules</Text>
              </View>
              <TouchableOpacity onPress={() => setShowShiftModal(false)}>
                <Ionicons name="close-circle" size={28} color={COLORS.border} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.sheetGrid}>
              <View style={styles.sheetItem}>
                <Ionicons name="enter-outline" size={20} color={COLORS.primary} />
                <View>
                  <Text style={styles.sheetLabel}>Shift Start</Text>
                  <Text style={styles.sheetValue}>{stats?.shiftStart || '—'}</Text>
                </View>
              </View>
              <View style={styles.sheetItem}>
                <Ionicons name="exit-outline" size={20} color={COLORS.danger} />
                <View>
                  <Text style={styles.sheetLabel}>Shift End</Text>
                  <Text style={styles.sheetValue}>{stats?.shiftEnd || '—'}</Text>
                </View>
              </View>
              
              {stats?.lunchStart && stats?.lunchEnd && (
                <View style={styles.sheetItem}>
                  <Ionicons name="restaurant-outline" size={20} color={COLORS.warning} />
                  <View>
                    <Text style={styles.sheetLabel}>Lunch Break</Text>
                    <Text style={styles.sheetValue}>{stats.lunchStart} - {stats.lunchEnd}</Text>
                  </View>
                </View>
              )}
              
              {stats?.teaStart && stats?.teaEnd && (
                <View style={styles.sheetItem}>
                  <Ionicons name="cafe-outline" size={20} color={COLORS.purple} />
                  <View>
                    <Text style={styles.sheetLabel}>Tea Break</Text>
                    <Text style={styles.sheetValue}>{stats.teaStart} - {stats.teaEnd}</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.sheetFooter}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={styles.footerLabel}>Weekly Off Policy</Text>
                <View style={[styles.dayTag, { backgroundColor: COLORS.bgMain }]}>
                  <Text style={[styles.dayTagText, { color: COLORS.textMuted, fontSize: 10 }]}>{stats?.weekOffType}</Text>
                </View>
              </View>
              
              <View style={styles.tagGrid}>
                {stats?.weekOffType === 'Selected Weekdays' ? (
                  (stats?.weekOffDays || []).length > 0 ? stats.weekOffDays.map((d, i) => (
                    <View key={i} style={styles.dayTag}>
                      <Text style={styles.dayTagText}>{d}</Text>
                    </View>
                  )) : (
                    <Text style={styles.sheetValue}>No Fixed Weekly Off</Text>
                  )
                ) : (
                  <View style={{ gap: 8, width: '100%' }}>
                    {stats?.weekOffsPerWeek > 0 && (
                      <View style={styles.quotaRow}>
                        <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.quotaText}>Allowance: <Text style={{fontWeight:'800'}}>{stats.weekOffsPerWeek}</Text> per week</Text>
                      </View>
                    )}
                    {stats?.weekOffsPerMonth > 0 && (
                      <View style={styles.quotaRow}>
                        <Ionicons name="apps-outline" size={16} color={COLORS.purple} />
                        <Text style={styles.quotaText}>Cap: <Text style={{fontWeight:'800'}}>{stats.weekOffsPerMonth}</Text> per month</Text>
                      </View>
                    )}
                    {!stats?.weekOffsPerWeek && !stats?.weekOffsPerMonth && (
                      <Text style={styles.sheetValue}>Flexible rest days apply</Text>
                    )}
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity style={styles.sheetButton} onPress={() => setShowShiftModal(false)}>
              <Text style={styles.sheetButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Penalty Details Modal */}
      <Modal visible={showPenaltyModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={{ flex: 1, width: '100%' }} activeOpacity={1} onPress={() => setShowPenaltyModal(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetIcon, { backgroundColor: COLORS.dangerLight }]}>
                <Ionicons name="receipt" size={24} color={COLORS.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Monthly Penalties</Text>
                <Text style={styles.sheetSub}>Detailed list of deductions</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPenaltyModal(false)}>
                <Ionicons name="close-circle" size={28} color={COLORS.border} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {(!stats.penaltyHistory || stats.penaltyHistory.length === 0) ? (
                <View style={styles.emptyActivity}>
                  <View style={[styles.alertCircle, { backgroundColor: COLORS.successLight }]}>
                    <Ionicons name="shield-checkmark" size={32} color={COLORS.success} />
                  </View>
                  <Text style={[styles.modalTitle, { fontSize: 16 }]}>No Penalties Recorded</Text>
                  <Text style={styles.emptyText}>Great job! You haven't incurred any penalties this month.</Text>
                </View>
              ) : (
                stats.penaltyHistory.map((p, i) => (
                  <View key={i} style={styles.penaltyItem}>
                    <View style={styles.penaltyLeft}>
                      <View style={[styles.penaltyDot, { backgroundColor: p.type === 'Late In' ? COLORS.danger : COLORS.warning }]} />
                      <View>
                        <Text style={styles.penaltyDate}>{new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                        <Text style={styles.penaltyType}>{p.type}</Text>
                      </View>
                    </View>
                    <Text style={styles.penaltyAmount}>- ₹{p.amount}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.sheetFooter}>
              <View style={[styles.totalPenaltyBox, { backgroundColor: COLORS.dangerLight, padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }]}>
                <Text style={{ fontWeight: '800', color: COLORS.danger }}>Total Deduction</Text>
                <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.danger }}>₹{stats.monthPenalty || 0}</Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.sheetButton, { backgroundColor: COLORS.danger }]} onPress={() => setShowPenaltyModal(false)}>
              <Text style={styles.sheetButtonText}>Understood</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Global Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size={50} color={COLORS.primary} />
        </View>
      )}

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
  statCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 92 },
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
  breakItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderRadius: 16, backgroundColor: COLORS.bgMain, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  breakItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  breakIconCircle: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' },
  breakItemName: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  breakItemDur: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  modalCloseBtn: {
    position: 'absolute',
    top: 20, right: 20,
    zIndex: 10, padding: 4,
  },
  timelineCard: { backgroundColor: COLORS.white, borderRadius: 24, padding: 12, marginBottom: 20 },
  timelineItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderTopWidth: 1, borderTopColor: COLORS.borderLight, gap: 12, paddingHorizontal: 4 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginRight: 4 },
  timelineContent: { flex: 1 },
  timelineType: { fontSize: 13, fontWeight: '700', color: COLORS.textDark },
  timelineTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontWeight: '600' },
  emptyActivity: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  holidayCard: { backgroundColor: COLORS.white, borderRadius: 24, padding: 8, marginBottom: 20 },
  holidayItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 16 },
  holidayDateBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  holidayDate: { fontSize: 16, fontWeight: '800' },
  holidayMonth: { fontSize: 9, fontWeight: '800', marginTop: -2 },
  holidayInfo: { flex: 1 },
  holidayName: { fontSize: 14, fontWeight: '700', color: COLORS.textDark },
  holidayDay: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontWeight: '600' },
  quickActionsGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  quickAction: { flex: 1, backgroundColor: COLORS.white, borderRadius: 20, padding: 16, alignItems: 'center', gap: 10 },
  quickIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMain },
  
  // Shift Modal Styles
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    width: '100%',
    ...SHADOW.medium,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  sheetIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textDark },
  sheetSub: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  sheetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  sheetItem: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: COLORS.bgMain, borderRadius: 16 },
  sheetLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  sheetValue: { fontSize: 13, color: COLORS.textDark, fontWeight: '700' },
  sheetFooter: { marginBottom: 32 },
  footerLabel: { fontSize: 14, fontWeight: '800', color: COLORS.textDark, marginBottom: 12 },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayTag: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.primaryLight, borderRadius: 10 },
  dayTagText: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  quotaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.bgMain, padding: 12, borderRadius: 12 },
  quotaText: { fontSize: 14, color: COLORS.textDark, fontWeight: '600' },
  sheetButton: { backgroundColor: COLORS.primary, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  sheetButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  penaltyItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  penaltyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  penaltyDot: { width: 8, height: 8, borderRadius: 4 },
  penaltyDate: { fontSize: 14, fontWeight: '700', color: COLORS.textDark },
  penaltyType: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  penaltyAmount: { fontSize: 15, fontWeight: '800', color: COLORS.danger },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
});
