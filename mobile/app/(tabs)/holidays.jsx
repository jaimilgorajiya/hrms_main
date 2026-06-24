import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet,
    TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/api';
import { SIZES, SHADOW } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

// ─── Type config ─────────────────────────────────────────────────────────────
const TYPE = {
    National: { icon: 'flag',       color: '#EF4444', lightBg: 'rgba(239,68,68,0.1)'  },
    Regional: { icon: 'location',   color: '#F59E0B', lightBg: 'rgba(245,158,11,0.1)' },
    Optional: { icon: 'star',       color: '#8B5CF6', lightBg: 'rgba(139,92,246,0.1)' },
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_SHORT  = ['Su','Mo','Tu','We','Th','Fr','Sa'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0];

const fmtDate = (d) => {
    const [y, m, day] = d.split('-').map(Number);
    return `${String(day).padStart(2,'0')} ${MONTHS[m-1]} ${y}`;
};

const getDayName = (d) => {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m-1, day).toLocaleDateString('en-IN', { weekday: 'long' });
};

const daysUntil = (d) => {
    const today = new Date(); today.setHours(0,0,0,0);
    return Math.ceil((new Date(d) - today) / (1000*60*60*24));
};

export default function HolidaysScreen() {
    const { colors } = useTheme();
    const [holidays,   setHolidays]   = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [year,       setYear]       = useState(new Date().getFullYear());
    const [tab,        setTab]        = useState('upcoming'); // upcoming | past | calendar
    const [calMonth,   setCalMonth]   = useState(new Date().getMonth());
    const [calYear,    setCalYear]    = useState(new Date().getFullYear());

    const fetchHolidays = useCallback(async () => {
        try {
            const res  = await apiFetch(`/api/holidays/my?year=${year}`);
            const data = await res.json();
            if (data.success) setHolidays(data.holidays || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, [year]);

    useEffect(() => { setLoading(true); fetchHolidays(); }, [fetchHolidays]);

    const today   = todayStr();
    const upcoming = [...holidays].filter(h => h.date >= today).sort((a,b) => a.date.localeCompare(b.date));
    const past     = [...holidays].filter(h => h.date <  today).sort((a,b) => b.date.localeCompare(a.date));
    const nextHol  = upcoming[0] || null;

    // ── Calendar helpers ──────────────────────────────────────────────────────
    const shiftCalMonth = (dir) => {
        let m = calMonth + dir;
        let y = calYear;
        if (m < 0)  { m = 11; y--; }
        if (m > 11) { m = 0;  y++; }
        setCalMonth(m); setCalYear(y);
    };

    const buildCalCells = () => {
        const firstDay  = new Date(calYear, calMonth, 1).getDay();
        const daysInMon = new Date(calYear, calMonth + 1, 0).getDate();
        const hMap = {};
        holidays.forEach(h => {
            const [hy, hm, hd] = h.date.split('-').map(Number);
            if (hy === calYear && hm - 1 === calMonth) hMap[hd] = h;
        });
        const cells = [];
        for (let i = 0; i < firstDay; i++) cells.push(null);
        for (let d = 1; d <= daysInMon; d++) cells.push({ day: d, holiday: hMap[d] || null });
        return cells;
    };

    const monthHolidays = holidays.filter(h => {
        const [hy, hm] = h.date.split('-').map(Number);
        return hy === calYear && hm - 1 === calMonth;
    });

    // ── Holiday card ──────────────────────────────────────────────────────────
    const HolidayCard = ({ h, showCountdown }) => {
        const tc     = TYPE[h.type] || TYPE.National;
        const isToday = h.date === today;
        const diff    = daysUntil(h.date);
        return (
            <View style={[styles.card, SHADOW.sm, { backgroundColor: colors.bgCard, borderColor: isToday ? tc.color : colors.borderLight }]}>
                {/* Date badge */}
                <View style={[styles.dateBadge, { backgroundColor: tc.lightBg }]}>
                    <Text style={[styles.dateBadgeDay, { color: tc.color }]}>
                        {h.date.split('-')[2]}
                    </Text>
                    <Text style={[styles.dateBadgeMon, { color: tc.color }]}>
                        {MONTHS[parseInt(h.date.split('-')[1]) - 1]}
                    </Text>
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        {isToday && (
                            <View style={[styles.todayPill, { backgroundColor: tc.color }]}>
                                <Text style={styles.todayPillText}>TODAY</Text>
                            </View>
                        )}
                        <Text style={[styles.cardName, { color: colors.textDark }]} numberOfLines={1}>{h.name}</Text>
                    </View>
                    <Text style={[styles.cardDay, { color: colors.textMuted }]}>{getDayName(h.date)}</Text>
                    {h.description ? <Text style={[styles.cardDesc, { color: colors.textLight }]} numberOfLines={1}>{h.description}</Text> : null}
                </View>

                {/* Type + countdown */}
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={[styles.typePill, { backgroundColor: tc.lightBg }]}>
                        <Ionicons name={tc.icon} size={10} color={tc.color} />
                        <Text style={[styles.typeText, { color: tc.color }]}>{h.type}</Text>
                    </View>
                    <View style={[styles.typePill, {
                        backgroundColor: h.isPaid !== false ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)'
                    }]}>
                        <Text style={[styles.typeText, {
                            color: h.isPaid !== false ? '#10B981' : '#F59E0B'
                        }]}>{h.isPaid !== false ? '✓ Paid' : '✗ Unpaid'}</Text>
                    </View>
                    {showCountdown && !isToday && diff > 0 && (
                        <Text style={[styles.countdown, { color: colors.textMuted }]}>in {diff}d</Text>
                    )}
                </View>
            </View>
        );
    };

    const s = StyleSheet.create({
        // scoped here to access colors
        tab: (active) => ({
            flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
            backgroundColor: active ? colors.primary : 'transparent',
        }),
        tabText: (active) => ({
            fontSize: 12, fontWeight: '800',
            color: active ? colors.white : colors.textMuted,
        }),
    });

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgMain }} edges={['top']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHolidays(); }} tintColor={colors.primary} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.title, { color: colors.textDark }]}>Holidays</Text>
                        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{holidays.length} holidays in {year}</Text>
                    </View>
                    {/* Year picker */}
                    <View style={[styles.yearPicker, { backgroundColor: colors.bgCard, borderColor: colors.borderLight }]}>
                        <TouchableOpacity onPress={() => setYear(y => y - 1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                        <Text style={[styles.yearText, { color: colors.textDark }]}>{year}</Text>
                        <TouchableOpacity onPress={() => setYear(y => y + 1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ paddingHorizontal: 20 }}>
                    {/* Next holiday banner */}
                    {!loading && nextHol && (() => {
                        const tc = TYPE[nextHol.type] || TYPE.National;
                        const diff = daysUntil(nextHol.date);
                        return (
                            <View style={[styles.banner, { backgroundColor: colors.primary }]}>
                                <View style={[styles.bannerIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                    <Ionicons name="gift" size={22} color="white" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.bannerTitle}>
                                        {diff === 0 ? '🎉 Holiday Today!' : `Next holiday in ${diff} day${diff !== 1 ? 's' : ''}`}
                                    </Text>
                                    <Text style={styles.bannerSub}>{nextHol.name} · {fmtDate(nextHol.date)} · {getDayName(nextHol.date)}</Text>
                                </View>
                            </View>
                        );
                    })()}

                    {/* Type pills */}
                    <View style={styles.typePills}>
                        {Object.entries(TYPE).map(([type, cfg]) => (
                            <View key={type} style={[styles.legendPill, { backgroundColor: cfg.lightBg, borderColor: cfg.color + '40' }]}>
                                <Ionicons name={cfg.icon} size={11} color={cfg.color} />
                                <Text style={[styles.legendText, { color: cfg.color }]}>
                                    {holidays.filter(h => h.type === type).length} {type}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Tabs */}
                    <View style={[styles.tabRow, { backgroundColor: colors.bgCard, borderColor: colors.borderLight }]}>
                        {[
                            { key: 'upcoming', label: `Upcoming (${upcoming.length})` },
                            { key: 'past',     label: `Past (${past.length})` },
                            { key: 'calendar', label: 'Calendar' },
                        ].map(t => (
                            <TouchableOpacity key={t.key} style={s.tab(tab === t.key)} onPress={() => setTab(t.key)}>
                                <Text style={s.tabText(tab === t.key)}>{t.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Content */}
                    {loading ? (
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
                    ) : (
                        <>
                            {/* Upcoming */}
                            {tab === 'upcoming' && (
                                upcoming.length === 0 ? (
                                    <View style={styles.empty}>
                                        <Ionicons name="calendar-outline" size={60} color={colors.border} />
                                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No upcoming holidays for {year}</Text>
                                    </View>
                                ) : upcoming.map(h => <HolidayCard key={h._id} h={h} showCountdown />)
                            )}

                            {/* Past */}
                            {tab === 'past' && (
                                past.length === 0 ? (
                                    <View style={styles.empty}>
                                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No past holidays</Text>
                                    </View>
                                ) : past.map(h => <HolidayCard key={h._id} h={h} showCountdown={false} />)
                            )}

                            {/* Calendar */}
                            {tab === 'calendar' && (
                                <View style={[styles.calCard, { backgroundColor: colors.bgCard, borderColor: colors.borderLight }]}>
                                    {/* Month nav */}
                                    <View style={styles.calNav}>
                                        <TouchableOpacity onPress={() => shiftCalMonth(-1)} style={[styles.calNavBtn, { backgroundColor: colors.bgMain, borderColor: colors.borderLight }]}>
                                            <Ionicons name="chevron-back" size={16} color={colors.textMuted} />
                                        </TouchableOpacity>
                                        <Text style={[styles.calMonthLabel, { color: colors.textDark }]}>
                                            {MONTH_FULL[calMonth]} {calYear}
                                        </Text>
                                        <TouchableOpacity onPress={() => shiftCalMonth(1)} style={[styles.calNavBtn, { backgroundColor: colors.bgMain, borderColor: colors.borderLight }]}>
                                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Day headers */}
                                    <View style={styles.calDayRow}>
                                        {DAY_SHORT.map(d => (
                                            <Text key={d} style={[styles.calDayHdr, { color: colors.textMuted }]}>{d}</Text>
                                        ))}
                                    </View>

                                    {/* Day cells */}
                                    <View style={styles.calGrid}>
                                        {buildCalCells().map((cell, i) => {
                                            if (!cell) return <View key={`e-${i}`} style={styles.calCell} />;
                                            const h   = cell.holiday;
                                            const tc  = h ? TYPE[h.type] : null;
                                            const isT = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(cell.day).padStart(2,'0')}` === today;
                                            return (
                                                <View key={i} style={[
                                                    styles.calCell,
                                                    h   && { backgroundColor: tc.lightBg, borderRadius: 10, borderWidth: 1, borderColor: tc.color + '40' },
                                                    isT && !h && { backgroundColor: colors.primaryLight, borderRadius: 10 },
                                                ]}>
                                                    <Text style={[
                                                        styles.calCellNum,
                                                        { color: h ? tc.color : isT ? colors.primary : colors.textDark },
                                                        (h || isT) && { fontWeight: '800' },
                                                    ]}>{cell.day}</Text>
                                                    {h && <View style={[styles.calDot, { backgroundColor: tc.color }]} />}
                                                </View>
                                            );
                                        })}
                                    </View>

                                    {/* This month holidays list */}
                                    {monthHolidays.length > 0 && (
                                        <View style={[styles.calMonthList, { borderTopColor: colors.borderLight }]}>
                                            <Text style={[styles.calMonthListTitle, { color: colors.textMuted }]}>HOLIDAYS THIS MONTH</Text>
                                            {monthHolidays.map(h => <HolidayCard key={h._id} h={h} showCountdown={h.date >= today} />)}
                                        </View>
                                    )}
                                    {monthHolidays.length === 0 && (
                                        <Text style={[styles.noHolText, { color: colors.textMuted }]}>No holidays in {MONTH_FULL[calMonth]}</Text>
                                    )}
                                </View>
                            )}
                        </>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header:        { padding: 24, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title:         { fontSize: SIZES.xxl, fontWeight: '800' },
    subtitle:      { fontSize: SIZES.sm, marginTop: 2, fontWeight: '600' },
    yearPicker:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
    yearText:      { fontSize: 16, fontWeight: '900', minWidth: 44, textAlign: 'center' },

    banner:        { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, marginBottom: 16 },
    bannerIcon:    { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    bannerTitle:   { color: 'white', fontWeight: '900', fontSize: 14 },
    bannerSub:     { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', marginTop: 2 },

    typePills:     { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
    legendPill:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
    legendText:    { fontSize: 11, fontWeight: '800' },

    tabRow:        { flexDirection: 'row', padding: 6, borderRadius: 16, marginBottom: 16, borderWidth: 1, gap: 4 },

    card:          { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, marginBottom: 10, borderWidth: 1.5 },
    dateBadge:     { width: 50, alignItems: 'center', padding: 8, borderRadius: 12 },
    dateBadgeDay:  { fontSize: 20, fontWeight: '900', lineHeight: 22 },
    dateBadgeMon:  { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    todayPill:     { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    todayPillText: { color: 'white', fontSize: 8, fontWeight: '900' },
    cardName:      { fontSize: 14, fontWeight: '800' },
    cardDay:       { fontSize: 11, fontWeight: '600', marginTop: 2 },
    cardDesc:      { fontSize: 11, marginTop: 2 },
    typePill:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    typeText:      { fontSize: 10, fontWeight: '800' },
    countdown:     { fontSize: 10, fontWeight: '700' },

    empty:         { height: 200, justifyContent: 'center', alignItems: 'center', gap: 12 },
    emptyText:     { fontSize: 14, fontWeight: '600', textAlign: 'center' },

    calCard:       { borderRadius: 20, borderWidth: 1.5, padding: 16, marginBottom: 20 },
    calNav:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    calNavBtn:     { padding: 8, borderRadius: 10, borderWidth: 1 },
    calMonthLabel: { fontSize: 16, fontWeight: '900' },
    calDayRow:     { flexDirection: 'row', marginBottom: 8 },
    calDayHdr:     { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '800' },
    calGrid:       { flexDirection: 'row', flexWrap: 'wrap' },
    calCell:       { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', padding: 2 },
    calCellNum:    { fontSize: 13, fontWeight: '600' },
    calDot:        { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
    calMonthList:  { marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
    calMonthListTitle: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginBottom: 10 },
    noHolText:     { textAlign: 'center', fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 8 },
});
