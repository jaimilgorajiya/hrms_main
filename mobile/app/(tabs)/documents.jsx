import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch, getImageUrl } from '../../utils/api';
import { ENDPOINTS } from '../../constants/api';
import { COLORS, SIZES, RADIUS, SHADOW } from '../../constants/theme';
import Toast from 'react-native-toast-message';

const DocCard = ({ doc }) => {
  const url = getImageUrl(doc.file);
  const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();

  return (
    <View style={[styles.docCard, SHADOW.sm]}>
      <View style={[styles.docIcon, { backgroundColor: isExpired ? COLORS.dangerLight : COLORS.primaryLight }]}>
        <Ionicons name="document-text" size={30} color={isExpired ? COLORS.danger : COLORS.primary} />
      </View>
      <View style={styles.docContent}>
        <View style={styles.docHeader}>
          <Text style={styles.docTitle} numberOfLines={1}>{doc.documentType || 'Personal Document'}</Text>
          {isExpired && <View style={styles.expiredBadge}><Text style={styles.expiredText}>EXPIRY</Text></View>}
        </View>
        <Text style={styles.docNum}>ID: {doc.documentNumber || '—'}</Text>
        
        <View style={styles.docMeta}>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.metaText}>Issued: {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString() : '—'}</Text>
          </View>
          {doc.expiryDate && (
            <View style={styles.metaRow}>
              <Ionicons name="alert-circle-outline" size={14} color={isExpired ? COLORS.danger : COLORS.textMuted} />
              <Text style={[styles.metaText, isExpired && { color: COLORS.danger, fontWeight: '700' }]}>
                Expiry: {new Date(doc.expiryDate).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.docActions}>
          <TouchableOpacity style={[styles.actionBtn, styles.viewBtn]} onPress={() => Linking.openURL(url)}>
            <Ionicons name="eye-outline" size={16} color={COLORS.primary} />
            <Text style={styles.viewBtnText}>View File</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.downloadBtn]} onPress={() => Linking.openURL(url)}>
            <Ionicons name="download-outline" size={16} color={COLORS.white} />
            <Text style={styles.downloadBtnText}>Download</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default function DocumentsScreen() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDocs = async () => {
    try {
      const res = await apiFetch(ENDPOINTS.employeeStats);
      const json = await res.json();
      if (json.success) setDocs(json.employee?.documents || []);
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Load Failed', text2: 'Could not fetch documents.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadDocs(); }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Documents</Text>
        <Text style={styles.subTitle}>Manage and download your official records</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDocs(); }} tintColor={COLORS.primary} />}
        >
          {docs.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="folder-open-outline" size={80} color={COLORS.border} />
              <Text style={styles.emptyText}>No documents uploaded yet.</Text>
            </View>
          ) : (
            docs.map((doc, idx) => <DocCard key={doc._id || idx} doc={doc} />)
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgMain },
  header: { padding: 24, paddingBottom: 10 },
  title: { fontSize: SIZES.xxl, fontWeight: '800', color: COLORS.textDark },
  subTitle: { fontSize: SIZES.sm, color: COLORS.textLight, marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  docCard: { backgroundColor: COLORS.white, borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 16 },
  docIcon: { width: 64, height: 64, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  docContent: { flex: 1 },
  docHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  docTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark, flex: 1 },
  expiredBadge: { backgroundColor: COLORS.danger, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  expiredText: { fontSize: 10, fontWeight: '800', color: COLORS.white },
  docNum: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600', marginBottom: 12 },
  docMeta: { gap: 6, marginBottom: 16, backgroundColor: COLORS.bgMain, padding: 10, borderRadius: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 12, color: COLORS.textMain, fontWeight: '600' },
  docActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, height: 40, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  viewBtn: { backgroundColor: COLORS.primaryLight, borderWidth: 1, borderColor: COLORS.primaryBorder },
  viewBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  downloadBtn: { backgroundColor: COLORS.primary },
  downloadBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  empty: { height: 400, justifyContent: 'center', alignItems: 'center', gap: 20 },
  emptyText: { fontSize: 16, color: COLORS.textMuted, fontWeight: '600' },
});
