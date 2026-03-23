import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/api';
import { ENDPOINTS } from '../../constants/api';
import { COLORS, SIZES, RADIUS, SHADOW } from '../../constants/theme';

const PolicyCard = ({ icon, title, value, color, bg }) => (
  <View style={[styles.policyCard, SHADOW.sm]}>
    <View style={[styles.policyIcon, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <View style={styles.policyInfo}>
      <Text style={styles.policyLabel}>{title}</Text>
      <Text style={styles.policyValue}>{value || '—'}</Text>
    </View>
  </View>
);

const DaySchedule = ({ day, start, end, isOff, isToday }) => (
  <View style={[styles.dayCard, isToday && styles.todayCard, SHADOW.sm]}>
    <Text style={[styles.dayName, isToday && styles.todayText]}>{day.substring(0, 3).toUpperCase()}</Text>
    {isOff ? (
      <View style={styles.offBadge}><Text style={styles.offText}>OFF</Text></View>
    ) : (
      <View style={styles.timeWrap}>
        <Text style={styles.timeText}>{start}</Text>
        <View style={styles.timeDot} />
        <Text style={styles.timeText}>{end}</Text>
      </View>
    )}
  </View>
);

export default function ShiftScreen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const res = await apiFetch(ENDPOINTS.employeeStats);
      const json = await res.json();
      if (json.success) setData(json.employee?.workSetup?.shift);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
  );

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const todayName = days[(new Date().getDay() + 6) % 7];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.primary} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>My Shift & Schedule</Text>
          <Text style={styles.subTitle}>Manage your working hours and policies</Text>
        </View>

        <View style={styles.body}>
          {/* Main Shift Card */}
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={[styles.heroCard, SHADOW.lg]}>
            <View style={styles.heroRow}>
              <View>
                <Text style={styles.heroLabel}>Active Shift</Text>
                <Text style={styles.heroValue}>{data?.name || 'Standard Shift'}</Text>
              </View>
              <View style={styles.shiftIconBox}>
                <Ionicons name="time" size={32} color={COLORS.white} />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.heroGrid}>
              <View style={styles.heroItem}>
                <Ionicons name="sunny" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.heroItemText}>Start: {data?.schedule?.[todayName]?.shiftStart || '—'}</Text>
              </View>
              <View style={styles.heroItem}>
                <Ionicons name="moon" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.heroItemText}>End: {data?.schedule?.[todayName]?.shiftEnd || '—'}</Text>
              </View>
              <View style={styles.heroItem}>
                <Ionicons name="hourglass" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.heroItemText}>Duration: 9h (Avg)</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Weekly Schedule */}
          <Text style={styles.sectionTitle}>Weekly Schedule</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekScroll}>
            {days.map(d => (
              <DaySchedule
                key={d}
                day={d}
                start={data?.schedule?.[d]?.shiftStart}
                end={data?.schedule?.[d]?.shiftEnd}
                isOff={data?.schedule?.[d]?.isOff}
                isToday={d === todayName}
              />
            ))}
          </ScrollView>

          {/* Policies */}
          <Text style={styles.sectionTitle}>Rules & Policies</Text>
          <View style={styles.policyGrid}>
            <PolicyCard icon="alert-circle" title="Late Threshold" value={`${data?.maxLateMinutes || 0} Minutes`} color={COLORS.danger} bg={COLORS.dangerLight} />
            <PolicyCard icon="exit" title="Max Early Out" value={`${data?.maxEarlyOutMinutes || 0} Minutes`} color={COLORS.warning} bg={COLORS.warningLight} />
            <PolicyCard icon="restaurant" title="Lunch Break" value={`${data?.schedule?.[todayName]?.lunchDuration || 0} Mins`} color={COLORS.success} bg={COLORS.successLight} />
            <PolicyCard icon="cafe" title="Tea Breaks" value="2 x 15 Mins" color={COLORS.purple} bg={COLORS.purpleLight} />
          </View>

          {/* Full Day / Half Day Rules */}
          <View style={[styles.rulesCard, SHADOW.sm]}>
            <Text style={styles.rulesTitle}>Attendance Criteria</Text>
            <View style={styles.ruleRow}>
              <View style={[styles.ruleDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.ruleText}>Full Day: Min <Text style={styles.bold}>{data?.minFullDayHours || 8} hours</Text> of work</Text>
            </View>
            <View style={styles.ruleRow}>
              <View style={[styles.ruleDot, { backgroundColor: COLORS.warning }]} />
              <Text style={styles.ruleText}>Half Day: Min <Text style={styles.bold}>{data?.minHalfDayHours || 4} hours</Text> of work</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgMain },
  scroll: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingBottom: 10 },
  title: { fontSize: SIZES.xxl, fontWeight: '800', color: COLORS.textDark },
  subTitle: { fontSize: SIZES.sm, color: COLORS.textLight, marginTop: 4 },
  body: { padding: 20 },
  heroCard: { borderRadius: RADIUS.xl, padding: 24, marginBottom: 28 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600', textTransform: 'uppercase' },
  heroValue: { fontSize: 24, fontWeight: '800', color: COLORS.white, marginTop: 4 },
  shiftIconBox: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 20 },
  heroGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  heroItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroItemText: { fontSize: 13, color: COLORS.white, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark, marginBottom: 16, marginTop: 8 },
  weekScroll: { paddingBottom: 10, gap: 12 },
  dayCard: { width: 100, backgroundColor: COLORS.white, borderRadius: 16, padding: 16, alignItems: 'center', gap: 8 },
  todayCard: { backgroundColor: COLORS.primary, borderWidth: 0 },
  dayName: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  todayText: { color: COLORS.white },
  timeWrap: { alignItems: 'center', gap: 4 },
  timeText: { fontSize: 14, fontWeight: '700', color: COLORS.textDark },
  timeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.border },
  offBadge: { backgroundColor: COLORS.bgMain, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  offText: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted },
  policyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  policyCard: { width: '48%', backgroundColor: COLORS.white, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  policyIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  policyInfo: { flex: 1 },
  policyLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textLight },
  policyValue: { fontSize: 14, fontWeight: '800', color: COLORS.textDark, marginTop: 2 },
  rulesCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20, marginBottom: 40 },
  rulesTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textDark, marginBottom: 14 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  ruleDot: { width: 8, height: 8, borderRadius: 4 },
  ruleText: { fontSize: 13, color: COLORS.textMain },
  bold: { fontWeight: '700' },
});
