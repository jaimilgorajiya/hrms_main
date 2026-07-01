import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, TouchableOpacity, TextInput, Pressable, Keyboard, KeyboardAvoidingView, Platform
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { format, addDays, isBefore, isSameDay } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiFetch } from '../../utils/api';
import { ENDPOINTS } from '../../constants/api';
import { SIZES, RADIUS, SHADOW } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import Toast from 'react-native-toast-message';

const RequestCard = ({ request }) => {
  const { colors } = useTheme();
  const isPending = request.status === 'Pending';
  const isApproved = request.status === 'Approved';
  const isRejected = request.status === 'Rejected';

  let color = colors.textMuted;
  let bg = colors.bgMain;
  if (isApproved) { color = colors.success; bg = colors.successLight; }
  if (isRejected) { color = colors.danger; bg = colors.dangerLight; }
  if (isPending) { color = colors.warning; bg = colors.warningLight; }

  return (
    <View style={[styles.leaveCard, SHADOW.sm, { backgroundColor: colors.bgCard, borderColor: colors.borderLight }]}>
      <View style={styles.leaveHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.leaveType, { color: colors.textDark }]}>{request.leaveType?.name || 'Leave Request'}</Text>
          <Text style={[styles.leaveReason, { color: colors.textLight }]} numberOfLines={2}>{request.reason}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: bg }]}>
          <Text style={[styles.statusText, { color }]}>{request.status}</Text>
        </View>
      </View>
      <View style={[styles.leaveDivider, { backgroundColor: colors.borderLight }]} />
      <View style={styles.leaveFooter}>
        <View style={styles.footerItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
             {request.fromDate === request.toDate ? request.fromDate : `${request.fromDate} to ${request.toDate}`}
          </Text>
        </View>
        {request.leaveDuration && (
          <View style={styles.footerItem}>
             <Ionicons name="time-outline" size={14} color={colors.textMuted} />
             <Text style={[styles.footerText, { color: colors.textMuted }]}>{request.leaveDuration}</Text>
          </View>
        )}
        <View style={styles.footerItem}>
           <Ionicons 
            name={request.leaveCategory === 'Paid' ? "card-outline" : "alert-circle-outline"} 
            size={14} 
            color={request.leaveCategory === 'Paid' ? colors.success : colors.warning} 
           />
           <Text style={[styles.footerText, { color: request.leaveCategory === 'Paid' ? colors.success : colors.warning }]}>
             {request.leaveCategory || 'Paid'}
           </Text>
        </View>
      </View>
      {request.adminRemark && (
        <View style={[styles.remarkBox, { backgroundColor: colors.bgMain, borderColor: colors.borderLight }]}>
          <Text style={[styles.remarkLabel, { color: colors.textMuted }]}>Admin Remark:</Text>
          <Text style={[styles.remarkText, { color: colors.textDark }]}>{request.adminRemark}</Text>
        </View>
      )}
    </View>
  );
};

export default function LeavesScreen() {
  const { colors, isDarkMode } = useTheme();
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  
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
        [date]: { startingDay: true, endingDay: true, color: colors.primary, textColor: 'white' }
      });
      return;
    }

    if (!fromDate || (fromDate && toDate && fromDate !== toDate)) {
      setFromDate(date);
      setToDate(null);
      setMarkedDates({
        [date]: { startingDay: true, color: colors.primary, textColor: 'white' }
      });
    } else if (fromDate && !toDate) {
      if (isBefore(new Date(date), new Date(fromDate))) {
        setFromDate(date);
        setMarkedDates({
          [date]: { startingDay: true, color: colors.primary, textColor: 'white' }
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
            color: colors.primary,
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
        [date]: { startingDay: true, color: colors.primary, textColor: 'white' }
      });
    }
  };

  const loadData = async () => {
    try {
      // Sequential fetching to prevent server timeouts
      const statsRes = await apiFetch(ENDPOINTS.stats || ENDPOINTS.employeeStats);
      const res = await apiFetch(ENDPOINTS.myRequests);
      const ltRes = await apiFetch(ENDPOINTS.leaveTypes);

      const statsJson = await statsRes.json();
      if (statsJson.success) {
        setStats(statsJson.stats);
        setUserProfile(statsJson.employee);
      }

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
            const color = req.status === 'Approved' ? colors.successLight : colors.warningLight;
            const textColor = req.status === 'Approved' ? colors.success : colors.warning;

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
    const maxLimit = stats?.maxUsagePerMonth || stats?.totalLeaves || 0;
    const usedLeaves = stats?.usedLeaves || 0;
    if (leaveCategory === 'Paid' && maxLimit > 0 && usedLeaves >= maxLimit) {
      return Toast.show({ type: 'error', text1: 'Limit Reached', text2: `You have already used your ${maxLimit} paid leaves for this month.` });
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
  const maxInMonth = stats?.maxUsagePerMonth || total;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bgMain }]} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
            <View>
               <Text style={[styles.title, { color: colors.textDark }]}>Leave Management</Text>
               <Text style={[styles.subTitle, { color: colors.textLight }]}>Check entitlement and apply for leave</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/holidays')}
              style={[styles.holidayBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '30' }]}
            >
              <Ionicons name="calendar" size={14} color={colors.primary} />
              <Text style={[styles.holidayBtnText, { color: colors.primary }]}>Holidays</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {/* Stats Cards */}
          {stats?.hasLeaveGroup ? (
            <>
              <View style={{ gap: 10, marginBottom: 20 }}>
                <View style={styles.summaryRow}>
                   <View style={[styles.summaryCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '20', borderWidth: 1 }]}>
                      <Text style={[styles.summaryVal, { color: colors.primaryLight === 'rgba(195, 192, 255, 0.12)' || isDarkMode ? colors.primary : '#4338CA' }]}>{total}</Text>
                      <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Entitlement</Text>
                   </View>
                   <View style={[styles.summaryCard, { backgroundColor: colors.successLight, borderColor: colors.success + '20', borderWidth: 1 }]}>
                      <Text style={[styles.summaryVal, { color: colors.success }]}>{balance}</Text>
                      <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Available</Text>
                   </View>
                </View>
                <View style={styles.summaryRow}>
                   <View style={[styles.summaryCard, { backgroundColor: colors.dangerLight, borderColor: colors.danger + '20', borderWidth: 1 }]}>
                      <Text style={[styles.summaryVal, { color: colors.danger }]}>{used}</Text>
                      <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Paid Used</Text>
                   </View>
                   <View style={[styles.summaryCard, { backgroundColor: colors.warningLight, borderColor: colors.warning + '20', borderWidth: 1 }]}>
                      <Text style={[styles.summaryVal, { color: colors.warning }]}>{stats?.usedUnpaidLeaves || 0}</Text>
                      <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Unpaid Taken</Text>
                   </View>
                </View>
              </View>

              {/* Policy Information */}
              <View style={[styles.policyCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '20' }]}>
                 <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                 <View style={{ flex: 1 }}>
                    <Text style={[styles.policyTitle, { color: colors.primary }]}>Leave Policy</Text>
                    <Text style={[styles.policyText, { color: colors.textDark }]}>
                       {isWholeOnly 
                        ? "Only full days can be applied as per your policy." 
                        : "You can apply for Full Day or Half Day leaves."}
                       {` \n\nMaximum Paid Leave You Can Use Per Month: ${maxInMonth}`}
                    </Text>
                 </View>
              </View>
            </>
          ) : (
            <View style={[styles.policyCard, { backgroundColor: colors.warningLight, borderColor: colors.warning + '20' }]}>
               <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
               <View style={{ flex: 1 }}>
                  <Text style={[styles.policyTitle, { color: colors.warning }]}>No Leave Group Assigned</Text>
                  <Text style={[styles.policyText, { color: colors.textDark }]}>You are not currently enrolled in any leave policy. Please contact HR for assistance.</Text>
               </View>
            </View>
          )}

          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Request History</Text>
          {loading && !refreshing ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : requests.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={80} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No leave requests found.</Text>
            </View>
          ) : (
            requests.map((r) => <RequestCard key={r._id} request={r} />)
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      {stats?.hasLeaveGroup && (
        <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary, borderColor: colors.white + (isDarkMode ? '20' : '40') }]} onPress={() => {
            setShowApply(true);
            const maxLimit = stats?.maxUsagePerMonth || stats?.totalLeaves || 0;
            const usedLeaves = stats?.usedLeaves || 0;
            if (maxLimit > 0 && usedLeaves >= maxLimit) {
                setLeaveCategory('Unpaid');
            } else {
                setLeaveCategory('Paid');
            }
        }} activeOpacity={0.8}>
           <Ionicons name="add" size={28} color={colors.white} />
        </TouchableOpacity>
      )}

      <Modal visible={showApply} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
            <View style={[styles.modalContent, { backgroundColor: colors.bgCardElevated, borderColor: colors.borderLight }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.modalTitle, { color: colors.textDark }]}>Apply for Leave</Text>
              <TouchableOpacity onPress={() => setShowApply(false)}><Ionicons name="close" size={24} color={colors.textDark} /></TouchableOpacity>
            </View>
            <ScrollView style={[styles.modalBody, { flexGrow: 0 }]} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              
              <View style={{ marginBottom: 20 }}>
                <Text style={[styles.inputLabel, { color: colors.textDark }]}>Select Period</Text>
                <Calendar
                  key={colors.bgCardElevated}
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
                    calendarBackground: colors.bgCardElevated,
                    selectedDayBackgroundColor: colors.primary,
                    selectedDayTextColor: colors.white,
                    todayTextColor: colors.primary,
                    dayTextColor: colors.textDark,
                    arrowColor: colors.primary,
                    monthTextColor: colors.textDark,
                    textMonthFontWeight: '800',
                    textDisabledColor: colors.textMuted + '40',
                  }}
                  style={{ backgroundColor: colors.bgCardElevated, borderRadius: 16, borderWidth: 1, borderColor: colors.borderLight }}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textDark }]}>From Date</Text>
                  <View style={[styles.inputNonEdit, { backgroundColor: colors.bgMain, borderBottomColor: colors.borderLight }]}><Text style={[styles.dateText, { color: colors.textDark }]}>{fromDate || 'Not selected'}</Text></View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textDark }]}>To Date</Text>
                  <View style={[styles.inputNonEdit, { backgroundColor: colors.bgMain, borderBottomColor: colors.borderLight }]}><Text style={[styles.dateText, { color: colors.textDark }]}>{toDate || fromDate || 'Not selected'}</Text></View>
                </View>
              </View>

              {leaveTypes.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={[styles.inputLabel, { color: colors.textDark }]}>Leave Type</Text>
                  <View style={styles.leaveTypesScroll}>
                    {leaveTypes.filter(lt => {
                        if (userProfile?.gender) {
                            if (lt.applicableFor === 'Male Only' && userProfile.gender !== 'Male') return false;
                            if (lt.applicableFor === 'Female Only' && userProfile.gender !== 'Female') return false;
                        }
                        return true;
                    }).map(lt => (
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
              )}

              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.inputLabel, { color: colors.textDark }]}>Duration</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={[styles.durBtn, { backgroundColor: colors.bgMain, borderColor: colors.borderLight }, leaveDuration === 'Full Day' && [styles.durBtnActive, { backgroundColor: colors.primary, borderColor: colors.primary }]]} onPress={() => setLeaveDuration('Full Day')}>
                    <Text style={[styles.durBtnText, { color: colors.textMuted }, leaveDuration === 'Full Day' && [styles.durBtnTextActive, { color: colors.white }]]}>Full Day</Text>
                  </TouchableOpacity>
                  {!isWholeOnly && (
                    <>
                      <TouchableOpacity style={[styles.durBtn, { backgroundColor: colors.bgMain, borderColor: colors.borderLight }, leaveDuration === 'First Half' && [styles.durBtnActive, { backgroundColor: colors.primary, borderColor: colors.primary }]]} onPress={() => { setLeaveDuration('First Half'); if (fromDate && toDate) { setToDate(null); setMarkedDates({ [fromDate]: { startingDay: true, endingDay: true, color: colors.primary, textColor: 'white' } }); } }}>
                        <Text style={[styles.durBtnText, { color: colors.textMuted }, leaveDuration === 'First Half' && [styles.durBtnTextActive, { color: colors.white }]]}>1st Half</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.durBtn, { backgroundColor: colors.bgMain, borderColor: colors.borderLight }, leaveDuration === 'Second Half' && [styles.durBtnActive, { backgroundColor: colors.primary, borderColor: colors.primary }]]} onPress={() => { setLeaveDuration('Second Half'); if (fromDate && toDate) { setToDate(null); setMarkedDates({ [fromDate]: { startingDay: true, endingDay: true, color: colors.primary, textColor: 'white' } }); } }}>
                        <Text style={[styles.durBtnText, { color: colors.textMuted }, leaveDuration === 'Second Half' && [styles.durBtnTextActive, { color: colors.white }]]}>2nd Half</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.inputLabel, { color: colors.textDark }]}>Leave Category</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {(() => {
                      const maxLimit = stats?.maxUsagePerMonth || stats?.totalLeaves || 0;
                      const usedLeaves = stats?.usedLeaves || 0;
                      const isLimitReached = maxLimit > 0 && usedLeaves >= maxLimit;
                      return (
                          <TouchableOpacity 
                            style={[
                              styles.durBtn, 
                              { backgroundColor: colors.bgMain, borderColor: colors.borderLight },
                              leaveCategory === 'Paid' && { backgroundColor: colors.success, borderColor: colors.success },
                              isLimitReached && { opacity: 0.4 }
                            ]} 
                            onPress={() => {
                                if (isLimitReached) {
                                    Toast.show({ type: 'error', text1: 'Limit Reached', text2: `You have already used your ${maxLimit} paid leaves for this month.` });
                                } else {
                                    setLeaveCategory('Paid');
                                }
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name="card-outline" size={16} color={leaveCategory === 'Paid' ? colors.white : colors.textMuted} />
                                <Text style={[styles.durBtnText, leaveCategory === 'Paid' && { color: colors.white }]}>Paid Leave</Text>
                            </View>
                          </TouchableOpacity>
                      );
                  })()}
                  {stats?.canApplyUnpaidLeave && (
                    <TouchableOpacity 
                        style={[styles.durBtn, { backgroundColor: colors.bgMain, borderColor: colors.borderLight }, leaveCategory === 'Unpaid' && { backgroundColor: colors.warning, borderColor: colors.warning }]} 
                        onPress={() => setLeaveCategory('Unpaid')}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="alert-circle-outline" size={16} color={leaveCategory === 'Unpaid' ? colors.white : colors.textMuted} />
                            <Text style={[styles.durBtnText, leaveCategory === 'Unpaid' && { color: colors.white }]}>Unpaid Leave</Text>
                        </View>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 4, fontWeight: '700' }}>
                   {leaveCategory === 'Paid' ? "* This will deduct from your paid leave balance." : "* This will NOT deduct from your paid leave balance."}
                </Text>
              </View>

              <Text style={[styles.inputLabel, { color: colors.textDark }]}>Reason</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.bgMain, color: colors.textDark, borderColor: colors.borderLight }]} multiline numberOfLines={3} value={reason} onChangeText={setReason} placeholder="Explain why you need this leave..." placeholderTextColor={colors.textMuted} />
              
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={[styles.submitBtnText, { color: colors.white }]}>Submit Application</Text>}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { padding: 24, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  holidayBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  holidayBtnText: { fontSize: 12, fontWeight: '800' },
  title: { fontSize: SIZES.xxl, fontWeight: '800' },
  subTitle: { fontSize: SIZES.sm, marginTop: 4 },
  body: { padding: 20 },
  fab: { 
    position: 'absolute', 
    bottom: 30, 
    right: 25, 
    width: 52, 
    height: 52, 
    borderRadius: 26, 
    justifyContent: 'center', 
    alignItems: 'center', 
    ...SHADOW.lg, 
    elevation: 8,
    borderWidth: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16, marginTop: 10 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, borderRadius: 16, padding: 12, alignItems: 'center' },
  summaryVal: { fontSize: 18, fontWeight: '800' },
  summaryLabel: { fontSize: 10, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  policyCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 20,
    borderWidth: 1,
  },
  policyTitle: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  policyText: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  leaveCard: { borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1 },
  leaveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  leaveType: { fontSize: 15, fontWeight: '800' },
  leaveReason: { fontSize: 13, marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },
  leaveDivider: { height: 1, marginVertical: 14 },
  leaveFooter: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', gap: 20 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { fontSize: 11, fontWeight: '700' },
  remarkBox: { marginTop: 12, padding: 10, borderRadius: 10, borderWidth: 1 },
  remarkLabel: { fontSize: 10, fontWeight: '700', marginBottom: 2 },
  remarkText: { fontSize: 12 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '85%', borderWidth: 1 },
  modalHeader: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalBody: { padding: 24 },
  inputLabel: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: { borderRadius: 16, padding: 16, fontSize: 14, marginBottom: 16, textAlignVertical: 'top', borderWidth: 1 },
  inputNonEdit: { borderRadius: 16, padding: 16, fontSize: 14, marginBottom: 16, borderBottomWidth: 1 },
  dateText: { fontSize: 14, fontWeight: '700' },
  ltBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  ltBadgeActive: { },
  ltText: { fontSize: 12, fontWeight: '700' },
  ltTextActive: { },
  leaveTypesScroll: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  durBtn: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  durBtnActive: { },
  durBtnText: { fontWeight: '700', fontSize: 13 },
  durBtnTextActive: { },
  submitBtn: { padding: 18, borderRadius: 18, alignItems: 'center', marginTop: 10, ...SHADOW.md },
  submitBtnText: { fontSize: 16, fontWeight: '800' },
  empty: { height: 300, justifyContent: 'center', alignItems: 'center', gap: 20 },
  emptyText: { fontSize: 16, fontWeight: '600' },
});
