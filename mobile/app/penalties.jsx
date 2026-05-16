import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../utils/api';
import { ENDPOINTS } from '../constants/api';
import { SIZES, RADIUS, SHADOW } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

export default function PenaltiesScreen() {
  const { colors, isDarkMode } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const fetchPenalties = async () => {
    try {
      const res = await apiFetch(ENDPOINTS.employeeStats);
      const json = await res.json();
      if (json.success) {
        setStats(json.stats);
      }
    } catch (e) {
      console.error('Fetch Penalties Error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPenalties();
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgMain }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const penaltyHistory = stats?.penaltyHistory || [];
  const monthPenalty = stats?.monthPenalty || 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bgMain }]}>
      {/* Navigation Header */}
      <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.bgMain }]}>
          <Ionicons name="arrow-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textDark }]}>Deduction Ledger</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Total Summary Block */}
        <View style={[styles.totalCard, { backgroundColor: colors.danger + '0A', borderColor: colors.danger + '30' }]}>
          <View>
            <Text style={[styles.totalLabel, { color: colors.textLight }]}>Total Liabilities</Text>
            <Text style={[styles.totalAmount, { color: colors.danger }]}>₹{monthPenalty}</Text>
          </View>
          <View style={[styles.totalIconWrap, { backgroundColor: colors.danger + '15' }]}>
            <Ionicons name="calculator" size={24} color={colors.danger} />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textLight }]}>Detailed Deductions</Text>

        {penaltyHistory.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.bgCard, borderColor: colors.borderLight }]}>
            <View style={[styles.successIconWrap, { backgroundColor: colors.successLight }]}>
              <Ionicons name="shield-checkmark" size={36} color={colors.success} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textDark }]}>No Penalties Recorded</Text>
            <Text style={[styles.emptyText, { color: colors.textLight }]}>Excellent compliance! No active deductions found for the current billing cycle.</Text>
          </View>
        ) : (
          penaltyHistory.map((p, i) => (
            <View key={i} style={[styles.penaltyCard, { backgroundColor: colors.bgCard, borderColor: colors.borderLight }]}>
              <View style={styles.penaltyLeft}>
                <View style={[styles.iconCircle, { backgroundColor: colors.bgMain }]}>
                  <Ionicons 
                    name={p.type === 'Late In' ? "time" : "walk"} 
                    size={20} 
                    color={p.type === 'Late In' ? colors.danger : colors.warning} 
                  />
                </View>
                <View>
                  <Text style={[styles.penaltyType, { color: colors.textDark }]}>{p.type}</Text>
                  <Text style={[styles.penaltyDate, { color: colors.textMuted }]}>
                    {new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              </View>
              <View style={styles.penaltyRight}>
                <Text style={[styles.penaltyAmount, { color: colors.danger }]}>- ₹{p.amount}</Text>
                <Text style={[styles.penaltySub, { color: colors.textLight }]}>Deducted</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  backBtn: { padding: 8, borderRadius: 12 },
  scroll: { padding: 20 },
  
  totalCard: { borderWidth: 1, borderRadius: 24, padding: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  totalLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  totalAmount: { fontSize: 32, fontWeight: '900', marginTop: 4 },
  totalIconWrap: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center' },

  sectionTitle: { fontSize: 15, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16, paddingHorizontal: 4 },

  emptyContainer: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 20, borderRadius: 24, borderWidth: 1, ...SHADOW.soft },
  successIconWrap: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 20, fontWeight: '500' },

  penaltyCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, ...SHADOW.soft },
  penaltyLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  penaltyType: { fontSize: 15, fontWeight: '800' },
  penaltyDate: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  penaltyRight: { alignItems: 'flex-end' },
  penaltyAmount: { fontSize: 16, fontWeight: '900' },
  penaltySub: { fontSize: 10, fontWeight: '700', marginTop: 2 },
});
