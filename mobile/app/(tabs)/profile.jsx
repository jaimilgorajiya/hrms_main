import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image, TouchableOpacity,
  ActivityIndicator, Animated, RefreshControl, Linking, Dimensions, StatusBar, Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { apiFetch, getImageUrl } from '../../utils/api';
import { ENDPOINTS } from '../../constants/api';
import { COLORS, RADIUS, SHADOW, GRADIENTS } from '../../constants/theme';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';

const { width, height } = Dimensions.get('window');

// Animated Background Decor
const BackgroundDecor = () => {
  const moveAnim1 = useRef(new Animated.Value(0)).current;
  const moveAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnim = (anim, duration) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
    };
    createAnim(moveAnim1, 8000).start();
    createAnim(moveAnim2, 12000).start();
  }, []);

  const transX1 = moveAnim1.interpolate({ inputRange: [0, 1], outputRange: [-20, 20] });
  const transY1 = moveAnim1.interpolate({ inputRange: [0, 1], outputRange: [-30, 30] });
  const transX2 = moveAnim2.interpolate({ inputRange: [0, 1], outputRange: [30, -30] });
  const transY2 = moveAnim2.interpolate({ inputRange: [0, 1], outputRange: [20, -20] });

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.blob, { backgroundColor: '#4338CA', top: -50, right: -50, width: 250, height: 250, opacity: 0.15, transform: [{ translateX: transX1 }, { translateY: transY1 }] }]} />
      <Animated.View style={[styles.blob, { backgroundColor: '#6366F1', bottom: 100, left: -80, width: 300, height: 300, opacity: 0.1, transform: [{ translateX: transX2 }, { translateY: transY2 }] }]} />
      {/* Mesh Pattern Overlay */}
      <View style={styles.meshPattern} />
    </View>
  );
};

const ProfileItem = ({ label, value, icon, iconLib = Ionicons }) => {
  const IconComponent = iconLib;
  return (
    <View style={styles.profileItem}>
      <View style={styles.iconContainer}>
        <IconComponent name={icon} size={20} color={COLORS.primary} />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemLabel}>{label}</Text>
        <Text style={styles.itemValue}>{value || 'Not specified'}</Text>
      </View>
    </View>
  );
};

export default function ProfileScreen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Personal');
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const { logout } = useAuth();

  const handleLogout = () => {
    logout().then(() => {
      Toast.show({ type: 'success', text1: 'Logged out successfully' });
    }).catch(e => {
      Toast.show({ type: 'error', text1: 'Logout failed' });
    });
  };

  const loadData = async () => {
    try {
      const res = await apiFetch(ENDPOINTS.employeeStats);
      const json = await res.json();
      if (json.success) setData(json.employee);
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Failed to load profile' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const photoUrl = data ? getImageUrl(data.profilePhoto) : null;

  if (loading && !refreshing) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <BackgroundDecor />
      
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <Animated.ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        >
          {/* Header Card */}
          <View style={styles.headerCardContainer}>
            <View style={[styles.glassCard, styles.mainHeaderCard, SHADOW.premium]}>
              <View style={styles.headerTop}>
                <View>
                  <Text style={styles.headerTitle}>Account</Text>
                  <Text style={styles.headerStatus}>Premium Access</Text>
                </View>
                <TouchableOpacity style={styles.glassActionBtn} onPress={handleLogout}>
                  <Feather name="log-out" size={18} color={COLORS.textDark} />
                </TouchableOpacity>
              </View>

              <View style={styles.profileMeta}>
                <View style={styles.avatarWrapper}>
                  <LinearGradient colors={GRADIENTS.primary} style={styles.avatarRing} />
                  <View style={styles.avatarInner}>
                    {photoUrl ? (
                      <Image source={{ uri: photoUrl }} style={styles.avatar} />
                    ) : (
                      <Text style={styles.avatarInitial}>{(data?.name || 'E')[0]}</Text>
                    )}
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName}>{data?.name || 'Loading...'}</Text>
                  <View style={styles.designationTag}>
                    <Text style={styles.designationText}>{data?.designation || 'Staff'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.statsOverview}>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{data?.employeeId || '---'}</Text>
                  <Text style={styles.statLabel}>EMP ID</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={[styles.statVal, { color: COLORS.success }]}>{data?.personalInfo?.status || 'ACTIVE'}</Text>
                  <Text style={styles.statLabel}>STATUS</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Navigation Pill */}
          <View style={styles.navContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navScroll}>
              {['Personal', 'Work', 'Contact', 'Experience', 'Documents'].map(tab => (
                <TouchableOpacity 
                  key={tab} 
                  style={[styles.navPill, activeTab === tab && styles.navPillActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.navText, activeTab === tab && styles.navTextActive]}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Detailed Content */}
          <View style={styles.contentWrapper}>
            <View style={[styles.glassCard, styles.contentCard]}>
              <View style={styles.tabHeader}>
                <Text style={styles.tabTitle}>{activeTab} Details</Text>
                <View style={styles.tabLine} />
              </View>

              <View style={styles.tabBody}>
                {activeTab === 'Personal' && (
                  <>
                    <ProfileItem icon="person-outline" label="Full Name" value={data?.name} />
                    <ProfileItem icon="calendar-outline" label="Date of Birth" value={data?.dateOfBirth ? new Date(data.dateOfBirth).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null} />
                    <ProfileItem icon="male-female-outline" label="Gender" value={data?.gender} />
                    <ProfileItem icon="water-outline" label="Blood Group" value={data?.bloodGroup} />
                    <ProfileItem icon="heart-outline" label="Marital Status" value={data?.maritalStatus} />
                  </>
                )}

                {activeTab === 'Work' && (
                  <>
                    <ProfileItem icon="business-outline" label="Office Branch" value={data?.branch} />
                    <ProfileItem icon="people-outline" label="Department" value={data?.department} />
                    <ProfileItem icon="briefcase-outline" label="Designation" value={data?.designation} />
                    <ProfileItem icon="calendar-outline" label="Joining Date" value={data?.dateJoined ? new Date(data.dateJoined).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null} />
                    <ProfileItem icon="infinite-outline" label="Employment" value={data?.workSetup?.employmentType || 'Permanent'} />
                  </>
                )}

                {activeTab === 'Contact' && (
                  <>
                    <ProfileItem icon="mail-outline" label="Work Email" value={data?.email} />
                    <ProfileItem icon="at-outline" label="Personal Email" value={data?.personalEmail} />
                    <ProfileItem icon="call-outline" label="Phone" value={data?.phone} />
                    <ProfileItem icon="location-outline" label="Address" value={data?.currentAddress} />
                  </>
                )}

                {activeTab === 'Experience' && (
                  <View style={{ gap: 20 }}>
                    {(data?.pastExperience || []).length > 0 ? (
                      data.pastExperience.map((exp, i) => (
                        <View key={i} style={styles.expNode}>
                          <View style={styles.expIconBox}>
                            <Ionicons name="briefcase" size={16} color={COLORS.white} />
                          </View>
                          <View style={styles.expContent}>
                            <Text style={styles.expCompany}>{exp.companyName}</Text>
                            <Text style={styles.expRole}>{exp.designation}</Text>
                            <Text style={styles.expDate}>{exp.workFrom ? new Date(exp.workFrom).getFullYear() : ''} - {exp.workTo ? new Date(exp.workTo).getFullYear() : 'Present'}</Text>
                          </View>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyText}>No experience data</Text>
                    )}
                  </View>
                )}

                {activeTab === 'Documents' && (
                  <View style={{ gap: 12 }}>
                    {(data?.documents || []).length > 0 ? (
                      data.documents.map((doc, i) => (
                        <TouchableOpacity key={i} style={styles.glassDocItem} onPress={() => doc.fileUrl && Linking.openURL(getImageUrl(doc.fileUrl))}>
                          <View style={styles.docIconWrapper}>
                            <MaterialCommunityIcons name="file-document" size={20} color={COLORS.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.docName} numberOfLines={1}>{doc.originalName || 'Document'}</Text>
                            <Text style={styles.docType}>{doc.documentType?.documentTypeName || 'Internal'}</Text>
                          </View>
                          <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
                        </TouchableOpacity>
                      ))
                    ) : (
                      <Text style={styles.emptyText}>No documents found</Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Background Decor
  blob: { position: 'absolute', borderRadius: 200, blur: 100 },
  meshPattern: { ...StyleSheet.absoluteFillObject, opacity: 0.03, backgroundColor: 'transparent', backgroundImage: 'radial-gradient(#000 0.5px, transparent 0.5px)', backgroundSize: '10px 10px' },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  // Glass Card Base
  glassCard: { backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.8)', overflow: 'hidden' },
  
  // Header Section
  headerCardContainer: { padding: 20, paddingTop: 10 },
  mainHeaderCard: { padding: 24, paddingTop: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  headerTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.5 },
  headerStatus: { fontSize: 18, fontWeight: '900', color: COLORS.textDark, marginTop: 2 },
  glassActionBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#f0f0f0' },

  profileMeta: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 30 },
  avatarWrapper: { position: 'relative', width: 88, height: 88, padding: 4 },
  avatarRing: { ...StyleSheet.absoluteFillObject, borderRadius: 32, opacity: 0.2 },
  avatarInner: { flex: 1, borderRadius: 28, backgroundColor: '#f0f4f8', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 3, borderColor: '#fff' },
  avatar: { width: '100%', height: '100%' },
  avatarInitial: { fontSize: 32, fontWeight: '900', color: COLORS.primary },

  profileName: { fontSize: 24, fontWeight: '900', color: COLORS.textDark },
  designationTag: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: COLORS.primaryLight, marginTop: 6 },
  designationText: { fontSize: 11, fontWeight: '800', color: COLORS.primary, textTransform: 'uppercase' },

  statsOverview: { flexDirection: 'row', backgroundColor: 'rgba(248, 250, 252, 0.5)', borderRadius: 20, padding: 16, alignItems: 'center' },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 24, backgroundColor: '#e2e8f0' },
  statVal: { fontSize: 15, fontWeight: '900', color: COLORS.textDark },
  statLabel: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted, marginTop: 2, letterSpacing: 0.5 },

  // Navigation
  navContainer: { marginBottom: 25 },
  navScroll: { paddingHorizontal: 20, gap: 12 },
  navPill: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: '#f0f0f0' },
  navPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  navText: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
  navTextActive: { color: COLORS.white },

  // Content
  contentWrapper: { paddingHorizontal: 20 },
  contentCard: { padding: 24, minHeight: 400 },
  tabHeader: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 25 },
  tabTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textDark },
  tabLine: { flex: 1, height: 2, backgroundColor: '#f1f5f9', borderRadius: 1 },
  
  tabBody: { gap: 20 },
  profileItem: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  iconContainer: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  itemContent: { flex: 1 },
  itemLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  itemValue: { fontSize: 15, fontWeight: '800', color: COLORS.textDark, marginTop: 2 },

  expNode: { flexDirection: 'row', gap: 16 },
  expIconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  expContent: { flex: 1, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  expCompany: { fontSize: 16, fontWeight: '900', color: COLORS.textDark },
  expRole: { fontSize: 13, fontWeight: '600', color: COLORS.textLight, marginTop: 2 },
  expDate: { fontSize: 12, fontWeight: '800', color: COLORS.primary, marginTop: 6 },

  glassDocItem: { flexDirection: 'row', alignItems: 'center', gap: 15, padding: 14, backgroundColor: 'rgba(248, 250, 252, 0.5)', borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  docIconWrapper: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  docName: { fontSize: 14, fontWeight: '800', color: COLORS.textDark },
  docType: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, marginTop: 2 },
  emptyText: { textAlign: 'center', color: COLORS.textPlaceholder, padding: 40, fontSize: 14, fontWeight: '600' },
});
