import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput, Modal, 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isPast } from 'date-fns';
import Toast from 'react-native-toast-message';
import { apiFetch } from '../utils/api';
import { ENDPOINTS } from '../constants/api';
import { SIZES, RADIUS, SHADOW } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

import ClockPicker from '../components/ClockPicker';

const TimePickerModal = (props) => <ClockPicker {...props} />;

export default function PunchMissingScreen() {
  const { colors, isDarkMode } = useTheme();
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
        const start = startOfMonth(new Date());
        const end = endOfMonth(new Date());
        const days = eachDayOfInterval({ start, end });
        
        const recordsMap = {};
        json.records.forEach(r => recordsMap[r.date] = r);
        
        const requestsMap = json.requests || {};
        const woDays = json.weekOffDays || [];
        const jDate = json.joiningDate;
        
        const missing = [];
        days.forEach(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          if (dateStr >= todayStr) return; 
          if (jDate && dateStr < jDate) return; 
          
          const dayName = format(day, 'EEEE');
          if (woDays.includes(dayName)) return; 
          
          const r = recordsMap[dateStr];
          const req = requestsMap[dateStr];
          
          if (req && (req.status === 'Pending' || req.status === 'Approved')) return; 
          
          if (r && r.punchIn && !r.punchOut) {
            missing.push(r);
          }
        });
        setMissingDays(missing);
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
    <View style={[styles.container, { justifyContent: 'center', backgroundColor: colors.bgMain }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgMain }]}>
      <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.bgMain }]}>
          <Ionicons name="arrow-back" size={24} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textDark }]}>Correction Workflow</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {step === 0 && (
          <>
            <View style={[styles.infoBox, { backgroundColor: colors.primaryLight, borderLeftColor: colors.primary }]}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.primary }]}>Select a day with a missing punch-out to start the correction workflow.</Text>
            </View>

            {missingDays.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="checkmark-circle" size={64} color={colors.success} style={{ opacity: 0.3, marginBottom: 16 }} />
                <Text style={[styles.emptyTitle, { color: colors.textDark }]}>All Good!</Text>
                <Text style={[styles.emptySub, { color: colors.textLight }]}>No missing punch-outs found in your recent history.</Text>
              </View>
            ) : (
              missingDays.map(day => (
                <TouchableOpacity 
                  key={day.date} 
                  style={[styles.dayCard, SHADOW.soft, { padding: 0, overflow: 'hidden', backgroundColor: colors.bgCard, borderColor: colors.borderLight }]}
                  onPress={() => {
                    setSelectedDay(day);
                    const match = day.punchIn?.match(/(\d{1,2}):(\d{2})/);
                    if (match) day.punchInRaw = `${match[1].padStart(2, '0')}:${match[2]}`;
                    setStep(2);
                  }}
                >
                  <View style={{ flexDirection: 'row' }}>
                    <View style={{ backgroundColor: colors.warningLight, padding: 16, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: colors.borderLight, width: 65 }}>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: colors.warning }}>{format(new Date(day.date + 'T00:00:00'), 'dd')}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: colors.warning, textTransform: 'uppercase' }}>{format(new Date(day.date + 'T00:00:00'), 'MMM')}</Text>
                    </View>
                    <View style={{ flex: 1, padding: 16 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                         <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textDark }}>{format(new Date(day.date + 'T00:00:00'), 'EEEE')}</Text>
                         <View style={[styles.warningTag, { backgroundColor: colors.warning, borderColor: colors.warning }]}><Text style={[styles.warningText, { color: colors.white }]}>Fix Needed</Text></View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 16 }}>
                         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textLight }}>In: {day.punchIn}</Text>
                         </View>
                         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger }} />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.danger }}>Out: {day.punchOut || 'MISSING'}</Text>
                         </View>
                      </View>
                    </View>
                    <View style={{ backgroundColor: colors.primary, width: 50, alignItems: 'center', justifyContent: 'center' }}>
                       <Ionicons name="arrow-forward" size={20} color={colors.white} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {step === 1 && selectedDay && (
          <View style={[styles.form, SHADOW.soft, { backgroundColor: colors.bgCard, borderColor: colors.borderLight }]}>
             <Ionicons name="calendar-outline" size={48} color={colors.primary} style={{ alignSelf: 'center', marginBottom: 12 }} />
             <Text style={[styles.formTitle, { color: colors.textDark }]}>Day Selected: {format(new Date(selectedDay.date + 'T00:00:00'), 'dd MMM')}</Text>
             <Text style={[styles.modalSub, { color: colors.textLight }]}>Would you like to raise a replacement request for your missing punch-out?</Text>
             
             <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={nextStep}>
               <Text style={[styles.submitBtnText, { color: colors.white }]}>Raise Request for Punch Out</Text>
             </TouchableOpacity>

             <TouchableOpacity 
               style={[styles.submitBtn, { backgroundColor: colors.purpleLight, marginTop: 12, borderWidth: 1, borderColor: colors.purple + '20', flexDirection: 'row', gap: 8 }]} 
               onPress={() => router.push({ pathname: '/(tabs)/attendance', params: { date: selectedDay.date, autoOpen: 'true' } })}
             >
               <Ionicons name="leaf-outline" size={18} color={colors.purple} />
               <Text style={[styles.submitBtnText, { color: colors.purple }]}>Apply for Leave Instead</Text>
             </TouchableOpacity>

             <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.bgMain, marginTop: 12, borderWidth: 1, borderColor: colors.borderLight }]} onPress={() => setStep(0)}>
               <Text style={[styles.submitBtnText, { color: colors.textLight }]}>Change Day</Text>
             </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={[styles.form, SHADOW.soft, { backgroundColor: colors.bgCard, borderColor: colors.borderLight }]}>
            <View style={styles.stepHeader}>
                <View style={[styles.stepNum, { backgroundColor: colors.primaryLight }]}><Text style={[styles.stepNumText, { color: colors.primary }]}>1/2</Text></View>
                <Text style={[styles.formTitle, { color: colors.textDark }]}>Work Report</Text>
             </View>
             <Text style={[styles.modalSub, { color: colors.textLight }]}>Describe your work achievements for this day. <Text style={{ color: colors.danger }}>*</Text></Text>
             <TextInput 
              style={[styles.input, { minHeight: 150, backgroundColor: colors.bgMain, borderColor: colors.borderLight, color: colors.textDark }]} 
              multiline 
              placeholder="List tasks completed, meetings attended, etc..."
              placeholderTextColor={colors.textMuted}
              value={workReport}
              onChangeText={setWorkReport}
            />
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={() => {
                if (!workReport.trim()) return Toast.show({ type: 'error', text1: 'Required', text2: 'Please add your work report' });
                nextStep();
            }}>
               <Text style={[styles.submitBtnText, { color: colors.white }]}>Next Step</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 16, alignSelf: 'center' }} onPress={prevStep}>
               <Text style={{ color: colors.textMuted, fontWeight: '700' }}>Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View style={[styles.form, SHADOW.soft, { backgroundColor: colors.bgCard, borderColor: colors.borderLight }]}>
            <View style={styles.stepHeader}>
                <Text style={[styles.formTitle, { color: colors.textDark }]}>Correction Details</Text>
            </View>
            
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.label, { color: colors.textLight }]}>Original Punch In</Text>
              <View style={[styles.timeDisplay, { backgroundColor: colors.bgMain, borderColor: colors.borderLight, gap: 10 }]}>
                <Ionicons name="lock-closed" size={18} color={colors.textMuted} />
                <Text style={[styles.timeValue, { color: colors.textMuted }]}>{selectedDay.punchIn || '—'}</Text>
              </View>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.label, { color: colors.textLight }]}>Set Missing Punch Out Time</Text>
              <TouchableOpacity 
                style={[styles.timeDisplay, { width: '100%', flexDirection: 'row', justifyContent: 'flex-start', backgroundColor: colors.bgMain, borderColor: colors.borderLight }, 
                  (new Date(`${selectedDay.date}T${manualOut}:00`) <= new Date(`${selectedDay.date}T${selectedDay.punchInRaw || '00:00'}:00`)) && { borderColor: colors.danger, borderWidth: 1 }]} 
                onPress={() => setShowOutPicker(true)}
              >
                <View style={{ backgroundColor: colors.primary + '10', padding: 8, borderRadius: 10, marginRight: 12 }}>
                  <Ionicons name="time" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }}>Missing Punch Out</Text>
                  <Text style={[styles.timeValue, { marginTop: 2, color: colors.textDark }]}>{manualOut}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.border} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
              {(new Date(`${selectedDay.date}T${manualOut}:00`) <= new Date(`${selectedDay.date}T${selectedDay.punchInRaw || '00:00'}:00`)) && (
                <Text style={{ color: colors.danger, fontSize: 11, fontWeight: '700', marginTop: 6, marginLeft: 4 }}>
                  <Ionicons name="warning" size={12} color={colors.danger} /> Punch-out must be after {selectedDay.punchIn}
                </Text>
              )}
            </View>

            <Text style={[styles.label, { color: colors.textLight }]}>Reason for Missing Punch Out <Text style={{ color: colors.danger }}>*</Text></Text>
            <TextInput 
              style={[styles.input, { backgroundColor: colors.bgMain, borderColor: colors.borderLight, color: colors.textDark }]} 
              multiline 
              placeholder="e.g. System error, Forgot to punch, etc..."
              placeholderTextColor={colors.textMuted}
              value={reason}
              onChangeText={setReason}
            />

            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: colors.primary }]} 
              onPress={handleApply}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={[styles.submitBtnText, { color: colors.white }]}>Submit Correction Request</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 16, alignSelf: 'center' }} onPress={() => setStep(0)}>
               <Text style={{ color: colors.textMuted, fontWeight: '700' }}>Back</Text>
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
  container: { flex: 1 },
  header: { padding: 20, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  backBtn: { padding: 8, marginRight: 10, borderRadius: 12 },
  title: { fontSize: 20, fontWeight: '800' },
  scroll: { padding: 20 },
  infoBox: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 16, marginBottom: 24, borderLeftWidth: 4 },
  infoText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 20 },
  empty: { padding: 60, alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center' },
  dayCard: { borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1 },
  dayTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  dayDate: { fontSize: 16, fontWeight: '800' },
  dayName: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  warningTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  warningText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  dayPunches: { flexDirection: 'row', gap: 20, paddingTop: 16, borderTopWidth: 1 },
  punchItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  punchText: { fontSize: 13, fontWeight: '600' },
  form: { borderRadius: 24, padding: 24, marginTop: 20, borderWidth: 1 },
  formTitle: { fontSize: 18, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  modalSub: { fontSize: 14, textAlign: 'center', marginBottom: 24, fontWeight: '500', lineHeight: 20 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  stepNum: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  stepNumText: { fontSize: 10, fontWeight: '800' },
  label: { fontSize: 13, fontWeight: '800', marginBottom: 10, marginTop: 16 },
  timeDisplay: { padding: 16, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  timeValue: { fontSize: 15, fontWeight: '700' },
  input: { padding: 16, borderRadius: 16, borderWidth: 1, fontSize: 14, minHeight: 100, textAlignVertical: 'top' },
  submitBtn: { padding: 18, borderRadius: 18, alignItems: 'center', marginTop: 12 },
  submitBtnText: { fontWeight: '800', fontSize: 16 },
  tpOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  tpContent: { borderRadius: 32, padding: 24, width: '100%', maxWidth: 300, borderWidth: 1 },
  tpLabel: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 20 },
  tpPickers: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  tpSubLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  tpItem: { padding: 12, alignItems: 'center', borderRadius: 10 },
  tpItemActive: { },
  tpText: { fontSize: 16, fontWeight: '600' },
  tpTextActive: { fontWeight: '800' },
  tpDivider: { width: 1, height: 150, marginHorizontal: 20 },
  tpFooter: { flexDirection: 'row', gap: 12, marginTop: 24 },
  tpBtn: { flex: 1, padding: 12, borderRadius: 14, alignItems: 'center' },
});
