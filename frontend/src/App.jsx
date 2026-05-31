import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Workers from './pages/Workers';
import SubmitTask from './pages/SubmitTask';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1c2128', color: '#e6edf3', border: '1px solid #30363d', fontSize: 13 },
          success: { iconTheme: { primary: '#3fb950', secondary: '#1c2128' } },
          error: { iconTheme: { primary: '#f85149', secondary: '#1c2128' } },
        }}
      />
      <div className="layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/workers" element={<Workers />} />
            <Route path="/submit" element={<SubmitTask />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
