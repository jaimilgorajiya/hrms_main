import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, TouchableOpacity, TextInput
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { format, addDays, isBefore, isSameDay } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/api';
import { ENDPOINTS } from '../../constants/api';
import { COLORS, SIZES, RADIUS, SHADOW } from '../../constants/theme';
import Toast from 'react-native-toast-message';

const RequestCard = ({ request }) => {
  const isPending = request.status === 'Pending';
  const isApproved = request.status === 'Approved';
  const isRejected = request.status === 'Rejected';

  let color = COLORS.textMuted;
  let bg = COLORS.bgMain;
  if (isApproved) { color = COLORS.success; bg = COLORS.successLight; }
  if (isRejected) { color = COLORS.danger; bg = COLORS.dangerLight; }
  if (isPending) { color = COLORS.warning; bg = COLORS.warningLight; }

  return (
    <View style={[styles.leaveCard, SHADOW.sm]}>
      <View style={styles.leaveHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.leaveType}>{request.leaveType?.name || 'Leave Request'}</Text>
          <Text style={styles.leaveReason} numberOfLines={2}>{request.reason}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: bg }]}>
          <Text style={[styles.statusText, { color }]}>{request.status}</Text>
        </View>
      </View>
      <View style={styles.leaveDivider} />
      <View style={styles.leaveFooter}>
        <View style={styles.footerItem}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.footerText}>
             {request.fromDate === request.toDate ? request.fromDate : `${request.fromDate} to ${request.toDate}`}
          </Text>
        </View>
        {request.leaveDuration && (
          <View style={styles.footerItem}>
             <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
             <Text style={styles.footerText}>{request.leaveDuration}</Text>
          </View>
        )}
        <View style={styles.footerItem}>
           <Ionicons 
            name={request.leaveCategory === 'Paid' ? "card-outline" : "alert-circle-outline"} 
            size={14} 
            color={request.leaveCategory === 'Paid' ? COLORS.success : COLORS.warning} 
           />
           <Text style={[styles.footerText, { color: request.leaveCategory === 'Paid' ? COLORS.success : COLORS.warning }]}>
             {request.leaveCategory || 'Paid'}
           </Text>
        </View>
      </View>
      {request.adminRemark && (
        <View style={styles.remarkBox}>
          <Text style={styles.remarkLabel}>Admin Remark:</Text>
          <Text style={styles.remarkText}>{request.adminRemark}</Text>
        </View>
      )}
    </View>
  );
};

export default function LeavesScreen() {
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Apply Leave form states
  const [showApply, setShowApply] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [markedDates, setMarkedDates] = useState({});
  const [baseMarkedDates, setBaseMarkedDates] = useState({});
  const [reason, setReason] = useState('');
  const [leaveDuration, setLeaveDuration] = useState('Full Day');
  const [leaveCategory, setLeaveCategory] = useState('Paid');

  const onDayPress = (day) => {
    const date = day.dateString;
    if (baseMarkedDates[date]) return; // Block selection of existing leaves
    // Condition for Half Day (Only one day allowed)
    if (leaveDuration !== 'Full Day') {
      setFromDate(date);
      setToDate(date);
      setMarkedDates({
        [date]: { startingDay: true, endingDay: true, color: COLORS.primary, textColor: 'white' }
      });
      return;
    }

    if (!fromDate || (fromDate && toDate && fromDate !== toDate)) {
      setFromDate(date);
      setToDate(null);
      setMarkedDates({
        [date]: { startingDay: true, color: COLORS.primary, textColor: 'white' }
      });
    } else if (fromDate && !toDate) {
      if (isBefore(new Date(date), new Date(fromDate))) {
        setFromDate(date);
        setMarkedDates({
          [date]: { startingDay: true, color: COLORS.primary, textColor: 'white' }
        });
      } else {
        setToDate(date);
        // Calculate range
        let range = {};
        let current = new Date(fromDate);
        const end = new Date(date);
        while (current <= end) {
          const dStr = format(current, 'yyyy-MM-dd');
          range[dStr] = {
            color: COLORS.primary,
            textColor: 'white',
            ...(dStr === fromDate ? { startingDay: true } : {}),
            ...(dStr === date ? { endingDay: true } : {}),
          };
          current = addDays(current, 1);
        }
        setMarkedDates(range);
      }
    } else {
      // Single day selected already, reset to new start
      setFromDate(date);
      setToDate(null);
      setMarkedDates({
        [date]: { startingDay: true, color: COLORS.primary, textColor: 'white' }
      });
    }
  };

  const loadData = async () => {
    try {
      const [statsRes, res, ltRes] = await Promise.all([
        apiFetch(ENDPOINTS.employeeStats),
        apiFetch(ENDPOINTS.myRequests),
        leaveTypes.length === 0 ? apiFetch(ENDPOINTS.leaveTypes) : Promise.resolve(null)
      ]);

      const statsJson = await statsRes.json();
      if (statsJson.success) setStats(statsJson.stats);

      const json = await res.json();
      if (json.success) {
        const leaveRequests = json.requests.filter(r => r.requestType === 'Leave');
        setRequests(leaveRequests);

        // Process marked dates
        const historical = {};
        leaveRequests.forEach(req => {
            if (req.status === 'Rejected') return;
            const start = new Date(req.fromDate);
            const end = new Date(req.toDate);
            const color = req.status === 'Approved' ? COLORS.successLight : COLORS.warningLight;
            const textColor = req.status === 'Approved' ? COLORS.success : COLORS.warning;

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dStr = format(d, 'yyyy-MM-dd');
                historical[dStr] = { 
                    disabled: true, 
                    disableTouchEvent: true, 
                    color, 
                    textColor,
                    startingDay: dStr === req.fromDate,
                    endingDay: dStr === req.toDate
                };
            }
        });
        setBaseMarkedDates(historical);
      }

      if (ltRes) {
        const ltJson = await ltRes.json();
        if (ltJson.success) setLeaveTypes(ltJson.leaveTypes || ltJson.data || []);
      }
    } catch (e) {
      console.error('Leaves loadData error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async () => {
    const finalToDate = toDate || fromDate;
    if (!reason.trim() || !selectedLeaveType || !fromDate || !finalToDate) {
      return Toast.show({ type: 'error', text1: 'Required details missing' });
    }
    setSubmitting(true);
    try {
      const payload = {
        requestType: 'Leave',
        fromDate,
        toDate: finalToDate,
        reason,
        leaveType: selectedLeaveType,
        leaveDuration,
        leaveCategory
      };
      const res = await apiFetch(ENDPOINTS.submitRequest, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        Toast.show({ type: 'success', text1: 'Leave application submitted' });
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

  const total = stats?.totalLeaves || 0;
  const used = stats?.usedLeaves || 0;
  const balance = Math.max(0, total - used);
  const isWholeOnly = stats?.leavePolicy === 'Multiple of 1';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.primary} />}
      >
        <View style={styles.header}>
            <View>
               <Text style={styles.title}>Leave Management</Text>
               <Text style={styles.subTitle}>Check entitlement and apply for leave</Text>
            </View>
        </View>

        <View style={styles.body}>
          {/* Stats Cards */}
          {stats?.hasLeaveGroup ? (
            <>
              <View style={{ gap: 10, marginBottom: 20 }}>
                <View style={styles.summaryRow}>
                   <View style={[styles.summaryCard, { backgroundColor: '#EEF2FF' }]}>
                      <Text style={[styles.summaryVal, { color: '#4338CA' }]}>{total}</Text>
                      <Text style={styles.summaryLabel}>Entitlement</Text>
                   </View>
                   <View style={[styles.summaryCard, { backgroundColor: '#ECFDF5' }]}>
                      <Text style={[styles.summaryVal, { color: '#047857' }]}>{balance}</Text>
                      <Text style={styles.summaryLabel}>Available</Text>
                   </View>
                </View>
                <View style={styles.summaryRow}>
                   <View style={[styles.summaryCard, { backgroundColor: '#FEF2F2' }]}>
                      <Text style={[styles.summaryVal, { color: '#B91C1C' }]}>{used}</Text>
                      <Text style={styles.summaryLabel}>Paid Used</Text>
                   </View>
                   <View style={[styles.summaryCard, { backgroundColor: '#FFF7ED' }]}>
                      <Text style={[styles.summaryVal, { color: '#C2410C' }]}>{stats?.usedUnpaidLeaves || 0}</Text>
                      <Text style={styles.summaryLabel}>Unpaid Taken</Text>
                   </View>
                </View>
              </View>

              {/* Policy Information */}
              <View style={styles.policyCard}>
                 <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
                 <View style={{ flex: 1 }}>
                    <Text style={styles.policyTitle}>Leave Policy</Text>
                    <Text style={styles.policyText}>
                       {isWholeOnly 
                        ? "Only full days can be applied as per your policy." 
                        : "You can apply for Full Day or Half Day leaves."}
                       {` \n\nMaximum Paid Leave You Can Use Per Month: ${stats?.maxPLMonth || total}`}
                    </Text>
                 </View>
              </View>
            </>
          ) : (
            <View style={styles.policyCard}>
               <Ionicons name="alert-circle-outline" size={20} color={COLORS.warning} />
               <View style={{ flex: 1 }}>
                  <Text style={[styles.policyTitle, { color: COLORS.warning }]}>No Leave Group Assigned</Text>
                  <Text style={styles.policyText}>You are not currently enrolled in any leave policy. Please contact HR for assistance.</Text>
               </View>
            </View>
          )}

          <Text style={styles.sectionTitle}>Request History</Text>
          {loading && !refreshing ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : requests.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={80} color={COLORS.border} />
              <Text style={styles.emptyText}>No leave requests found.</Text>
            </View>
          ) : (
            requests.map((r) => <RequestCard key={r._id} request={r} />)
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      {stats?.hasLeaveGroup && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowApply(true)} activeOpacity={0.8}>
           <Ionicons name="add" size={32} color={COLORS.white} />
        </TouchableOpacity>
      )}

      {/* New Request Modal */}
      <Modal visible={showApply} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply for Leave</Text>
              <TouchableOpacity onPress={() => setShowApply(false)}><Ionicons name="close" size={24} color={COLORS.textDark} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              
              <View style={{ marginBottom: 20 }}>
                <Text style={styles.inputLabel}>Select Period</Text>
                <Calendar
                  minDate={new Date().toISOString().split('T')[0]}
                  onDayPress={(dayObj) => {
                    const date = dayObj.dateString;
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const selected = new Date(date);
                    if (isBefore(selected, today)) return;
                    onDayPress(dayObj);
                  }}
                  markedDates={{ ...baseMarkedDates, ...markedDates }}
                  markingType={'period'}
                  theme={{
                    selectedDayBackgroundColor: COLORS.primary,
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: COLORS.primary,
                    arrowColor: COLORS.primary,
                    monthTextColor: COLORS.textDark,
                    textMonthFontWeight: '800',
                    textDisabledColor: COLORS.borderLight, // Style for disabled past dates
                  }}
                  style={{ borderRadius: 16, borderWeight: 1, borderColor: COLORS.borderLight }}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>From Date</Text>
                  <View style={styles.inputNonEdit}><Text style={styles.dateText}>{fromDate || 'Not selected'}</Text></View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>To Date</Text>
                  <View style={styles.inputNonEdit}><Text style={styles.dateText}>{toDate || fromDate || 'Not selected'}</Text></View>
                </View>
              </View>

              {leaveTypes.length > 0 && (
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

              <View style={{ marginBottom: 16 }}>
                <Text style={styles.inputLabel}>Duration</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={[styles.durBtn, leaveDuration === 'Full Day' && styles.durBtnActive]} onPress={() => setLeaveDuration('Full Day')}>
                    <Text style={[styles.durBtnText, leaveDuration === 'Full Day' && styles.durBtnTextActive]}>Full Day</Text>
                  </TouchableOpacity>
                  {!isWholeOnly && (
                    <>
                      <TouchableOpacity style={[styles.durBtn, leaveDuration === 'First Half' && styles.durBtnActive]} onPress={() => { setLeaveDuration('First Half'); if (fromDate && toDate) { setToDate(null); setMarkedDates({ [fromDate]: { startingDay: true, endingDay: true, color: COLORS.primary, textColor: 'white' } }); } }}>
                        <Text style={[styles.durBtnText, leaveDuration === 'First Half' && styles.durBtnTextActive]}>1st Half</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.durBtn, leaveDuration === 'Second Half' && styles.durBtnActive]} onPress={() => { setLeaveDuration('Second Half'); if (fromDate && toDate) { setToDate(null); setMarkedDates({ [fromDate]: { startingDay: true, endingDay: true, color: COLORS.primary, textColor: 'white' } }); } }}>
                        <Text style={[styles.durBtnText, leaveDuration === 'Second Half' && styles.durBtnTextActive]}>2nd Half</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={styles.inputLabel}>Leave Category</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity 
                    style={[styles.durBtn, leaveCategory === 'Paid' && { backgroundColor: COLORS.success, borderColor: COLORS.success }]} 
                    onPress={() => setLeaveCategory('Paid')}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="card-outline" size={16} color={leaveCategory === 'Paid' ? COLORS.white : COLORS.textMuted} />
                        <Text style={[styles.durBtnText, leaveCategory === 'Paid' && { color: COLORS.white }]}>Paid Leave</Text>
                    </View>
                  </TouchableOpacity>
                  {stats?.canApplyUnpaidLeave && (
                    <TouchableOpacity 
                        style={[styles.durBtn, leaveCategory === 'Unpaid' && { backgroundColor: COLORS.warning, borderColor: COLORS.warning }]} 
                        onPress={() => setLeaveCategory('Unpaid')}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="alert-circle-outline" size={16} color={leaveCategory === 'Unpaid' ? COLORS.white : COLORS.textMuted} />
                            <Text style={[styles.durBtnText, leaveCategory === 'Unpaid' && { color: COLORS.white }]}>Unpaid Leave</Text>
                        </View>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 4, fontWeight: '700' }}>
                   {leaveCategory === 'Paid' ? "* This will deduct from your paid leave balance." : "* This will NOT deduct from your paid leave balance."}
                </Text>
              </View>

              <Text style={styles.inputLabel}>Reason</Text>
              <TextInput style={styles.input} multiline numberOfLines={3} value={reason} onChangeText={setReason} placeholder="Explain why you need this leave..." />
              
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitBtnText}>Submit Application</Text>}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgMain },
  header: { padding: 24, paddingBottom: 10 },
  title: { fontSize: SIZES.xxl, fontWeight: '800', color: COLORS.textDark },
  subTitle: { fontSize: SIZES.sm, color: COLORS.textLight, marginTop: 4 },
  body: { padding: 20 },
  fab: { 
    position: 'absolute', 
    bottom: 30, 
    right: 25, 
    width: 65, 
    height: 65, 
    borderRadius: 32.5, 
    backgroundColor: COLORS.primary, 
    justifyContent: 'center', 
    alignItems: 'center', 
    ...SHADOW.lg, 
    elevation: 8,
    borderWidth: 2,
    borderColor: COLORS.white + '30'
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark, marginBottom: 16, marginTop: 10 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, borderRadius: 16, padding: 12, alignItems: 'center' },
  summaryVal: { fontSize: 18, fontWeight: '800' },
  summaryLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, marginTop: 2, textTransform: 'uppercase' },
  policyCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    backgroundColor: COLORS.primaryLight, 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.primary + '20'
  },
  policyTitle: { fontSize: 11, fontWeight: '800', color: COLORS.primary, textTransform: 'uppercase' },
  policyText: { fontSize: 13, color: COLORS.textMain, fontWeight: '600', marginTop: 2 },
  leaveCard: { backgroundColor: COLORS.white, borderRadius: 24, padding: 20, marginBottom: 16 },
  leaveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  leaveType: { fontSize: 15, fontWeight: '800', color: COLORS.textDark },
  leaveReason: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },
  leaveDivider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: 14 },
  leaveFooter: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', gap: 20 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700' },
  remarkBox: { marginTop: 12, padding: 10, backgroundColor: COLORS.bgMain, borderRadius: 10 },
  remarkLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, marginBottom: 2 },
  remarkText: { fontSize: 12, color: COLORS.textDark },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '85%' },
  modalHeader: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textDark },
  modalBody: { padding: 24 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginBottom: 8 },
  input: { backgroundColor: COLORS.bgMain, borderRadius: 16, padding: 16, fontSize: 14, color: COLORS.textDark, marginBottom: 16, textAlignVertical: 'top' },
  inputNonEdit: { backgroundColor: COLORS.bgMain, borderRadius: 16, padding: 16, fontSize: 14, color: COLORS.textDark, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  dateText: { fontSize: 14, fontWeight: '700', color: COLORS.textDark },
  ltBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: COLORS.bgMain, borderWidth: 1, borderColor: COLORS.borderLight },
  ltBadgeActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  ltText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700' },
  ltTextActive: { color: COLORS.white },
  leaveTypesScroll: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  durBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: COLORS.bgMain, alignItems: 'center', borderWidth: 1, borderColor: COLORS.borderLight },
  durBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  durBtnText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 13 },
  durBtnTextActive: { color: COLORS.white },
  submitBtn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 18, alignItems: 'center', marginTop: 10, ...SHADOW.md },
  submitBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  empty: { height: 300, justifyContent: 'center', alignItems: 'center', gap: 20 },
  emptyText: { fontSize: 16, color: COLORS.textMuted, fontWeight: '600' },
});
