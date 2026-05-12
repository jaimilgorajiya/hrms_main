import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../utils/api';
import { ENDPOINTS } from '../constants/api';
import { COLORS, SHADOW } from '../constants/theme';
import { format } from 'date-fns';

export default function NotificationsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const res = await apiFetch(ENDPOINTS.notifications);
      const json = await res.json();
      if (json.success) {
        setNotifications(json.notifications || []);
        setUnreadCount(json.unreadCount || 0);
      }
    } catch (e) {
      console.error('Fetch Notifications Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      const res = await apiFetch(ENDPOINTS.readAllNotifications, { method: 'PUT' });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (e) {
      console.error('Mark Read Error:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} style={styles.readAllBtn}>
            <Ionicons name="checkmark-done" size={16} color={COLORS.primary} />
            <Text style={styles.readAllText}>Mark Read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.iconWrap}>
                <Ionicons name="notifications-off-outline" size={36} color={COLORS.border} />
              </View>
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptyText}>You're all caught up! Account updates and approvals will appear here.</Text>
            </View>
          ) : (
            notifications.map((n, i) => {
              const color = n.type === 'Attendance' ? COLORS.primary : (n.type === 'Leave' ? COLORS.purple : COLORS.warning);
              return (
                <View key={i} style={[styles.card, !n.isRead && styles.unreadCard]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.leftTitle}>
                      <View style={[styles.avatar, { backgroundColor: color + '15' }]}>
                        <Ionicons 
                          name={n.type === 'Attendance' ? "calendar-outline" : (n.type === 'Leave' ? "umbrella-outline" : "alert-circle-outline")} 
                          size={16} 
                          color={color} 
                        />
                      </View>
                      <Text style={styles.title}>{n.title}</Text>
                    </View>
                    <Text style={styles.time}>
                      {n.createdAt ? format(new Date(n.createdAt), 'dd MMM, HH:mm') : ''}
                    </Text>
                  </View>
                  <Text style={styles.message}>{n.message}</Text>
                  {!n.isRead && <View style={styles.unreadDot} />}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
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
  readAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8,
  },
  readAllText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  scroll: { padding: 20, gap: 12 },
  
  emptyContainer: {
    alignItems: 'center', paddingVertical: 48, paddingHorizontal: 20,
    backgroundColor: COLORS.white, borderRadius: 24, borderWidth: 1,
    borderColor: COLORS.borderLight, ...SHADOW.soft, marginTop: 20,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.bgMain,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark, marginBottom: 8 },
  emptyText: { fontSize: 13, color: COLORS.textLight, textAlign: 'center', lineHeight: 20, fontWeight: '500' },

  card: {
    backgroundColor: COLORS.white, padding: 16, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.borderLight + '60', ...SHADOW.soft,
    position: 'relative', overflow: 'hidden',
  },
  unreadCard: {
    borderColor: COLORS.primary + '30',
    backgroundColor: COLORS.primary + '04',
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  leftTitle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '800', color: COLORS.textDark },
  time: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  message: { fontSize: 13, color: COLORS.textLight, lineHeight: 20, paddingLeft: 42 },
  unreadDot: {
    position: 'absolute', top: 12, right: 12, width: 6, height: 6,
    borderRadius: 3, backgroundColor: COLORS.primary,
  },
});
