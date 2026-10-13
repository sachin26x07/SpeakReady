import { useState } from 'react';
import { CheckCircle, XCircle, Wifi, AlertTriangle } from 'lucide-react';
import { checkProviderStatus, testConnection } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import type { AppSettings } from '../types';

export default function AISettings() {
  const { settings, updateSettings } = useSettings();
  const [status, setStatus] = useState<{
    groq: { configured: boolean; model: string };
    gemini: { configured: boolean; model: string };
  } | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ provider: string; ok: boolean; message: string } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const checkStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await checkProviderStatus();
      setStatus(res.status);
    } catch (e: any) {
      setStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleTest = async (provider: 'groq' | 'gemini') => {
    setTesting(provider);
    setTestResult(null);
    try {
      const res = await testConnection(provider);
      setTestResult({ provider, ok: res.ok, message: res.message });
    } catch (e: any) {
      setTestResult({ provider, ok: false, message: e.message || 'Connection failed' });
    } finally {
      setTesting(null);
    }
  };

  const update = (key: keyof AppSettings, value: AppSettings[keyof AppSettings]) => {
    updateSettings({ [key]: value } as Partial<AppSettings>);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">⚙️ AI Provider Settings</h1>
        <p className="page-subtitle">Configure your AI provider, feedback language, and speech preferences</p>
      </div>

      {/* Provider selection */}
      <div className="card card-elevated" style={{ marginBottom: 20 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>🤖 AI Provider</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 20 }}>
          <div style={{
            padding: 16, borderRadius: 12, border: '1px solid var(--border-color)',
            background: 'var(--bg-card)',
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>
              Switch Gemini / Groq
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              Choose which provider to use for practice and feedback
            </div>
            <div role="group" aria-label="Switch between Gemini and Groq" style={{
              display: 'flex', padding: 4, borderRadius: 10, background: 'var(--bg-surface)', gap: 4,
            }}>
              {(['gemini', 'groq'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={settings.provider === p}
                  onClick={() => update('provider', p)}
                  style={{
                    flex: 1, padding: '10px 12px', border: 0, borderRadius: 8, cursor: 'pointer',
                    background: settings.provider === p ? 'var(--bg-card)' : 'transparent',
                    color: 'var(--text-primary)', fontWeight: settings.provider === p ? 700 : 500,
                    boxShadow: settings.provider === p ? '0 1px 3px rgba(0, 0, 0, 0.12)' : 'none',
                  }}
                >
                  {p === 'gemini' ? '🌟 Gemini' : '⚡ Groq'}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-primary-600)', fontSize: 12 }}>
              <CheckCircle size={12} /> {settings.provider === 'groq' ? 'Groq' : 'Gemini'} currently selected
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={checkStatus} disabled={loadingStatus}>
            {loadingStatus ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Wifi size={16} />}
            Check Connection Status
          </button>
          {(['groq', 'gemini'] as const).map(p => (
            <button
              key={p}
              className="btn btn-ghost btn-sm"
              onClick={() => handleTest(p)}
              disabled={!!testing}
            >
              {testing === p ? <span className="spinner" style={{ width: 12, height: 12 }} /> : null}
              Test {p === 'gemini' ? 'Gemini' : 'Groq'}
            </button>
          ))}
        </div>

        {status && (
          <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {(['groq', 'gemini'] as const).map(p => (
              <div key={p} style={{
                padding: '10px 14px', borderRadius: 8, background: 'var(--bg-surface)',
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
              }}>
                {status[p].configured
                  ? <CheckCircle size={14} color="var(--color-success)" />
                  : <XCircle size={14} color="var(--color-error)" />}
                <span style={{ fontWeight: 600 }}>{p === 'gemini' ? 'Gemini' : 'Groq'}:</span>
                <span style={{ color: status[p].configured ? 'var(--color-success)' : 'var(--color-error)' }}>
                  {status[p].configured ? `Configured (${status[p].model})` : 'Not configured'}
                </span>
              </div>
            ))}
          </div>
        )}

        {testResult && (
          <div className={`alert ${testResult.ok ? 'alert-success' : 'alert-error'}`} style={{ marginTop: 12 }}>
            {testResult.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
            <span><strong>{testResult.provider}:</strong> {testResult.message}</span>
          </div>
        )}
      </div>

      {/* Language settings */}
      <div className="card card-elevated" style={{ marginBottom: 20 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>🌐 Language & Feedback</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label>Feedback Language</label>
            <select
              className="select"
              value={settings.feedbackLanguage}
              onChange={e => update('feedbackLanguage', e.target.value as AppSettings['feedbackLanguage'])}
            >
              <option value="english">English</option>
              <option value="hinglish">Hinglish (Hindi + English)</option>
            </select>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {settings.feedbackLanguage === 'hinglish'
                ? 'AI will explain mistakes in a mix of Hindi and English'
                : 'AI will give feedback in English only'}
            </div>
          </div>
          <div className="form-group">
            <label>Daily Practice Goal</label>
            <select
              className="select"
              value={settings.dailyGoalMinutes}
              onChange={e => update('dailyGoalMinutes', +e.target.value)}
            >
              {[10, 15, 20, 30, 45, 60].map(n => (
                <option key={n} value={n}>{n} minutes/day</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TTS settings */}
      <div className="card card-elevated" style={{ marginBottom: 20 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>🔊 Text-to-Speech Settings</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.autoPlayTTS}
              onChange={e => update('autoPlayTTS', e.target.checked)}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Auto-play audio</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Automatically play reference audio in Listen & Repeat</div>
            </div>
          </label>

          <div className="form-group">
            <label>Speech Rate: {settings.ttsRate.toFixed(1)}x</label>
            <input
              type="range" min="0.5" max="1.5" step="0.1"
              value={settings.ttsRate}
              onChange={e => update('ttsRate', +e.target.value)}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
              <span>Slower (0.5x)</span><span>Normal (1.0x)</span><span>Faster (1.5x)</span>
            </div>
          </div>

          <div className="form-group">
            <label>Volume: {Math.round(settings.ttsVolume * 100)}%</label>
            <input
              type="range" min="0" max="1" step="0.1"
              value={settings.ttsVolume}
              onChange={e => update('ttsVolume', +e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* Theme */}
      <div className="card card-elevated">
        <div className="card-title" style={{ marginBottom: 16 }}>🎨 Appearance</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.darkMode}
            onChange={e => update('darkMode', e.target.checked)}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Dark Mode</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Switch to a dark colour scheme</div>
          </div>
        </label>

        <div className="alert alert-warning" style={{ marginTop: 16 }}>
          <AlertTriangle size={14} />
          <div style={{ fontSize: 13 }}>
            <strong>API keys are never stored in the frontend.</strong> Configure them in the backend
            <code style={{ fontSize: 12, background: 'var(--bg-surface)', padding: '2px 6px', borderRadius: 4, marginLeft: 4 }}>.env</code> file.
          </div>
        </div>
      </div>
    </div>
  );
}
