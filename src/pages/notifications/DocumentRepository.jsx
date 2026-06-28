import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { listDocuments, getDocumentStats, deleteDocument, shareDocument, uploadDocument } from '../../services/complianceService';
import { useRef } from 'react';
import './DocumentRepository.css';

// GET /admin/documents response schema isn't documented. Mapped
// defensively from plausible field names.
function mapDoc(d) {
  return {
    id: d.id,
    name: d.file_name ?? d.name ?? '—',
    category: d.type ?? d.category ?? 'Other',
    size: d.size_kb ? `${(d.size_kb / 1024).toFixed(1)} MB` : d.size ?? '—',
    uploadedBy: d.uploaded_by ?? d.uploadedBy ?? '—',
    date: d.created_at ?? d.date ?? '—',
  };
}

export default function DocumentRepository() {
  const { notification, notify, closeNotification } = useNotification();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [docs, setDocs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const fileInputRef = useRef(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [docsResult, statsResult] = await Promise.allSettled([
        listDocuments({ type: selectedCategory !== 'all' ? selectedCategory : undefined }),
        getDocumentStats(),
      ]);
      if (docsResult.status === 'fulfilled') setDocs(docsResult.value.items.map(mapDoc));
      else notify.error(getErrorMessage(docsResult.reason, 'Failed to load documents.'));
      if (statsResult.status === 'fulfilled') setStats(statsResult.value);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const categories = ['all', 'KYC', 'Financial', 'Income', 'Legal'];

  const handleDownload = async (doc) => {
    try {
      setBusyId(doc.id);
      const result = await shareDocument(doc.id, { expiryMinutes: 60, purpose: 'Admin download' });
      const url = result?.url ?? result?.data?.url;
      if (url) window.open(url, '_blank', 'noopener');
      else notify.warning('Share link generated, but no URL was returned by the server.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to generate share link.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (doc) => {
    try {
      setBusyId(doc.id);
      await deleteDocument(doc.id);
      notify.success('Document deleted.');
      fetchAll();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to delete document.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      await uploadDocument(formData);
      notify.success('Document uploaded successfully.');
      fetchAll();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to upload document.'));
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <PageWrapper title="Document Repository" subtitle="Centralized document management system">
      <div className="document-repo">
        <div className="repo-header">
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleUpload} 
          />
          <button 
            className="upload-btn" 
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            + Upload Document
          </button>
        </div>

        <Card>
          <div className="category-filters">
            {categories.map(cat => (
              <button key={cat} className={`category-btn ${selectedCategory === cat ? 'active' : ''}`} onClick={() => setSelectedCategory(cat)}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          <div className="stats-bar">
            <div>Total Documents: {stats?.total ?? docs.length}</div>
            <div>Total Size: {stats?.total_size ?? '—'}</div>
            <div>Last Upload: {stats?.last_upload ?? '—'}</div>
          </div>

          {loading ? <Loader text="Loading documents..." /> : (
            <div className="documents-grid">
              {docs.map(doc => (
                <div key={doc.id} className="doc-card">
                  <div className="doc-icon">📄</div>
                  <div className="doc-info">
                    <div className="doc-name">{doc.name}</div>
                    <div className="doc-meta">
                      <span className="doc-category">{doc.category}</span>
                      <span className="doc-size">{doc.size}</span>
                    </div>
                    <div className="doc-uploader">by {doc.uploadedBy} • {doc.date}</div>
                  </div>
                  <div className="doc-actions">
                    <button className="download-doc" onClick={() => handleDownload(doc)} disabled={busyId === doc.id}>↓</button>
                    <button className="delete-doc" onClick={() => handleDelete(doc)} disabled={busyId === doc.id}>🗑️</button>
                  </div>
                </div>
              ))}
              {!docs.length && <p className="doc-empty">No documents found.</p>}
            </div>
          )}
        </Card>
      </div>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
