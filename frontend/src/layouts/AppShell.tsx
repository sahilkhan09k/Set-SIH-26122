import { useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Dashboard from '../pages/Dashboard';
import UploadIngestion from '../pages/UploadIngestion';
import ActivityMatches from '../pages/ActivityMatches';
import PlannerReview from '../pages/PlannerReview';
import Schedule from '../pages/Schedule';
import InstitutionalMemory from '../pages/InstitutionalMemory';
import AuditTrail from '../pages/AuditTrail';
import ProgressIntelligence from '../pages/ProgressIntelligence';
import SettingsPage from '../pages/SettingsPage';
import TimeAgent from '../pages/TimeAgent';
import Toast from '../components/ui/Toast';
import type { ToastData } from '../components/ui/Toast';

export default function AppShell() {
  const [reviewCount, setReviewCount] = useState(31);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const handleApprove = useCallback(() => {
    setReviewCount(prev => Math.max(0, prev - 1));
    addToast({ type: 'success', message: 'Match approved. Activity linked to schedule.' });
  }, [addToast]);

  const handleReject = useCallback(() => {
    setReviewCount(prev => Math.max(0, prev - 1));
    addToast({ type: 'warning', message: 'Match rejected. Activity marked for re-review.' });
  }, [addToast]);

  return (
    <div className="app-shell">
      <Sidebar reviewCount={reviewCount} />

      <div className="main-wrapper">
        <Header reviewCount={reviewCount} />

        <main className="page-content">
          <Routes>
            <Route path="/"            element={<Dashboard />} />
            <Route path="/intelligence" element={<ProgressIntelligence />} />
            <Route path="/upload"      element={<UploadIngestion addToast={addToast} />} />
            <Route path="/matches"     element={<ActivityMatches />} />
            <Route path="/review"      element={<PlannerReview onApprove={handleApprove} onReject={handleReject} addToast={addToast} />} />
            <Route path="/review/:id"  element={<PlannerReview onApprove={handleApprove} onReject={handleReject} addToast={addToast} />} />
            <Route path="/schedule"    element={<Schedule addToast={addToast} />} />
            <Route path="/memory"      element={<InstitutionalMemory />} />
            <Route path="/audit"       element={<AuditTrail />} />
            <Route path="/agent"       element={<TimeAgent />} />
            <Route path="/settings"    element={<SettingsPage />} />
          </Routes>
        </main>
      </div>

      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map(toast => <Toast key={toast.id} toast={toast} />)}
      </div>
    </div>
  );
}
