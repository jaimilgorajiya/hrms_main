import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
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
          <Text style={styles.leaveType}>{request.requestType} - {request.leaveType?.name || 'General'}</Text>
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
          <Text style={styles.footerText}>{request.date}</Text>
        </View>
        {request.requestType === 'Attendance Correction' && (
          <View style={styles.footerItem}>
            <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.footerText}>
               {request.manualIn ? new Date(request.manualIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'} - 
               {request.manualOut ? new Date(request.manualOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
            </Text>
          </View>
        )}
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const res = await apiFetch(ENDPOINTS.myRequests);
      const json = await res.json();
      if (json.success) setRequests(json.requests);
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Failed to load requests' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Requests History</Text>
          <Text style={styles.subTitle}>Track your Leave & Attendance Correction requests</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.primary} />}
      >
        <View style={styles.body}>
          <Text style={styles.sectionTitle}>Request History</Text>
          {loading && !refreshing ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : requests.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={80} color={COLORS.border} />
              <Text style={styles.emptyText}>No requests found.</Text>
            </View>
          ) : (
            requests.map((r) => <RequestCard key={r._id} request={r} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgMain },
  header: { padding: 24, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: SIZES.xxl, fontWeight: '800', color: COLORS.textDark },
  subTitle: { fontSize: SIZES.sm, color: COLORS.textLight, marginTop: 4 },
  body: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark, marginBottom: 16 },
  leaveCard: { backgroundColor: COLORS.white, borderRadius: 24, padding: 20, marginBottom: 16 },
  leaveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  leaveType: { fontSize: 15, fontWeight: '800', color: COLORS.textDark },
  leaveReason: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },
  leaveDivider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: 14 },
  leaveFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { fontSize: 12, color: COLORS.textMain, fontWeight: '600' },
  remarkBox: { marginTop: 12, padding: 10, backgroundColor: COLORS.bgMain, borderRadius: 10 },
  remarkLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, marginBottom: 2 },
  remarkText: { fontSize: 12, color: COLORS.textDark },
  empty: { height: 300, justifyContent: 'center', alignItems: 'center', gap: 20 },
  emptyText: { fontSize: 16, color: COLORS.textMuted, fontWeight: '600' },
});
