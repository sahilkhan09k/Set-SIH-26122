import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

export interface ToastData {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
}

const ICONS = {
  success: <CheckCircle2 size={16} color="#10b981" />,
  warning: <AlertTriangle size={16} color="#f59e0b" />,
  error:   <XCircle size={16} color="#ef4444" />,
  info:    <Info size={16} color="#3b82f6" />,
};

const BORDER_COLORS = {
  success: 'rgba(16,185,129,0.3)',
  warning: 'rgba(245,158,11,0.3)',
  error:   'rgba(239,68,68,0.3)',
  info:    'rgba(59,130,246,0.3)',
};

export default function Toast({ toast }: { toast: ToastData }) {
  return (
    <div
      className="toast"
      style={{ borderLeftColor: BORDER_COLORS[toast.type], borderLeftWidth: 3 }}
    >
      <span className="toast-icon">{ICONS[toast.type]}</span>
      <span className="toast-message">{toast.message}</span>
    </div>
  );
}
