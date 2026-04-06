import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput, Modal, 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import Toast from 'react-native-toast-message';
import { apiFetch } from '../utils/api';
import { ENDPOINTS } from '../constants/api';
import { COLORS, SHADOW } from '../constants/theme';

import ClockPicker from '../components/ClockPicker';

const TimePickerModal = (props) => <ClockPicker {...props} />;

export default function PunchMissingScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [missingDays, setMissingDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [reason, setReason] = useState('');
  const [manualOut, setManualOut] = useState('18:00');
  const [showOutPicker, setShowOutPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [step, setStep] = useState(0); // 0: Select, 1: Raise, 2: Work Report, 3: Out Time & Reason
  const [workReport, setWorkReport] = useState('');

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  useEffect(() => {
    loadMissingPunches();
  }, []);

  const loadMissingPunches = async () => {
    try {
      const m = format(new Date(), 'yyyy-MM');
      const res = await apiFetch(`${ENDPOINTS.attendanceHistory}?month=${m}`);
      const json = await res.json();
      if (json.success) {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const missing = json.records.filter(r => r.punchIn && !r.punchOut && r.date !== todayStr);
        const pendingRequests = Object.keys(json.requests || {})
          .filter(date => json.requests[date].status === 'Pending')
          .map(date => date);
        setMissingDays(missing.filter(m => !pendingRequests.includes(m.date)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!selectedDay) return;
    if (!reason.trim()) return Toast.show({ type: 'error', text1: 'Note', text2: 'Please provide a reason' });

    setSubmitting(true);
    try {
      const inStr = selectedDay.punchInRaw || '09:00';
      const inDate = new Date(`${selectedDay.date}T${inStr}:00`);
      const outDate = new Date(`${selectedDay.date}T${manualOut}:00`);

      if (outDate <= inDate) {
        return Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Punch-out time must be after punch-in time' });
      }

      const payload = {
        requestType: 'Attendance Correction',
        date: selectedDay.date,
        reason,
        workSummary: workReport,
        manualIn: inDate,
        manualOut: outDate,
      };
      
      const res = await apiFetch(ENDPOINTS.submitRequest, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        Toast.show({ type: 'success', text1: 'Success', text2: 'Correction request sent' });
        setSelectedDay(null);
        setReason('');
        setWorkReport('');
        setStep(0);
        loadMissingPunches();
      } else {
        Toast.show({ type: 'error', text1: 'Failed', text2: json.message });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <View style={[styles.container, { justifyContent: 'center' }]}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.title}>Correction Workflow</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {step === 0 && (
          <>
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={COLORS.primary} />
              <Text style={styles.infoText}>Select a day with a missing punch-out to start the correction workflow.</Text>
            </View>

            {missingDays.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="checkmark-circle" size={64} color="#10B981" style={{ opacity: 0.3, marginBottom: 16 }} />
                <Text style={styles.emptyTitle}>All Good!</Text>
                <Text style={styles.emptySub}>No missing punch-outs found in your recent history.</Text>
              </View>
            ) : (
              missingDays.map(day => (
                <TouchableOpacity 
                  key={day.date} 
                  style={[styles.dayCard, SHADOW.soft, { padding: 0, overflow: 'hidden' }]}
                  onPress={() => {
                    setSelectedDay(day);
                    const match = day.punchIn?.match(/(\d{1,2}):(\d{2})/);
                    if (match) day.punchInRaw = `${match[1].padStart(2, '0')}:${match[2]}`;
                    setStep(1);
                  }}
                >
                  <View style={{ flexDirection: 'row' }}>
                    <View style={{ backgroundColor: '#FFF7ED', padding: 16, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#FFEDD5' }}>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#EA580C' }}>{format(new Date(day.date + 'T00:00:00'), 'dd')}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#F97316', textTransform: 'uppercase' }}>{format(new Date(day.date + 'T00:00:00'), 'MMM')}</Text>
                    </View>
                    <View style={{ flex: 1, padding: 16 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                         <Text style={{ fontSize: 15, fontWeight: '800', color: '#1E293B' }}>{format(new Date(day.date + 'T00:00:00'), 'EEEE')}</Text>
                         <View style={[styles.warningTag, { backgroundColor: '#EA580C', borderColor: '#EA580C' }]}><Text style={[styles.warningText, { color: '#fff' }]}>Fix Needed</Text></View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 16 }}>
                         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>In: {day.punchIn}</Text>
                         </View>
                         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }} />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444' }}>Out: MISSING</Text>
                         </View>
                      </View>
                    </View>
                    <View style={{ backgroundColor: COLORS.primary, width: 50, alignItems: 'center', justifyContent: 'center' }}>
                       <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {step === 1 && selectedDay && (
          <View style={[styles.form, SHADOW.soft]}>
             <Ionicons name="calendar-outline" size={48} color={COLORS.primary} style={{ alignSelf: 'center', marginBottom: 12 }} />
             <Text style={styles.formTitle}>Day Selected: {format(new Date(selectedDay.date + 'T00:00:00'), 'dd MMM')}</Text>
             <Text style={styles.modalSub}>Would you like to raise a replacement request for your missing punch-out?</Text>
             
             <TouchableOpacity style={styles.submitBtn} onPress={nextStep}>
               <Text style={styles.submitBtnText}>Raise Request for Punch Out</Text>
             </TouchableOpacity>
             <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#F1F5F9', marginTop: 12 }]} onPress={() => setStep(0)}>
               <Text style={[styles.submitBtnText, { color: '#64748B' }]}>Change Day</Text>
             </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={[styles.form, SHADOW.soft]}>
            <View style={styles.stepHeader}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>1/2</Text></View>
                <Text style={styles.formTitle}>Work Report</Text>
             </View>
             <Text style={styles.modalSub}>Describe your work achievements for this day. <Text style={{ color: COLORS.danger }}>*</Text></Text>
             <TextInput 
              style={[styles.input, { minHeight: 150 }]} 
              multiline 
              placeholder="List tasks completed, meetings attended, etc..."
              value={workReport}
              onChangeText={setWorkReport}
            />
            <TouchableOpacity style={styles.submitBtn} onPress={() => {
                if (!workReport.trim()) return Toast.show({ type: 'error', text1: 'Required', text2: 'Please add your work report' });
                nextStep();
            }}>
               <Text style={styles.submitBtnText}>Next Step</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 16, alignSelf: 'center' }} onPress={prevStep}>
               <Text style={{ color: '#94A3B8', fontWeight: '700' }}>Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View style={[styles.form, SHADOW.soft]}>
            <View style={styles.stepHeader}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>2/2</Text></View>
                <Text style={styles.formTitle}>Correction Details</Text>
            </View>
            
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.label}>Original Punch In</Text>
              <View style={[styles.timeDisplay, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', gap: 10 }]}>
                <Ionicons name="lock-closed" size={18} color="#64748B" />
                <Text style={[styles.timeValue, { color: '#64748B' }]}>{selectedDay.punchIn || '—'}</Text>
              </View>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={styles.label}>Set Missing Punch Out Time</Text>
              <TouchableOpacity 
                style={[styles.timeDisplay, { width: '100%', flexDirection: 'row', justifyContent: 'flex-start' }, 
                  (new Date(`${selectedDay.date}T${manualOut}:00`) <= new Date(`${selectedDay.date}T${selectedDay.punchInRaw || '00:00'}:00`)) && { borderColor: COLORS.danger, borderWidth: 1 }]} 
                onPress={() => setShowOutPicker(true)}
              >
                <View style={{ backgroundColor: COLORS.primary + '10', padding: 8, borderRadius: 10, marginRight: 12 }}>
                  <Ionicons name="time" size={20} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' }}>Missing Punch Out</Text>
                  <Text style={[styles.timeValue, { marginTop: 2 }]}>{manualOut}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.border} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
              {(new Date(`${selectedDay.date}T${manualOut}:00`) <= new Date(`${selectedDay.date}T${selectedDay.punchInRaw || '00:00'}:00`)) && (
                <Text style={{ color: COLORS.danger, fontSize: 11, fontWeight: '700', marginTop: 6, marginLeft: 4 }}>
                  <Ionicons name="warning" size={12} color={COLORS.danger} /> Punch-out must be after {selectedDay.punchIn}
                </Text>
              )}
            </View>

            <Text style={styles.label}>Reason for Missing Punch Out <Text style={{ color: COLORS.danger }}>*</Text></Text>
            <TextInput 
              style={styles.input} 
              multiline 
              placeholder="e.g. System error, Forgot to punch, etc."
              value={reason}
              onChangeText={setReason}
            />

            <TouchableOpacity 
              style={styles.submitBtn} 
              onPress={handleApply}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Full Request</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 16, alignSelf: 'center' }} onPress={prevStep}>
               <Text style={{ color: '#94A3B8', fontWeight: '700' }}>Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <TimePickerModal 
        visible={showOutPicker} 
        value={manualOut} 
        label="Out Time" 
        onSelect={(v) => { setManualOut(v); setShowOutPicker(false); }} 
        onCancel={() => setShowOutPicker(false)} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { padding: 8, marginRight: 10, borderRadius: 12, backgroundColor: '#F1F5F9' },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.textDark },
  scroll: { padding: 20 },
  infoBox: { flexDirection: 'row', gap: 12, backgroundColor: '#EFF6FF', padding: 16, borderRadius: 16, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  infoText: { flex: 1, fontSize: 13, color: '#1E40AF', fontWeight: '500', lineHeight: 20 },
  empty: { padding: 60, alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  dayCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16 },
  dayTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  dayDate: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  dayName: { fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '600' },
  warningTag: { backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderOriginWidth: 1, borderColor: '#FDBA74' },
  warningText: { fontSize: 10, fontWeight: '800', color: '#EA580C', textTransform: 'uppercase' },
  dayPunches: { flexDirection: 'row', gap: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  punchItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  punchText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  form: { backgroundColor: '#fff', borderRadius: 24, padding: 24, marginTop: 20 },
  formTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  modalSub: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24, fontWeight: '500', lineHeight: 20 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  stepNum: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  stepNumText: { color: COLORS.primary, fontSize: 10, fontWeight: '800' },
  label: { fontSize: 13, fontWeight: '800', color: '#475569', marginBottom: 10, marginTop: 16 },
  timeDisplay: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderOriginWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center' },
  timeValue: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  input: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderOriginWidth: 1, borderColor: '#E2E8F0', fontSize: 14, minHeight: 100, textAlignVertical: 'top', color: '#0F172A' },
  submitBtn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 18, alignItems: 'center', marginTop: 12 },
  submitBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
  tpOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  tpContent: { backgroundColor: '#fff', borderRadius: 32, padding: 24, width: '100%', maxWidth: 300 },
  tpLabel: { fontSize: 18, fontWeight: '900', color: '#0F172A', textAlign: 'center', marginBottom: 20 },
  tpPickers: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  tpSubLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textAlign: 'center', marginBottom: 8 },
  tpItem: { padding: 12, alignItems: 'center', borderRadius: 10 },
  tpItemActive: { backgroundColor: '#EFF6FF' },
  tpText: { fontSize: 16, fontWeight: '600', color: '#475569' },
  tpTextActive: { color: COLORS.primary, fontWeight: '800' },
  tpDivider: { width: 1, height: 150, backgroundColor: '#F1F5F9', marginHorizontal: 20 },
  tpFooter: { flexDirection: 'row', gap: 12, marginTop: 24 },
  tpBtn: { flex: 1, padding: 12, borderRadius: 14, alignItems: 'center' },
});
