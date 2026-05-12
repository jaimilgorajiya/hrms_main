import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../utils/api';
import { ENDPOINTS } from '../constants/api';
import { COLORS, SHADOW } from '../constants/theme';

export default function PenaltiesScreen() {
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const penaltyHistory = stats?.penaltyHistory || [];
  const monthPenalty = stats?.monthPenalty || 0;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Deduction Ledger</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Total Summary Block */}
        <View style={styles.totalCard}>
          <View>
            <Text style={styles.totalLabel}>Total Liabilities</Text>
            <Text style={styles.totalAmount}>₹{monthPenalty}</Text>
          </View>
          <View style={styles.totalIconWrap}>
            <Ionicons name="calculator" size={24} color={COLORS.danger} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Detailed Deductions</Text>

        {penaltyHistory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.successIconWrap}>
              <Ionicons name="shield-checkmark" size={36} color={COLORS.success} />
            </View>
            <Text style={styles.emptyTitle}>No Penalties Recorded</Text>
            <Text style={styles.emptyText}>Excellent compliance! No active deductions found for the current billing cycle.</Text>
          </View>
        ) : (
          penaltyHistory.map((p, i) => (
            <View key={i} style={styles.penaltyCard}>
              <View style={styles.penaltyLeft}>
                <View style={styles.iconCircle}>
                  <Ionicons 
                    name={p.type === 'Late In' ? "time" : "walk"} 
                    size={20} 
                    color={p.type === 'Late In' ? COLORS.danger : COLORS.warning} 
                  />
                </View>
                <View>
                  <Text style={styles.penaltyType}>{p.type}</Text>
                  <Text style={styles.penaltyDate}>
                    {new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              </View>
              <View style={styles.penaltyRight}>
                <Text style={styles.penaltyAmount}>- ₹{p.amount}</Text>
                <Text style={styles.penaltySub}>Deducted</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgMain },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgMain },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark },
  backBtn: { padding: 8, borderRadius: 12, backgroundColor: COLORS.bgMain },
  scroll: { padding: 20 },
  
  totalCard: {
    backgroundColor: COLORS.danger + '0A',
    borderWidth: 1,
    borderColor: COLORS.danger + '20',
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.danger,
    marginTop: 4,
  },
  totalIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.danger + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
    paddingHorizontal: 4,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOW.soft,
  },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.successLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },

  penaltyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight + '60',
    ...SHADOW.soft,
  },
  penaltyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.bgMain,
    justifyContent: 'center',
    alignItems: 'center',
  },
  penaltyType: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  penaltyDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  penaltyRight: {
    alignItems: 'flex-end',
  },
  penaltyAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.danger,
  },
  penaltySub: {
    fontSize: 10,
    color: COLORS.textLight,
    fontWeight: '700',
    marginTop: 2,
  },
});
