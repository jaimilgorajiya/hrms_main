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
import { RADIUS, SHADOW } from '../../constants/theme';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const { width, height } = Dimensions.get('window');

// Animated Background Decor
const BackgroundDecor = () => {
  const { colors, theme } = useTheme();
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
      <Animated.View style={[styles.blob, { backgroundColor: colors.primary, top: -50, right: -50, width: 250, height: 250, opacity: theme === 'dark' ? 0.15 : 0.08, transform: [{ translateX: transX1 }, { translateY: transY1 }] }]} />
      <Animated.View style={[styles.blob, { backgroundColor: colors.purple, bottom: 100, left: -80, width: 300, height: 300, opacity: theme === 'dark' ? 0.1 : 0.05, transform: [{ translateX: transX2 }, { translateY: transY2 }] }]} />
      <View style={[styles.meshPattern, { opacity: theme === 'dark' ? 0.03 : 0.015 }]} />
    </View>
  );
};

const ProfileItem = ({ label, value, icon, iconLib = Ionicons }) => {
  const { colors } = useTheme();
  const IconComponent = iconLib;
  return (
    <View style={styles.profileItem}>
      <View style={[styles.iconContainer, { backgroundColor: colors.bgSection, borderColor: colors.borderLight }]}>
        <IconComponent name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.itemValue, { color: colors.textDark }]}>{value || 'Not specified'}</Text>
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
  const { theme, colors, toggleTheme } = useTheme();

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
      <View style={[styles.loaderContainer, { backgroundColor: colors.bgMain }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgMain }]}>
      <BackgroundDecor />
      
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <Animated.ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />}
        >
          {/* Header Card */}
          <View style={styles.headerCardContainer}>
            <View style={[styles.glassCard, styles.mainHeaderCard, { backgroundColor: colors.bgCard, borderColor: colors.borderLight }, SHADOW.premium]}>
              <View style={styles.headerTop}>
                <View>
                  <Text style={[styles.headerTitle, { color: colors.textMuted }]}>Account</Text>
                  {/* <Text style={[styles.headerStatus, { color: colors.textDark }]}>Premium Access</Text> */}
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity 
                    style={[styles.glassActionBtn, { backgroundColor: colors.bgSection, borderColor: colors.borderLight }]} 
                    onPress={toggleTheme}
                  >
                    <Feather name={theme === 'dark' ? 'sun' : 'moon'} size={18} color={colors.textDark} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.glassActionBtn, { backgroundColor: colors.bgSection, borderColor: colors.borderLight }]} 
                    onPress={handleLogout}
                  >
                    <Feather name="log-out" size={18} color={colors.textDark} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.profileMeta}>
                <View style={styles.avatarWrapper}>
                  <View style={[styles.avatarRing, { backgroundColor: colors.primary, opacity: 0.2 }]} />
                  <View style={[styles.avatarInner, { backgroundColor: colors.bgCardElevated, borderColor: colors.borderLight }]}>
                    {photoUrl ? (
                      <Image source={{ uri: photoUrl }} style={styles.avatar} />
                    ) : (
                      <Text style={[styles.avatarInitial, { color: colors.primary }]}>{(data?.name || 'E')[0]}</Text>
                    )}
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.profileName, { color: colors.textDark }]}>{data?.name || 'Loading...'}</Text>
                  <View style={[styles.designationTag, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.designationText, { color: colors.primary }]}>{data?.designation || 'Staff'}</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.statsOverview, { backgroundColor: colors.bgMain, borderColor: colors.borderLight }]}>
                <View style={styles.statBox}>
                  <Text style={[styles.statVal, { color: colors.textDark }]}>{data?.employeeId || '---'}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>EMP ID</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
                <View style={styles.statBox}>
                  <Text style={[styles.statVal, { color: colors.success }]}>{data?.personalInfo?.status || 'ACTIVE'}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>STATUS</Text>
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
                  style={[
                    styles.navPill, 
                    { backgroundColor: colors.bgCard, borderColor: colors.borderLight },
                    activeTab === tab && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[
                    styles.navText, 
                    { color: colors.textMuted },
                    activeTab === tab && { color: colors.white }
                  ]}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Detailed Content */}
          <View style={styles.contentWrapper}>
            <View style={[styles.glassCard, styles.contentCard, { backgroundColor: colors.bgCard, borderColor: colors.borderLight }]}>
              <View style={styles.tabHeader}>
                <Text style={[styles.tabTitle, { color: colors.textDark }]}>{activeTab} Details</Text>
                <View style={[styles.tabLine, { backgroundColor: colors.borderLight }]} />
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
                          <View style={[styles.expIconBox, { backgroundColor: colors.primary }]}>
                            <Ionicons name="briefcase" size={16} color={colors.white} />
                          </View>
                          <View style={[styles.expContent, { borderBottomColor: colors.borderLight }]}>
                            <Text style={[styles.expCompany, { color: colors.textDark }]}>{exp.companyName}</Text>
                            <Text style={[styles.expRole, { color: colors.textLight }]}>{exp.designation}</Text>
                            <Text style={[styles.expDate, { color: colors.primary }]}>{exp.workFrom ? new Date(exp.workFrom).getFullYear() : ''} - {exp.workTo ? new Date(exp.workTo).getFullYear() : 'Present'}</Text>
                          </View>
                        </View>
                      ))
                    ) : (
                      <Text style={[styles.emptyText, { color: colors.textPlaceholder }]}>No experience data</Text>
                    )}
                  </View>
                )}

                {activeTab === 'Documents' && (
                  <View style={{ gap: 12 }}>
                    {(data?.documents || []).length > 0 ? (
                      data.documents.map((doc, i) => (
                        <TouchableOpacity key={i} style={[styles.glassDocItem, { backgroundColor: colors.bgSection, borderColor: colors.borderLight }]} onPress={() => doc.fileUrl && Linking.openURL(getImageUrl(doc.fileUrl))}>
                          <View style={[styles.docIconWrapper, { backgroundColor: colors.bgCardElevated }]}>
                            <MaterialCommunityIcons name="file-document" size={20} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.docName, { color: colors.textDark }]} numberOfLines={1}>{doc.originalName || 'Document'}</Text>
                            <Text style={[styles.docType, { color: colors.textMuted }]}>{doc.documentType?.documentTypeName || 'Internal'}</Text>
                          </View>
                          <Feather name="chevron-right" size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                      ))
                    ) : (
                      <Text style={[styles.emptyText, { color: colors.textPlaceholder }]}>No documents found</Text>
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
  container: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  blob: { position: 'absolute', borderRadius: 200 },
  meshPattern: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  glassCard: { borderRadius: 32, borderWidth: 1, overflow: 'hidden' },
  
  headerCardContainer: { padding: 20, paddingTop: 10 },
  mainHeaderCard: { padding: 24, paddingTop: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  headerTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5 },
  headerStatus: { fontSize: 18, fontWeight: '900', marginTop: 2 },
  glassActionBtn: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },

  profileMeta: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 30 },
  avatarWrapper: { position: 'relative', width: 88, height: 88, padding: 4 },
  avatarRing: { ...StyleSheet.absoluteFillObject, borderRadius: 32, opacity: 0.2 },
  avatarInner: { flex: 1, borderRadius: 28, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 3 },
  avatar: { width: '100%', height: '100%' },
  avatarInitial: { fontSize: 32, fontWeight: '900' },

  profileName: { fontSize: 24, fontWeight: '900' },
  designationTag: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginTop: 6 },
  designationText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },

  statsOverview: { flexDirection: 'row', borderRadius: 20, padding: 16, alignItems: 'center', borderWidth: 1 },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 24 },
  statVal: { fontSize: 15, fontWeight: '900' },
  statLabel: { fontSize: 9, fontWeight: '800', marginTop: 2, letterSpacing: 0.5 },

  navContainer: { marginBottom: 25 },
  navScroll: { paddingHorizontal: 20, gap: 12 },
  navPill: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, borderWidth: 1 },
  navText: { fontSize: 14, fontWeight: '700' },

  contentWrapper: { paddingHorizontal: 20 },
  contentCard: { padding: 24, minHeight: 400 },
  tabHeader: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 25 },
  tabTitle: { fontSize: 18, fontWeight: '900' },
  tabLine: { flex: 1, height: 2, borderRadius: 1 },
  
  tabBody: { gap: 20 },
  profileItem: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  iconContainer: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  itemContent: { flex: 1 },
  itemLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  itemValue: { fontSize: 15, fontWeight: '800', marginTop: 2 },

  expNode: { flexDirection: 'row', gap: 16 },
  expIconBox: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  expContent: { flex: 1, paddingBottom: 20, borderBottomWidth: 1 },
  expCompany: { fontSize: 16, fontWeight: '900' },
  expRole: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  expDate: { fontSize: 12, fontWeight: '800', marginTop: 6 },

  glassDocItem: { flexDirection: 'row', alignItems: 'center', gap: 15, padding: 14, borderRadius: 20, borderWidth: 1 },
  docIconWrapper: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  docName: { fontSize: 14, fontWeight: '800' },
  docType: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  emptyText: { textAlign: 'center', padding: 40, fontSize: 14, fontWeight: '600' },
});
