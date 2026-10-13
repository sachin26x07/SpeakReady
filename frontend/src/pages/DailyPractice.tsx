import { Link } from 'react-router-dom';
import {
  BookOpen, Headphones, Mic, GraduationCap, MessageSquare,
  Clock, ArrowRight
} from 'lucide-react';

const ACTIVITIES = [
  {
    key: 'reading', to: '/reading', icon: <BookOpen size={24} />,
    label: 'Reading Aloud', desc: 'Read a passage aloud and compare with the original', time: '5 min', color: '#10b981', bg: '#ecfdf5'
  },
  {
    key: 'listening', to: '/listening', icon: <Headphones size={24} />,
    label: 'Listening Comprehension', desc: 'Listen and answer questions about what you heard', time: '5 min', color: '#3b82f6', bg: '#eff6ff'
  },
  {
    key: 'repeat', to: '/repeat', icon: <Mic size={24} />,
    label: 'Listen & Repeat', desc: 'Listen to sentences and repeat them for accuracy', time: '10 min', color: '#8b5cf6', bg: '#f5f3ff'
  },
  {
    key: 'grammar', to: '/grammar', icon: <GraduationCap size={24} />,
    label: 'Grammar Practice', desc: 'AI-generated grammar questions with explanations', time: '5 min', color: '#f59e0b', bg: '#fffbeb'
  },
  {
    key: 'speaking', to: '/speaking', icon: <MessageSquare size={24} />,
    label: 'Speaking Practice', desc: 'Answer speaking prompts and get AI feedback', time: '5 min', color: '#ef4444', bg: '#fef2f2'
  },
];

export default function DailyPractice() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">⚡ Daily Practice Plan</h1>
        <p className="page-subtitle">
          Complete your 30-minute daily practice to build consistent English skills.
        </p>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 24 }}>
        <Clock size={16} />
        <div>
          <strong>Your daily routine:</strong> 30 minutes of focused practice across 5 activities.
          You can do them in any order. Complete each module at your own pace.
        </div>
      </div>

      <div className="card card-elevated" style={{ marginBottom: 24 }}>
        <div className="card-header" style={{ marginBottom: 20 }}>
          <div className="card-title">📋 Today's Activities</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="badge badge-neutral">30 min total</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ACTIVITIES.map((act) => (
            <Link
              key={act.key}
              to={act.to}
              className="daily-activity"
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '16px 20px', borderRadius: 12,
                background: act.bg,
                border: `1px solid ${act.color}30`,
                textDecoration: 'none',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: act.color + '20', color: act.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {act.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 2 }}>
                  {act.label}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{act.desc}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                  {act.time}
                </span>
                <ArrowRight size={16} color={act.color} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>💡 Practice Tips</div>
        <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 2 }}>
          <li>Do <strong>Listening</strong> first when your mind is fresh.</li>
          <li>Use headphones for better audio quality during Listen & Repeat.</li>
          <li>Speak clearly and at a natural pace — don't rush.</li>
          <li>Review your grammar mistakes to identify patterns.</li>
          <li>Consistency beats perfection — practise daily even for 10 minutes.</li>
        </ul>
      </div>
    </div>
  );
}
