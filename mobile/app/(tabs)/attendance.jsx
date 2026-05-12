import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { apiFetch } from '../../utils/api';
import { ENDPOINTS } from '../../constants/api';
import { COLORS, SIZES, RADIUS, SHADOW } from '../../constants/theme';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import Toast from 'react-native-toast-message';

import ClockPicker from '../../components/ClockPicker';

const TimePickerModal = (props) => <ClockPicker {...props} />;

const StatusBadge = ({ status, approvalStatus, category }) => {
  const isPresent = status === 'Present';
  const isAbsent = status === 'Absent';
  const isLeave = status === 'Leave' || status === 'On Leave';
  const isWeekOff = status === 'Week Off';
  const isLate = status === 'Late' || status === 'Incomplete' || status === 'Clocked In';
  const isMissing = status === 'Missing' || status === 'Ghost';

  let color = COLORS.textMuted;
  let bg = COLORS.bgMain;
  if (approvalStatus === 'Rejected') {
    color = COLORS.danger; bg = COLORS.dangerLight;
  } else if (approvalStatus === 'Pending' && (status === 'Leave' || status === 'Attendance Correction')) {
    color = COLORS.warning; bg = COLORS.warningLight;
  } else if (isPresent) { color = COLORS.success; bg = COLORS.successLight; }
  else if (isAbsent || isLeave) { color = COLORS.danger; bg = COLORS.dangerLight; }
  else if (isWeekOff) { color = COLORS.purple; bg = COLORS.purpleLight; }
  else if (isLate || isMissing) { color = COLORS.warning; bg = COLORS.warningLight; }

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
      if (filterModalType === 'Present') return md?.dotColor === COLORS.success;
      if (filterModalType === 'Absent') return md?.dotColor === COLORS.danger;
      if (filterModalType === 'Punch Out Miss') {
        const req = allRequests[date];
        if (req && (req.status === 'Pending' || req.status === 'Approved')) return false;
        return md?.dotColor === COLORS.warning && data.find(r => r.date === date)?.punchIn && !data.find(r => r.date === date)?.punchOut;
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
        let dotColor = COLORS.textMuted;
        const isMissingOut = r.punchIn && !r.punchOut;
        
        if (isMissingOut) { 
          dotColor = COLORS.warning; 
          if (!req || (req.status !== 'Pending' && req.status !== 'Approved')) {
            sMissingOut++; 
          }
        } // Orange for missing punch out
        else if (r.status === 'Present') { dotColor = COLORS.success; sPresent++; }
        else if (r.status === 'Absent') { dotColor = COLORS.danger; sAbsent++; }
        else if (r.status === 'Leave' || r.status === 'On Leave') { dotColor = COLORS.danger; sLeaves++; }
        else { dotColor = COLORS.warning; sHalfDay++; }

        marked[dateStr] = {
          marked: true,
          dotColor,
          customStyles: {
            container: { backgroundColor: dotColor + '10', borderRadius: 8 },
            text: { color: dotColor, fontWeight: '700' }
          }
        };
      } else if (req && req.status === 'Approved') {
          let dotColor = req.type === 'Leave' ? COLORS.danger : COLORS.success;
          marked[dateStr] = { marked: true, dotColor, customStyles: { container: { backgroundColor: dotColor + '10', borderRadius: 8 }, text: { color: dotColor, fontWeight: '700' } } };
      } else if (req && req.status === 'Rejected') {
          let dotColor = COLORS.danger;
          marked[dateStr] = { marked: true, dotColor, customStyles: { container: { backgroundColor: dotColor + '10', borderRadius: 8 }, text: { color: dotColor, fontWeight: '700' } } };
          if (dateStr < today && (!jDate || dateStr >= jDate)) sAbsent++;
      } else if (req && req.status === 'Pending') {
          let dotColor = COLORS.warning;
          marked[dateStr] = { marked: true, dotColor, customStyles: { container: { backgroundColor: dotColor + '10', borderRadius: 8 }, text: { color: dotColor, fontWeight: '700' } } };
      } else if (isWeekOff) {
          marked[dateStr] = {
            marked: true,
            dotColor: COLORS.purple,
            isWeekOff: true,
            customStyles: {
              container: { backgroundColor: COLORS.purple + '10', borderRadius: 8 },
              text: { color: COLORS.purple, fontWeight: '700' }
            }
          };
      } else if (dateStr < today && (!jDate || dateStr >= jDate)) {
        sAbsent++;
        marked[dateStr] = {
          marked: true,
          dotColor: COLORS.danger,
          customStyles: {
            container: { backgroundColor: COLORS.danger + '10', borderRadius: 8 },
            text: { color: COLORS.danger, fontWeight: '700' }
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
  const isRedDate = (markedDates[selectedDate]?.dotColor === COLORS.danger) || isAbsent;
  
  // Allow request if absent OR if punch out is missing OR if incomplete/late
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isMissingPunchOut = selectedRecord && selectedRecord.punchIn && !selectedRecord.punchOut && selectedDate !== todayStr;
  const isIncomplete = selectedRecord && (selectedRecord.status === 'Incomplete' || selectedRecord.status === 'Half Day' || selectedRecord.status === 'Late' || selectedRecord.status === 'Absent');
  const isPastDate = selectedDate < todayStr;
  const isFutureDate = selectedDate > todayStr;
  const canRequest = !currentRequest && (isRedDate || isMissingPunchOut || (isPastDate && isIncomplete) || isFutureDate || (selectedDate === todayStr && !selectedRecord));



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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Attendance History</Text>
          <Text style={styles.subTitle}>Logs and stats for {format(currentMonth, 'MMMM yyyy')}</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.statsRow}>
            <TouchableOpacity style={[styles.statItem, SHADOW.sm]} activeOpacity={0.7} onPress={() => setFilterModalType('Present')}>
              <Text style={[styles.statVal, { color: COLORS.success }]}>{stats.present}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statItem, SHADOW.sm]} activeOpacity={0.7} onPress={() => setFilterModalType('Absent')}>
              <Text style={[styles.statVal, { color: COLORS.danger }]}>{stats.absent}</Text>
              <Text style={styles.statLabel}>Absent</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statItem, SHADOW.sm]} activeOpacity={0.7} onPress={() => setFilterModalType('Punch Out Miss')}>
              <Text style={[styles.statVal, { color: COLORS.warning }]}>{stats.missingOut || 0}</Text>
              <Text style={styles.statLabel}>Punch Out Miss</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.calendarCard, SHADOW.md]}>
            <Calendar
              onMonthChange={onMonthChange}
              onDayPress={(day) => setSelectedDate(day.dateString)}
              markedDates={{
                ...markedDates,
                ...(selectedDate ? { 
                  [selectedDate]: { 
                    ...markedDates[selectedDate], 
                    customStyles: { 
                      container: { backgroundColor: COLORS.primary, borderRadius: 10 }, 
                      text: { color: COLORS.white, fontWeight: '800' } 
                    } 
                  } 
                } : {})
              }}
              markingType={'custom'}
              theme={{
                calendarBackground: COLORS.white,
                selectedDayBackgroundColor: COLORS.primary,
                todayTextColor: COLORS.primary,
                dayTextColor: COLORS.textDark,
                textDisabledColor: COLORS.border,
                monthTextColor: COLORS.textDark,
                textDayFontWeight: '600',
                textMonthFontWeight: '800'
              }}
            />
          </View>

          {selectedDate && (
            <View style={[styles.detailCard, SHADOW.sm]}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>{format(new Date(selectedDate), 'dd MMMM yyyy')}</Text>
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
                    <View style={styles.detailItem}><Text style={styles.detailLabel}>In</Text><Text style={styles.detailValue}>{selectedRecord.punchIn || '—'}</Text></View>
                    <View style={styles.detailItem}><Text style={styles.detailLabel}>Out</Text><Text style={styles.detailValue}>{selectedRecord.punchOut || '—'}</Text></View>
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
                          <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>
                              Work Report / History
                            </Text>
                            {summaries.map((s, idx) => (
                              <Text key={idx} style={{ fontSize: 13, color: '#1E293B', lineHeight: 18, marginTop: idx > 0 ? 6 : 0 }}>
                                {s}
                              </Text>
                            ))}
                          </View>
                        )}

                        {(lReasons.length > 0 || selectedRecord.lateInPenalty?.isLate) && (
                          <View style={{ backgroundColor: '#FFF7ED', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#FFEDD5' }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#C2410C', textTransform: 'uppercase' }}>
                              Late Arrival
                            </Text>
                            <Text style={{ fontSize: 12, color: '#9A3412', fontWeight: '600', marginTop: 2 }}>
                              {lReasons.join(' · ') || 'Marked as late entry by shift policy.'}
                            </Text>
                          </View>
                        )}

                        {(eReasons.length > 0 || selectedRecord.earlyOutPenalty?.amount > 0) && (
                          <View style={{ backgroundColor: '#FEF2F2', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#FEE2E2' }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#DC2626', textTransform: 'uppercase' }}>
                              Early Departure
                            </Text>
                            <Text style={{ fontSize: 12, color: '#991B1B', fontWeight: '600', marginTop: 2 }}>
                              {eReasons.join(' · ') || 'Marked as early departure.'}
                            </Text>
                          </View>
                        )}

                        {gReasons.length > 0 && (
                          <View style={{ backgroundColor: '#FEF3C7', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#FDE68A' }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309', textTransform: 'uppercase' }}>
                              Out of Range Punch
                            </Text>
                            <Text style={{ fontSize: 12, color: '#92400E', fontWeight: '600', marginTop: 2 }}>
                              {gReasons.join(' · ')}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })()}

                  {(isMissingPunchOut || (selectedDate < todayStr && isIncomplete)) && (
                    currentRequest ? (
                      <View style={[styles.sentRequestCard, { marginTop: 20 }, currentRequest.status === 'Rejected' && { backgroundColor: COLORS.dangerLight, borderColor: COLORS.danger + '40' }]}>
                        <View style={styles.sentRequestHeader}>
                          <Ionicons name={currentRequest.status === 'Rejected' ? "close-circle" : "checkmark-done-circle"} size={18} color={currentRequest.status === 'Rejected' ? COLORS.danger : COLORS.primary} />
                          <Text style={[styles.sentRequestTitle, currentRequest.status === 'Rejected' && { color: COLORS.danger }]}>
                            {currentRequest.status === 'Rejected' ? (isMissingPunchOut ? 'Punch out correction rejected' : 'Correction request rejected') : (isMissingPunchOut ? 'Punch out missing request is already sent' : 'Correction request is already sent')}
                          </Text>
                        </View>
                        {currentRequest.reason && (
                          <View style={styles.sentRequestRow}>
                             <Text style={styles.sentRequestLabel}>Reason:</Text>
                             <Text style={styles.sentRequestValue}>{currentRequest.reason}</Text>
                          </View>
                        )}
                        {currentRequest.workSummary && (
                          <View style={styles.sentRequestRow}>
                            <Text style={styles.sentRequestLabel}>Report:</Text>
                            <Text style={styles.sentRequestValue}>{currentRequest.workSummary}</Text>
                          </View>
                        )}
                        {currentRequest.adminRemark && (
                          <View style={styles.sentRequestRow}>
                            <Text style={styles.sentRequestLabel}>Admin:</Text>
                            <Text style={[styles.sentRequestValue, { fontStyle: 'italic', color: COLORS.primary }]}>{currentRequest.adminRemark}</Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <TouchableOpacity style={[styles.requestBtn, { marginTop: 20 }]} onPress={openRequest}>
                        <Ionicons name="build-outline" size={18} color={COLORS.white} />
                        <Text style={styles.requestBtnText}>{isMissingPunchOut ? "Request Punch Out Correction" : "Request Correction"}</Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              ) : currentRequest ? (
                <View style={[styles.sentRequestCard, currentRequest.status === 'Rejected' && { backgroundColor: COLORS.dangerLight, borderColor: COLORS.danger + '40' }]}>
                  <View style={styles.sentRequestHeader}>
                    <Ionicons name={currentRequest.status === 'Rejected' ? "close-circle" : "information-circle"} size={16} color={currentRequest.status === 'Rejected' ? COLORS.danger : COLORS.primary} />
                    <Text style={[styles.sentRequestTitle, currentRequest.status === 'Rejected' && { color: COLORS.danger }]}>
                      {currentRequest.status === 'Rejected' ? `Request Rejected (${currentRequest.type})` : `Request already sent (${currentRequest.type})`}
                    </Text>
                  </View>
                  <View style={styles.sentRequestRow}>
                    <Text style={styles.sentRequestLabel}>Reason:</Text>
                    <Text style={styles.sentRequestValue}>{currentRequest.reason}</Text>
                  </View>
                  {currentRequest.workSummary && (
                    <View style={styles.sentRequestRow}>
                      <Text style={styles.sentRequestLabel}>Report:</Text>
                      <Text style={styles.sentRequestValue}>{currentRequest.workSummary}</Text>
                    </View>
                  )}
                  {currentRequest.adminRemark && (
                    <View style={styles.sentRequestRow}>
                      <Text style={styles.sentRequestLabel}>Admin:</Text>
                      <Text style={[styles.sentRequestValue, { fontStyle: 'italic', color: COLORS.primary }]}>{currentRequest.adminRemark}</Text>
                    </View>
                  )}
                  {currentRequest.type === 'Attendance Correction' && (
                    <View style={styles.sentRequestRow}>
                      <Text style={styles.sentRequestLabel}>Time:</Text>
                      <Text style={styles.sentRequestValue}>
                        {(currentRequest.manualIn || currentRequest.inTime) ? new Date(currentRequest.manualIn || currentRequest.inTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} 
                        {' - '} 
                        {(currentRequest.manualOut || currentRequest.outTime) ? new Date(currentRequest.manualOut || currentRequest.outTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </Text>
                    </View>
                  )}
                  {currentRequest.leaveType && (
                    <View style={styles.sentRequestRow}>
                      <Text style={styles.sentRequestLabel}>Leave:</Text>
                      <Text style={styles.sentRequestValue}>{currentRequest.leaveType}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View>
                  <Text style={styles.emptyText}>No logs recorded for this day.</Text>
                  {canRequest && (
                    <TouchableOpacity style={styles.requestBtn} onPress={openRequest}>
                      <Ionicons name={isMissingPunchOut ? "build-outline" : "paper-plane-outline"} size={18} color={COLORS.white} />
                      <Text style={styles.requestBtnText}>{isMissingPunchOut ? "Request Punch Out Correction" : "Request Attendance / Leave"}</Text>
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Request</Text>
              <TouchableOpacity onPress={() => setShowApply(false)}><Ionicons name="close" size={24} color={COLORS.textDark} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}><Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} /> {reqDate} {isMissingPunchOut && ` (In: ${selectedRecord?.punchIn || manualIn})`}</Text>

                    {!isMissingPunchOut && (
                      <View style={styles.typeSelector}>
                        <TouchableOpacity 
                          style={[styles.typeBtn, reqType === 'Leave' && styles.typeBtnActive]} 
                          onPress={() => setReqType('Leave')}
                        >
                          <Text style={[styles.typeBtnText, reqType === 'Leave' && styles.typeBtnTextActive]}>Leave</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.typeBtn, reqType === 'Attendance Correction' && styles.typeBtnActive]} 
                          onPress={() => setReqType('Attendance Correction')}
                        >
                          <Text style={[styles.typeBtnText, reqType === 'Attendance Correction' && styles.typeBtnTextActive]}>Attendance</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {reqType === 'Leave' && (
                      filteredLeaves.length === 0 ? (
                        <View style={styles.infoBox}>
                          <Ionicons name="information-circle" size={18} color={COLORS.warning} />
                          <Text style={styles.infoText}>
                            Leave requests are not available for this date. {reqDate < todayStr ? "Back-dated leaves are restricted." : "No applicable leave types found."}
                          </Text>
                        </View>
                      ) : (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={styles.inputLabel}>Leave Type</Text>
                          <View style={styles.leaveTypesScroll}>
                            {filteredLeaves.map(lt => (
                              <TouchableOpacity 
                                key={lt._id} 
                                style={[styles.ltBadge, selectedLeaveType === lt._id && styles.ltBadgeActive]}
                                onPress={() => setSelectedLeaveType(lt._id)}
                              >
                                <Text style={[styles.ltText, selectedLeaveType === lt._id && styles.ltTextActive]}>{lt.name}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )
                    )}

                    {reqType === 'Leave' && (
                      <View style={{ marginBottom: 16 }}>
                        <Text style={styles.inputLabel}>Leave Category</Text>
                        <View style={styles.typeSelector}>
                          <TouchableOpacity 
                            style={[styles.typeBtn, leaveCategory === 'Paid' && styles.typeBtnActive]} 
                            onPress={() => setLeaveCategory('Paid')}
                          >
                            <Text style={[styles.typeBtnText, leaveCategory === 'Paid' && styles.typeBtnTextActive]}>Paid</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.typeBtn, leaveCategory === 'Unpaid' && styles.typeBtnActive]} 
                            onPress={() => setLeaveCategory('Unpaid')}
                          >
                            <Text style={[styles.typeBtnText, leaveCategory === 'Unpaid' && styles.typeBtnTextActive]}>Unpaid</Text>
                          </TouchableOpacity>
                        </View>
                        {leaveCategory === 'Paid' && leaveStats.max > 0 && (
                          <Text style={{ fontSize: 11, color: leaveStats.used >= leaveStats.max ? COLORS.danger : COLORS.textMuted, fontWeight: '700', marginTop: -8 }}>
                            Monthly Usage: {leaveStats.used} / {leaveStats.max} {leaveStats.used >= leaveStats.max && '(Limit Reached)'}
                          </Text>
                        )}
                      </View>
                    )}


              {reqType === 'Leave' && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.inputLabel}>Duration</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity style={[styles.durBtn, leaveDuration === 'Full Day' && styles.durBtnActive]} onPress={() => setLeaveDuration('Full Day')}>
                      <Text style={[styles.durBtnText, leaveDuration === 'Full Day' && styles.durBtnTextActive]}>Full Day</Text>
                    </TouchableOpacity>
                    {leavePolicy !== 'Multiple of 1' && (
                      <>
                        <TouchableOpacity style={[styles.durBtn, leaveDuration === 'First Half' && styles.durBtnActive]} onPress={() => setLeaveDuration('First Half')}>
                          <Text style={[styles.durBtnText, leaveDuration === 'First Half' && styles.durBtnTextActive]}>1st Half</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.durBtn, leaveDuration === 'Second Half' && styles.durBtnActive]} onPress={() => setLeaveDuration('Second Half')}>
                          <Text style={[styles.durBtnText, leaveDuration === 'Second Half' && styles.durBtnTextActive]}>2nd Half</Text>
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
                        { flex: 1, flexDirection: 'row', justifyContent: 'flex-start' },
                        isMissingPunchOut && { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }
                      ]} 
                      onPress={() => !isMissingPunchOut && setShowInPicker(true)}
                      activeOpacity={isMissingPunchOut ? 1 : 0.7}
                    >
                      <View style={{ backgroundColor: isMissingPunchOut ? '#64748B20' : COLORS.success + '10', padding: 8, borderRadius: 10, marginRight: 10 }}>
                        <Ionicons name={isMissingPunchOut ? "lock-closed" : "log-in"} size={20} color={isMissingPunchOut ? "#64748B" : COLORS.success} />
                      </View>
                      <View>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' }}>
                          Punch In {isMissingPunchOut}
                        </Text>
                        <Text style={[styles.timeValue, isMissingPunchOut && { color: '#64748B' }]}>{manualIn}</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.timeDisplay, { flex: 1, flexDirection: 'row', justifyContent: 'flex-start' }, 
                        (new Date(`${reqDate}T${manualOut}:00`) <= new Date(`${reqDate}T${manualIn}:00`)) && { borderColor: COLORS.danger }]} 
                      onPress={() => setShowOutPicker(true)}
                    >
                      <View style={{ backgroundColor: COLORS.danger + '10', padding: 8, borderRadius: 10, marginRight: 10 }}>
                        <Ionicons name="log-out" size={20} color={COLORS.danger} />
                      </View>
                      <View>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' }}>Punch Out</Text>
                        <Text style={styles.timeValue}>{manualOut}</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                  
                  {(new Date(`${reqDate}T${manualOut}:00`) <= new Date(`${reqDate}T${manualIn}:00`)) && (
                    <Text style={{ color: COLORS.danger, fontSize: 11, fontWeight: '700', marginTop: 0, marginLeft: 4 }}>
                      <Ionicons name="warning" size={12} color={COLORS.danger} /> Out-time must be after In-time ({manualIn})
                    </Text>
                  )}
                </View>
              )}

              {reqType === 'Attendance Correction' && (
                <View style={{ marginBottom: 16 }}>
                   <Text style={styles.inputLabel}>Work Report <Text style={{ color: COLORS.danger }}>*</Text></Text>
                   <TextInput 
                    style={[styles.input, { minHeight: 80 }]} 
                    multiline 
                    numberOfLines={4} 
                    value={workSummary} 
                    onChangeText={setWorkSummary} 
                    placeholder="Describe your work for this day..." 
                  />
                </View>
              )}

              <Text style={styles.inputLabel}>Reason <Text style={{ color: COLORS.danger }}>*</Text></Text>
              <TextInput style={styles.input} multiline numberOfLines={3} value={reason} onChangeText={setReason} placeholder="Explain why..." />
              <TouchableOpacity 
                style={[
                  styles.submitBtn, 
                  ((reqType === 'Leave' && filteredLeaves.length === 0) || submitting) && { backgroundColor: COLORS.border, opacity: 0.7 }
                ]} 
                onPress={handleSubmit} 
                disabled={submitting || (reqType === 'Leave' && filteredLeaves.length === 0)}
              >
                {submitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitBtnText}>Submit Request</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Filtered Days List Modal */}
      <Modal visible={!!filterModalType} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{filterModalType} Days</Text>
                <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
                  Tap any day to view full punch details
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFilterModalType(null)}>
                <Ionicons name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {(() => {
                const list = getFilteredDays();
                if (list.length === 0) {
                  return <Text style={styles.emptyText}>No {filterModalType} days found for this month.</Text>;
                }
                return list.map((item) => (
                  <TouchableOpacity 
                    key={item.date}
                    style={[styles.filterRow, SHADOW.sm, { padding: 0, overflow: 'hidden' }]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedDate(item.date);
                      setFilterModalType(null);
                    }}
                  >
                    <View style={{ flexDirection: 'row' }}>
                      <View style={{ backgroundColor: filterModalType === 'Present' ? '#ECFDF5' : filterModalType === 'Absent' ? '#FEF2F2' : '#FFF7ED', padding: 14, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: filterModalType === 'Present' ? '#D1FAE5' : filterModalType === 'Absent' ? '#FEE2E2' : '#FFEDD5', width: 65 }}>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: filterModalType === 'Present' ? '#059669' : filterModalType === 'Absent' ? '#DC2626' : '#EA580C' }}>{format(new Date(item.date), 'dd')}</Text>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: filterModalType === 'Present' ? '#10B981' : filterModalType === 'Absent' ? '#EF4444' : '#F97316', textTransform: 'uppercase' }}>{format(new Date(item.date), 'MMM')}</Text>
                      </View>
                      <View style={{ flex: 1, padding: 14, justifyContent: 'center' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                           <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B' }}>{format(new Date(item.date), 'EEEE')}</Text>
                           <View style={[styles.badge, { backgroundColor: filterModalType === 'Present' ? COLORS.successLight : filterModalType === 'Absent' ? COLORS.dangerLight : COLORS.warningLight }]}>
                             <Text style={[styles.badgeText, { color: filterModalType === 'Present' ? COLORS.success : filterModalType === 'Absent' ? COLORS.danger : COLORS.warning }]}>
                               {filterModalType}
                             </Text>
                           </View>
                        </View>
                        {item.record ? (
                          <View style={{ flexDirection: 'row', gap: 12 }}>
                             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>In: {item.record.punchIn || '—'}</Text>
                             </View>
                             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: filterModalType === 'Punch Out Miss' ? '#EF4444' : '#64748B' }} />
                                <Text style={{ fontSize: 11, fontWeight: '700', color: filterModalType === 'Punch Out Miss' ? '#EF4444' : '#64748B' }}>Out: {item.record.punchOut || (filterModalType === 'Punch Out Miss' ? 'MISSING' : '—')}</Text>
                             </View>
                          </View>
                        ) : (
                          <Text style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: '600' }}>No punch logs</Text>
                        )}
                      </View>
                      <View style={{ backgroundColor: '#F8FAFC', width: 44, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#E2E8F0' }}>
                         <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
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
  safe: { flex: 1, backgroundColor: COLORS.bgMain },
  header: { padding: 24, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textDark },
  subTitle: { fontSize: 13, color: COLORS.textLight, marginTop: 4 },
  body: { padding: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statItem: { flex: 1, backgroundColor: COLORS.white, borderRadius: 16, padding: 12, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, marginTop: 2, textTransform: 'uppercase' },
  calendarCard: { backgroundColor: COLORS.white, borderRadius: 24, padding: 10, marginBottom: 20 },
  detailCard: { backgroundColor: COLORS.white, borderRadius: 24, padding: 20, marginBottom: 24 },
  detailTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark, marginBottom: 16 },
  detailGrid: { flexDirection: 'row', gap: 16 },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  detailValue: { fontSize: 15, fontWeight: '700', color: COLORS.textDark, marginTop: 4 },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, padding: 10 },
  requestBtn: { backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 14, borderRadius: 16, marginTop: 10 },
  requestBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sentRequestCard: { 
    backgroundColor: COLORS.primaryLight, 
    borderRadius: 16, 
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '20'
  },
  sentRequestHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sentRequestTitle: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  sentRequestRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  sentRequestLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  sentRequestValue: { fontSize: 11, fontWeight: '700', color: COLORS.textMain, flex: 1, textAlign: 'right', marginLeft: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textDark },
  modalBody: { gap: 16 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textMain, marginBottom: 8 },
  input: { backgroundColor: COLORS.bgMain, borderRadius: 14, padding: 16, fontSize: 14, color: COLORS.textDark, textAlignVertical: 'top' },
  typeSelector: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: COLORS.bgMain, alignItems: 'center' },
  typeBtnActive: { backgroundColor: COLORS.primary },
  typeBtnText: { color: COLORS.textMuted, fontWeight: '700' },
  typeBtnTextActive: { color: COLORS.white },
  timeDisplay: { backgroundColor: COLORS.bgMain, padding: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.borderLight },
  timeValue: { fontSize: 14, fontWeight: '700', color: COLORS.textDark },
  submitBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  durBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: COLORS.bgMain, alignItems: 'center', borderWidth: 1, borderColor: COLORS.borderLight },
  durBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  durBtnText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 13 },
  durBtnTextActive: { color: COLORS.white },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  leaveTypesScroll: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ltBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.bgMain },
  ltBadgeActive: { backgroundColor: COLORS.primary },
  ltText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  ltTextActive: { color: COLORS.white },
  tpOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  tpContent: { backgroundColor: COLORS.white, borderRadius: 24, padding: 24, width: '100%', maxWidth: 300 },
  tpLabel: { fontSize: 18, fontWeight: '800', color: COLORS.textDark, textAlign: 'center', marginBottom: 20 },
  tpPickers: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  tpSubLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textAlign: 'center', marginBottom: 8 },
  tpItem: { padding: 12, alignItems: 'center', borderRadius: 10 },
  tpItemActive: { backgroundColor: COLORS.primary + '15' },
  tpText: { fontSize: 16, fontWeight: '600', color: COLORS.textMain },
  tpTextActive: { color: COLORS.primary, fontWeight: '800' },
  tpDivider: { width: 1, height: 150, backgroundColor: COLORS.borderLight, marginHorizontal: 20 },
  tpFooter: { flexDirection: 'row', gap: 12, marginTop: 24 },
  tpBtn: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  infoBox: { flexDirection: 'row', gap: 10, backgroundColor: COLORS.warningLight, padding: 16, borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: COLORS.warning + '20' },
  infoText: { flex: 1, fontSize: 13, color: COLORS.warning, fontWeight: '600' },
  filterRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.white, 
    borderRadius: 16, 
    padding: 14, 
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight
  },
  filterRowDate: { 
    alignItems: 'center', 
    backgroundColor: COLORS.bgMain, 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 10, 
    marginRight: 12,
    minWidth: 50
  },
  filterRowDayName: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' },
  filterRowDateNum: { fontSize: 14, fontWeight: '800', color: COLORS.primary, marginTop: 2 },
  filterRowDetails: { flex: 1 },
  filterRowTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textDark },
});
