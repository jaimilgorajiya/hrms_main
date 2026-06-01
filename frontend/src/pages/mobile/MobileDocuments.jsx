import React, { useState, useEffect } from 'react';
import { FileText, Eye, Download, Calendar, AlertCircle, FolderOpen, RefreshCw } from 'lucide-react';
import { useMobileAuth } from './context/MobileAuthContext';
import { useMobileTheme } from './context/MobileThemeContext';

const ENDPOINTS = {
  stats: '/api/employee-dashboard/stats',
};

// Simple utility to resolve document files to full URL
const getImageUrl = (filePath) => {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  // Fallback to standard server static upload route
  return `http://localhost:5000/${filePath.replace(/\\/g, '/')}`;
};

export default function MobileDocuments() {
  const { apiFetch } = useMobileAuth();
  const { isDark } = useMobileTheme();

  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadDocs = async () => {
    try {
      const res = await apiFetch(ENDPOINTS.stats);
      const json = await res.json();
      if (json.success) {
        setDocs(json.employee?.documents || []);
      } else {
        showToast(json.message || 'Failed to fetch documents', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Could not fetch documents.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const handleOpenLink = (url) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{ minHeight: '100%', paddingBottom: 80 }}>
      {/* Toast */}
      {toast && (
        <div className="m-toast" style={{
          background: toast.type === 'error' ? 'var(--m-danger)' : 'var(--m-success)',
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{
        background: isDark
          ? 'linear-gradient(160deg, #1a2540 0%, #0f172a 100%)'
          : 'linear-gradient(160deg, #6366F1 0%, #4338CA 100%)',
        padding: '24px 20px 30px',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: -0.5 }}>My Documents</h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>Manage and download your official records</p>
          </div>
          <button
            onClick={() => { setRefreshing(true); loadDocs(); }}
            style={{
              width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <RefreshCw size={16} color="white" style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Documents List */}
      <div style={{ padding: '20px 16px' }}>
        {loading ? (
          <div className="m-loader" style={{ height: 200 }}>
            <div className="m-spinner" />
            <span>Loading documents...</span>
          </div>
        ) : docs.length === 0 ? (
          <div style={{
            height: 300, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16,
            color: 'var(--m-muted)'
          }}>
            <FolderOpen size={64} style={{ opacity: 0.5 }} />
            <span style={{ fontSize: 15, fontWeight: 600 }}>No documents uploaded yet.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {docs.map((doc, idx) => {
              const fileUrl = getImageUrl(doc.file);
              const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();

              return (
                <div key={doc._id || idx} className="m-card" style={{ padding: 18, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: isExpired ? 'var(--m-danger-light)' : 'var(--m-primary-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <FileText size={24} color={isExpired ? 'var(--m-danger)' : 'var(--m-primary)'} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--m-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {doc.documentType || 'Personal Document'}
                      </h4>
                      {isExpired && (
                        <span style={{
                          padding: '3px 8px', borderRadius: 6, background: 'var(--m-danger)',
                          color: 'white', fontSize: 9, fontWeight: 900
                        }}>EXPIRY</span>
                      )}
                    </div>

                    <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: 'var(--m-muted)' }}>
                      ID: {doc.documentNumber || '—'}
                    </p>

                    <div style={{
                      background: 'var(--m-elevated)', borderRadius: 10,
                      padding: 10, display: 'flex', flexDirection: 'column', gap: 6,
                      fontSize: 12, fontWeight: 600, marginBottom: 14
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--m-text)' }}>
                        <Calendar size={13} style={{ color: 'var(--m-muted)' }} />
                        <span>Issued: {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString() : '—'}</span>
                      </div>
                      {doc.expiryDate && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          color: isExpired ? 'var(--m-danger)' : 'var(--m-text)',
                          fontWeight: isExpired ? 700 : 600
                        }}>
                          <AlertCircle size={13} style={{ color: isExpired ? 'var(--m-danger)' : 'var(--m-muted)' }} />
                          <span>Expiry: {new Date(doc.expiryDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        className="m-btn m-btn-ghost m-btn-sm"
                        style={{ flex: 1, gap: 6 }}
                        onClick={() => handleOpenLink(fileUrl)}
                      >
                        <Eye size={14} />
                        View File
                      </button>
                      <button
                        className="m-btn m-btn-primary m-btn-sm"
                        style={{ flex: 1, gap: 6 }}
                        onClick={() => handleOpenLink(fileUrl)}
                      >
                        <Download size={14} />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
