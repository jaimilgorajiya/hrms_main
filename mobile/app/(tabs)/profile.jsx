import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image, TouchableOpacity,
  TextInput, ActivityIndicator, Animated, RefreshControl, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch, getImageUrl } from '../../utils/api';
import { ENDPOINTS } from '../../constants/api';
import { COLORS, SIZES, RADIUS, SHADOW } from '../../constants/theme';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';

const ProfileItem = ({ label, value, icon }) => (
  <View style={styles.profileItem}>
    <View style={styles.iconBox}><Ionicons name={icon} size={18} color={COLORS.primary} /></View>
    <View>
      <Text style={styles.itemLabel}>{label}</Text>
      <Text style={styles.itemValue}>{value || '—'}</Text>
    </View>
  </View>
);

export default function ProfileScreen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Personal');
  const [refreshing, setRefreshing] = useState(false);
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      Toast.show({ type: 'success', text1: 'Logged out successfully' });
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Logout failed' });
    }
  };

  const loadData = async () => {
    try {
      const res = await apiFetch(ENDPOINTS.employeeStats);
      const json = await res.json();
      if (json.success) setData(json.employee);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const photoUrl = data ? getImageUrl(data.profilePhoto) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.primary} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>My Profile</Text>
          <Text style={styles.subTitle}>Manage your personal information</Text>
        </View>

        <View style={styles.body}>
          <View style={[styles.profileHero, SHADOW.lg]}>
            <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.heroBg} />
            <View style={styles.heroContent}>
              <View style={[styles.avatarWrap, SHADOW.md]}>
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}><Text style={styles.avatarText}>{(data?.name || 'E')[0]}</Text></View>
                )}
              </View>
              <Text style={styles.heroName}>{data?.name || 'Employee'}</Text>
              <Text style={styles.heroRole}>{data?.designation || 'Staff'}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, styles.statusBadge]}><Text style={styles.badgeText}>{data?.personalInfo?.status || 'Active'}</Text></View>
                <View style={[styles.badge, styles.idBadge]}><Text style={styles.badgeText}>ID: {data?.employeeId}</Text></View>
              </View>
            </View>
          </View>

          {/* Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBarScroll} contentContainerStyle={styles.tabBar}>
            {['Personal', 'Work', 'Experience', 'Contact', 'Documents'].map(t => (
              <TouchableOpacity key={t} style={[styles.tab, activeTab === t && styles.activeTab]} onPress={() => setActiveTab(t)}>
                <Text style={[styles.tabText, activeTab === t && styles.activeTabText]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={[styles.card, SHADOW.sm]}>
            {activeTab === 'Personal' && (
              <View style={styles.tabContent}>
                <ProfileItem icon="person-outline" label="Full Name" value={data?.name} />
                <ProfileItem icon="calendar-outline" label="Birthday" value={data?.dateOfBirth ? new Date(data.dateOfBirth).toLocaleDateString() : null} />
                <ProfileItem icon="transgender-outline" label="Gender" value={data?.gender} />
                <ProfileItem icon="water-outline" label="Blood Group" value={data?.bloodGroup} />
                <ProfileItem icon="heart-outline" label="Marital Status" value={data?.maritalStatus} />
              </View>
            )}
            
            {activeTab === 'Work' && (
              <View style={styles.tabContent}>
                <ProfileItem icon="business-outline" label="Branch" value={data?.branch} />
                <ProfileItem icon="people-outline" label="Department" value={data?.department} />
                <ProfileItem icon="briefcase-outline" label="Designation" value={data?.designation} />
                <ProfileItem icon="calendar-outline" label="Joined On" value={data?.dateJoined ? new Date(data.dateJoined).toLocaleDateString() : null} />
                <ProfileItem icon="time-outline" label="Work Mode" value={data?.workSetup?.mode} />
                <ProfileItem icon="person-outline" label="Reporting To" value={data?.reportingTo} />
              </View>
            )}

            {activeTab === 'Experience' && (
              <View style={styles.tabContent}>
                {(data?.pastExperience || []).length > 0 ? (
                  data.pastExperience.map((exp, i) => {
                    const from = exp.workFrom ? new Date(exp.workFrom).getFullYear() : '—';
                    const to = exp.workTo ? new Date(exp.workTo).getFullYear() : 'Present';
                    return (
                      <View key={i} style={styles.expItem}>
                        <Text style={styles.expCompany}>{exp.companyName || 'Unknown Company'}</Text>
                        <Text style={styles.expRole}>{exp.designation || 'Position'}</Text>
                        <Text style={styles.expYears}>{from} - {to}</Text>
                        <View style={styles.divider} />
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.emptyText}>No experience data available.</Text>
                )}
              </View>
            )}

            {activeTab === 'Contact' && (
              <View style={styles.tabContent}>
                <ProfileItem icon="mail-outline" label="Official Email" value={data?.email} />
                <ProfileItem icon="at-outline" label="Personal Email" value={data?.personalEmail} />
                <ProfileItem icon="call-outline" label="Mobile" value={data?.phone} />
                <ProfileItem icon="home-outline" label="Current Address" value={data?.currentAddress} />
                <ProfileItem icon="alert-circle-outline" label="Emergency Contact" value={`${data?.emergencyContact?.name} (${data?.emergencyContact?.relation})`} />
                <ProfileItem icon="call-outline" label="Emergency Phone" value={data?.emergencyContact?.phone} />
              </View>
            )}

            {activeTab === 'Documents' && (
              <View style={styles.tabContent}>
                {(data?.documents || []).length > 0 ? (
                  data.documents.map((doc, i) => {
                    const fullUrl = getImageUrl(doc.fileUrl);
                    return (
                      <TouchableOpacity 
                        key={i} 
                        style={styles.docItem} 
                        activeOpacity={0.7}
                        onPress={() => {
                          if (fullUrl) {
                            Linking.openURL(fullUrl).catch(err => {
                              console.error("URL Open Error:", err);
                              Toast.show({ type: 'error', text1: 'Unable to open file' });
                            });
                          }
                        }}
                      >
                        <View style={styles.docIconBox}>
                          <Ionicons name="document-outline" size={20} color={COLORS.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.docName} numberOfLines={1}>{doc.originalName || 'Document'}</Text>
                          <Text style={styles.docType}>{doc.documentType?.documentTypeName || 'Internal Doc'}</Text>
                        </View>
                        <Ionicons name="cloud-download-outline" size={20} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={styles.emptyText}>No documents uploaded.</Text>
                )}
              </View>
            )}

            <View style={styles.logoutWrapper}>
              <TouchableOpacity style={styles.logoutButton} activeOpacity={0.8} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
                <Text style={styles.logoutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgMain },
  scroll: { flex: 1 },
  header: { padding: 24, paddingBottom: 10 },
  title: { fontSize: SIZES.xxl, fontWeight: '800', color: COLORS.textDark },
  subTitle: { fontSize: SIZES.sm, color: COLORS.textLight, marginTop: 4 },
  body: { padding: 20 },
  profileHero: { backgroundColor: COLORS.white, borderRadius: 28, overflow: 'hidden', marginBottom: 24, paddingBottom: 24 },
  heroBg: { height: 100, width: '100%', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  heroContent: { marginTop: -50, alignItems: 'center' },
  avatarWrap: { width: 100, height: 100, borderRadius: RADIUS.full, borderWidth: 4, borderColor: COLORS.white, overflow: 'hidden', backgroundColor: COLORS.bgMain },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primaryLight },
  avatarText: { fontSize: 36, fontWeight: '800', color: COLORS.primary },
  heroName: { fontSize: 24, fontWeight: '800', color: COLORS.textDark, marginTop: 12 },
  heroRole: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginTop: 2, textTransform: 'uppercase' },
  badgeRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadge: { backgroundColor: COLORS.successLight },
  idBadge: { backgroundColor: COLORS.bgMain },
  badgeText: { fontSize: 11, fontWeight: '700', color: COLORS.textDark },
  tabBarScroll: { maxHeight: 60, marginBottom: 16 },
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 16, padding: 4, gap: 4, height: 56 },
  tab: { paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center', borderRadius: 12, minWidth: 100 },
  activeTab: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  activeTabText: { color: COLORS.white },
  card: { backgroundColor: COLORS.white, borderRadius: 24, padding: 20, minHeight: 400 },
  tabContent: { gap: 18 },
  profileItem: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  itemLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase' },
  itemValue: { fontSize: 15, fontWeight: '700', color: COLORS.textDark, marginTop: 2 },
  expItem: { marginBottom: 10 },
  expCompany: { fontSize: 15, fontWeight: '800', color: COLORS.textDark },
  expRole: { fontSize: 13, color: COLORS.textMain, marginTop: 2 },
  expYears: { fontSize: 12, color: COLORS.primary, fontWeight: '700', marginTop: 4 },
  docItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.bgMain, padding: 12, borderRadius: 16 },
  docIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' },
  docName: { fontSize: 14, fontWeight: '700', color: COLORS.textDark },
  docType: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  divider: { height: 1, backgroundColor: COLORS.borderLight, marginTop: 12 },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, padding: 20 },
  logoutWrapper: { marginTop: 30, borderTopWidth: 1, borderTopColor: COLORS.borderLight, paddingTop: 20 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.dangerLight, paddingVertical: 14, borderRadius: 16, gap: 8 },
  logoutText: { fontSize: 15, fontWeight: '700', color: COLORS.danger },
});
