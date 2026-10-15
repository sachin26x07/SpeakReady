import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, Headphones, Mic, GraduationCap, MessageSquare,
  FileText, Flame, TrendingUp, Target, Clock, CheckCircle,
  ArrowRight, BookMarked
} from 'lucide-react';
import { getProgress, getTodaySession, getWeeklyStats } from '../services/storage';
import type { ProgressData, DailySession } from '../types';

const activities = [
  { icon: <BookOpen size={20} />, label: 'Reading Aloud', to: '/reading', color: '#10b981', bg: '#ecfdf5', time: '5 min', key: 'reading' },
  { icon: <Headphones size={20} />, label: 'Listening', to: '/listening', color: '#3b82f6', bg: '#eff6ff', time: '5 min', key: 'listening' },
  { icon: <Mic size={20} />, label: 'Listen & Repeat', to: '/repeat', color: '#8b5cf6', bg: '#f5f3ff', time: '10 min', key: 'repeat' },
  { icon: <GraduationCap size={20} />, label: 'Grammar', to: '/grammar', color: '#f59e0b', bg: '#fffbeb', time: '5 min', key: 'grammar' },
  { icon: <MessageSquare size={20} />, label: 'Speaking', to: '/speaking', color: '#ef4444', bg: '#fef2f2', time: '5 min', key: 'speaking' },
  { icon: <BookMarked size={20} />, label: 'Saved Vocabulary', to: '/vocabulary', color: '#059669', bg: '#ecfdf5', time: 'review', key: 'vocabulary' },
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
  const maxMin = Math.max(...minutes, 30);
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayDateString = new Date().toDateString();

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 160, padding: '10px 4px 6px' }}>
      {minutes.map((min, i) => {
        const date = new Date(dates[i]);
        const day = dayLabels[date.getDay()];
        const isToday = date.toDateString() === todayDateString;
        const fillPercent = Math.min(100, Math.round((min / maxMin) * 100));

        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', gap: 6 }}>
            {/* Minute indicator value */}
            <span
              style={{
                fontSize: 11,
                fontWeight: min > 0 ? 600 : 400,
                color: min > 0 ? 'var(--color-primary-500)' : 'var(--text-muted)',
                height: 16,
                lineHeight: '16px',
              }}
            >
              {min > 0 ? `${min}m` : '·'}
            </span>

            {/* Bar track container */}
            <div
              style={{
                width: '100%',
                flex: 1,
                background: 'var(--bg-surface)',
                borderRadius: 8,
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-end',
                overflow: 'hidden',
                border: isToday ? '1px solid var(--color-primary-400)' : '1px solid transparent',
              }}
              title={`${day}: ${min} minutes`}
            >
              {/* Fill bar */}
              <div
                style={{
                  width: '100%',
                  height: `${fillPercent}%`,
                  background: isToday
                    ? 'linear-gradient(180deg, var(--color-primary-400), var(--color-primary-600))'
                    : min > 0
                    ? 'linear-gradient(180deg, var(--color-primary-300), var(--color-primary-500))'
                    : 'transparent',
                  borderRadius: '6px 6px 0 0',
                  transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: min > 0 ? '0 2px 8px rgba(16, 185, 129, 0.25)' : 'none',
                }}
              />
            </div>

            {/* Day label */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: isToday ? 700 : 500,
                  color: isToday ? 'var(--color-primary-500)' : 'var(--text-secondary)',
                }}
              >
                {day}
              </span>
              {isToday && (
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--color-primary-500)' }} />
              )}
            </div>
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

  const totalWeeklyMinutes = weeklyStats.minutes.reduce((total, m) => total + m, 0);
  const activeDaysThisWeek = weeklyStats.minutes.filter(m => m > 0).length;
  const avgDailyMinutes = Math.round(totalWeeklyMinutes / 7);

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

        {/* Right column: Expanded Weekly Analytics Card */}
        <div className="card card-elevated dashboard-week-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-header" style={{ marginBottom: 16 }}>
              <div>
                <div className="card-title">📊 This Week</div>
                <div className="card-subtitle">Daily practice & consistency</div>
              </div>
              <span className="badge badge-success" style={{ fontSize: 12 }}>
                {totalWeeklyMinutes} min total
              </span>
            </div>

            {/* Quick mini-stats strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              <div style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Total Time</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{totalWeeklyMinutes} min</div>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Daily Avg</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{avgDailyMinutes} min</div>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Active Days</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary-600)' }}>{activeDaysThisWeek}/7 days</div>
              </div>
            </div>

            {/* Expanded Chart */}
            <WeeklyChart dates={weeklyStats.dates} minutes={weeklyStats.minutes} />
          </div>

          {/* Consistency footer bar */}
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, marginRight: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Weekly Consistency</span>
                <span style={{ color: 'var(--color-primary-600)', fontWeight: 700 }}>{Math.round((activeDaysThisWeek / 7) * 100)}%</span>
              </div>
              <div style={{ width: '100%', height: 6, background: 'var(--bg-surface)', borderRadius: 3, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.round((activeDaysThisWeek / 7) * 100)}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--color-primary-400), var(--color-primary-600))',
                    borderRadius: 3,
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
            </div>
            <Link to="/progress" className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap' }}>
              Full History <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
