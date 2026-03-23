import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, File, Image, AlertCircle } from 'lucide-react';
import authenticatedFetch from '../../utils/apiHandler';
import API_URL from '../../config/api';
import '../../styles/EmployeePanel.css';

const EmployeeDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authenticatedFetch(`${API_URL}/api/employee-dashboard/stats`);
        const json = await res.json();
        if (json.success) setDocuments(json.employee?.documents || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const getFileIcon = (url) => {
    if (!url) return <File size={24} />;
    const ext = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <Image size={24} />;
    return <FileText size={24} />;
  };

  const getFileUrl = (url) => {
    if (!url) return '#';
    return url.startsWith('http') ? url : `${API_URL}/uploads/${url}`;
  };

  const isImage = (url) => {
    if (!url) return false;
    const ext = url.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  };

  if (loading) return <div className="dashboard-loading"><div className="loader"></div><span>Loading documents...</span></div>;

  return (
    <div className="ep-page">
      <div className="ep-page-header">
        <div>
          <h2>My Documents</h2>
          <p>View your uploaded documents and ID proofs</p>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="ep-card ep-empty-docs">
          <AlertCircle size={48} />
          <h3>No Documents Found</h3>
          <p>Your uploaded documents will appear here. Contact HR to upload your documents.</p>
        </div>
      ) : (
        <div className="ep-docs-grid">
          {documents.map((doc, i) => {
            const typeName = doc.documentType?.name || 'Document';
            const fileUrl = getFileUrl(doc.fileUrl);
            const img = isImage(doc.fileUrl);
            return (
              <div key={i} className="ep-doc-card">
                <div className="ep-doc-preview">
                  {img ? (
                    <img src={fileUrl} alt={typeName} className="ep-doc-img-preview" />
                  ) : (
                    <div className="ep-doc-file-icon">
                      {getFileIcon(doc.fileUrl)}
                    </div>
                  )}
                </div>
                <div className="ep-doc-info">
                  <span className="ep-doc-type">{typeName}</span>
                  <span className="ep-doc-name">{doc.originalName || doc.fileUrl}</span>
                  {doc.documentNumber && <span className="ep-doc-number">No: {doc.documentNumber}</span>}
                  <div className="ep-doc-dates">
                    {doc.issueDate && <span>Issued: {new Date(doc.issueDate).toLocaleDateString('en-IN')}</span>}
                    {doc.expiryDate && <span>Expires: {new Date(doc.expiryDate).toLocaleDateString('en-IN')}</span>}
                  </div>
                  <span className="ep-doc-uploaded">Uploaded: {new Date(doc.uploadedAt).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="ep-doc-actions">
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="ep-doc-action-btn view">
                    <Eye size={15} /> View
                  </a>
                  <a href={fileUrl} download className="ep-doc-action-btn download">
                    <Download size={15} /> Download
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EmployeeDocuments;
