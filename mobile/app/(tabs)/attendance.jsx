import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { apiFetch } from '../../utils/api';
import { ENDPOINTS } from '../../constants/api';
import { COLORS, SIZES, RADIUS, SHADOW } from '../../constants/theme';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

const StatusBadge = ({ status }) => {
  const isPresent = status === 'Present';
  const isAbsent = status === 'Absent';
  const isLeave = status === 'Leave';
  const isLate = status === 'Late';

  let color = COLORS.textMuted;
  let bg = COLORS.bgMain;
  if (isPresent) { color = COLORS.success; bg = COLORS.successLight; }
  if (isAbsent) { color = COLORS.danger; bg = COLORS.dangerLight; }
  if (isLeave) { color = COLORS.purple; bg = COLORS.purpleLight; }
  if (isLate) { color = COLORS.warning; bg = COLORS.warningLight; }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{status}</Text>
    </View>
  );
};

export default function AttendanceScreen() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, leaves: 0 });

  const loadData = async (m) => {
    try {
      const res = await apiFetch(`${ENDPOINTS.attendanceHistory}?month=${m}`);
      const json = await res.json();
      if (json.success) {
        setData(json.records);
        processAttendance(json.records);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const processAttendance = (records) => {
    const marked = {};
    let sPresent = 0, sAbsent = 0, sLate = 0, sLeaves = 0;

    records.forEach(r => {
      let dotColor = COLORS.textMuted;
      if (r.status === 'Present') { dotColor = COLORS.success; sPresent++; }
      if (r.status === 'Absent') { dotColor = COLORS.danger; sAbsent++; }
      if (r.status === 'Late') { dotColor = COLORS.warning; sLate++; }
      if (r.status === 'Leave') { dotColor = COLORS.purple; sLeaves++; }

      marked[r.date] = {
        marked: true,
        dotColor,
        customStyles: {
          container: { backgroundColor: dotColor + '15', borderRadius: 8 },
          text: { color: dotColor, fontWeight: '700' }
        }
      };
    });

    setMarkedDates(marked);
    setStats({ present: sPresent, absent: sAbsent, late: sLate, leaves: sLeaves });
  };

  useEffect(() => { loadData(month); }, [month]);

  const onMonthChange = (date) => {
    const newMonth = format(new Date(date.dateString), 'yyyy-MM');
    setMonth(newMonth);
    setLoading(true);
  };

  const selectedRecord = selectedDate ? data.find(r => r.date === selectedDate) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Attendance History</Text>
        <Text style={styles.subTitle}>Track your daily logs and status</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.body}>
          <View style={styles.statsRow}>
            <View style={[styles.statItem, SHADOW.sm]}>
              <Text style={[styles.statVal, { color: COLORS.success }]}>{stats.present}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={[styles.statItem, SHADOW.sm]}>
              <Text style={[styles.statVal, { color: COLORS.danger }]}>{stats.absent}</Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
            <View style={[styles.statItem, SHADOW.sm]}>
              <Text style={[styles.statVal, { color: COLORS.warning }]}>{stats.late}</Text>
              <Text style={styles.statLabel}>Late</Text>
            </View>
            <View style={[styles.statItem, SHADOW.sm]}>
              <Text style={[styles.statVal, { color: COLORS.purple }]}>{stats.leaves}</Text>
              <Text style={styles.statLabel}>Leaves</Text>
            </View>
          </View>

          <View style={[styles.calendarCard, SHADOW.md]}>
            <Calendar
              onMonthChange={onMonthChange}
              onDayPress={(day) => setSelectedDate(day.dateString)}
              markedDates={{
                ...markedDates,
                [selectedDate]: { ...markedDates[selectedDate], selected: true, selectedColor: COLORS.primary }
              }}
              markingType={'custom'}
              theme={{
                calendarBackground: COLORS.white,
                textSectionTitleColor: COLORS.textMuted,
                selectedDayBackgroundColor: COLORS.primary,
                selectedDayTextColor: COLORS.white,
                todayTextColor: COLORS.primary,
                dayTextColor: COLORS.textDark,
                textDisabledColor: COLORS.border,
                dotColor: COLORS.primary,
                arrowColor: COLORS.primary,
                monthTextColor: COLORS.textDark,
                textDayFontWeight: '600',
                textMonthFontWeight: '800',
                textDayHeaderFontWeight: '700',
                textDayFontSize: 14,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 12
              }}
            />
          </View>

          {selectedDate && (
            <View style={[styles.detailCard, SHADOW.sm]}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>{format(new Date(selectedDate), 'dd MMMM yyyy')}</Text>
                {selectedRecord ? (
                  <StatusBadge status={selectedRecord.status} />
                ) : (
                  <View style={styles.badge}><Text style={styles.badgeText}>No Record</Text></View>
                )}
              </View>

              {selectedRecord ? (
                <View style={styles.detailGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Punch In</Text>
                    <Text style={styles.detailValue}>{selectedRecord.punchIn || '—'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Punch Out</Text>
                    <Text style={styles.detailValue}>{selectedRecord.punchOut || '—'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Working Hours</Text>
                    <Text style={styles.detailValue}>{selectedRecord.workingFormatted || '—'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Breaks</Text>
                    <Text style={styles.detailValue}>{selectedRecord.breakCount || 0} Taken</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.emptyText}>No logs recorded for this day.</Text>
              )}
            </View>
          )}

          <Text style={styles.sectionTitle}>Recent Logs</Text>
          {data.slice(0, 5).map((r, i) => (
            <TouchableOpacity key={i} style={[styles.logCard, SHADOW.sm]} onPress={() => setSelectedDate(r.date)}>
              <View style={styles.logLeft}>
                <Text style={styles.logDate}>{format(new Date(r.date), 'dd MMM')}</Text>
                <Text style={styles.logDay}>{format(new Date(r.date), 'EEE')}</Text>
              </View>
              <View style={styles.logBody}>
                <View style={styles.logRow}>
                  <Ionicons name="enter-outline" size={14} color={COLORS.success} />
                  <Text style={styles.logTime}>{r.punchIn || '—'}</Text>
                  <View style={styles.logGap} />
                  <Ionicons name="exit-outline" size={14} color={COLORS.danger} />
                  <Text style={styles.logTime}>{r.punchOut || '—'}</Text>
                </View>
              </View>
              <StatusBadge status={r.status} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgMain },
  header: { padding: 24, paddingBottom: 10 },
  title: { fontSize: SIZES.xxl, fontWeight: '800', color: COLORS.textDark },
  subTitle: { fontSize: SIZES.sm, color: COLORS.textLight, marginTop: 4 },
  body: { padding: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statItem: { flex: 1, backgroundColor: COLORS.white, borderRadius: 16, padding: 12, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, marginTop: 2, textTransform: 'uppercase' },
  calendarCard: { backgroundColor: COLORS.white, borderRadius: 24, padding: 10, marginBottom: 20, overflow: 'hidden' },
  detailCard: { backgroundColor: COLORS.white, borderRadius: 24, padding: 20, marginBottom: 24 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  detailTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  detailItem: { width: '45%' },
  detailLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase' },
  detailValue: { fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark, marginBottom: 16 },
  logCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 16 },
  logLeft: { alignItems: 'center', width: 45, borderRightWidth: 1, borderRightColor: COLORS.borderLight, paddingRight: 10 },
  logDate: { fontSize: 14, fontWeight: '800', color: COLORS.textDark },
  logDay: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' },
  logBody: { flex: 1 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logTime: { fontSize: 13, fontWeight: '600', color: COLORS.textMain },
  logGap: { width: 10 },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, padding: 20 },
});
