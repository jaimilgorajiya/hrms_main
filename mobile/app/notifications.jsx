import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../utils/api';
import { ENDPOINTS } from '../constants/api';
import { SIZES, RADIUS, SHADOW } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { format } from 'date-fns';

export default function NotificationsScreen() {
  const { colors, isDarkMode } = useTheme();
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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bgMain }]}>
      {/* Navigation Header */}
      <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.bgMain }]}>
          <Ionicons name="arrow-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textDark }]}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} style={[styles.readAllBtn, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="checkmark-done" size={16} color={colors.primary} />
            <Text style={[styles.readAllText, { color: colors.primary }]}>Mark Read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {loading ? (
        <View style={[styles.center, { backgroundColor: colors.bgMain }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} style={{ backgroundColor: colors.bgMain }}>
          {notifications.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: colors.bgCard, borderColor: colors.borderLight }]}>
              <View style={[styles.iconWrap, { backgroundColor: colors.bgMain }]}>
                <Ionicons name="notifications-off-outline" size={36} color={colors.border} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textDark }]}>No Notifications</Text>
              <Text style={[styles.emptyText, { color: colors.textLight }]}>You're all caught up! Account updates and approvals will appear here.</Text>
            </View>
          ) : (
            notifications.map((n, i) => {
              const color = n.type === 'Attendance' ? colors.primary : (n.type === 'Leave' ? colors.purple : colors.warning);
              return (
                <View key={i} style={[
                  styles.card, 
                  { backgroundColor: colors.bgCard, borderColor: colors.borderLight },
                  !n.isRead && [styles.unreadCard, { backgroundColor: colors.bgCardElevated, borderColor: colors.primary + (isDarkMode ? '80' : '40') }]
                ]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.leftTitle}>
                      <View style={[styles.avatar, { backgroundColor: color + '15' }]}>
                        <Ionicons 
                          name={n.type === 'Attendance' ? "calendar-outline" : (n.type === 'Leave' ? "umbrella-outline" : "alert-circle-outline")} 
                          size={16} 
                          color={color} 
                        />
                      </View>
                      <Text style={[styles.title, { color: colors.textDark }]}>{n.title}</Text>
                    </View>
                    <Text style={[styles.time, { color: colors.textMuted }]}>
                      {n.createdAt ? format(new Date(n.createdAt), 'dd MMM, HH:mm') : ''}
                    </Text>
                  </View>
                  <Text style={[styles.message, { color: colors.textLight }]}>{n.message}</Text>
                  {!n.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
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
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  backBtn: { padding: 8, borderRadius: 12 },
  readAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  readAllText: { fontSize: 11, fontWeight: '700' },
  scroll: { padding: 20, gap: 12 },
  
  emptyContainer: {
    alignItems: 'center', paddingVertical: 48, paddingHorizontal: 20,
    borderRadius: 24, borderWidth: 1, ...SHADOW.soft, marginTop: 20,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 20, fontWeight: '500' },

  card: { padding: 16, borderRadius: 20, borderWidth: 1, ...SHADOW.soft, position: 'relative', overflow: 'hidden' },
  unreadCard: { },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  leftTitle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '800' },
  time: { fontSize: 11, fontWeight: '600' },
  message: { fontSize: 13, lineHeight: 20, paddingLeft: 42 },
  unreadDot: { position: 'absolute', top: 12, right: 12, width: 6, height: 6, borderRadius: 3 },
});
