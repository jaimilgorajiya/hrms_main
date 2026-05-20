import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Animated, RefreshControl, Image, Platform, LayoutAnimation, UIManager, Alert, TextInput, Modal,
  ActivityIndicator,
} from 'react-native';
import { Svg, Circle, G, Defs, LinearGradient as SvgGradient, Stop, Path, Line } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch, getImageUrl } from '../../utils/api';
import { ENDPOINTS } from '../../constants/api';
import { useAuth } from '../../context/AuthContext';
import { SIZES, RADIUS, SHADOW, COLORS, GRADIENTS } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import * as Location from 'expo-location';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { getDistance } from '../../utils/geofence';

// LayoutAnimation is enabled by default in the New Architecture


const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const StatCard = ({ icon, label, value, sub, color, bg, onPress, delay }) => {
  const { colors, gradients, isDarkMode } = useTheme();
  const styles = createStyles(colors, gradients, isDarkMode);
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, tension: 50, friction: 7, delay, useNativeDriver: true }).start();
  }, [delay]);
  return (
    <Animated.View style={{ opacity: anim, transform: [{ scale: anim }], width: '48%' }}>
      <TouchableOpacity 
        style={[styles.statCard, { backgroundColor: colors.bgCard, borderColor: colors.borderLight }, SHADOW.soft]} 
        onPress={onPress} 
        activeOpacity={0.85}
      >
        <View style={[styles.statIconBox, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={styles.statContent}>
          <Text style={[styles.statValue, { color: colors.textDark }]} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.7}>
            {value ?? '—'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
          {sub ? <Text style={[styles.statSub, { color: colors.textLight }]} numberOfLines={1}>{sub}</Text> : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Premium Animated Hovering Assistant Object / Companion Robot
// Premium Animated Levitating Companion Object: Faceted Kinetic Origami Phoenix / Soaring Falcon
// const AnimatedMascotRobot = () => {
//   const floatAnim = useRef(new Animated.Value(0)).current;

//   useEffect(() => {
//     // Continuous native levitation loop simulating gentle soaring currents
//     Animated.loop(
//       Animated.sequence([
//         Animated.timing(floatAnim, { toValue: 1, duration: 2800, useNativeDriver: true }),
//         Animated.timing(floatAnim, { toValue: 0, duration: 2800, useNativeDriver: true }),
//       ])
//     ).start();
//   }, []);

//   const translateY = floatAnim.interpolate({
//     inputRange: [0, 1],
//     outputRange: [0, -14], // smooth vertical hover path
//   });

//   return (
//     <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 12, paddingHorizontal: 4 }}>
//       {/* Left Column: Bold Target Application Branding */}
//       {/* <View style={{ flex: 1, paddingRight: 12 }}>
//         <Text style={{ fontSize: 28, fontWeight: '800', color: COLORS.white, letterSpacing: -0.5 }}>
//           HRMS Hub
//         </Text>
//         <Text style={{ fontSize: 21, fontWeight: '700', color: COLORS.textMuted, marginTop: 4, lineHeight: 28 }}>
//           Your Daily HR Companion.
//         </Text>
        
//         <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 18 }}>
//           <Text style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: '500' }}>
//             Crafted with <Text style={{ color: COLORS.danger }}>❤️</Text> in India.
//           </Text>
//         </View>
//       </View> */}

//       {/* Right Column: Faceted Origami Soaring Companion Bird Vector Art */}
//       <View style={{ alignItems: 'center', width: 130 }}>
//         <Animated.View style={{ transform: [{ translateY }] }}>
//           <Svg width="125" height="135" viewBox="0 0 120 135">
//             <Defs>
//               <SvgGradient id="wingLeftPrimary" x1="0" y1="0" x2="1" y2="1">
//                 <Stop offset="0" stopColor="#0EA5E9" />
//                 <Stop offset="1" stopColor="#6366F1" />
//               </SvgGradient>
//               <SvgGradient id="wingLeftSecondary" x1="0" y1="0" x2="0" y2="1">
//                 <Stop offset="0" stopColor="#38BDF8" />
//                 <Stop offset="1" stopColor="#312E81" />
//               </SvgGradient>
//               <SvgGradient id="wingRightPrimary" x1="1" y1="0" x2="0" y2="1">
//                 <Stop offset="0" stopColor="#F59E0B" />
//                 <Stop offset="1" stopColor="#EC4899" />
//               </SvgGradient>
//               <SvgGradient id="wingRightSecondary" x1="0" y1="0" x2="1" y2="1">
//                 <Stop offset="0" stopColor="#FBBF24" />
//                 <Stop offset="1" stopColor="#831843" />
//               </SvgGradient>
//               <SvgGradient id="torsoPrism" x1="0" y1="0" x2="1" y2="1">
//                 <Stop offset="0" stopColor="#4F46E5" />
//                 <Stop offset="1" stopColor="#0F172A" />
//               </SvgGradient>
//               <SvgGradient id="crestGlow" x1="0" y1="0" x2="1" y2="1">
//                 <Stop offset="0" stopColor="#10B981" />
//                 <Stop offset="1" stopColor="#34D399" />
//               </SvgGradient>
//             </Defs>

//             <Path d="M48,82 L58,115 L62,85 Z" fill="#1E1B4B" />
//             <Path d="M62,85 L66,112 L72,82 Z" fill="#312E81" />
//             <Path d="M55,100 L62,125 L68,100 Z" fill="#4338CA" opacity="0.6" />

//             <Path d="M58,55 L20,25 L45,62 Z" fill="url(#wingLeftPrimary)" />
//             <Path d="M45,62 L12,42 L42,72 Z" fill="url(#wingLeftSecondary)" />
//             <Path d="M42,72 L8,60 L48,82 Z" fill="#0284C7" />
//             <Path d="M58,55 L28,15 L52,48 Z" fill="#38BDF8" opacity="0.8" />

//             <Path d="M62,55 L100,25 L75,62 Z" fill="url(#wingRightPrimary)" />
//             <Path d="M75,62 L108,42 L78,72 Z" fill="url(#wingRightSecondary)" />
//             <Path d="M78,72 L112,60 L72,82 Z" fill="#D97706" />
//             <Path d="M62,55 L92,15 L68,48 Z" fill="#FDE047" opacity="0.8" />

//             <Path d="M58,40 L62,40 L72,82 L48,82 Z" fill="url(#torsoPrism)" />
//             <Path d="M58,40 L62,40 L65,82 L55,82 Z" fill="#6366F1" opacity="0.5" />

//             <Path d="M56,40 L60,18 L64,40 Z" fill="#E0E7FF" />
//             <Path d="M60,18 L68,28 L62,40 Z" fill="#93C5FD" />
//             <Path d="M60,18 L52,28 L58,40 Z" fill="#818CF8" />

//             <Circle cx="60" cy="30" r="3.5" fill="url(#crestGlow)" />
//             <Circle cx="60" cy="30" r="1" fill="#FFFFFF" />
//             <Path d="M60,25 L60,12" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
//             <Circle cx="60" cy="10" r="2" fill="#10B981" />

//             <Circle cx="60" cy="60" r="18" fill="none" stroke="#38BDF8" strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />
//             <Circle cx="60" cy="60" r="24" fill="none" stroke="#FBBF24" strokeWidth="1" strokeDasharray="6 4" opacity="0.25" />
//           </Svg>
//         </Animated.View>

//         {/* Dynamic footprint tracking shadow mapping levitation altitude */}
//         <Animated.View 
//           style={{ 
//             width: 55, 
//             height: 7, 
//             backgroundColor: '#000000', 
//             borderRadius: 3.5, 
//             marginTop: 4,
//             opacity: floatAnim.interpolate({
//               inputRange: [0, 1],
//               outputRange: [0.4, 0.1]
//             }),
//             transform: [{
//               scaleX: floatAnim.interpolate({
//                 inputRange: [0, 1],
//                 outputRange: [1, 0.6]
//               })
//             }]
//           }} 
//         />
//       </View>
//     </View>
//   );
// };

const PunchSystem = ({ punchData, onPunch, onBreak }) => {
  const { colors, gradients, isDarkMode, theme } = useTheme();
  const styles = createStyles(colors, gradients, isDarkMode);
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

  const [productiveTime, setProductiveTime] = useState('00:00:00');

  useEffect(() => {
    let interval;
    if (punchData?.punchedIn && punchData.startTime) {
      interval = setInterval(() => {
        const start = new Date(punchData.startTime).getTime();
        const now = new Date().getTime();
        
        // Calculate total break MS (completed breaks + current active break)
        let totalBreakMs = 0;
        (punchData.breaks || []).forEach(b => {
          if (b.start && b.end) totalBreakMs += new Date(b.end).getTime() - new Date(b.start).getTime();
          else if (b.start) totalBreakMs += now - new Date(b.start).getTime();
        });

        if (punchData.isOnBreak) {
          const lastBreak = (punchData.breaks || [])[punchData.breaks.length - 1];
          if (lastBreak?.start) {
            const bStart = new Date(lastBreak.start).getTime();
            setBreakElapsed(formatMs(now - bStart));
          }
        } else {
          const diff = Math.max(0, now - start);
          setElapsed(formatMs(diff));
          setRemaining(formatMs(Math.max(0, WORK_HOURS - diff)));
          const p = Math.min(1, diff / WORK_HOURS);
          setPercent(p);
          
          // Productive time = Total elapsed since start - Total break time
          setProductiveTime(formatMs(Math.max(0, diff - totalBreakMs)));
        }
      }, 1000);
    } else if (punchData?.startTime) {
      // Retain finalized completed state statistics when punched out
      const start = new Date(punchData.startTime).getTime();
      const lastPunch = punchData.punches?.[punchData.punches.length - 1];
      const end = (lastPunch && lastPunch.type === 'OUT') ? new Date(lastPunch.time).getTime() : start;
      const diff = Math.max(0, end - start);
      
      let totalBreakMs = 0;
      (punchData.breaks || []).forEach(b => {
        if (b.start && b.end) totalBreakMs += new Date(b.end).getTime() - new Date(b.start).getTime();
      });

      setElapsed(formatMs(diff));
      setRemaining(formatMs(Math.max(0, WORK_HOURS - diff)));
      const p = Math.min(1, diff / WORK_HOURS);
      setPercent(p);
      setProductiveTime(formatMs(Math.max(0, diff - totalBreakMs)));
    } else {
      setElapsed('00:00:00');
      setRemaining(formatMs(WORK_HOURS));
      setPercent(0);
      setProductiveTime('00:00:00');
    }
    return () => clearInterval(interval);
  }, [punchData, WORK_HOURS]);

  useEffect(() => {
    Animated.timing(ringAnim, { toValue: percent, duration: 1000, useNativeDriver: true }).start();
  }, [percent]);

  // Ambient Multi-Orbital Rotation Animations
  const rotAnimOuter = useRef(new Animated.Value(0)).current;
  const rotAnimInner = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotAnimOuter, {
        toValue: 1,
        duration: 24000,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(rotAnimInner, {
        toValue: 1,
        duration: 18000,
        useNativeDriver: true,
      })
    ).start();
  }, [rotAnimOuter, rotAnimInner]);

  const spinOuter = rotAnimOuter.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const spinInner = rotAnimInner.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  const toggleDetails = () => {
    // We use LayoutAnimation for the rest of the layout but Animated for the card's height
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    const nextState = !showDetails;
    setShowDetails(true);
    
    const targetHeight = punchData.isDoneForToday ? 190 : 110;
    
    Animated.spring(heightAnim, {
      toValue: nextState ? targetHeight : 0,
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
      {/* Premium Background Ambient Glow & Counter-Rotating Orbital Traces */}
      <View style={{ position: 'absolute', width: 260, height: 260, top: -30, justifyContent: 'center', alignItems: 'center', zIndex: -1 }}>
        {/* Static Diffused Aura Core */}
        <Svg width={260} height={260} style={{ position: 'absolute' }}>
          <Defs>
            <SvgGradient id="bgGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.15" />
              <Stop offset="100%" stopColor={colors.primaryDark} stopOpacity="0.01" />
            </SvgGradient>
          </Defs>
          <Circle cx={130} cy={130} r={125} fill="url(#bgGlow)" />
        </Svg>

        {/* Primary Orbital Technical Trace Ring (Clockwise Rotation) */}
        <Animated.View style={{ position: 'absolute', width: 260, height: 260, transform: [{ rotate: spinOuter }] }}>
          <Svg width={260} height={260}>
            <Defs>
              <SvgGradient id="bgRingOuter" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.4" />
                <Stop offset="100%" stopColor={colors.purple} stopOpacity="0.05" />
              </SvgGradient>
            </Defs>
            <Circle cx={130} cy={130} r={115} stroke="url(#bgRingOuter)" strokeWidth={1.5} strokeDasharray="6 5" fill="none" />
          </Svg>
        </Animated.View>

        {/* Secondary Subdued Calibration Trace Ring (Counter-Clockwise Rotation) */}
        <Animated.View style={{ position: 'absolute', width: 260, height: 260, transform: [{ rotate: spinInner }] }}>
          <Svg width={260} height={260}>
            <Defs>
              <SvgGradient id="bgRingInner" x1="100%" y1="100%" x2="0%" y2="0%">
                <Stop offset="0%" stopColor={colors.success} stopOpacity="0.3" />
                <Stop offset="100%" stopColor={colors.primary} stopOpacity="0.05" />
              </SvgGradient>
            </Defs>
            <Circle cx={130} cy={130} r={105} stroke="url(#bgRingInner)" strokeWidth={1} strokeDasharray="2 6" fill="none" />
          </Svg>
        </Animated.View>
      </View>

      <TouchableOpacity 
        style={[
          styles.ringWrapper, 
          { backgroundColor: isDarkMode ? colors.bgCard : colors.white }, 
          SHADOW.soft
        ]} 
        onPress={toggleDetails} 
        activeOpacity={0.9}
      >
        <Svg width={size} height={size}>
          <Defs>
            <SvgGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colors.primary} />
              <Stop offset="100%" stopColor={colors.primaryDark} />
            </SvgGradient>
          </Defs>
          <G rotation="-90" origin={`${center}, ${center}`}>
            <Circle cx={center} cy={center} r={radius} stroke={colors.borderLight} strokeWidth={stroke} fill="none" />
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
          <Text style={[styles.timerText, { color: colors.textDark }]}>{punchData.isOnBreak ? breakElapsed : elapsed}</Text>
          <Text style={[styles.statusBadgeText, { color: punchData.isOnBreak ? colors.warning : (punchData.punchedIn ? colors.success : colors.textMuted) }]}>
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
          backgroundColor: colors.bgCard,
          borderColor: colors.borderLight,
          height: heightAnim,
          opacity: heightAnim.interpolate({ inputRange: [0, 110, 190], outputRange: [0, 1, 1] }),
          overflow: 'hidden',
          marginTop: heightAnim.interpolate({ inputRange: [0, 110], outputRange: [0, 12] }),
        }
      ]}>
        <View style={{ paddingVertical: 14, paddingHorizontal: 16, gap: 10 }}>
          <View style={styles.detailRow}>
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="log-in-outline" size={16} color={colors.success} />
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Punch In Time</Text>
            </View>
            <Text style={[styles.detailValue, { color: colors.textDark }]}>
              {punchData.startTime ? new Date(punchData.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
            </Text>
          </View>

          {punchData.isDoneForToday && punchData.punches?.length > 0 && (
            <View style={styles.detailRow}>
              <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="log-out-outline" size={16} color={colors.danger} />
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Punch Out Time</Text>
              </View>
              <Text style={[styles.detailValue, { color: colors.textDark }]}>
                {new Date(punchData.punches[punchData.punches.length - 1].time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="flash-outline" size={16} color={colors.primary} />
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Productive Hours</Text>
            </View>
            <Text style={[styles.detailValue, { color: colors.primary, fontWeight: '800' }]}>{productiveTime}</Text>
          </View>

          <View style={styles.detailRow}>
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="cafe-outline" size={16} color={colors.warning} />
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Break Duration</Text>
            </View>
            <Text style={[styles.detailValue, { color: colors.textDark }]}>{punchData.breakDuration || '00:00:00'}</Text>
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
            colors={punchData?.isDoneForToday ? ['#94A3B8', '#64748B'] : (punchData?.punchedIn ? gradients.danger : gradients.success)} 
            style={styles.pillGrad} 
            start={{x:0,y:0}} 
            end={{x:1,y:0}}
          >
            <Ionicons 
              name={punchData?.isDoneForToday ? 'checkmark-circle' : (punchData?.punchedIn ? 'exit-outline' : 'log-in-outline')} 
              size={18} 
              color={colors.white} 
              style={{marginRight: 6}} 
            />
            <Text style={[styles.pillBtnText, { color: colors.white }]}>
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
          <LinearGradient colors={punchData?.isOnBreak ? gradients.danger : gradients.warning} style={styles.pillGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
            <Ionicons name={punchData?.isOnBreak ? 'stop-circle-outline' : 'cafe-outline'} size={18} color={colors.white} style={{marginRight: 6}} />
            <Text style={[styles.pillBtnText, { color: colors.white }]}>{punchData?.isOnBreak ? 'End Break' : 'Take Break'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.historyFullBtn} onPress={() => router.push('/(tabs)/attendance')} activeOpacity={0.85}>
        <LinearGradient colors={gradients.purple} style={styles.pillGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
          <Ionicons name="time-outline" size={18} color={colors.white} style={{marginRight: 6}} />
          <Text style={[styles.pillBtnText, { color: colors.white }]}>View History</Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={[styles.productivityCard, SHADOW.soft, { backgroundColor: colors.bgCard, borderColor: colors.borderLight, marginTop: 20 }]}>
        <View style={[styles.prodIcon, { backgroundColor: colors.primaryLight }]}><Ionicons name="sparkles" size={16} color={colors.primary} /></View>
        <Text style={[styles.prodText, { color: colors.textMain }]}>
          {punchData.punchedIn 
            ? `You are currently clocked in. Have a productive day!` 
            : "Remember to log your attendance when you arrive."}
        </Text>
      </View>
    </View>
  );
};

export default function Dashboard() {
  const { colors, gradients, theme, isDarkMode } = useTheme();
  const styles = createStyles(colors, gradients, isDarkMode);
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
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifModal, setShowNotifModal] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await apiFetch(ENDPOINTS.notifications);
      const json = await res.json();
      if (json.success) {
        setNotifications(json.notifications);
        setUnreadCount(json.unreadCount);
      }
    } catch (e) {
      console.error('Fetch Notifications Error:', e);
    }
  };

  const markAllRead = async () => {
    try {
      const res = await apiFetch(ENDPOINTS.readAllNotifications, { method: 'PUT' });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (e) { console.error(e); }
  };

  const [missingPunches, setMissingPunches] = useState(0);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [statsRes, attnRes, notifRes, histRes] = await Promise.all([
        apiFetch(ENDPOINTS.employeeStats),
        apiFetch(ENDPOINTS.attendanceToday),
        apiFetch(ENDPOINTS.notifications),
        apiFetch(`${ENDPOINTS.attendanceHistory}?month=${new Date().toISOString().slice(0, 7)}`)
      ]);

      const statsJson = await statsRes.json();
      const attnJson = await attnRes.json();
      const notifJson = await notifRes.json();
      const histJson = await histRes.json();

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
      }

      if (notifJson.success) {
        setNotifications(notifJson.notifications);
        setUnreadCount(notifJson.unreadCount);
      }

      if (histJson && histJson.success) {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const start = startOfMonth(new Date());
        const end = endOfMonth(new Date());
        const days = eachDayOfInterval({ start, end });
        
        const recordsMap = {};
        histJson.records.forEach(r => recordsMap[r.date] = r);
        
        const requestsMap = histJson.requests || {};
        const woDays = histJson.weekOffDays || [];
        const jDate = histJson.joiningDate;
        
        let mCount = 0;
        days.forEach(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          if (dateStr >= todayStr) return; 
          if (jDate && dateStr < jDate) return; 
          
          const dayName = format(day, 'EEEE');
          if (woDays.includes(dayName)) return; 
          
          const r = recordsMap[dateStr];
          const req = requestsMap[dateStr];
          if (req && (req.status === 'Pending' || req.status === 'Approved')) return; 
          
          if (r && r.punchIn && !r.punchOut) {
            mCount++;
          }
        });
        setMissingPunches(mCount);
      }
    } catch (e) {
      console.error('Dashboard loadData error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

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
        let skipCheck = false;
        if (data?.stats?.isWeekOff && !data?.stats?.lateEarlyApplyOnExtraDay) {
          skipCheck = true;
        }

        if (!skipCheck) {
          const [h, m] = data.stats.shiftStart.split(':').map(Number);
          const lateLimit = new Date();
          lateLimit.setHours(h, m + (data.stats.effectiveMaxLate || 0), 0, 0);
          
          if (now > lateLimit) {
            setShowLateReasonModal(true);
            setLoading(false);
            return;
          }
        }
      }

      // 0.1 Check Early Punch Out
      if (!isPunchingIn && data?.stats?.shiftEnd && data?.stats?.requireEarlyOutReason && !effectiveEarlyReason) {
        let skipCheck = false;
        if (data?.stats?.isWeekOff && !data?.stats?.lateEarlyApplyOnExtraDay) {
          skipCheck = true;
        }

        if (!skipCheck) {
          const [h, m] = data.stats.shiftEnd.split(':').map(Number);
          
          let earlyGrace = data.stats.effectiveMaxEarly || 0;
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
              // Combined logic: remaining grace
              earlyGrace = Math.max(0, (data.stats.effectiveMaxLate || 0) - lateMins);
            } else {
              earlyGrace = data.stats.effectiveMaxLate || 0;
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
      if (loc.mocked) {
        Toast.show({ type: 'error', text1: 'Fake Location Detected', text2: 'Please disable mock locations.' });
        setLoading(false);
        return;
      }
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
        locationAddress: addr,
        isMocked: loc.mocked || loc.coords?.mocked || false,
        clientTime: new Date().toISOString()
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
        locationAddress: reasons.locationAddress,
        isMocked: reasons.isMocked || false,
        clientTime: reasons.clientTime || new Date().toISOString()
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
      await loadData();
    } else {
      Toast.show({ type: 'error', text1: 'Oops', text2: json.message });
      setLoading(false);
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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bgMain }]} edges={['top']}>
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.bgMain }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={colors.primary} />}
      >
        <LinearGradient
          colors={theme === 'dark' ? ['#3c328f', '#1d1a3b'] : [colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, SHADOW.medium]}
        >
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { color: colors.white }]}>{getGreeting()}, {emp.name?.split(' ')[0] || 'Member'}</Text>
            <Text style={[styles.subtext, { color: colors.white + 'CC' }]}>
              {new Date().getHours() < 17 ? 'Let’s have a productive day' : 'Hope you had a productive day'}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={[styles.notifBtn, { borderColor: colors.white + '20' }]} onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={22} color={colors.white} />
              {unreadCount > 0 && <View style={[styles.notifDot, { backgroundColor: colors.danger, borderColor: theme === 'dark' ? '#3c328f' : colors.primary }]} />}
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
        </LinearGradient>

        <View style={styles.body}>
          <PunchSystem punchData={punchData} onPunch={handlePunch} onBreak={handleBreak} />
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Monthly Overview</Text>
          <View style={{ position: 'relative' }}>
            {/* Elegant Premium Nocturnal Background Vector Trace Element Behind the Grid */}
            <View style={{ position: 'absolute', top: -15, left: -10, right: -10, bottom: -15, zIndex: -1, pointerEvents: 'none', overflow: 'hidden', borderRadius: 28 }}>
              <Svg width="100%" height="100%" viewBox="0 0 400 400" preserveAspectRatio="none">
                <Defs>
                  <SvgGradient id="gridTraceGrad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={colors.primary} stopOpacity="0.12" />
                    <Stop offset="0.5" stopColor={colors.purple} stopOpacity="0.04" />
                    <Stop offset="1" stopColor={colors.primary} stopOpacity="0.0" />
                  </SvgGradient>
                  <SvgGradient id="gridGlowGrad" x1="1" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={colors.purple} stopOpacity="0.15" />
                    <Stop offset="1" stopColor={colors.primary} stopOpacity="0.0" />
                  </SvgGradient>
                </Defs>
                
                {/* Intersecting vector trace pathways providing executive dashboard depth */}
                <Path d="M-50,60 Q120,-30 280,90 T520,120" fill="none" stroke="url(#gridTraceGrad)" strokeWidth="2.5" />
                <Path d="M-30,180 Q190,260 360,130 T580,220" fill="none" stroke="url(#gridGlowGrad)" strokeWidth="1.5" />
                <Path d="M40,340 C160,210 270,420 480,260" fill="none" stroke="url(#gridTraceGrad)" strokeWidth="1.5" strokeDasharray="6 4" />
                
                {/* Technical nexus orbital fields */}
                <Circle cx="110" cy="60" r="45" fill="none" stroke={colors.primary} strokeWidth="1" strokeOpacity="0.08" />
                <Circle cx="320" cy="190" r="65" fill="none" stroke={colors.purple} strokeWidth="1" strokeOpacity="0.06" />
                <Circle cx="160" cy="300" r="85" fill="none" stroke={colors.primary} strokeWidth="1" strokeOpacity="0.04" />
                
                {/* Subtle digital junction nodes */}
                <Circle cx="280" cy="90" r="2.5" fill={colors.primary} fillOpacity="0.3" />
                <Circle cx="360" cy="130" r="2" fill={colors.purple} fillOpacity="0.35" />
                <Circle cx="160" cy="300" r="2.5" fill={colors.primary} fillOpacity="0.2" />
              </Svg>
            </View>

            <View style={styles.statsGrid}>
              <StatCard icon="calendar-outline" label="Attendance" value={`${stats.presentDays}d`} sub="Days Present" color={colors.success} bg={colors.successLight} onPress={() => router.push('/(tabs)/attendance')} delay={50} />
              <StatCard icon="alert-circle-outline" label="Punch Fix" value={missingPunches} sub="Missing Out" color={colors.warning} bg={colors.warningLight} onPress={() => router.push('/punch-missing')} delay={100} />
              <StatCard icon="receipt-outline" label="Total Penalty" value={`₹${stats.monthPenalty || 0}`} sub="This Month" color={colors.danger} bg={colors.dangerLight} delay={150} onPress={() => router.push('/penalties')} />
              <StatCard icon="warning-outline" label="Today's Penalty" value={`₹${punchData.lateInPenalty || 0}`} sub="Late In" color={colors.warning} bg={colors.warningLight} delay={200} />
              <StatCard icon="moon-outline" label="Today's Shift" value={stats.shiftName || '—'} sub={stats.shiftStart || 'Time'} color={colors.purple} bg={colors.purpleLight} delay={250} onPress={() => setShowShiftModal(true)} />
              {stats.hasLeaveGroup && (
                <StatCard icon="leaf-outline" label="Annual Leaves" value={stats.totalLeaves} sub="Quota" color={colors.success} bg={colors.successLight} onPress={() => router.push('/(tabs)/leaves')} delay={300} />
              )}
              <StatCard icon="exit-outline" label="Resignation" value="Process" sub="Apply/Track" color={colors.danger} bg={colors.dangerLight} onPress={() => router.push('/resignation')} delay={350} />
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Today's Activity</Text>
          <View style={[styles.timelineCard, { backgroundColor: colors.bgCard, borderColor: colors.borderLight }, SHADOW.soft]}>
            {(punchData.punches || []).length === 0 ? (
              <View style={styles.emptyActivity}>
                <Ionicons name="calendar-clear-outline" size={32} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No activity logged for today yet.</Text>
              </View>
            ) : (
                [...punchData.punches].reverse().map((p, i) => (
                    <View key={i} style={[styles.timelineItem, { borderTopColor: colors.borderLight }, i === 0 && { borderTopWidth: 0 }]}>
                        <View style={[styles.timelineDot, { backgroundColor: p.type === 'IN' ? colors.success : colors.danger }]} />
                        <View style={styles.timelineContent}>
                            <Text style={[styles.timelineType, { color: colors.textDark }]}>{p.type === 'IN' ? 'Punched In' : 'Punched Out'}</Text>
                            <Text style={[styles.timelineTime, { color: colors.textMuted }]}>{new Date(p.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
                        </View>
                        <Ionicons name={p.type === 'IN' ? 'enter-outline' : 'exit-outline'} size={18} color={p.type === 'IN' ? colors.success : colors.danger} />
                    </View>
                ))
            )}
          </View>

          {/* Persistent Ambient Command Companion Robot Filling Empty Canvas Space */}
          {/* <AnimatedMascotRobot /> */}
        </View>
      </ScrollView>

      {/* Today's Work Summary Modal (Punch OUT) */}
      {/* Today's Work Summary Modal (Punch OUT) */}
      {/* Work Summary Modal */}
      <Modal visible={showWorkSummaryModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgCardElevated, borderColor: colors.borderLight }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.alertCircle, { backgroundColor: colors.successLight }]}>
                <Ionicons name="document-text" size={32} color={colors.success} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.textDark }]}>Work Summary</Text>
              <Text style={[styles.modalSub, { color: colors.textMuted }]}>Briefly list your achievements for today before you sign off.</Text>
              
              <View style={styles.modalTimeRow}>
                <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.modalTimeText, { color: colors.textMuted }]}>{modalTime}</Text>
              </View>
            </View>
            
            <TextInput
              style={[styles.reasonInput, { backgroundColor: colors.bgMain, borderColor: colors.borderLight, color: colors.textDark }]}
              placeholder="e.g., Task A completed, Meeting with Client B..."
              placeholderTextColor={colors.textMuted}
              value={workSummary}
              onChangeText={setWorkSummary}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowWorkSummaryModal(false)}>
                <Text style={[styles.cancelBtnText, { color: colors.textLight }]}>Later</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={() => {
                setShowWorkSummaryModal(false);
                handlePunch({ workSummary });
              }}>
                <LinearGradient colors={GRADIENTS.success} style={styles.submitBtnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                  <Text style={[styles.submitBtnText, { color: colors.white }]}>Submit & Continue</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Late Punch In Modal */}
      <Modal visible={showLateReasonModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgCardElevated, borderColor: colors.borderLight }]}>
            <TouchableOpacity 
              style={styles.modalCloseBtn} 
              onPress={() => { setShowLateReasonModal(false); setLateReason(''); }}
            >
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.modalHeader}>
              <View style={[styles.alertCircle, { backgroundColor: colors.dangerLight }]}>
                <Ionicons name="time" size={32} color={colors.danger} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.textDark }]}>Late Arrival</Text>
              <Text style={[styles.modalSub, { color: colors.textMuted }]}>You are clocking in past your shift start time. Please provide a reason.</Text>
              
              <View style={styles.modalTimeRow}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.modalTimeText, { color: colors.textMuted }]}>Attempted at: {modalTime}</Text>
              </View>
            </View>
            
            <TextInput
              style={[styles.reasonInput, { backgroundColor: colors.bgMain, borderColor: colors.borderLight, color: colors.textDark }]}
              placeholder="e.g., Heavy traffic, Personal issue, Client meeting..."
              placeholderTextColor={colors.textMuted}
              value={lateReason}
              onChangeText={setLateReason}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowLateReasonModal(false); setLateReason(''); }}>
                <Text style={[styles.cancelBtnText, { color: colors.textLight }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={() => {
                setShowLateReasonModal(false);
                handlePunch({ lateReason });
              }}>
                <LinearGradient colors={GRADIENTS.danger} style={styles.submitBtnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                  <Text style={[styles.submitBtnText, { color: colors.white }]}>Confirm Late In</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Early Punch Out Modal */}
      <Modal visible={showEarlyReasonModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgCardElevated, borderColor: colors.borderLight }]}>
            <TouchableOpacity 
              style={styles.modalCloseBtn} 
              onPress={() => { setShowEarlyReasonModal(false); setEarlyReason(''); }}
            >
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.modalHeader}>
              <View style={[styles.alertCircle, { backgroundColor: colors.warningLight }]}>
                <Ionicons name="time" size={32} color={colors.warning} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.textDark }]}>Early Departure</Text>
              <Text style={[styles.modalSub, { color: colors.textMuted }]}>Your shift hasn't ended. Please specify a reason for leaving early.</Text>
              
              <View style={styles.modalTimeRow}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.modalTimeText, { color: colors.textMuted }]}>Attempted at: {modalTime}</Text>
              </View>
            </View>
            
            <TextInput
              style={[styles.reasonInput, { backgroundColor: colors.bgMain, borderColor: colors.borderLight, color: colors.textDark }]}
              placeholder="e.g., Finished work, Personal emergency..."
              placeholderTextColor={colors.textMuted}
              value={earlyReason}
              onChangeText={setEarlyReason}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowEarlyReasonModal(false); setEarlyReason(''); }}>
                <Text style={[styles.cancelBtnText, { color: colors.textLight }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={() => {
                setShowEarlyReasonModal(false);
                handlePunch({ earlyReason });
              }}>
                <LinearGradient colors={GRADIENTS.warning} style={styles.submitBtnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                  <Text style={[styles.submitBtnText, { color: colors.white }]}>Confirm Early Out</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Geofence Alert Modal (Out of Range) */}
      <Modal visible={showGeofenceModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgCardElevated, borderColor: colors.borderLight }]}>
            <TouchableOpacity 
              style={styles.modalCloseBtn} 
              onPress={() => setShowGeofenceModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.modalHeader}>
              <View style={[styles.alertCircle, { backgroundColor: colors.dangerLight }]}>
                <Ionicons name="location" size={32} color={colors.danger} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.textDark }]}>Geofence Alert</Text>
              <Text style={[styles.modalSub, { color: colors.textMuted }]}>You are currently outside your assigned workplace reach. Justify this log.</Text>
              
              <View style={[styles.modalTimeRow, { marginBottom: 6 }]}>
                <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                <Text style={[styles.modalTimeText, { color: colors.textMuted }]}>{modalTime}</Text>
              </View>
              
              <View style={[styles.currentLocBadge, { backgroundColor: colors.dangerLight, marginTop: 10 }]}>
                <Ionicons name="resize-outline" size={14} color={colors.danger} />
                <Text style={[styles.currentLocText, { color: colors.danger }]}>
                   Detected Distance: {Math.round(getDistance(tempLocation?.latitude || 0, tempLocation?.longitude || 0, data?.stats?.branchCoords?.latitude || 0, data?.stats?.branchCoords?.longitude || 0))}m 
                   (Limit: {data?.stats?.branchCoords?.radius || 200}m)
                </Text>
              </View>
              
              {currentAddress ? (
                <View style={[styles.currentLocBadge, { backgroundColor: colors.bgMain, borderColor: colors.borderLight }]}>
                  <Ionicons name="pin" size={14} color={colors.danger} />
                  <Text style={[styles.currentLocText, { color: colors.textMuted }]}>{currentAddress}</Text>
                </View>
              ) : null}
            </View>
            
            <TextInput
              style={[styles.reasonInput, { backgroundColor: colors.bgMain, borderColor: colors.borderLight, color: colors.textDark }]}
              placeholder="e.g., Working from onsite, Field work..."
              placeholderTextColor={colors.textMuted}
              value={geofenceReason}
              onChangeText={setGeofenceReason}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowGeofenceModal(false)}>
                <Text style={[styles.cancelBtnText, { color: colors.textLight }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={submitWithReason}>
                <LinearGradient colors={GRADIENTS.primary} style={styles.submitBtnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                  <Text style={[styles.submitBtnText, { color: colors.white }]}>Submit Signature</Text>
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
          <View style={[styles.modalContent, { backgroundColor: colors.bgCardElevated, borderColor: colors.borderLight, paddingBottom: 24 }]}>
          <View style={styles.modalHeader}>
            <View style={[styles.alertCircle, { backgroundColor: colors.successLight, marginBottom: 12 }]}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.textDark, fontSize: 22 }]}>
              {Math.round(getDistance(tempLocation?.latitude || 0, tempLocation?.longitude || 0, data?.stats?.branchCoords?.latitude || 0, data?.stats?.branchCoords?.longitude || 0)) <= (data?.stats?.branchCoords?.radius || 500) 
                ? 'You are in range' 
                : 'Remote Punch Available'}
            </Text>
          
            
            {currentAddress ? (
              <View style={[styles.currentLocBadge, { backgroundColor: colors.successLight, marginTop: 15 }]}>
                <Ionicons name="pin" size={14} color={colors.success} />
                <Text style={[styles.currentLocText, { color: colors.success }]}>{currentAddress}</Text>
              </View>
            ) : null}

            <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 10, fontWeight: '600' }}>Distance: {Math.round(getDistance(tempLocation?.latitude || 0, tempLocation?.longitude || 0, data?.stats?.branchCoords?.latitude || 0, data?.stats?.branchCoords?.longitude || 0))}m</Text>
          </View>
          
          <View style={[styles.modalActions, { marginTop: 24 }]}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowInRangeModal(false)}>
              <Text style={[styles.cancelBtnText, { color: colors.textLight }]}>Cancel</Text>
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
                <Text style={[styles.submitBtnText, { color: colors.white }]}>
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
          <View style={[styles.modalContent, { backgroundColor: colors.bgCardElevated, borderColor: colors.borderLight, maxHeight: '70%', paddingBottom: 20 }]}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowBreakModal(false)}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.modalHeader}>
              <View style={[styles.alertCircle, { backgroundColor: colors.warningLight }]}>
                <Ionicons name="cafe" size={32} color={colors.warning} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.textDark }]}>Choose Break Type</Text>
              <Text style={[styles.modalSub, { color: colors.textMuted }]}>Select the type of break you are taking.</Text>
            </View>

            <ScrollView style={{ marginBottom: 20 }}>
              {(filteredBreaks || []).map((b, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={[styles.breakItem, { backgroundColor: colors.bgMain, borderColor: colors.borderLight }]} 
                  onPress={() => handleBreak(b.name)}
                >
                  <View style={styles.breakItemLeft}>
                    <View style={[styles.breakIconCircle, { backgroundColor: colors.bgCard }]}>
                      <Ionicons name={b.name?.toLowerCase().includes('lunch') ? 'fast-food-outline' : 'cafe-outline'} size={20} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={[styles.breakItemName, { color: colors.textDark }]}>{b.name}</Text>
                      {b.name?.toLowerCase().includes('lunch') && stats.lunchStart ? (
                        <Text style={[styles.breakItemDur, { color: colors.textMuted }]}>Window: {stats.lunchStart} - {stats.lunchEnd}</Text>
                      ) : b.name?.toLowerCase().includes('tea') && stats.teaStart ? (
                        <Text style={[styles.breakItemDur, { color: colors.textMuted }]}>Window: {stats.teaStart} - {stats.teaEnd}</Text>
                      ) : (
                        <Text style={[styles.breakItemDur, { color: colors.textMuted }]}>{b.minutes === 'As Per Shift' ? 'As per company policy' : `${b.minutes} mins allowed`}</Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.border} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowBreakModal(false)}>
              <Text style={[styles.cancelBtnText, { color: colors.textLight }]}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Shift Details Modal */}
      <Modal visible={showShiftModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={{ flex: 1, width: '100%' }} activeOpacity={1} onPress={() => setShowShiftModal(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.bgCardElevated }]}>
            {/* Top Drag Indicator */}
            <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />

            {/* Premium Header */}
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetIcon, { backgroundColor: colors.warning + '12', borderRadius: 20 }]}>
                <Ionicons name="time" size={22} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetTitle, { color: colors.textDark, fontSize: 22, letterSpacing: -0.3 }]}>{stats?.shiftName || 'Shift Schedule'}</Text>
                <Text style={[styles.sheetSub, { color: colors.textMuted }]}>Allocated timings and weekly rules</Text>
              </View>
              <TouchableOpacity style={{ padding: 4 }} onPress={() => setShowShiftModal(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            
            {/* Full-Width Shift Timings Stack */}
            <View style={{ gap: 12, marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: colors.bgMain, borderRadius: 20, borderWidth: 1, borderColor: colors.borderLight + '80' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.bgCardElevated, justifyContent: 'center', alignItems: 'center', ...SHADOW.soft }}>
                    <Ionicons name="enter-outline" size={20} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, color: colors.textLight, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 }}>Shift Start</Text>
                    <Text style={{ fontSize: 16, color: colors.textDark, fontWeight: '900', marginTop: 2 }}>{stats?.shiftStart || '—'}</Text>
                  </View>
                </View>
                <View style={{ backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: colors.primary }}>INBOUND</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: colors.bgMain, borderRadius: 20, borderWidth: 1, borderColor: colors.borderLight + '80' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.bgCardElevated, justifyContent: 'center', alignItems: 'center', ...SHADOW.soft }}>
                    <Ionicons name="exit-outline" size={20} color={colors.danger} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, color: colors.textLight, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 }}>Shift End</Text>
                    <Text style={{ fontSize: 16, color: colors.textDark, fontWeight: '900', marginTop: 2 }}>{stats?.shiftEnd || '—'}</Text>
                  </View>
                </View>
                <View style={{ backgroundColor: colors.dangerLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: colors.danger }}>OUTBOUND</Text>
                </View>
              </View>
              
              {stats?.lunchStart && stats?.lunchEnd && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: colors.bgMain, borderRadius: 20, borderWidth: 1, borderColor: colors.borderLight + '80' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.bgCardElevated, justifyContent: 'center', alignItems: 'center', ...SHADOW.soft }}>
                      <Ionicons name="restaurant-outline" size={20} color={colors.warning} />
                    </View>
                    <View>
                      <Text style={{ fontSize: 11, color: colors.textLight, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 }}>Lunch Break</Text>
                      <Text style={{ fontSize: 15, color: colors.textDark, fontWeight: '800', marginTop: 2 }}>{stats.lunchStart} - {stats.lunchEnd}</Text>
                    </View>
                  </View>
                  <View style={{ backgroundColor: colors.warningLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.warning }}>LUNCH</Text>
                  </View>
                </View>
              )}
              
              {stats?.teaStart && stats?.teaEnd && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: colors.bgMain, borderRadius: 20, borderWidth: 1, borderColor: colors.borderLight + '80' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.bgCardElevated, justifyContent: 'center', alignItems: 'center', ...SHADOW.soft }}>
                      <Ionicons name="cafe-outline" size={20} color={colors.purple} />
                    </View>
                    <View>
                      <Text style={{ fontSize: 11, color: colors.textLight, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 }}>Tea Break</Text>
                      <Text style={{ fontSize: 15, color: colors.textDark, fontWeight: '800', marginTop: 2 }}>{stats.teaStart} - {stats.teaEnd}</Text>
                    </View>
                  </View>
                  <View style={{ backgroundColor: colors.purpleLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.purple }}>REST</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Premium Policy Block */}
            <View style={{ backgroundColor: colors.bgMain, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.borderLight + '80' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textLight, textTransform: 'uppercase', letterSpacing: 0.6 }}>Weekly Off Policy</Text>
                <View style={{ backgroundColor: colors.bgCardElevated, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: colors.borderLight }}>
                  <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700' }}>{stats?.weekOffType || 'Standard'}</Text>
                </View>
              </View>
              
              <View style={styles.tagGrid}>
                {stats?.weekOffType === 'Selected Weekdays' ? (
                  (stats?.weekOffDays || []).length > 0 ? stats.weekOffDays.map((d, i) => (
                    <View key={i} style={{ backgroundColor: colors.bgCardElevated, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, ...SHADOW.soft }}>
                      <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '800' }}>{d}</Text>
                    </View>
                  )) : (
                    <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '600' }}>No Fixed Rest Days Configured</Text>
                  )
                ) : (
                  <View style={{ gap: 8, width: '100%' }}>
                    {stats?.weekOffsPerWeek > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="calendar-clear" size={14} color={colors.primary} />
                        <Text style={{ fontSize: 13, color: colors.textDark, fontWeight: '600' }}>
                          Allowance: <Text style={{ fontWeight: '800', color: colors.primary }}>{stats.weekOffsPerWeek}</Text> days / week
                        </Text>
                      </View>
                    )}
                    {stats?.weekOffsPerMonth > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <Ionicons name="apps" size={14} color={colors.purple} />
                        <Text style={{ fontSize: 13, color: colors.textDark, fontWeight: '600' }}>
                          Monthly Cap: <Text style={{ fontWeight: '800', color: colors.purple }}>{stats.weekOffsPerMonth}</Text> days / month
                        </Text>
                      </View>
                    )}
                    {!stats?.weekOffsPerWeek && !stats?.weekOffsPerMonth && (
                      <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '600' }}>Flexible dynamic rest schedules apply</Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Penalty Details Modal */}

      
      {/* Global Loading Overlay */}
      {loading && (
        <View style={[styles.loadingOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
          <ActivityIndicator size={50} color={colors.primary} />
        </View>
      )}

    </SafeAreaView>
  );
}

function createStyles(colors, gradients, isDarkMode) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgMain },
  scroll: { flex: 1, backgroundColor: colors.bgMain },
  header: {
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 20, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 24,
    zIndex: 10,
    borderWidth: 1, borderColor: isDarkMode ? 'rgba(195, 192, 255, 0.15)' : 'rgba(79, 70, 229, 0.15)',
  },
  greeting: { fontSize: SIZES.lg, fontWeight: '800', color: colors.white },
  subtext: { fontSize: SIZES.sm, color: colors.white + 'CC', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  notifBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)' },
  notifDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger, borderWidth: 1.5, borderColor: isDarkMode ? '#3c328f' : colors.primary },
  avatarBorder: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.primaryLight, padding: 2, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%', borderRadius: 24 },
  avatarPlaceholder: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', justifyContent: 'center', alignItems: 'center', borderRadius: 24 },
  avatarText: { fontSize: 18, fontWeight: '800', color: colors.white },
  body: { padding: 20, paddingBottom: 20 },
  heroSection: { alignItems: 'center', marginVertical: 20 },
  ringWrapper: { 
    width: 200, height: 200, 
    justifyContent: 'center', alignItems: 'center', 
    backgroundColor: colors.bgCard, 
    borderRadius: 100, 
    borderWidth: 1, 
    borderColor: isDarkMode ? 'rgba(195, 192, 255, 0.2)' : 'rgba(79, 70, 229, 0.15)' 
  },
  timerOverlay: { position: 'absolute', alignItems: 'center' },
  timerText: { fontSize: SIZES.xxxl, fontWeight: '800', color: colors.textDark, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  statusBadgeText: { fontSize: SIZES.sm, fontWeight: '700', marginTop: 4 },
  detailsCard: { backgroundColor: colors.bgCard, width: '90%', borderRadius: 20, borderWidth: 1, borderColor: colors.borderLight },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 14, color: colors.textLight, fontWeight: '600' },
  detailValue: { fontSize: 14, color: colors.textDark, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  actionBtnRow: { flexDirection: 'row', gap: 12, marginTop: 32 },
  pillBtn: { flex: 1, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOW.soft },
  historyFullBtn: { width: '100%', marginTop: 12, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOW.soft },
  pillGrad: { paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  pillBtnText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  submitBtnText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  currentLocBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.dangerLight, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, marginTop: 10,
    width: '100%',
  },
  currentLocText: {
    fontSize: 12, fontWeight: '600', color: colors.danger,
    flex: 1,
  },
  modalTimeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 4,
  },
  modalTimeText: {
    fontSize: 11, color: colors.textMuted,
    fontWeight: '600',
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.textDark, marginBottom: 16, marginTop: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  statCard: { backgroundColor: colors.bgCard, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 92, borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden' },
  statIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  statContent: { flex: 1 },
  statValue: { fontSize: 16, fontWeight: '800', color: colors.textDark },
  statLabel: { fontSize: 11, fontWeight: '600', color: colors.textLight, marginTop: 2 },
  statSub: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
  productivityCard: { backgroundColor: colors.bgCard, borderRadius: 20, padding: 20, marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.borderLight },
  prodIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  prodText: { flex: 1, fontSize: 13, color: colors.textDark, fontWeight: '600', lineHeight: 20 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.bgCardElevated, borderRadius: 24, padding: 24, paddingBottom: 30, borderWidth: 1, borderColor: colors.borderLight },
  modalHeader: { alignItems: 'center', marginBottom: 20 },
  alertCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.textDark, marginBottom: 8 },
  modalSub: { fontSize: 13, color: colors.textLight, textAlign: 'center', lineHeight: 20 },
  reasonInput: { 
    backgroundColor: colors.bgMain, borderRadius: 16, padding: 16, 
    height: 120, textAlignVertical: 'top', fontSize: 14, color: colors.textDark,
    borderWidth: 1, borderColor: colors.borderLight, marginBottom: 24
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, height: 52, justifyContent: 'center', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: colors.textLight },
  submitBtn: { flex: 2, height: 52, borderRadius: 14, overflow: 'hidden' },
  submitBtnGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
  breakItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderRadius: 16, backgroundColor: colors.bgMain, marginBottom: 12,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  breakItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  breakIconCircle: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.bgCard, justifyContent: 'center', alignItems: 'center' },
  breakItemName: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  breakItemDur: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  modalCloseBtn: {
    position: 'absolute',
    top: 20, right: 20,
    zIndex: 10, padding: 4,
  },
  timelineCard: { backgroundColor: colors.bgCard, borderRadius: 24, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: colors.borderLight },
  timelineItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.borderLight, gap: 12, paddingHorizontal: 4 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginRight: 4 },
  timelineContent: { flex: 1 },
  timelineType: { fontSize: 13, fontWeight: '700', color: colors.textDark },
  timelineTime: { fontSize: 11, color: colors.textMuted, marginTop: 2, fontWeight: '600' },
  emptyActivity: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  holidayCard: { backgroundColor: colors.bgCard, borderRadius: 24, padding: 8, marginBottom: 20, borderWidth: 1, borderColor: colors.borderLight },
  holidayItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 16 },
  holidayDateBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  holidayDate: { fontSize: 16, fontWeight: '800' },
  holidayMonth: { fontSize: 9, fontWeight: '800', marginTop: -2 },
  holidayInfo: { flex: 1 },
  holidayName: { fontSize: 14, fontWeight: '700', color: colors.textDark },
  holidayDay: { fontSize: 11, color: colors.textMuted, marginTop: 2, fontWeight: '600' },                                                              
  quickActionsGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  quickAction: { flex: 1, backgroundColor: colors.bgCard, borderRadius: 20, padding: 16, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.borderLight },
  quickIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { fontSize: 11, fontWeight: '700', color: colors.textMain },
  
  // Shift Modal Styles
  modalSheet: {   
    backgroundColor: colors.bgCardElevated,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    width: '100%',
    borderWidth: 1, borderColor: colors.borderLight,
    ...SHADOW.medium,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  sheetIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: colors.textDark },
  sheetSub: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  sheetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  sheetItem: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.bgMain, borderRadius: 16 },
  sheetLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  sheetValue: { fontSize: 13, color: colors.textDark, fontWeight: '700' },
  sheetFooter: { marginBottom: 32 },
  footerLabel: { fontSize: 14, fontWeight: '800', color: colors.textDark, marginBottom: 12 },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayTag: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.primaryLight, borderRadius: 10 },
  dayTagText: { fontSize: 12, color: colors.primary, fontWeight: '700' },
  quotaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bgMain, padding: 12, borderRadius: 12 },
  quotaText: { fontSize: 14, color: colors.textDark, fontWeight: '600' },
  sheetButton: { backgroundColor: colors.primary, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  sheetButtonText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  penaltyItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  penaltyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  penaltyDot: { width: 8, height: 8, borderRadius: 4 },
  penaltyDate: { fontSize: 14, fontWeight: '700', color: colors.textDark },
  penaltyType: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  penaltyAmount: { fontSize: 15, fontWeight: '800', color: colors.danger },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
});
}
