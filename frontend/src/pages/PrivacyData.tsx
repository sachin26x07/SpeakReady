import { useState } from 'react';
import { Shield, Download, Upload, Trash2, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { exportData, importData, resetAllData, getProgress } from '../services/storage';

export default function PrivacyData() {
  const [importJson, setImportJson] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [showReset, setShowReset] = useState(false);

  const progress = getProgress();
  const storageUsed = JSON.stringify(progress).length + 500; // rough estimate

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `speakready-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const result = importData(importJson);
    if (result.success) {
      setImportMsg('✅ Data imported! Refreshing…');
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setImportMsg(`❌ Import failed: ${result.error}`);
    }
  };

  const handleReset = () => {
    resetAllData();
    window.location.reload();
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🔒 Privacy & Data Management</h1>
        <p className="page-subtitle">Understand how your data is stored and manage it</p>
      </div>

      {/* Privacy summary */}
      <div className="card card-elevated" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
          <Shield size={24} color="var(--color-primary-500)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div className="card-title" style={{ marginBottom: 4 }}>Your Data — Fully Local by Default</div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              SpeakReady AI is designed for personal use. Your practice history, settings, and resume
              are stored <strong>only in your browser's localStorage</strong> on this device.
            </p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { icon: '✅', label: 'Progress history', where: 'Your browser (localStorage)' },
            { icon: '✅', label: 'Settings & preferences', where: 'Your browser (localStorage)' },
            { icon: '✅', label: 'Resume text', where: 'Your browser (localStorage)' },
            { icon: '⚠️', label: 'AI practice questions', where: 'Sent to your selected Groq or Gemini provider via your backend' },
            { icon: '⚠️', label: 'Resume text (interview)', where: 'Sent to AI provider when you generate questions' },
            { icon: '⚠️', label: 'Speech transcript', where: 'Processed by browser SpeechRecognition (browser vendor)' },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '10px 14px', background: 'var(--bg-surface)',
              borderRadius: 8, fontSize: 13,
            }}>
              <span>{item.icon}</span>
              <span style={{ fontWeight: 600, marginLeft: 6 }}>{item.label}</span>
              <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{item.where}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Important notices */}
      <div className="alert alert-warning" style={{ marginBottom: 20 }}>
        <AlertTriangle size={16} />
        <div style={{ fontSize: 13 }}>
          <strong>Storage limitations:</strong> localStorage data may be lost when you clear browser data,
          use private/incognito mode, or switch browsers. Export your data regularly to keep backups.
          This app is designed for <strong>one browser on one device</strong> — no automatic cross-device sync.
        </div>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 20 }}>
        <Info size={16} />
        <div style={{ fontSize: 13 }}>
          <strong>API keys:</strong> Your Groq and Gemini API keys are stored only in the backend
          <code style={{ fontSize: 12, background: 'rgba(0,0,0,0.08)', padding: '1px 5px', borderRadius: 3, margin: '0 3px' }}>.env</code>
          file on your computer — never in the browser or frontend code.
        </div>
      </div>

      {/* Storage stats */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title" style={{ marginBottom: 12 }}>📊 Storage Usage</div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13 }}>
            <span style={{ color: 'var(--text-muted)' }}>Sessions recorded:</span>{' '}
            <strong>{progress.sessions.length}</strong>
          </div>
          <div style={{ fontSize: 13 }}>
            <span style={{ color: 'var(--text-muted)' }}>Grammar results:</span>{' '}
            <strong>{progress.grammarResults.length}</strong>
          </div>
          <div style={{ fontSize: 13 }}>
            <span style={{ color: 'var(--text-muted)' }}>Approx. data size:</span>{' '}
            <strong>{Math.round(storageUsed / 1024)} KB</strong>
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="card card-elevated" style={{ marginBottom: 20 }}>
        <div className="card-title" style={{ marginBottom: 8 }}>💾 Export My Data</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
          Download all your progress, settings, and resume as a JSON file. Save this as a backup.
        </p>
        <button className="btn btn-secondary" onClick={handleExport}>
          <Download size={16} /> Export All Data
        </button>
      </div>

      {/* Import */}
      <div className="card card-elevated" style={{ marginBottom: 20 }}>
        <div className="card-title" style={{ marginBottom: 8 }}>📥 Import Data</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
          Paste a previously exported JSON to restore your data. This will merge with existing data.
        </p>
        <textarea
          className="textarea"
          rows={5}
          placeholder='Paste your exported JSON here… {"version":1,"settings":…}'
          value={importJson}
          onChange={e => setImportJson(e.target.value)}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 12, marginBottom: 10 }}
        />
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleImport}
          disabled={!importJson.trim()}
        >
          <Upload size={14} /> Import Data
        </button>
        {importMsg && (
          <div style={{ marginTop: 10, fontSize: 13 }}>
            {importMsg.startsWith('✅')
              ? <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={14} />{importMsg}</span>
              : <span style={{ color: 'var(--color-error)' }}>{importMsg}</span>}
          </div>
        )}
      </div>

      {/* Reset */}
      <div className="card" style={{ border: '1px solid #fecaca', background: '#fef2f2' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertTriangle size={18} color="var(--color-error)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-error)', marginBottom: 6 }}>Reset All Progress</div>
            <p style={{ fontSize: 13, color: '#7f1d1d', marginBottom: 14 }}>
              This permanently deletes all practice history, grammar results, settings, streak data, and your saved resume.
              <strong> Export your data first if you want to keep it.</strong>
            </p>
            {!showReset ? (
              <button className="btn btn-danger btn-sm" onClick={() => setShowReset(true)}>
                <Trash2 size={13} /> Reset All Data
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn btn-danger" onClick={handleReset}>Yes, Delete Everything</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowReset(false)}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
