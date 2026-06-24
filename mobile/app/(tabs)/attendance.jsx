import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput, Keyboard, Pressable,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { apiFetch } from '../../utils/api';
import { ENDPOINTS } from '../../constants/api';
import { SIZES, RADIUS, SHADOW } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import Toast from 'react-native-toast-message';

import ClockPicker from '../../components/ClockPicker';

const TimePickerModal = (props) => <ClockPicker {...props} />;

const StatusBadge = ({ status, approvalStatus, category }) => {
  const { colors } = useTheme();
  const isPresent = status === 'Present';
  const isAbsent = status === 'Absent';
  const isLeave = status === 'Leave' || status === 'On Leave';
  const isWeekOff = status === 'Week Off';
  const isLate = status === 'Late' || status === 'Incomplete' || status === 'Clocked In';
  const isMissing = status === 'Missing' || status === 'Ghost';

  let color = colors.textMuted;
  let bg = colors.bgMain;
  if (approvalStatus === 'Rejected') {
    color = colors.danger; bg = colors.dangerLight;
  } else if (approvalStatus === 'Pending' && (status === 'Leave' || status === 'Attendance Correction')) {
    color = colors.warning; bg = colors.warningLight;
  } else if (isPresent) { color = colors.success; bg = colors.successLight; }
  else if (isAbsent || isLeave) { color = colors.danger; bg = colors.dangerLight; }
  else if (isWeekOff) { color = colors.purple; bg = colors.purpleLight; }
  else if (isLate || isMissing) { color = colors.warning; bg = colors.warningLight; }

  let label = status;
  if (approvalStatus === 'Rejected') {
    label = `${status === 'Leave' ? 'Leave' : 'Correction'} Rejected`;
  } else if (approvalStatus === 'Pending' && (status === 'Leave' || status === 'Attendance Correction')) {
    label = `${status === 'Leave' ? 'Leave' : 'Correction'} Pending`;
  } else if (status === 'On Leave' && category) {
    label = `${category} Leave`;
  } else if (status === 'Leave' && category) {
    label = `${category} Leave`;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
};

export default function AttendanceScreen() {
  const { colors, isDarkMode } = useTheme();
  const params = useLocalSearchParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [markedDates, setMarkedDates] = useState({});
  const [allRequests, setAllRequests] = useState({});
  const [selectedDate, setSelectedDate] = useState(null); 
  const [joiningDate, setJoiningDate] = useState(null);
  const [stats, setStats] = useState({ present: 0, absent: 0, halfDay: 0, leaves: 0 });
  const [weekOffDays, setWeekOffDays] = useState([]);
  const [leavePolicy, setLeavePolicy] = useState('Default (Multiple of 0.5)');
  const [leaveDuration, setLeaveDuration] = useState('Full Day');
  const [filterModalType, setFilterModalType] = useState(null);

  const getFilteredDays = () => {
    if (!filterModalType) return [];
    const keys = Object.keys(markedDates).sort((a,b) => b.localeCompare(a)); // sort descending so newest dates appear at top
    return keys.filter(date => {
      const md = markedDates[date];
      if (filterModalType === 'Present') return md?.dotColor === colors.success;
      if (filterModalType === 'Absent') return md?.dotColor === colors.danger;
      if (filterModalType === 'Punch Out Miss') {
        const req = allRequests[date];
        if (req && (req.status === 'Pending' || req.status === 'Approved')) return false;
        return md?.dotColor === colors.warning && data.find(r => r.date === date)?.punchIn && !data.find(r => r.date === date)?.punchOut;
      }
      return false;
    }).map(date => {
      const rec = data.find(r => r.date === date);
      const req = allRequests[date];
      return {
        date,
        record: rec,
        request: req,
        md: markedDates[date]
      };
    });
  };

  const loadData = async (m = month) => {
    try {
      const res = await apiFetch(`${ENDPOINTS.attendanceHistory}?month=${m}`);
      const json = await res.json();
      if (json.success) {
        setData(json.records);
        setAllRequests(json.requests || {});
        setJoiningDate(json.joiningDate);
        setWeekOffDays(json.weekOffDays || []);
        setLeavePolicy(json.leavePolicy || 'Default (Multiple of 0.5)');
        processAttendance(json.records, m, json.joiningDate, json.requests, json.weekOffDays || []);
      }

      // Refetch Leave Types
      const ltRes = await apiFetch(ENDPOINTS.leaveTypes);
      const ltJson = await ltRes.json();
      if (ltJson.success) setLeaveTypes(ltJson.leaveTypes || ltJson.data || []);
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Network error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const processAttendance = (records, targetMonth, jDate, requests = {}, woDays = []) => {
    const marked = {};
    let sPresent = 0, sAbsent = 0, sHalfDay = 0, sLeaves = 0, sMissingOut = 0;
    const lookup = {};
    records.forEach(r => lookup[r.date] = r);

    const start = startOfMonth(new Date(`${targetMonth}-01`));
    const end = endOfMonth(new Date(`${targetMonth}-01`));
    const today = format(new Date(), 'yyyy-MM-dd');

    eachDayOfInterval({ start, end }).forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayName = format(day, 'EEEE');
      const isWeekOff = woDays.includes(dayName);
      const r = lookup[dateStr];
      const req = requests[dateStr];

      if (r) {
        let dotColor = colors.textMuted;
        const isMissingOut = r.punchIn && !r.punchOut;
        
        if (isMissingOut) { 
          dotColor = colors.warning; 
          if (!req || (req.status !== 'Pending' && req.status !== 'Approved')) {
            sMissingOut++; 
          }
        } // Orange for missing punch out
        else if (r.status === 'Present') { dotColor = colors.success; sPresent++; }
        else if (r.status === 'Absent') { dotColor = colors.danger; sAbsent++; }
        else if (r.status === 'Leave' || r.status === 'On Leave') { dotColor = colors.danger; sLeaves++; }
        else { dotColor = colors.warning; sHalfDay++; }

        marked[dateStr] = {
          marked: true,
          dotColor,
          customStyles: {
            container: { backgroundColor: dotColor + (isDarkMode ? '20' : '15'), borderRadius: 8 },
            text: { color: dotColor, fontWeight: '700' }
          }
        };
      } else if (req && req.status === 'Approved') {
          let dotColor = req.type === 'Leave' ? colors.danger : colors.success;
          marked[dateStr] = { marked: true, dotColor, customStyles: { container: { backgroundColor: dotColor + (isDarkMode ? '20' : '15'), borderRadius: 8 }, text: { color: dotColor, fontWeight: '700' } } };
      } else if (req && req.status === 'Rejected') {
          let dotColor = colors.danger;
          marked[dateStr] = { marked: true, dotColor, customStyles: { container: { backgroundColor: dotColor + (isDarkMode ? '20' : '15'), borderRadius: 8 }, text: { color: dotColor, fontWeight: '700' } } };
          if (dateStr < today && (!jDate || dateStr >= jDate)) sAbsent++;
      } else if (req && req.status === 'Pending') {
          let dotColor = colors.warning;
          marked[dateStr] = { marked: true, dotColor, customStyles: { container: { backgroundColor: dotColor + (isDarkMode ? '20' : '15'), borderRadius: 8 }, text: { color: dotColor, fontWeight: '700' } } };
      } else if (isWeekOff) {
          marked[dateStr] = {
            marked: true,
            dotColor: colors.purple,
            isWeekOff: true,
            customStyles: {
              container: { backgroundColor: colors.purple + (isDarkMode ? '20' : '15'), borderRadius: 8 },
              text: { color: colors.purple, fontWeight: '700' }
            }
          };
      } else if (dateStr < today && (!jDate || dateStr >= jDate)) {
        sAbsent++;
        marked[dateStr] = {
          marked: true,
          dotColor: colors.danger,
          customStyles: {
            container: { backgroundColor: colors.danger + (isDarkMode ? '20' : '15'), borderRadius: 8 },
            text: { color: colors.danger, fontWeight: '700' }
          }
        };
      }
    });

    setMarkedDates(marked);
    setStats({ present: sPresent, absent: sAbsent, halfDay: sHalfDay, leaves: sLeaves, missingOut: sMissingOut });
  };

  useEffect(() => { loadData(); }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [month])
  );

  const onMonthChange = (date) => {
    const newMonth = format(new Date(date.dateString), 'yyyy-MM');
    setCurrentMonth(new Date(date.dateString));
    setMonth(newMonth);
    loadData(newMonth);
  };

  const selectedRecord = data.find(r => r.date === selectedDate);
  const currentRequest = allRequests[selectedDate];
  const isAbsent = !selectedRecord && selectedDate < format(new Date(), 'yyyy-MM-dd') && (!joiningDate || selectedDate >= joiningDate);
  const isRedDate = (markedDates[selectedDate]?.dotColor === colors.danger) || isAbsent;
  
  // Allow request if absent OR if punch out is missing OR if incomplete/late
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isMissingPunchOut = selectedRecord && selectedRecord.punchIn && !selectedRecord.punchOut && selectedDate !== todayStr;
  const isIncomplete = selectedRecord && (selectedRecord.status === 'Incomplete' || selectedRecord.status === 'Half Day' || selectedRecord.status === 'Late' || selectedRecord.status === 'Absent');
  const isPastDate = selectedDate < todayStr;
  const isFutureDate = selectedDate > todayStr;
  const canRequest = !currentRequest && (isRedDate || isMissingPunchOut || (isPastDate && isIncomplete) || (selectedDate === todayStr && !selectedRecord));



  const [showApply, setShowApply] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [reqType, setReqType] = useState('Leave');
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [reqDate, setReqDate] = useState('');
  const [reason, setReason] = useState('');
  const [workSummary, setWorkSummary] = useState('');
  const [manualIn, setManualIn] = useState('09:00');
  const [manualOut, setManualOut] = useState('18:00');
  const [showInPicker, setShowInPicker] = useState(false);
  const [showOutPicker, setShowOutPicker] = useState(false);
  const [leaveCategory, setLeaveCategory] = useState('Paid');
  const [leaveStats, setLeaveStats] = useState({ used: 0, max: 0 });

  const [userProfile, setUserProfile] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch User Profile for Gender/Settings
        const statsRes = await apiFetch(ENDPOINTS.employeeStats);
        const statsJson = await statsRes.json();
        if (statsJson.success) {
          setUserProfile(statsJson.employee);
          setLeaveStats({
            used: statsJson.stats.usedLeaves || 0,
            max: statsJson.stats.maxUsagePerMonth || 0
          });
        }

        // Fetch Data
        await loadData();
        
        // Fetch Leave Types
        const ltRes = await apiFetch(ENDPOINTS.leaveTypes);
        const ltJson = await ltRes.json();
        if (ltJson.success) setLeaveTypes(ltJson.leaveTypes || ltJson.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    const init = async () => {
      await fetchData();
      if (params.date) {
        setSelectedDate(params.date);
        // Small delay to ensure records are processed and isMissingPunchOut etc are computed
        if (params.autoOpen === 'true') {
           setTimeout(() => setShowApply(true), 600);
        }
      }
    };
    init();
  }, []);

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (reqType === 'Leave' && !selectedLeaveType) return Toast.show({ type: 'info', text1: 'Highlight', text2: 'Please select a leave type' });
    if (reqType === 'Leave' && leaveCategory === 'Paid' && leaveStats.max > 0 && leaveStats.used >= leaveStats.max) {
      return Toast.show({ type: 'error', text1: 'Limit Reached', text2: `You have already used your ${leaveStats.max} paid leaves for this month.` });
    }
    if (reqType === 'Attendance Correction' && !workSummary.trim()) return Toast.show({ type: 'info', text1: 'Required', text2: 'Please provide a work report' });
    if (!reason.trim()) return Toast.show({ type: 'info', text1: 'Required', text2: 'Please provide a reason' });
    setSubmitting(true);
    try {
      if (reqType === 'Attendance Correction') {
        const inDate = new Date(`${reqDate}T${manualIn}:00`);
        const outDate = new Date(`${reqDate}T${manualOut}:00`);
        if (outDate <= inDate) {
          return Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Out time must be after in time' });
        }
      }

      const payload = {
        requestType: reqType,
        date: reqDate,
        reason,
        workSummary: reqType === 'Attendance Correction' ? workSummary : undefined,
        leaveType: reqType === 'Leave' ? selectedLeaveType : undefined,
        leaveCategory: reqType === 'Leave' ? leaveCategory : undefined,
        manualIn: reqType === 'Attendance Correction' ? new Date(`${reqDate}T${manualIn}:00`) : undefined,
        manualOut: reqType === 'Attendance Correction' ? new Date(`${reqDate}T${manualOut}:00`) : undefined,
        leaveDuration: reqType === 'Leave' ? leaveDuration : undefined,
      };
      const res = await apiFetch(ENDPOINTS.submitRequest, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        Toast.show({ type: 'success', text1: 'Request submitted' });
        setShowApply(false);
        setReason('');
        loadData();
      } else {
        Toast.show({ type: 'error', text1: json.message || 'Failed' });
      }
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Network error' });
    } finally {
      setSubmitting(false);
    }
  };

  const openRequest = () => {
    setReqDate(selectedDate);
    
    // Reset form states to prevent old request data persistence
    setReason('');
    setWorkSummary('');
    setManualOut('18:00');
    setSelectedLeaveType('');

    const filteredForThisDate = leaveTypes.filter(lt => {
      if (userProfile?.gender) {
        if (lt.applicableFor === 'Male Only' && userProfile.gender !== 'Male') return false;
        if (lt.applicableFor === 'Female Only' && userProfile.gender !== 'Female') return false;
      }
      if (lt.applyOnPastDays === 'No' && selectedDate < todayStr) return false;
      return true;
    });

    if (isMissingPunchOut) {
      if (filteredForThisDate.length > 0) {
        setReqType('Attendance Correction'); // Default but allow switch
      } else {
        setReqType('Attendance Correction');
      }
      
      if (selectedRecord?.punchIn) {
        const match = selectedRecord.punchIn.match(/(\d{1,2}):(\d{2})/);
        if (match) setManualIn(`${match[1].padStart(2, '0')}:${match[2]}`);
      }
    } else {
      setReqType(filteredForThisDate.length > 0 ? 'Leave' : 'Attendance Correction');
    }
    setShowApply(true);
  };

  const filteredLeaves = leaveTypes.filter(lt => {
    if (userProfile?.gender) {
      if (lt.applicableFor === 'Male Only' && userProfile.gender !== 'Male') return false;
      if (lt.applicableFor === 'Female Only' && userProfile.gender !== 'Female') return false;
    }
    if (lt.applyOnPastDays === 'No' && reqDate < todayStr) return false;
    return true;
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bgMain }]} edges={['top']}>
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textDark }]}>Attendance History</Text>
          <Text style={[styles.subTitle, { color: colors.textLight }]}>Logs and stats for {format(currentMonth, 'MMMM yyyy')}</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.statsRow}>
            <TouchableOpacity style={[styles.statItem, SHADOW.sm, { backgroundColor: colors.bgCard, borderColor: colors.borderLight, borderWidth: 1 }]} activeOpacity={0.7} onPress={() => setFilterModalType('Present')}>
              <Text style={[styles.statVal, { color: colors.success }]}>{stats.present}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Present</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statItem, SHADOW.sm, { backgroundColor: colors.bgCard, borderColor: colors.borderLight, borderWidth: 1 }]} activeOpacity={0.7} onPress={() => setFilterModalType('Absent')}>
              <Text style={[styles.statVal, { color: colors.danger }]}>{stats.absent}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Absent</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statItem, SHADOW.sm, { backgroundColor: colors.bgCard, borderColor: colors.borderLight, borderWidth: 1 }]} activeOpacity={0.7} onPress={() => setFilterModalType('Punch Out Miss')}>
              <Text style={[styles.statVal, { color: colors.warning }]}>{stats.missingOut || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Punch Out Miss</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.calendarCard, SHADOW.md, { backgroundColor: colors.bgCard, borderColor: colors.borderLight, borderWidth: 1 }]}>
            <Calendar
              key={colors.bgCard}
              style={{ backgroundColor: colors.bgCard, borderRadius: 20 }}
              onMonthChange={onMonthChange}
              onDayPress={(day) => setSelectedDate(day.dateString)}
              markedDates={{
                ...markedDates,
                ...(selectedDate ? { 
                  [selectedDate]: { 
                    ...markedDates[selectedDate], 
                    customStyles: { 
                      container: { backgroundColor: colors.primary, borderRadius: 10 }, 
                      text: { color: colors.white, fontWeight: '800' } 
                    } 
                  } 
                } : {})
              }}
              markingType={'custom'}
              theme={{
                calendarBackground: colors.bgCard,
                selectedDayBackgroundColor: colors.primary,
                todayTextColor: colors.primary,
                dayTextColor: colors.textDark,
                textDisabledColor: colors.textMuted + '40',
                monthTextColor: colors.textDark,
                arrowColor: colors.primary,
                textDayFontWeight: '600',
                textMonthFontWeight: '800',
                textSectionTitleColor: colors.textMuted,
              }}
            />
          </View>

          {selectedDate && (
            <View style={[styles.detailCard, SHADOW.sm, { backgroundColor: colors.bgCard, borderColor: colors.borderLight, borderWidth: 1 }]}>
              <View style={styles.detailHeader}>
                <Text style={[styles.detailTitle, { color: colors.textDark }]}>{format(new Date(selectedDate), 'dd MMMM yyyy')}</Text>
                {selectedRecord ? (
                    <StatusBadge status={currentRequest ? currentRequest.type : selectedRecord.status} approvalStatus={currentRequest?.status || selectedRecord.approvalStatus} category={selectedRecord.leaveCategory} />
                ) : currentRequest ? (
                    <StatusBadge status={currentRequest.type} approvalStatus={currentRequest.status} category={currentRequest.leaveCategory || (currentRequest.type === 'Leave' ? 'Paid' : null)} />
                ) : markedDates[selectedDate]?.isWeekOff ? (
                    <StatusBadge status="Week Off" approvalStatus="Approved" />
                ) : (
                    <StatusBadge status={isAbsent ? 'Absent' : 'Pending'} approvalStatus="Pending" />
                )}
              </View>

              {selectedRecord ? (
                <View>
                  <View style={styles.detailGrid}>
                    <View style={styles.detailItem}><Text style={[styles.detailLabel, { color: colors.textLight }]}>In</Text><Text style={[styles.detailValue, { color: colors.textDark }]}>{selectedRecord.punchIn || '—'}</Text></View>
                    <View style={styles.detailItem}><Text style={[styles.detailLabel, { color: colors.textLight }]}>Out</Text><Text style={[styles.detailValue, { color: colors.textDark }]}>{selectedRecord.punchOut || '—'}</Text></View>
                  </View>

                  {(() => {
                    const summaries = [];
                    const lReasons = [];
                    const eReasons = [];
                    const gReasons = [];

                    if (selectedRecord.workSummary) summaries.push(selectedRecord.workSummary);
                    (selectedRecord.punches || []).forEach(p => {
                      if (p.workSummary && !summaries.includes(p.workSummary)) summaries.push(p.workSummary);
                      if (p.lateReason && !lReasons.includes(p.lateReason)) lReasons.push(p.lateReason);
                      if (p.earlyReason && !eReasons.includes(p.earlyReason)) eReasons.push(p.earlyReason);
                      if (p.geofenceReason && !gReasons.includes(p.geofenceReason)) gReasons.push(p.geofenceReason);
                    });

                    if (currentRequest && currentRequest.workSummary && !summaries.includes(currentRequest.workSummary)) {
                      summaries.push(currentRequest.workSummary);
                    }

                    return (
                      <View style={{ marginTop: 12, gap: 8 }}>
                        {summaries.length > 0 && (
                          <View style={{ backgroundColor: colors.bgMain, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textLight, textTransform: 'uppercase', marginBottom: 4 }}>
                              Work Report / History
                            </Text>
                            {summaries.map((s, idx) => (
                              <Text key={idx} style={{ fontSize: 13, color: colors.textDark, lineHeight: 18, marginTop: idx > 0 ? 6 : 0 }}>
                                {s}
                              </Text>
                            ))}
                          </View>
                        )}

                        {(lReasons.length > 0 || selectedRecord.lateInPenalty?.isLate) && (
                          <View style={{ backgroundColor: colors.warningLight, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.warning + '20' }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.warning, textTransform: 'uppercase' }}>
                              Late Arrival
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.textDark, fontWeight: '600', marginTop: 2 }}>
                              {lReasons.join(' · ') || 'Marked as late entry by shift policy.'}
                            </Text>
                          </View>
                        )}

                        {(eReasons.length > 0 || selectedRecord.earlyOutPenalty?.amount > 0) && (
                          <View style={{ backgroundColor: colors.dangerLight, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.danger + '20' }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.danger, textTransform: 'uppercase' }}>
                              Early Departure
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.textDark, fontWeight: '600', marginTop: 2 }}>
                              {eReasons.join(' · ') || 'Marked as early departure.'}
                            </Text>
                          </View>
                        )}

                        {gReasons.length > 0 && (
                          <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)' }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.warning, textTransform: 'uppercase' }}>
                              Out of Range Punch
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.textMain, fontWeight: '600', marginTop: 2 }}>
                              {gReasons.join(' · ')}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })()}

                  {(isMissingPunchOut || (selectedDate < todayStr && isIncomplete)) && (
                    currentRequest ? (
                      <View style={[styles.sentRequestCard, { marginTop: 20, backgroundColor: colors.bgMain, borderColor: colors.borderLight }, currentRequest.status === 'Rejected' && { backgroundColor: colors.dangerLight, borderColor: colors.danger + '40' }]}>
                        <View style={styles.sentRequestHeader}>
                          <Ionicons name={currentRequest.status === 'Rejected' ? "close-circle" : "checkmark-done-circle"} size={18} color={currentRequest.status === 'Rejected' ? colors.danger : colors.primary} />
                          <Text style={[styles.sentRequestTitle, { color: colors.textDark }, currentRequest.status === 'Rejected' && { color: colors.danger }]}>
                            {currentRequest.status === 'Rejected' ? (isMissingPunchOut ? 'Punch out correction rejected' : 'Correction request rejected') : (isMissingPunchOut ? 'Punch out missing request is already sent' : 'Correction request is already sent')}
                          </Text>
                        </View>
                        {currentRequest.reason && (
                          <View style={styles.sentRequestRow}>
                             <Text style={[styles.sentRequestLabel, { color: colors.textLight }]}>Reason:</Text>
                             <Text style={[styles.sentRequestValue, { color: colors.textDark }]}>{currentRequest.reason}</Text>
                          </View>
                        )}
                        {currentRequest.workSummary && (
                          <View style={styles.sentRequestRow}>
                            <Text style={[styles.sentRequestLabel, { color: colors.textLight }]}>Report:</Text>
                            <Text style={[styles.sentRequestValue, { color: colors.textDark }]}>{currentRequest.workSummary}</Text>
                          </View>
                        )}
                        {currentRequest.type === 'Attendance Correction' && (
                          <View style={styles.sentRequestRow}>
                            <Text style={[styles.sentRequestLabel, { color: colors.textLight }]}>Time:</Text>
                            <Text style={[styles.sentRequestValue, { color: colors.textDark }]}>
                              {(currentRequest.manualIn || currentRequest.inTime) ? new Date(currentRequest.manualIn || currentRequest.inTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} 
                              {' - '} 
                              {(currentRequest.manualOut || currentRequest.outTime) ? new Date(currentRequest.manualOut || currentRequest.outTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                            </Text>
                          </View>
                        )}
                        {currentRequest.adminRemark && (
                          <View style={styles.sentRequestRow}>
                            <Text style={[styles.sentRequestLabel, { color: colors.textLight }]}>Admin:</Text>
                            <Text style={[styles.sentRequestValue, { fontStyle: 'italic', color: colors.primary }]}>{currentRequest.adminRemark}</Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <TouchableOpacity style={[styles.requestBtn, { marginTop: 20, backgroundColor: colors.primary }]} onPress={openRequest}>
                        <Ionicons name="build-outline" size={18} color={colors.white} />
                        <Text style={[styles.requestBtnText, { color: colors.white }]}>{isMissingPunchOut ? "Request Punch Out Correction" : "Request Correction"}</Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              ) : currentRequest ? (
                <View style={[styles.sentRequestCard, { backgroundColor: colors.bgMain, borderColor: colors.borderLight }, currentRequest.status === 'Rejected' && { backgroundColor: colors.dangerLight, borderColor: colors.danger + '40' }]}>
                  <View style={styles.sentRequestHeader}>
                    <Ionicons name={currentRequest.status === 'Rejected' ? "close-circle" : "information-circle"} size={16} color={currentRequest.status === 'Rejected' ? colors.danger : colors.primary} />
                    <Text style={[styles.sentRequestTitle, { color: colors.textDark }, currentRequest.status === 'Rejected' && { color: colors.danger }]}>
                      {currentRequest.status === 'Rejected' ? `Request Rejected (${currentRequest.type})` : `Request already sent (${currentRequest.type})`}
                    </Text>
                  </View>
                  <View style={styles.sentRequestRow}>
                    <Text style={[styles.sentRequestLabel, { color: colors.textLight }]}>Reason:</Text>
                    <Text style={[styles.sentRequestValue, { color: colors.textDark }]}>{currentRequest.reason}</Text>
                  </View>
                  {currentRequest.workSummary && (
                    <View style={styles.sentRequestRow}>
                      <Text style={[styles.sentRequestLabel, { color: colors.textLight }]}>Report:</Text>
                      <Text style={[styles.sentRequestValue, { color: colors.textDark }]}>{currentRequest.workSummary}</Text>
                    </View>
                  )}
                  {currentRequest.adminRemark && (
                    <View style={styles.sentRequestRow}>
                      <Text style={[styles.sentRequestLabel, { color: colors.textLight }]}>Admin:</Text>
                      <Text style={[styles.sentRequestValue, { fontStyle: 'italic', color: colors.primary }]}>{currentRequest.adminRemark}</Text>
                    </View>
                  )}
                  {currentRequest.type === 'Attendance Correction' && (
                    <View style={styles.sentRequestRow}>
                      <Text style={[styles.sentRequestLabel, { color: colors.textLight }]}>Time:</Text>
                      <Text style={[styles.sentRequestValue, { color: colors.textDark }]}>
                        {(currentRequest.manualIn || currentRequest.inTime) ? new Date(currentRequest.manualIn || currentRequest.inTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} 
                        {' - '} 
                        {(currentRequest.manualOut || currentRequest.outTime) ? new Date(currentRequest.manualOut || currentRequest.outTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </Text>
                    </View>
                  )}
                  {currentRequest.leaveType && (
                    <View style={styles.sentRequestRow}>
                      <Text style={[styles.sentRequestLabel, { color: colors.textLight }]}>Leave:</Text>
                      <Text style={[styles.sentRequestValue, { color: colors.textDark }]}>{currentRequest.leaveType}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>No logs recorded for this day.</Text>
                  {canRequest && (
                    <TouchableOpacity style={[styles.requestBtn, { backgroundColor: colors.primary }]} onPress={openRequest}>
                      <Ionicons name={isMissingPunchOut ? "build-outline" : "paper-plane-outline"} size={18} color={colors.white} />
                      <Text style={[styles.requestBtnText, { color: colors.white }]}>{isMissingPunchOut ? "Request Punch Out Correction" : "Request Attendance / Leave"}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showApply} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
          <View style={[styles.modalContent, { backgroundColor: colors.bgCardElevated, borderColor: colors.borderLight }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textDark }]}>New Request</Text>
              <TouchableOpacity onPress={() => { Keyboard.dismiss(); setShowApply(false); }}><Ionicons name="close" size={24} color={colors.textDark} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: colors.textDark }]}><Ionicons name="calendar-outline" size={14} color={colors.textMuted} /> {reqDate} {isMissingPunchOut && ` (In: ${selectedRecord?.punchIn || manualIn})`}</Text>

                    {!isMissingPunchOut && (
                      <View style={[styles.typeSelector, { backgroundColor: colors.bgMain, borderColor: colors.borderLight, borderWidth: 1 }]}>
                        <TouchableOpacity 
                          style={[styles.typeBtn, reqType === 'Leave' && [styles.typeBtnActive, { backgroundColor: colors.primary }]]} 
                          onPress={() => setReqType('Leave')}
                        >
                          <Text style={[styles.typeBtnText, { color: colors.textMuted }, reqType === 'Leave' && [styles.typeBtnTextActive, { color: colors.white }]]}>Leave</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.typeBtn, reqType === 'Attendance Correction' && [styles.typeBtnActive, { backgroundColor: colors.primary }]]} 
                          onPress={() => setReqType('Attendance Correction')}
                        >
                          <Text style={[styles.typeBtnText, { color: colors.textMuted }, reqType === 'Attendance Correction' && [styles.typeBtnTextActive, { color: colors.white }]]}>Attendance</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {reqType === 'Leave' && (
                      filteredLeaves.length === 0 ? (
                        <View style={[styles.infoBox, { backgroundColor: colors.warningLight, borderColor: colors.warning + '20' }]}>
                          <Ionicons name="information-circle" size={18} color={colors.warning} />
                          <Text style={[styles.infoText, { color: colors.textDark }]}>
                            Leave requests are not available for this date. {reqDate < todayStr ? "Back-dated leaves are restricted." : "No applicable leave types found."}
                          </Text>
                        </View>
                      ) : (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={[styles.inputLabel, { color: colors.textDark }]}>Leave Type</Text>
                          <View style={styles.leaveTypesScroll}>
                            {filteredLeaves.map(lt => (
                              <TouchableOpacity 
                                key={lt._id} 
                                style={[styles.ltBadge, { backgroundColor: colors.bgMain, borderColor: colors.borderLight }, selectedLeaveType === lt._id && [styles.ltBadgeActive, { backgroundColor: colors.primary, borderColor: colors.primary }]]}
                                onPress={() => setSelectedLeaveType(lt._id)}
                              >
                                <Text style={[styles.ltText, { color: colors.textMuted }, selectedLeaveType === lt._id && [styles.ltTextActive, { color: colors.white }]]}>{lt.name}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )
                    )}

                    {reqType === 'Leave' && (
                      <View style={{ marginBottom: 16 }}>
                        <Text style={[styles.inputLabel, { color: colors.textDark }]}>Leave Category</Text>
                        <View style={[styles.typeSelector, { backgroundColor: colors.bgMain, borderColor: colors.borderLight, borderWidth: 1 }]}>
                          <TouchableOpacity 
                            style={[styles.typeBtn, leaveCategory === 'Paid' && [styles.typeBtnActive, { backgroundColor: colors.primary }]]} 
                            onPress={() => setLeaveCategory('Paid')}
                          >
                            <Text style={[styles.typeBtnText, { color: colors.textMuted }, leaveCategory === 'Paid' && [styles.typeBtnTextActive, { color: colors.white }]]}>Paid</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.typeBtn, leaveCategory === 'Unpaid' && [styles.typeBtnActive, { backgroundColor: colors.primary }]]} 
                            onPress={() => setLeaveCategory('Unpaid')}
                          >
                            <Text style={[styles.typeBtnText, { color: colors.textMuted }, leaveCategory === 'Unpaid' && [styles.typeBtnTextActive, { color: colors.white }]]}>Unpaid</Text>
                          </TouchableOpacity>
                        </View>
                        {leaveCategory === 'Paid' && leaveStats.max > 0 && (
                          <Text style={{ fontSize: 11, color: leaveStats.used >= leaveStats.max ? colors.danger : colors.textMuted, fontWeight: '700', marginTop: -8 }}>
                            Monthly Usage: {leaveStats.used} / {leaveStats.max} {leaveStats.used >= leaveStats.max && '(Limit Reached)'}
                          </Text>
                        )}
                      </View>
                    )}


              {reqType === 'Leave' && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={[styles.inputLabel, { color: colors.textDark }]}>Duration</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity style={[styles.durBtn, { backgroundColor: colors.bgMain, borderColor: colors.borderLight }, leaveDuration === 'Full Day' && [styles.durBtnActive, { backgroundColor: colors.primary, borderColor: colors.primary }]]} onPress={() => setLeaveDuration('Full Day')}>
                      <Text style={[styles.durBtnText, { color: colors.textMuted }, leaveDuration === 'Full Day' && [styles.durBtnTextActive, { color: colors.white }]]}>Full Day</Text>
                    </TouchableOpacity>
                    {leavePolicy !== 'Multiple of 1' && (
                      <>
                        <TouchableOpacity style={[styles.durBtn, { backgroundColor: colors.bgMain, borderColor: colors.borderLight }, leaveDuration === 'First Half' && [styles.durBtnActive, { backgroundColor: colors.primary, borderColor: colors.primary }]]} onPress={() => setLeaveDuration('First Half')}>
                          <Text style={[styles.durBtnText, { color: colors.textMuted }, leaveDuration === 'First Half' && [styles.durBtnTextActive, { color: colors.white }]]}>1st Half</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.durBtn, { backgroundColor: colors.bgMain, borderColor: colors.borderLight }, leaveDuration === 'Second Half' && [styles.durBtnActive, { backgroundColor: colors.primary, borderColor: colors.primary }]]} onPress={() => setLeaveDuration('Second Half')}>
                          <Text style={[styles.durBtnText, { color: colors.textMuted }, leaveDuration === 'Second Half' && [styles.durBtnTextActive, { color: colors.white }]]}>2nd Half</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              )}

              {reqType === 'Attendance Correction' && (
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                    <TouchableOpacity 
                      style={[
                        styles.timeDisplay, 
                        { flex: 1, flexDirection: 'row', justifyContent: 'flex-start', backgroundColor: colors.bgMain, borderColor: colors.borderLight },
                        isMissingPunchOut && { backgroundColor: isDarkMode ? colors.bgCardElevated : '#F1F5F9', borderColor: colors.borderLight }
                      ]} 
                      onPress={() => !isMissingPunchOut && setShowInPicker(true)}
                      activeOpacity={isMissingPunchOut ? 1 : 0.7}
                    >
                      <View style={{ backgroundColor: isMissingPunchOut ? (isDarkMode ? 'rgba(255,255,255,0.05)' : '#64748B20') : colors.successLight, padding: 8, borderRadius: 10, marginRight: 10 }}>
                        <Ionicons name={isMissingPunchOut ? "lock-closed" : "log-in"} size={20} color={isMissingPunchOut ? colors.textMuted : colors.success} />
                      </View>
                      <View>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }}>
                          Punch In
                        </Text>
                        <Text style={[styles.timeValue, { color: colors.textDark }, isMissingPunchOut && { color: colors.textMuted }]}>{manualIn}</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.timeDisplay, { flex: 1, flexDirection: 'row', justifyContent: 'flex-start', backgroundColor: colors.bgMain, borderColor: colors.borderLight }, 
                        (new Date(`${reqDate}T${manualOut}:00`) <= new Date(`${reqDate}T${manualIn}:00`)) && { borderColor: colors.danger }]} 
                      onPress={() => setShowOutPicker(true)}
                    >
                      <View style={{ backgroundColor: colors.dangerLight, padding: 8, borderRadius: 10, marginRight: 10 }}>
                        <Ionicons name="log-out" size={20} color={colors.danger} />
                      </View>
                      <View>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }}>Punch Out</Text>
                        <Text style={[styles.timeValue, { color: colors.textDark }]}>{manualOut}</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                  
                  {(new Date(`${reqDate}T${manualOut}:00`) <= new Date(`${reqDate}T${manualIn}:00`)) && (
                    <Text style={{ color: colors.danger, fontSize: 11, fontWeight: '700', marginTop: 0, marginLeft: 4 }}>
                      <Ionicons name="warning" size={12} color={colors.danger} /> Out-time must be after In-time ({manualIn})
                    </Text>
                  )}
                </View>
              )}

              {reqType === 'Attendance Correction' && (
                <View style={{ marginBottom: 16 }}>
                   <Text style={[styles.inputLabel, { color: colors.textDark }]}>Work Report <Text style={{ color: colors.danger }}>*</Text></Text>
                   <TextInput 
                    style={[styles.input, { minHeight: 80, backgroundColor: colors.bgMain, borderColor: colors.borderLight, color: colors.textDark }]} 
                    multiline 
                    numberOfLines={4} 
                    value={workSummary} 
                    onChangeText={setWorkSummary} 
                    placeholder="Describe your work for this day..." 
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              )}

              <Text style={[styles.inputLabel, { color: colors.textDark }]}>Reason <Text style={{ color: colors.danger }}>*</Text></Text>
              <TextInput style={[styles.input, { backgroundColor: colors.bgMain, borderColor: colors.borderLight, color: colors.textDark }]} multiline numberOfLines={3} value={reason} onChangeText={setReason} placeholder="Explain why..." placeholderTextColor={colors.textMuted} />
              <TouchableOpacity 
                style={[
                  styles.submitBtn, 
                  { backgroundColor: colors.primary },
                  ((reqType === 'Leave' && filteredLeaves.length === 0) || submitting) && { backgroundColor: colors.border, opacity: 0.7 }
                ]} 
                onPress={handleSubmit} 
                disabled={submitting || (reqType === 'Leave' && filteredLeaves.length === 0)}
              >
                {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={[styles.submitBtnText, { color: colors.white }]}>Submit Request</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Filtered Days List Modal */}
      <Modal visible={!!filterModalType} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgCardElevated, borderColor: colors.borderLight }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textDark }]}>{filterModalType} Days</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  Tap any day to view full punch details
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFilterModalType(null)}>
                <Ionicons name="close" size={24} color={colors.textDark} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {(() => {
                const list = getFilteredDays();
                if (list.length === 0) {
                  return <Text style={[styles.emptyText, { color: colors.textMuted }]}>No {filterModalType} days found for this month.</Text>;
                }
                return list.map((item) => (
                  <TouchableOpacity 
                    key={item.date}
                    style={[styles.filterRow, SHADOW.sm, { padding: 0, overflow: 'hidden', backgroundColor: colors.bgCard, borderColor: colors.borderLight }]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedDate(item.date);
                      setFilterModalType(null);
                    }}
                  >
                    <View style={{ flexDirection: 'row' }}>
                      <View style={{ 
                        backgroundColor: filterModalType === 'Present' ? colors.successLight : filterModalType === 'Absent' ? colors.dangerLight : colors.warningLight, 
                        padding: 14, 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        borderRightWidth: 1, 
                        borderRightColor: colors.borderLight, 
                        width: 65 
                      }}>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: filterModalType === 'Present' ? colors.success : filterModalType === 'Absent' ? colors.danger : colors.warning }}>{format(new Date(item.date), 'dd')}</Text>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: filterModalType === 'Present' ? colors.success : filterModalType === 'Absent' ? colors.danger : colors.warning, textTransform: 'uppercase' }}>{format(new Date(item.date), 'MMM')}</Text>
                      </View>
                      <View style={{ flex: 1, padding: 14, justifyContent: 'center' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                           <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textDark }}>{format(new Date(item.date), 'EEEE')}</Text>
                           <View style={[styles.badge, { backgroundColor: filterModalType === 'Present' ? colors.successLight : filterModalType === 'Absent' ? colors.dangerLight : colors.warningLight }]}>
                             <Text style={[styles.badgeText, { color: filterModalType === 'Present' ? colors.success : filterModalType === 'Absent' ? colors.danger : colors.warning }]}>
                               {filterModalType}
                             </Text>
                           </View>
                        </View>
                        {item.record ? (
                          <View style={{ flexDirection: 'row', gap: 12 }}>
                             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success }} />
                                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textLight }}>In: {item.record.punchIn || '—'}</Text>
                             </View>
                             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: filterModalType === 'Punch Out Miss' ? colors.danger : colors.textLight }} />
                                <Text style={{ fontSize: 11, fontWeight: '700', color: filterModalType === 'Punch Out Miss' ? colors.danger : colors.textLight }}>Out: {item.record.punchOut || (filterModalType === 'Punch Out Miss' ? 'MISSING' : '—')}</Text>
                             </View>
                          </View>
                        ) : (
                          <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>No punch logs</Text>
                        )}
                      </View>
                      <View style={{ backgroundColor: colors.bgMain, width: 44, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: colors.borderLight }}>
                         <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                      </View>
                    </View>
                  </TouchableOpacity>
                ));
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <TimePickerModal visible={showInPicker} value={manualIn} label="In Time" onSelect={(v) => { setManualIn(v); setShowInPicker(false); }} onCancel={() => setShowInPicker(false)} />
      <TimePickerModal visible={showOutPicker} value={manualOut} label="Out Time" onSelect={(v) => { setManualOut(v); setShowOutPicker(false); }} onCancel={() => setShowOutPicker(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { padding: 24, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: '800' },
  subTitle: { fontSize: 13, marginTop: 4 },
  body: { padding: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statItem: { flex: 1, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1 },
  statVal: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  calendarCard: { borderRadius: 24, padding: 10, marginBottom: 20, borderWidth: 1 },
  detailCard: { borderRadius: 24, padding: 20, marginBottom: 24, borderWidth: 1 },
  detailTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16 },
  detailGrid: { flexDirection: 'row', gap: 16 },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 11, fontWeight: '600' },
  detailValue: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  emptyText: { textAlign: 'center', padding: 10 },
  requestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 14, borderRadius: 16, marginTop: 10 },
  requestBtnText: { fontSize: 14, fontWeight: '800' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sentRequestCard: { 
    borderRadius: 16, 
    padding: 16,
    borderWidth: 1,
  },
  sentRequestHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sentRequestTitle: { fontSize: 13, fontWeight: '800' },
  sentRequestRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  sentRequestLabel: { fontSize: 11, fontWeight: '700' },
  sentRequestValue: { fontSize: 11, fontWeight: '700', flex: 1, textAlign: 'right', marginLeft: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '90%', borderWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalBody: { gap: 16 },
  inputLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  input: { borderRadius: 14, padding: 16, fontSize: 14, textAlignVertical: 'top', borderWidth: 1 },
  typeSelector: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeBtn: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  typeBtnActive: { },
  typeBtnText: { fontWeight: '700' },
  typeBtnTextActive: { },
  timeDisplay: { padding: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  timeValue: { fontSize: 14, fontWeight: '700' },
  submitBtn: { padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  submitBtnText: { fontSize: 16, fontWeight: '800' },
  durBtn: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  durBtnActive: { },
  durBtnText: { fontWeight: '700', fontSize: 13 },
  durBtnTextActive: { },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  leaveTypesScroll: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ltBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  ltBadgeActive: { },
  ltText: { fontSize: 12, fontWeight: '600' },
  ltTextActive: { },
  tpOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  tpContent: { borderRadius: 24, padding: 24, width: '100%', maxWidth: 300, borderWidth: 1 },
  tpLabel: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 20 },
  tpPickers: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  tpSubLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  tpItem: { padding: 12, alignItems: 'center', borderRadius: 10 },
  tpItemActive: { },
  tpText: { fontSize: 16, fontWeight: '600' },
  tpTextActive: { fontWeight: '800' },
  tpDivider: { width: 1, height: 150, marginHorizontal: 20 },
  tpFooter: { flexDirection: 'row', gap: 12, marginTop: 24 },
  tpBtn: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  infoBox: { flexDirection: 'row', gap: 10, padding: 16, borderRadius: 14, marginBottom: 16, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 13, fontWeight: '600' },
  filterRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 16, 
    padding: 14, 
    marginBottom: 10,
    borderWidth: 1,
  },
  filterRowDate: { 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 10, 
    marginRight: 12,
    minWidth: 50
  },
  filterRowDayName: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  filterRowDateNum: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  filterRowDetails: { flex: 1 },
  filterRowTitle: { fontSize: 13, fontWeight: '700' },
});
