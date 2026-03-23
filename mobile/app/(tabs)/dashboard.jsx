import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Animated, RefreshControl, Image, Platform, LayoutAnimation, UIManager,
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
        <TouchableOpacity style={styles.pillBtn} onPress={onPunch} activeOpacity={0.85}>
          <LinearGradient colors={GRADIENTS.danger} style={styles.pillGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
            <Ionicons name="exit-outline" size={18} color={COLORS.white} style={{marginRight: 6}} />
            <Text style={styles.pillBtnText}>{punchData?.punchedIn ? 'Punch Out' : 'Punch In'}</Text>
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

export default function DashboardScreen() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [punchData, setPunchData] = useState({ punchedIn: false, startTime: null, breakDuration: '00:00:00' });

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

        setPunchData({
          punchedIn: attnJson.isPunchedIn,
          startTime: firstIn?.time,
          breakDuration: `${String(bh).padStart(2, '0')}:${String(bm).padStart(2, '0')}:${String(bs).padStart(2, '0')}`,
          shiftStart: statsJson.stats?.shiftStart,
          shiftEnd: statsJson.stats?.shiftEnd,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handlePunch = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const res = await apiFetch(ENDPOINTS.togglePunch, { method: 'POST' });
      const json = await res.json();
      if (json.success) loadData();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Network error' });
    }
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
            <Text style={styles.greeting}>Good Morning, {emp.name?.split(' ')[0] || 'Member'}</Text>
            <Text style={styles.subtext}>Let’s have a productive day</Text>
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
});
