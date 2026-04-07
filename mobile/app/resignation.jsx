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
import { COLORS, SHADOW, RADIUS, GRADIENTS } from '../constants/theme';
import Toast from 'react-native-toast-message';

export default function ResignationScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resignation, setResignation] = useState(null);
  const [reason, setReason] = useState('');
  const [lwd, setLwd] = useState(''); // last working day
  const [showCalendar, setShowCalendar] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await apiFetch(ENDPOINTS.myResignation);
      const json = await res.json();
      if (json.success) setResignation(json.resignation);
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const statusColors = {
    Pending: COLORS.warning,
    Approved: COLORS.success,
    Rejected: COLORS.danger
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resignation</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {resignation ? (
          <View style={[styles.card, SHADOW.soft]}>
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
                <Text style={styles.infoLabel}>Requested LWD</Text>
                <Text style={styles.infoValue}>{new Date(resignation.lastWorkingDay).toLocaleDateString()}</Text>
              </View>
            </View>

            <View style={styles.reasonBox}>
              <Text style={styles.infoLabel}>Reason</Text>
              <Text style={styles.reasonText}>{resignation.reason}</Text>
            </View>

            {resignation.comments && (
              <View style={styles.commentBox}>
                <Text style={[styles.infoLabel, { color: COLORS.primary }]}>Admin Comments</Text>
                <Text style={styles.commentText}>{resignation.comments}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.card, SHADOW.soft]}>
            <Text style={styles.cardTitle}>Submit Resignation</Text>
            
            <Text style={styles.label}>Last Working Day</Text>
            <TouchableOpacity 
              style={styles.datePickerBtn} 
              onPress={() => setShowCalendar(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={20} color={lwd ? COLORS.textDark : COLORS.textMuted} />
              <Text style={[styles.datePickerText, !lwd && { color: COLORS.textMuted }]}>
                {lwd || 'Select your last working day'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.label}>Reason for Resignation</Text>
            <TextInput 
              style={[styles.input, styles.textArea]} 
              placeholder="Share your thoughts..." 
              value={reason} 
              onChangeText={setReason} 
              multiline
              numberOfLines={6}
            />

            <TouchableOpacity onPress={handleSubmit} disabled={submitting}>
              <LinearGradient colors={GRADIENTS.danger} style={styles.submitBtn} start={{x:0,y:0}} end={{x:1,y:0}}>
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
          <Ionicons name="information-circle" size={20} color={COLORS.textMuted} />
          <Text style={styles.noteText}>
            Resignations are subject to approval. Notice period guidelines apply.
          </Text>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal visible={showCalendar} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Select LWD</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Ionicons name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>
            <Calendar
              minDate={new Date().toISOString().split('T')[0]}
              onDayPress={(day) => {
                setLwd(day.dateString);
                setShowCalendar(false);
              }}
              markedDates={{
                [lwd]: { selected: true, selectedColor: COLORS.primary }
              }}
              theme={{
                selectedDayBackgroundColor: COLORS.primary,
                todayTextColor: COLORS.primary,
                arrowColor: COLORS.primary,
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0'
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark },
  backBtn: { padding: 8, borderRadius: 12, backgroundColor: '#F1F5F9' },
  scroll: { padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 24 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 16, padding: 15, fontSize: 15, color: COLORS.textDark
  },
  textArea: { height: 120, textAlignVertical: 'top' },
  datePickerBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 16, padding: 15, gap: 12
  },
  datePickerText: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  submitBtn: {
    borderRadius: 16, padding: 18, marginTop: 32,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center'
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  infoRow: { flexDirection: 'row', gap: 20, marginBottom: 24 },
  infoCol: { flex: 1, backgroundColor: '#F8FAFC', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  infoLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: '700', color: COLORS.textDark },
  reasonBox: { backgroundColor: '#F8FAFC', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  reasonText: { fontSize: 14, color: '#475569', lineHeight: 22 },
  commentBox: { marginTop: 24, padding: 15, backgroundColor: '#EFF6FF', borderRadius: 16, borderWidth: 1, borderColor: '#DBEAFE' },
  commentText: { fontSize: 14, color: '#1E40AF', fontWeight: '500' },
  noteBox: { flexDirection: 'row', gap: 10, marginTop: 24, paddingHorizontal: 10 },
  noteText: { flex: 1, fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  calendarCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, width: '100%', maxWidth: 400 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 10 },
  calendarTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark }
});
