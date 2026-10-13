import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, Headphones, Mic, GraduationCap, MessageSquare,
  FileText, Flame, TrendingUp, Target, Clock, CheckCircle,
  ArrowRight
} from 'lucide-react';
import { getProgress, getTodaySession, getWeeklyStats } from '../services/storage';
import type { ProgressData, DailySession } from '../types';

const activities = [
  { icon: <BookOpen size={20} />, label: 'Reading Aloud', to: '/reading', color: '#10b981', bg: '#ecfdf5', time: '5 min', key: 'reading' },
  { icon: <Headphones size={20} />, label: 'Listening', to: '/listening', color: '#3b82f6', bg: '#eff6ff', time: '5 min', key: 'listening' },
  { icon: <Mic size={20} />, label: 'Listen & Repeat', to: '/repeat', color: '#8b5cf6', bg: '#f5f3ff', time: '10 min', key: 'repeat' },
  { icon: <GraduationCap size={20} />, label: 'Grammar', to: '/grammar', color: '#f59e0b', bg: '#fffbeb', time: '5 min', key: 'grammar' },
  { icon: <MessageSquare size={20} />, label: 'Speaking', to: '/speaking', color: '#ef4444', bg: '#fef2f2', time: '5 min', key: 'speaking' },
  { icon: <FileText size={20} />, label: 'Resume Interview', to: '/interview', color: '#0891b2', bg: '#ecfeff', time: 'anytime', key: 'interview' },
];

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: color + '20', color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  );
}

function WeeklyChart({ dates, minutes }: { dates: string[]; minutes: number[] }) {
  const maxMin = Math.max(...minutes, 1);
  const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80, padding: '0 8px' }}>
      {minutes.map((min, i) => {
        const date = new Date(dates[i]);
        const day = dayLabels[date.getDay()];
        const height = Math.max((min / maxMin) * 60, min > 0 ? 4 : 0);
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div
              style={{
                width: '100%',
                height: height,
                background: min > 0 ? 'var(--color-primary-400)' : 'var(--bg-surface)',
                borderRadius: 4,
                transition: 'height 0.5s ease',
              }}
              title={`${min} min`}
            />
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{day}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [todaySession, setTodaySession] = useState<DailySession | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<{ dates: string[]; minutes: number[] }>({ dates: [], minutes: [] });

  useEffect(() => {
    setProgress(getProgress());
    setTodaySession(getTodaySession());
    setWeeklyStats(getWeeklyStats());
  }, []);

  const todayMinutes = todaySession?.minutesPracticed || 0;
  const completedActivities = todaySession?.activitiesCompleted || [];
  const streak = progress?.streak || 0;
  const totalSessions = progress?.totalSessions || 0;
  const grammarResults = progress?.grammarResults || [];
  const recentGrammarAccuracy = grammarResults.length > 0
    ? Math.round(grammarResults.slice(-20).filter(r => r.isCorrect).length / Math.min(grammarResults.length, 20) * 100)
    : 0;

  const weakAreas = progress?.weakAreas
    ?.sort((a, b) => b.errorCount - a.errorCount)
    .slice(0, 3) || [];

  const isNewUser = totalSessions === 0 && grammarResults.length === 0;

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1 className="page-title">
          {isNewUser ? '👋 Welcome to SpeakReady AI!' : '🌟 Good ' + (new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening') + '!'}
        </h1>
        <p className="page-subtitle">
          {isNewUser ? 'Start your English practice journey today. Pick any module below to begin!' : 'Keep up the great work. Practice makes perfect!'}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid-4 dashboard-stats" style={{ marginBottom: 24 }}>
        <StatCard label="Day Streak 🔥" value={streak} icon={<Flame size={22} />} color="#f59e0b" />
        <StatCard label="Today's Practice" value={`${todayMinutes} min`} icon={<Clock size={22} />} color="#10b981" />
        <StatCard label="Total Sessions" value={totalSessions} icon={<TrendingUp size={22} />} color="#8b5cf6" />
        <StatCard label="Grammar Accuracy" value={grammarResults.length > 0 ? `${recentGrammarAccuracy}%` : '—'} icon={<Target size={22} />} color="#3b82f6" />
      </div>

      <div className="grid-2 dashboard-main-grid" style={{ marginBottom: 24, gap: 20 }}>
        {/* Today's Plan */}
        <div className="card card-elevated dashboard-plan-card">
          <div className="card-header">
            <div>
              <div className="card-title">📅 Today's Practice Plan</div>
              <div className="card-subtitle">30-minute daily routine</div>
            </div>
            <Link to="/daily" className="btn btn-primary btn-sm">
              Start <ArrowRight size={14} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activities.map(act => {
              const done = completedActivities.includes(act.key);
              return (
                <Link
                  key={act.key}
                  to={act.to}
                  className="dashboard-activity"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', borderRadius: 8,
                    background: done ? 'var(--color-primary-50)' : 'var(--bg-surface)',
                    border: `1px solid ${done ? 'var(--color-primary-200)' : 'var(--border-color)'}`,
                    textDecoration: 'none', transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ color: act.color, width: 20 }}>{act.icon}</div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{act.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{act.time}</span>
                  </div>
                  {done
                    ? <CheckCircle size={16} color="var(--color-success)" />
                    : <ArrowRight size={14} color="var(--text-muted)" />
                  }
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Weekly chart */}
          <div className="card dashboard-week-card" style={{ flex: 1, minHeight: 190 }}>
            <div className="card-header" style={{ marginBottom: 12 }}>
              <div className="card-title" style={{ fontSize: 15 }}>📊 This Week</div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {weeklyStats.minutes.reduce((total, minutes) => total + minutes, 0)} min total
              </span>
            </div>
            <WeeklyChart dates={weeklyStats.dates} minutes={weeklyStats.minutes} />
          </div>

          {/* Weak areas */}
          {weakAreas.length > 0 && (
            <div className="card">
              <div className="card-title" style={{ fontSize: 15, marginBottom: 12 }}>🎯 Focus Areas</div>
              {weakAreas.map(area => (
                <div key={area.topic} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{area.topic}</span>
                  <span className="badge badge-warning">{area.errorCount} errors</span>
                </div>
              ))}
              <Link to="/grammar" className="btn btn-secondary btn-sm" style={{ marginTop: 8, width: '100%' }}>
                Practice Weak Areas
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
