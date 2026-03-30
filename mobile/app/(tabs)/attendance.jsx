import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { apiFetch } from '../../utils/api';
import { ENDPOINTS } from '../../constants/api';
import { COLORS, SIZES, RADIUS, SHADOW } from '../../constants/theme';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import Toast from 'react-native-toast-message';

const TimePickerModal = ({ visible, value, onSelect, onCancel, label }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  
  const [h, m] = (value || '09:00').split(':');
  const [currH, setCurrH] = useState(h);
  const [currM, setCurrM] = useState(m);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.tpOverlay}>
        <View style={styles.tpContent}>
          <Text style={styles.tpLabel}>Select {label}</Text>
          <View style={styles.tpPickers}>
            <View style={{ flex: 1 }}>
              <Text style={styles.tpSubLabel}>Hour</Text>
              <ScrollView style={{ height: 200 }} showsVerticalScrollIndicator={false}>
                {hours.map(hr => (
                  <TouchableOpacity key={hr} style={[styles.tpItem, currH === hr && styles.tpItemActive]} onPress={() => setCurrH(hr)}>
                    <Text style={[styles.tpText, currH === hr && styles.tpTextActive]}>{hr}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.tpDivider} />
            <View style={{ flex: 1 }}>
              <Text style={styles.tpSubLabel}>Minute</Text>
              <ScrollView style={{ height: 200 }} showsVerticalScrollIndicator={false}>
                {minutes.map(mn => (
                  <TouchableOpacity key={mn} style={[styles.tpItem, currM === mn && styles.tpItemActive]} onPress={() => setCurrM(mn)}>
                    <Text style={[styles.tpText, currM === mn && styles.tpTextActive]}>{mn}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          <View style={styles.tpFooter}>
            <TouchableOpacity onPress={onCancel} style={[styles.tpBtn, { backgroundColor: COLORS.bgMain }]}>
              <Text style={{ color: COLORS.textMuted, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onSelect(`${currH}:${currM}`)} style={[styles.tpBtn, { backgroundColor: COLORS.primary }]}>
              <Text style={{ color: COLORS.white, fontWeight: '700' }}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const StatusBadge = ({ status, approvalStatus }) => {
  const isPresent = status === 'Present';
  const isAbsent = status === 'Absent';
  const isLeave = status === 'Leave' || status === 'Week Off';
  const isLate = status === 'Late' || status === 'Incomplete';

  let color = COLORS.textMuted;
  let bg = COLORS.bgMain;
  if (isPresent) { color = COLORS.success; bg = COLORS.successLight; }
  if (isAbsent) { color = COLORS.danger; bg = COLORS.dangerLight; }
  if (isLeave) { color = COLORS.purple; bg = COLORS.purpleLight; }
  if (isLate) { color = COLORS.warning; bg = COLORS.warningLight; }

  const approvalIcon = approvalStatus === 'Approved' ? 'checkmark-circle' : (approvalStatus === 'Rejected' ? 'close-circle' : 'time');
  const approvalColor = approvalStatus === 'Approved' ? COLORS.success : (approvalStatus === 'Rejected' ? COLORS.danger : COLORS.warning);

  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[styles.badgeText, { color }]}>{status}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: approvalColor + '15', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
        <Ionicons name={approvalIcon} size={10} color={approvalColor} />
        <Text style={[styles.badgeText, { color: approvalColor }]}>{approvalStatus || 'Pending'}</Text>
      </View>
    </View>
  );
};

export default function AttendanceScreen() {
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

  const loadData = async (m = month) => {
    try {
      const res = await apiFetch(`${ENDPOINTS.attendanceHistory}?month=${m}`);
      const json = await res.json();
      if (json.success) {
        setData(json.records);
        setAllRequests(json.requests || {});
        setJoiningDate(json.joiningDate);
        setWeekOffDays(json.weekOffDays || []);
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
    let sPresent = 0, sAbsent = 0, sHalfDay = 0, sLeaves = 0;
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
        if (r.status === 'Present') { dotColor = COLORS.success; sPresent++; }
        else if (r.status === 'Absent') { dotColor = COLORS.danger; sAbsent++; }
        else if (r.status === 'Leave') { dotColor = COLORS.purple; sLeaves++; }
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
          // If approved leave/correction
          let dotColor = req.type === 'Leave' ? COLORS.purple : COLORS.success;
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
    setStats({ present: sPresent, absent: sAbsent, halfDay: sHalfDay, leaves: sLeaves });
  };

  useEffect(() => { loadData(); }, []);

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

  const [showApply, setShowApply] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [reqType, setReqType] = useState('Leave');
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [reqDate, setReqDate] = useState('');
  const [reason, setReason] = useState('');
  const [manualIn, setManualIn] = useState('09:00');
  const [manualOut, setManualOut] = useState('18:00');
  const [showInPicker, setShowInPicker] = useState(false);
  const [showOutPicker, setShowOutPicker] = useState(false);

  useEffect(() => {
    const fetchLeaveTypes = async () => {
      const res = await apiFetch(ENDPOINTS.leaveTypes);
      const json = await res.json();
      if (json.success) setLeaveTypes(json.leaveTypes || json.data || []);
    };
    fetchLeaveTypes();
  }, []);

  const handleSubmit = async () => {
    if (!reason.trim()) return Toast.show({ type: 'error', text1: 'Please provide a reason' });
    setSubmitting(true);
    try {
      const payload = {
        requestType: reqType,
        date: reqDate,
        reason,
        leaveType: reqType === 'Leave' ? selectedLeaveType : undefined,
        manualIn: reqType === 'Attendance Correction' ? new Date(`${reqDate}T${manualIn}:00`) : undefined,
        manualOut: reqType === 'Attendance Correction' ? new Date(`${reqDate}T${manualOut}:00`) : undefined,
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
    setShowApply(true);
  };

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
            <View style={[styles.statItem, SHADOW.sm]}>
              <Text style={[styles.statVal, { color: COLORS.success }]}>{stats.present}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={[styles.statItem, SHADOW.sm]}>
              <Text style={[styles.statVal, { color: COLORS.danger }]}>{stats.absent}</Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
            <View style={[styles.statItem, SHADOW.sm]}>
              <Text style={[styles.statVal, { color: COLORS.warning }]}>{stats.halfDay}</Text>
              <Text style={styles.statLabel}>Half Day</Text>
            </View>
          </View>

          <View style={[styles.calendarCard, SHADOW.md]}>
            <Calendar
              onMonthChange={onMonthChange}
              onDayPress={(day) => setSelectedDate(day.dateString)}
              markedDates={{
                ...markedDates,
                ...(selectedDate ? { [selectedDate]: { ...markedDates[selectedDate], selected: true, selectedColor: COLORS.primary } } : {})
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
                    <StatusBadge status={selectedRecord.status} approvalStatus={selectedRecord.approvalStatus} />
                ) : currentRequest ? (
                    <StatusBadge status={currentRequest.type} approvalStatus={currentRequest.status} />
                ) : markedDates[selectedDate]?.isWeekOff ? (
                    <StatusBadge status="Week Off" approvalStatus="Approved" />
                ) : (
                    <StatusBadge status={isAbsent ? 'Absent' : 'Pending'} approvalStatus="Pending" />
                )}
              </View>

              {selectedRecord ? (
                <View style={styles.detailGrid}>
                  <View style={styles.detailItem}><Text style={styles.detailLabel}>In</Text><Text style={styles.detailValue}>{selectedRecord.punchIn || '—'}</Text></View>
                  <View style={styles.detailItem}><Text style={styles.detailLabel}>Out</Text><Text style={styles.detailValue}>{selectedRecord.punchOut || '—'}</Text></View>
                </View>
              ) : currentRequest ? (
                <View style={styles.sentRequestCard}>
                  <View style={styles.sentRequestHeader}>
                    <Ionicons name="information-circle" size={16} color={COLORS.primary} />
                    <Text style={styles.sentRequestTitle}>Request already sent</Text>
                  </View>
                  <View style={styles.sentRequestRow}>
                    <Text style={styles.sentRequestLabel}>Reason:</Text>
                    <Text style={styles.sentRequestValue}>{currentRequest.reason}</Text>
                  </View>
                  {currentRequest.type === 'Attendance Correction' && (
                    <View style={styles.sentRequestRow}>
                      <Text style={styles.sentRequestLabel}>Time:</Text>
                      <Text style={styles.sentRequestValue}>
                        {currentRequest.manualIn ? new Date(currentRequest.manualIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} 
                        {' - '} 
                        {currentRequest.manualOut ? new Date(currentRequest.manualOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
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
                  {isRedDate && (
                    <TouchableOpacity style={styles.requestBtn} onPress={openRequest}>
                      <Ionicons name="paper-plane-outline" size={18} color={COLORS.white} />
                      <Text style={styles.requestBtnText}>Request Attendance / Leave</Text>
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
              <Text style={styles.inputLabel}>Request For: {reqDate}</Text>
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
              {reqType === 'Leave' && leaveTypes.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.inputLabel}>Leave Type</Text>
                  <View style={styles.leaveTypesScroll}>
                    {leaveTypes.map(lt => (
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
              )}

              {reqType === 'Attendance Correction' && (
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                  <TouchableOpacity style={[styles.timeDisplay, { flex: 1 }]} onPress={() => setShowInPicker(true)}><Text style={styles.timeValue}>In: {manualIn}</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.timeDisplay, { flex: 1 }]} onPress={() => setShowOutPicker(true)}><Text style={styles.timeValue}>Out: {manualOut}</Text></TouchableOpacity>
                </View>
              )}

              <Text style={styles.inputLabel}>Reason</Text>
              <TextInput style={styles.input} multiline numberOfLines={3} value={reason} onChangeText={setReason} placeholder="Explain why..." />
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitBtnText}>Submit Request</Text>}
              </TouchableOpacity>
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
});
