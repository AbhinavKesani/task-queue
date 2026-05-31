import { useState, useEffect } from 'react';
import { taskAPI } from '../services/api';
import { StatusBadge } from '../components/Badges';
import { formatDistanceToNow } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const STATUS_COLORS = {
  PENDING: '#d29922', QUEUED: '#388bfd', PROCESSING: '#bc8cff',
  COMPLETED: '#3fb950', FAILED: '#f85149', DEAD: '#484f58',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: '#1c2128', border: '1px solid #30363d', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
        <p style={{ color: '#e6edf3' }}>{label}: <strong>{payload[0].value}</strong></p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await taskAPI.getStats();
      setStats(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="spinner" />;
  if (!stats) return <div className="empty-state"><p>Failed to load stats</p></div>;

  const statusData = Object.entries(stats.byStatus || {}).map(([name, value]) => ({ name, value }));
  const priorityData = Object.entries(stats.byPriority || {}).map(([name, value]) => ({ name: name.toUpperCase(), value }));
  const typeData = Object.entries(stats.byType || {}).map(([name, value]) => ({ name, value }));
  const pieColors = Object.values(STATUS_COLORS);

  const statCards = [
    { label: 'Total Tasks', value: stats.total || 0, color: '#388bfd', icon: '📋' },
    { label: 'Completed', value: stats.byStatus?.COMPLETED || 0, color: '#3fb950', icon: '✅' },
    { label: 'Processing', value: stats.byStatus?.PROCESSING || 0, color: '#bc8cff', icon: '⚙️' },
    { label: 'Failed', value: stats.byStatus?.FAILED || 0, color: '#f85149', icon: '❌' },
    { label: 'Queued', value: stats.byStatus?.QUEUED || 0, color: '#388bfd', icon: '🔵' },
    { label: 'Avg Duration', value: stats.avgDuration ? `${(stats.avgDuration / 1000).toFixed(1)}s` : '—', color: '#d29922', icon: '⏱️' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Real-time overview of your distributed task queue</div>
        </div>
        <button className="btn btn-secondary" onClick={fetchStats}>🔄 Refresh</button>
      </div>

      <div className="stats-grid">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card" style={{ '--accent-color': s.color }}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-header"><span className="card-title">Tasks by Status</span></div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={11}>
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.name] || pieColors[i % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Tasks by Priority</span></div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={priorityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {priorityData.map((entry, i) => {
                  const colors = { HIGH: '#f85149', MEDIUM: '#d29922', LOW: '#3fb950' };
                  return <Cell key={i} fill={colors[entry.name] || '#388bfd'} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-header"><span className="card-title">Tasks by Type</span></div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={typeData} layout="vertical" margin={{ top: 0, right: 20, left: 40, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#388bfd" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Recent Tasks</span></div>
          {stats.recentTasks?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.recentTasks.map((t) => (
                <div key={t._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <p>No recent tasks</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
