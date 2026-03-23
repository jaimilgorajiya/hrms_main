import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch, getImageUrl } from '../../utils/api';
import { ENDPOINTS } from '../../constants/api';
import { COLORS, SIZES, RADIUS, SHADOW } from '../../constants/theme';
import Toast from 'react-native-toast-message';

const PayslipCard = ({ slip }) => {
  const url = getImageUrl(slip.file);
  return (
    <View style={[styles.slipCard, SHADOW.sm]}>
      <View style={styles.slipIcon}><Ionicons name="receipt" size={24} color={COLORS.purple} /></View>
      <View style={styles.slipContent}>
        <Text style={styles.slipTitle}>{slip.month || 'Salary Slip'}</Text>
        <Text style={styles.slipDate}>Generated: {new Date(slip.generatedAt || Date.now()).toLocaleDateString()}</Text>
        <TouchableOpacity style={styles.downloadBtn} onPress={() => Linking.openURL(url)}>
          <Ionicons name="download-outline" size={16} color={COLORS.white} />
          <Text style={styles.downloadText}>Download PDF</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function PayslipsScreen() {
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSlips = async () => {
    try {
      const res = await apiFetch(ENDPOINTS.employeeStats);
      const json = await res.json();
      if (json.success) setSlips(json.employee?.payslips || []);
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Load Failed', text2: 'Could not fetch payslips.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadSlips(); }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Payslips</Text>
        <Text style={styles.subTitle}>View and download your salary statements</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSlips(); }} tintColor={COLORS.primary} />}
        >
          {slips.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={80} color={COLORS.border} />
              <Text style={styles.emptyText}>No payslips available yet.</Text>
            </View>
          ) : (
            slips.map((s, idx) => <PayslipCard key={idx} slip={s} />)
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgMain },
  header: { padding: 24, paddingBottom: 10 },
  title: { fontSize: SIZES.xxl, fontWeight: '800', color: COLORS.textDark },
  subTitle: { fontSize: SIZES.sm, color: COLORS.textLight, marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  slipCard: { backgroundColor: COLORS.white, borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 16 },
  slipIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: COLORS.purpleLight, justifyContent: 'center', alignItems: 'center' },
  slipContent: { flex: 1 },
  slipTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark },
  slipDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, marginBottom: 12 },
  downloadBtn: { backgroundColor: COLORS.purple, height: 36, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, width: 140 },
  downloadText: { fontSize: 12, fontWeight: '800', color: COLORS.white },
  empty: { height: 400, justifyContent: 'center', alignItems: 'center', gap: 20 },
  emptyText: { fontSize: 16, color: COLORS.textMuted, fontWeight: '600' },
});
