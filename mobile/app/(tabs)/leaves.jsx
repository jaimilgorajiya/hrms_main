import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/api';
import { ENDPOINTS } from '../../constants/api';
import { COLORS, SIZES, RADIUS, SHADOW } from '../../constants/theme';
import Toast from 'react-native-toast-message';

const LeaveCard = ({ leave }) => {
  const isPending = leave.status === 'Pending';
  const isApproved = leave.status === 'Approved';
  const isRejected = leave.status === 'Rejected';

  let color = COLORS.textMuted;
  let bg = COLORS.bgMain;
  if (isApproved) { color = COLORS.success; bg = COLORS.successLight; }
  if (isRejected) { color = COLORS.danger; bg = COLORS.dangerLight; }
  if (isPending) { color = COLORS.warning; bg = COLORS.warningLight; }

  return (
    <View style={[styles.leaveCard, SHADOW.sm]}>
      <View style={styles.leaveHeader}>
        <View>
          <Text style={styles.leaveType}>{leave.leaveType?.name || 'Leave Request'}</Text>
          <Text style={styles.leaveReason} numberOfLines={1}>{leave.reason}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: bg }]}>
          <Text style={[styles.statusText, { color }]}>{leave.status}</Text>
        </View>
      </View>
      <View style={styles.leaveDivider} />
      <View style={styles.leaveFooter}>
        <View style={styles.footerItem}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.footerText}>
            {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.footerItem}>
          <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.footerText}>{leave.duration} Days</Text>
        </View>
      </View>
    </View>
  );
};

export default function LeavesScreen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showApply, setShowApply] = useState(false);

  const loadData = async () => {
    try {
      const res = await apiFetch(ENDPOINTS.employeeStats);
      const json = await res.json();
      if (json.success) setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const stats = data?.stats || {};
  const leaves = data?.employee?.leaveRequests || [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Leave Management</Text>
          <Text style={styles.subTitle}>Check status or apply for new leave</Text>
        </View>
        <TouchableOpacity style={[styles.applyBtn, SHADOW.md]} onPress={() => setShowApply(true)}>
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.primary} />}
      >
        <View style={styles.body}>
          {/* Summary */}
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, SHADOW.sm]}>
              <Text style={styles.summaryLabel}>Total Balance</Text>
              <Text style={[styles.summaryVal, { color: COLORS.primary }]}>{stats.totalLeaves || 0}</Text>
              <Text style={styles.summarySub}>{stats.leaveGroupName || 'Standard'}</Text>
            </View>
            <View style={[styles.summaryCard, SHADOW.sm]}>
              <Text style={styles.summaryLabel}>Active Req</Text>
              <Text style={[styles.summaryVal, { color: COLORS.warning }]}>{leaves.filter(l => l.status === 'Pending').length}</Text>
              <Text style={styles.summarySub}>Pending approval</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>History</Text>
          {leaves.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="leaf-outline" size={80} color={COLORS.border} />
              <Text style={styles.emptyText}>No leave requests found.</Text>
            </View>
          ) : (
            leaves.map((l, idx) => <LeaveCard key={l._id || idx} leave={l} />)
          )}
        </View>
      </ScrollView>

      {/* Simple Apply Modal (UI Only for now) */}
      <Modal visible={showApply} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply for Leave</Text>
              <TouchableOpacity onPress={() => setShowApply(false)}><Ionicons name="close" size={24} color={COLORS.textDark} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Reason for Leave</Text>
              <TextInput style={styles.input} placeholder="Family function, medical, etc." multiline numberOfLines={3} />
              <TouchableOpacity style={styles.submitBtn} onPress={() => { setShowApply(false); Toast.show({ type: 'info', text1: 'Feature coming soon' }); }}>
                <Text style={styles.submitBtnText}>Submit Request</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgMain },
  header: { padding: 24, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: SIZES.xxl, fontWeight: '800', color: COLORS.textDark },
  subTitle: { fontSize: SIZES.sm, color: COLORS.textLight, marginTop: 4 },
  applyBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  body: { padding: 20 },
  summaryGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  summaryCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 24, padding: 18, alignItems: 'center' },
  summaryLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' },
  summaryVal: { fontSize: 28, fontWeight: '800', marginVertical: 4 },
  summarySub: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark, marginBottom: 16 },
  leaveCard: { backgroundColor: COLORS.white, borderRadius: 24, padding: 20, marginBottom: 16 },
  leaveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  leaveType: { fontSize: 16, fontWeight: '800', color: COLORS.textDark },
  leaveReason: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  leaveDivider: { height: 1, backgroundColor: COLORS.borderLight, my: 15, marginVertical: 14 },
  leaveFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { fontSize: 12, color: COLORS.textMain, fontWeight: '600' },
  empty: { height: 300, justifyContent: 'center', alignItems: 'center', gap: 20 },
  emptyText: { fontSize: 16, color: COLORS.textMuted, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textDark },
  modalBody: { gap: 16 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textMain, marginBottom: 8 },
  input: { backgroundColor: COLORS.bgMain, borderRadius: 14, padding: 16, fontSize: 14, color: COLORS.textDark, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 24 },
  submitBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
});
