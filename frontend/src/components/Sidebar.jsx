import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/tasks', label: 'Tasks', icon: '📋' },
  { to: '/workers', label: 'Workers', icon: '⚙️' },
  { to: '/submit', label: 'Submit Task', icon: '➕' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">🐇</div>
        <h2>TaskQueue</h2>
        <p>Distributed Task System</p>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          <div>Node.js + Express</div>
          <div>RabbitMQ + MongoDB</div>
        </div>
      </div>
    </aside>
  );
}
