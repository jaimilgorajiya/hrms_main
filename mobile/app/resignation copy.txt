import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { format } from 'date-fns';
import { apiFetch } from '../utils/api';
import { ENDPOINTS } from '../constants/api';
import { SIZES, RADIUS, SHADOW } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import Toast from 'react-native-toast-message';

export default function ResignationScreen() {
  const { colors, isDarkMode } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resignation, setResignation] = useState(null);
  const [reason, setReason] = useState('');
  const [lwd, setLwd] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [policyNoticeDays, setPolicyNoticeDays] = useState(30);
  const [expectedLwd, setExpectedLwd] = useState('');

  const fetchStatus = async () => {
    try {
      const res = await apiFetch(ENDPOINTS.myResignation);
      const json = await res.json();
      if (json.success) {
        setResignation(json.resignation);
        setPolicyNoticeDays(json.noticePeriodDays || 30);
        
        // Calculate expected LWD if not yet submitted
        const date = new Date();
        date.setDate(date.getDate() + (json.noticePeriodDays || 30));
        setExpectedLwd(format(date, 'yyyy-MM-dd'));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleSubmit = async () => {
    if (!reason || !lwd) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    Alert.alert(
      'Confirm Resignation',
      'Are you sure you want to submit your resignation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Submit', 
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              const res = await apiFetch(ENDPOINTS.submitResignation, {
                method: 'POST',
                body: JSON.stringify({ reason, lastWorkingDay: lwd })
              });
              const json = await res.json();
              if (json.success) {
                Toast.show({ type: 'success', text1: 'Submitted', text2: 'Request sent for approval' });
                fetchStatus();
              } else {
                Toast.show({ type: 'error', text1: 'Error', text2: json.message });
              }
            } catch (e) {
              Toast.show({ type: 'error', text1: 'Network error' });
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgMain }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const statusColors = {
    Pending: colors.warning,
    Approved: colors.success,
    Rejected: colors.danger
  };

  const getPolicyLwd = () => {
    const startDate = resignation ? new Date(resignation.noticeDate) : new Date();
    startDate.setDate(startDate.getDate() + policyNoticeDays);
    return startDate.toLocaleDateString();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bgMain }]}>
      <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.bgMain }]}>
          <Ionicons name="arrow-back" size={24} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textDark }]}>Resignation</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {resignation ? (
          <View style={[styles.card, SHADOW.soft, { backgroundColor: colors.bgCard, borderColor: colors.borderLight }]}>
            <View style={styles.statusRow}>
              <Text style={styles.cardTitle}>Current Status</Text>
              <View style={[styles.badge, { backgroundColor: statusColors[resignation.status] + '20' }]}>
                <Text style={[styles.badgeText, { color: statusColors[resignation.status] }]}>{resignation.status}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Applied On</Text>
                <Text style={styles.infoValue}>{new Date(resignation.createdAt).toLocaleDateString()}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>{resignation.status === 'Approved' ? 'Official LWD' : 'Requested LWD'}</Text>
                <Text style={styles.infoValue}>{new Date(resignation.lastWorkingDay).toLocaleDateString()}</Text>
              </View>
            </View>

            {resignation.status === 'Pending' && (
              <View style={[styles.infoRow, { marginTop: -8 }]}>
                <View style={[styles.infoCol, { borderColor: colors.warning + '40', backgroundColor: colors.warningLight }]}>
                  <Text style={[styles.infoLabel, { color: colors.warning }]}>LWD as per Policy ({policyNoticeDays} days)</Text>
                  <Text style={[styles.infoValue, { color: colors.textDark }]}>{getPolicyLwd()}</Text>
                </View>
              </View>
            )}

            <View style={styles.reasonBox}>
              <Text style={styles.infoLabel}>Reason</Text>
              <Text style={styles.reasonText}>{resignation.reason}</Text>
            </View>

            {resignation.comments && (
              <View style={[styles.commentBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                <Text style={[styles.infoLabel, { color: colors.primary }]}>Admin Comments</Text>
                <Text style={[styles.commentText, { color: colors.primary }]}>{resignation.comments}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.card, SHADOW.soft, { backgroundColor: colors.bgCard, borderColor: colors.borderLight }]}>
            <Text style={[styles.cardTitle, { color: colors.textDark }]}>Submit Resignation</Text>
            
            <Text style={[styles.label, { color: colors.textDark }]}>Last Working Day</Text>
            <TouchableOpacity 
              style={[styles.datePickerBtn, { backgroundColor: colors.bgMain, borderColor: colors.borderLight }]} 
              onPress={() => setShowCalendar(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={20} color={lwd ? colors.textDark : colors.textMuted} />
              <Text style={[styles.datePickerText, { color: lwd ? colors.textDark : colors.textMuted }]}>
                {lwd || 'Select your last working day'}
              </Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 }}>
              <Ionicons name="information-circle-outline" size={14} color={colors.warning} />
              <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>
                Your policy-based LWD would be: <Text style={{ color: colors.warning, fontWeight: '800' }}>{new Date(expectedLwd).toLocaleDateString()}</Text>
              </Text>
            </View>

            <Text style={[styles.label, { color: colors.textDark }]}>Reason for Resignation</Text>
            <TextInput 
              style={[styles.input, styles.textArea, { backgroundColor: colors.bgMain, borderColor: colors.borderLight, color: colors.textDark }]} 
              placeholder="Share your thoughts..." 
              placeholderTextColor={colors.textMuted}
              value={reason} 
              onChangeText={setReason} 
              multiline
              numberOfLines={6}
            />

            <TouchableOpacity onPress={handleSubmit} disabled={submitting}>
              <LinearGradient colors={isDarkMode ? [colors.danger, colors.dangerDark || '#B91C1C'] : [colors.dangerLight || '#F87171', colors.danger]} style={styles.submitBtn} start={{x:0,y:0}} end={{x:1,y:0}}>
                {submitting ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <Ionicons name="send" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.submitBtnText}>Submit Request</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.noteBox}>
          <Ionicons name="information-circle" size={20} color={colors.textMuted} />
          <Text style={[styles.noteText, { color: colors.textMuted }]}>
            Resignations are subject to approval. Notice period guidelines apply.
          </Text>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal visible={showCalendar} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.calendarCard}>
            <View style={[styles.calendarHeader, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.calendarTitle, { color: colors.textDark }]}>Select LWD</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Ionicons name="close" size={24} color={colors.textDark} />
              </TouchableOpacity>
            </View>
            <Calendar
              minDate={new Date().toISOString().split('T')[0]}
              onDayPress={(day) => {
                setLwd(day.dateString);
                setShowCalendar(false);
              }}
              markedDates={{
                [lwd]: { selected: true, selectedColor: colors.primary }
              }}
              theme={{
                calendarBackground: colors.bgCardElevated,
                textSectionTitleColor: colors.textMuted,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: '#fff',
                todayTextColor: colors.primary,
                dayTextColor: colors.textDark,
                textDisabledColor: colors.textMuted + '40',
                arrowColor: colors.primary,
                monthTextColor: colors.textDark,
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  backBtn: { padding: 8, borderRadius: 12 },
  scroll: { padding: 20 },
  card: { borderRadius: 24, padding: 24, borderWidth: 1 },
  cardTitle: { fontSize: 18, fontWeight: '800', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8, marginTop: 16 },
  input: {
    borderWidth: 1, borderRadius: 16, padding: 15, fontSize: 15,
  },
  textArea: { height: 120, textAlignVertical: 'top' },
  datePickerBtn: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 15, gap: 12
  },
  datePickerText: { fontSize: 15, fontWeight: '700' },
  submitBtn: {
    borderRadius: 16, padding: 18, marginTop: 32,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center'
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  infoRow: { flexDirection: 'row', gap: 20, marginBottom: 24 },
  infoCol: { flex: 1, padding: 15, borderRadius: 16, borderWidth: 1 },
  infoLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: '700' },
  reasonBox: { padding: 15, borderRadius: 16, borderWidth: 1 },
  reasonText: { fontSize: 14, lineHeight: 22 },
  commentBox: { marginTop: 24, padding: 15, borderRadius: 16, borderWidth: 1 },
  commentText: { fontSize: 14, fontWeight: '600' },
  noteBox: { flexDirection: 'row', gap: 10, marginTop: 24, paddingHorizontal: 10 },
  noteText: { flex: 1, fontSize: 13, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  calendarCard: { borderRadius: 24, padding: 20, width: '100%', maxWidth: 400, borderWidth: 1 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 10 },
  calendarTitle: { fontSize: 18, fontWeight: '800' }
});
