import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Dimensions, FlatList } from 'react-native';
import { Svg, Circle, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { COLORS, SHADOW } from '../constants/theme';

const { width } = Dimensions.get('window');
const ITEM_HEIGHT = 60;
const VISIBLE_ITEMS = 3;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const AMPM = ['AM', 'PM'];

const WheelPart = ({ data, selectedValue, onValueChange, flex = 1 }) => {
  const flatListRef = useRef(null);
  const paddedData = ['', ...data, ''];

  useEffect(() => {
    const index = data.indexOf(selectedValue);
    if (index !== -1 && flatListRef.current) {
        setTimeout(() => {
            flatListRef.current.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: false });
        }, 100);
    }
  }, [selectedValue]);

  const onMomentumScrollEnd = (event) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const value = data[index];
    if (value !== undefined && value !== selectedValue) {
        onValueChange(value);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <View style={[styles.wheelColumn, { flex }]}>
      <FlatList
        ref={flatListRef}
        data={paddedData}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => (
          <View style={[styles.item, { height: ITEM_HEIGHT }]}>
            <Text style={[styles.itemText, item === selectedValue && styles.activeItemText]}>{item}</Text>
          </View>
        )}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, i) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * i, index: i })}
      />
    </View>
  );
};

const ClockPicker = ({ visible, value, onSelect, onCancel, label }) => {
  const [h, setH] = useState(12);
  const [m, setM] = useState('00');
  const [ap, setAp] = useState('AM');

  useEffect(() => {
    if (visible) {
        const [currH, currM] = (value || '09:00').split(':').map(Number);
        setH(currH % 12 || 12);
        setM(currM.toString().padStart(2, '0'));
        setAp(currH >= 12 ? 'PM' : 'AM');
    }
  }, [visible, value]);

  const onConfirm = () => {
    let finalH = h % 12;
    if (ap === 'PM') finalH += 12;
    const timeStr = `${finalH.toString().padStart(2, '0')}:${m}`;
    onSelect(timeStr);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onCancel} />
        
        <View style={styles.card}>
          {/* Context-Related Background Element: Intricate Timing Dials */}
          <View style={{ position: 'absolute', top: 40, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: -1, pointerEvents: 'none' }}>
            <Svg width={250} height={250} opacity={0.04}>
              {/* Outer Chronometer Rim */}
              <Circle cx={125} cy={125} r={120} stroke={COLORS.primary} strokeWidth={2} fill="none" />
              {/* Secondary Bezel Ring */}
              <Circle cx={125} cy={125} r={105} stroke={COLORS.white} strokeWidth={1} strokeDasharray="4 8" fill="none" />
              {/* Inner Gear Calibration Guide */}
              <Circle cx={125} cy={125} r={80} stroke={COLORS.primary} strokeWidth={1} strokeDasharray="2 12" fill="none" />
              {/* Core Pivot Hub */}
              <Circle cx={125} cy={125} r={6} fill={COLORS.primary} />
              {/* Stylized Chrono Hands */}
              <Line x1={125} y1={125} x2={125} y2={45} stroke={COLORS.primary} strokeWidth={3} strokeLinecap="round" />
              <Line x1={125} y1={125} x2={185} y2={125} stroke={COLORS.white} strokeWidth={2} strokeLinecap="round" />
              {/* Cardinal Time Indices */}
              <Circle cx={125} cy={12} r={3} fill={COLORS.primary} />
              <Circle cx={238} cy={125} r={3} fill={COLORS.primary} />
              <Circle cx={125} cy={238} r={3} fill={COLORS.primary} />
              <Circle cx={12} cy={125} r={3} fill={COLORS.primary} />
            </Svg>
          </View>

          <View style={styles.grabber} />
          <Text style={styles.label}>Select {label}</Text>
          
          <View style={styles.displayHeader}>
              <Text style={styles.timeText}>{h}:{m} <Text style={styles.apSub}>{ap}</Text></Text>
          </View>

          <View style={styles.wheelsWrapper}>
            <View style={styles.selectionBar} pointerEvents="none" />
            <WheelPart data={HOURS} selectedValue={h} onValueChange={setH} />
            <WheelPart data={MINUTES} selectedValue={m} onValueChange={setM} />
            <WheelPart data={AMPM} selectedValue={ap} onValueChange={setAp} flex={0.7} />
          </View>

          {/* Quick Action Hints for Convenience */}
          <View style={styles.quickActions}>
            {['00', '15', '30', '45'].map(val => (
              <TouchableOpacity 
                key={val} 
                onPress={() => { setM(val); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                style={[styles.quickBtn, m === val && styles.quickBtnActive]}
              >
                <Text style={[styles.quickBtnText, m === val && styles.quickBtnTextActive]}>:{val}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity onPress={onCancel} style={styles.btnSecondary}><Text style={styles.btnTextSecondary}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} style={styles.btnPrimary}><Text style={styles.btnTextPrimary}>Confirm</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  card: { backgroundColor: COLORS.bgCardElevated, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOW.lg },
  grabber: { width: 40, height: 4, backgroundColor: COLORS.borderLight, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '800', color: COLORS.textMuted, marginBottom: 24, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 },
  displayHeader: { backgroundColor: COLORS.bgMain, alignSelf: 'center', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 24, marginBottom: 20 },
  timeText: { fontSize: 36, fontWeight: '900', color: COLORS.primary },
  apSub: { fontSize: 16, color: COLORS.textMuted },
  wheelsWrapper: { height: WHEEL_HEIGHT, flexDirection: 'row', gap: 10, position: 'relative' },
  selectionBar: { position: 'absolute', top: ITEM_HEIGHT, left: 0, right: 0, height: ITEM_HEIGHT, borderRadius: 16, backgroundColor: COLORS.bgMain, borderColor: COLORS.primary + '10', borderWidth: 1 },
  wheelColumn: { height: WHEEL_HEIGHT },
  item: { alignItems: 'center', justifyContent: 'center' },
  itemText: { fontSize: 20, fontWeight: '600', color: COLORS.textMuted, opacity: 0.3 },
  activeItemText: { fontSize: 32, fontWeight: '900', color: COLORS.textDark, opacity: 1 },
  quickActions: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 20, paddingHorizontal: 10 },
  quickBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: COLORS.bgMain },
  quickBtnActive: { backgroundColor: COLORS.primary },
  quickBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
  quickBtnTextActive: { color: COLORS.white },
  footer: { flexDirection: 'row', gap: 12, marginTop: 32 },
  btnPrimary: { flex: 2, backgroundColor: COLORS.primary, padding: 18, borderRadius: 20, alignItems: 'center' },
  btnSecondary: { flex: 1, backgroundColor: COLORS.bgMain, padding: 18, borderRadius: 20, alignItems: 'center' },
  btnTextPrimary: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
  btnTextSecondary: { color: COLORS.textMuted, fontWeight: '800', fontSize: 16 }
});

export default ClockPicker;
