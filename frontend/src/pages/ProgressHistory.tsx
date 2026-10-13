import { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, Flame, Target, Clock, Download, Upload, Trash2, AlertTriangle } from 'lucide-react';
import { getProgress, exportData, importData, resetAllData, getWeeklyStats } from '../services/storage';
import type { ProgressData } from '../types';

function StatBox({ label, value, icon, color = 'var(--color-primary-500)' }: { label: string; value: string | number; icon: React.ReactNode; color?: string }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: color + '20', color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</div>
      </div>
    </div>
  );
}

export default function ProgressHistory() {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [weekly, setWeekly] = useState<{ dates: string[]; minutes: number[] }>({ dates: [], minutes: [] });
  const [showReset, setShowReset] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importMsg, setImportMsg] = useState('');

  useEffect(() => {
    setProgress(getProgress());
    setWeekly(getWeeklyStats());
  }, []);

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `speakready-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImport = () => {
    const result = importData(importJson);
    if (result.success) {
      setImportMsg('✅ Data imported successfully! Refreshing...');
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setImportMsg(`❌ Import failed: ${result.error}`);
    }
  };

  const handleReset = () => {
    resetAllData();
    setShowReset(false);
    window.location.reload();
  };

  if (!progress) return <div className="spinner" />;

  const grammarResults = progress.grammarResults || [];
  const recentAccuracy = grammarResults.length > 0
    ? Math.round(grammarResults.slice(-20).filter(r => r.isCorrect).length / Math.min(grammarResults.length, 20) * 100)
    : 0;

  const sessions = progress.sessions || [];
  const recentSessions = sessions.slice(-14).reverse();

  const topicErrors = (progress.weakAreas || [])
    .sort((a, b) => b.errorCount - a.errorCount)
    .slice(0, 5);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📊 Progress & History</h1>
        <p className="page-subtitle">Track your learning journey and identify areas for improvement</p>
      </div>

      {sessions.length === 0 ? (
        <div className="empty-state card" style={{ marginBottom: 24 }}>
          <div className="empty-state-icon"><BarChart2 size={28} /></div>
          <div className="empty-state-title">No Practice Data Yet</div>
          <div className="empty-state-description">
            Complete at least one practice session to see your progress here.
            Your data is saved locally in your browser.
          </div>
        </div>
      ) : (
        <>
          {/* Overall stats */}
          <div className="grid-4" style={{ marginBottom: 24 }}>
            <StatBox label="Day Streak 🔥" value={progress.streak} icon={<Flame size={20} />} color="#f59e0b" />
            <StatBox label="Total Sessions" value={progress.totalSessions} icon={<TrendingUp size={20} />} color="#8b5cf6" />
            <StatBox label="Total Minutes" value={progress.totalMinutes} icon={<Clock size={20} />} color="#10b981" />
            <StatBox label="Grammar Accuracy" value={grammarResults.length > 0 ? `${recentAccuracy}%` : '—'} icon={<Target size={20} />} color="#3b82f6" />
          </div>

          {/* Weekly chart */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header" style={{ marginBottom: 16 }}>
              <div className="card-title">📅 Last 7 Days</div>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {weekly.minutes.reduce((a,b) => a+b, 0)} min this week
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
              {weekly.minutes.map((min, i) => {
                const maxMin = Math.max(...weekly.minutes, 1);
                const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
                const date = new Date(weekly.dates[i]);
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{min > 0 ? `${min}m` : ''}</div>
                    <div style={{
                      width: '100%',
                      height: Math.max((min / maxMin) * 70, min > 0 ? 4 : 2),
                      background: min > 0 ? 'var(--color-primary-400)' : 'var(--bg-surface)',
                      borderRadius: 4,
                    }} title={`${min} min`} />
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{dayLabels[date.getDay()]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: 24 }}>
            {/* Weak areas */}
            <div className="card">
              <div className="card-title" style={{ fontSize: 15, marginBottom: 14 }}>🎯 Weak Areas (Grammar)</div>
              {topicErrors.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No errors recorded yet.</p>
              ) : (
                topicErrors.map(area => (
                  <div key={area.topic} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 13 }}>{area.topic}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="progress-bar" style={{ width: 80 }}>
                        <div className="progress-bar-fill error" style={{ width: `${Math.min(area.errorCount * 10, 100)}%` }} />
                      </div>
                      <span className="badge badge-error">{area.errorCount}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Recent sessions */}
            <div className="card">
              <div className="card-title" style={{ fontSize: 15, marginBottom: 14 }}>📋 Recent Sessions</div>
              {recentSessions.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No sessions yet.</p>
              ) : (
                recentSessions.slice(0, 7).map(s => (
                  <div key={s.date} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: 13
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{s.date}</span>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <span>{s.minutesPracticed} min</span>
                      <span style={{ color: 'var(--text-muted)' }}>{s.activitiesCompleted.length} activities</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Grammar history */}
          {grammarResults.length > 0 && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-title" style={{ fontSize: 15, marginBottom: 14 }}>📝 Recent Grammar Questions</div>
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {grammarResults.slice(-20).reverse().map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    padding: '8px 0', borderBottom: '1px solid var(--border-color)',
                    gap: 10,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{r.question}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.topic}</div>
                    </div>
                    <span className={`badge ${r.isCorrect ? 'badge-success' : 'badge-error'}`}>
                      {r.isCorrect ? '✓' : '✗'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Data management */}
      <div className="card card-elevated">
        <div className="card-title" style={{ marginBottom: 20 }}>💾 Data Management</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={16} /> Export My Data
          </button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Import Data</div>
          <textarea
            className="textarea"
            rows={4}
            placeholder="Paste exported JSON data here..."
            value={importJson}
            onChange={e => setImportJson(e.target.value)}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
          />
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={handleImport} disabled={!importJson.trim()}>
            <Upload size={14} /> Import
          </button>
          {importMsg && <div style={{ fontSize: 13, marginTop: 8 }}>{importMsg}</div>}
        </div>

        <div style={{ padding: '14px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertTriangle size={16} color="var(--color-error)" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-error)', marginBottom: 4 }}>Reset All Progress</div>
              <p style={{ fontSize: 13, color: '#7f1d1d', marginBottom: 10 }}>
                This will permanently delete all practice history, settings, and progress. Export your data first.
              </p>
              {!showReset ? (
                <button className="btn btn-danger btn-sm" onClick={() => setShowReset(true)}>
                  <Trash2 size={13} /> Reset All Data
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-danger btn-sm" onClick={handleReset}>Yes, Delete Everything</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowReset(false)}>Cancel</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="alert alert-warning" style={{ marginTop: 16 }}>
          <AlertTriangle size={14} />
          <div style={{ fontSize: 13 }}>
            <strong>Storage note:</strong> All data is saved in your browser's localStorage on this device.
            It may be lost if you clear browser data. Export regularly to keep backups.
            This app is designed for one browser/device — no automatic sync.
          </div>
        </div>
      </div>
    </div>
  );
}
