import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { workerAPI } from '../services/api';
import { WorkerStatusBadge } from '../components/Badges';
import { formatDistanceToNow } from 'date-fns';

export default function Workers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkers = async () => {
    try {
      const res = await workerAPI.getAll();
      setWorkers(res.data);
    } catch (e) {
      toast.error('Failed to load workers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
    const interval = setInterval(fetchWorkers, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleRemove = async (workerId) => {
    if (!window.confirm(`Remove worker ${workerId}?`)) return;
    try {
      await workerAPI.delete(workerId);
      toast.success('Worker removed');
      fetchWorkers();
    } catch {
      toast.error('Failed to remove worker');
    }
  };

  const online = workers.filter((w) => w.status !== 'OFFLINE').length;
  const busy = workers.filter((w) => w.status === 'BUSY').length;
  const total = workers.reduce((s, w) => s + (w.tasksProcessed || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Workers</div>
          <div className="page-subtitle">
            {online} online · {busy} busy · {total} total tasks processed
          </div>
        </div>
        <button className="btn btn-secondary" onClick={fetchWorkers}>🔄 Refresh</button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className="stat-card" style={{ '--accent-color': '#3fb950' }}>
          <div className="stat-value">{online}</div>
          <div className="stat-label">Online Workers</div>
        </div>
        <div className="stat-card" style={{ '--accent-color': '#bc8cff' }}>
          <div className="stat-value">{busy}</div>
          <div className="stat-label">Busy Workers</div>
        </div>
        <div className="stat-card" style={{ '--accent-color': '#388bfd' }}>
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Processed</div>
        </div>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : workers.length === 0 ? (
        <div className="empty-state">
          <h3>No workers registered</h3>
          <p>Start a worker process to begin processing tasks.</p>
          <div className="code-block" style={{ marginTop: 20, textAlign: 'left', maxWidth: 400, margin: '20px auto 0' }}>
            cd backend{'\n'}npm run worker
          </div>
        </div>
      ) : (
        <div className="workers-grid">
          {workers.map((worker) => (
            <div key={worker.workerId} className={`worker-card ${worker.status?.toLowerCase()}`}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>{worker.workerId}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>{worker.host}</div>
                </div>
                <WorkerStatusBadge status={worker.status} />
              </div>

              <div className="worker-info">
                <div className="worker-info-row">
                  <span className="worker-info-key">Tasks Processed</span>
                  <span className="worker-info-val" style={{ color: 'var(--accent-green)' }}>{worker.tasksProcessed || 0}</span>
                </div>
                <div className="worker-info-row">
                  <span className="worker-info-key">Tasks Failed</span>
                  <span className="worker-info-val" style={{ color: worker.tasksFailed > 0 ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                    {worker.tasksFailed || 0}
                  </span>
                </div>
                <div className="worker-info-row">
                  <span className="worker-info-key">Current Task</span>
                  <span className="worker-info-val">
                    {worker.currentTaskId ? (
                      <span style={{ color: 'var(--accent-purple)' }} className="pulse">● Processing</span>
                    ) : '—'}
                  </span>
                </div>
                <div className="worker-info-row">
                  <span className="worker-info-key">Last Heartbeat</span>
                  <span className="worker-info-val">
                    {formatDistanceToNow(new Date(worker.lastHeartbeat), { addSuffix: true })}
                  </span>
                </div>
                <div className="worker-info-row">
                  <span className="worker-info-key">Started</span>
                  <span className="worker-info-val">
                    {formatDistanceToNow(new Date(worker.startedAt || worker.createdAt), { addSuffix: true })}
                  </span>
                </div>
                {worker.queues?.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Queues</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {worker.queues.map((q) => (
                        <span key={q} style={{ fontSize: 10, background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{q}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-danger btn-sm" onClick={() => handleRemove(worker.workerId)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
