import type React from 'react';
import {
  LayoutDashboard, Upload, Link2, ClipboardCheck, Calendar,
  Brain, ScrollText, Settings, TrendingUp, User, MessageSquare
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

interface NavItemDef {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

interface SidebarProps {
  reviewCount: number;
}

const NAV_ITEMS: NavItemDef[] = [
  { to: '/',            icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
  { to: '/intelligence', icon: <TrendingUp size={16} />,     label: 'Progress Intelligence' },
  { to: '/upload',      icon: <Upload size={16} />,          label: 'Upload & Ingestion' },
  { to: '/matches',     icon: <Link2 size={16} />,           label: 'Activity Matches' },
  { to: '/review',      icon: <ClipboardCheck size={16} />,  label: 'Planner Review' },
  { to: '/agent',       icon: <MessageSquare size={16} />,   label: 'Time Agent' },
  { to: '/schedule',    icon: <Calendar size={16} />,        label: 'Schedule' },
  { to: '/memory',      icon: <Brain size={16} />,           label: 'Institutional Memory' },
  { to: '/audit',       icon: <ScrollText size={16} />,      label: 'Audit Trail' },
];

export default function Sidebar({ reviewCount }: SidebarProps) {
  const location = useLocation();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">S</div>
        <div>
          <div className="sidebar-logo-text">SETU</div>
          <div className="sidebar-logo-sub">Progress Intelligence</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Main</div>
        {NAV_ITEMS.slice(0, 2).map(item => (
          <SidebarNavItem
            key={item.to}
            item={item}
            isActive={location.pathname === item.to}
          />
        ))}

        <div className="sidebar-section-label">Workflow</div>
        {NAV_ITEMS.slice(2, 7).map(item => (
          <SidebarNavItem
            key={item.to}
            item={item}
            isActive={location.pathname === item.to || location.pathname.startsWith(item.to + '/')}
            badge={item.to === '/review' ? reviewCount : undefined}
          />
        ))}

        <div className="sidebar-section-label">Intelligence</div>
        {NAV_ITEMS.slice(7).map(item => (
          <SidebarNavItem
            key={item.to}
            item={item}
            isActive={location.pathname === item.to}
          />
        ))}

        <div className="sidebar-section-label">System</div>
        <SidebarNavItem
          item={{ to: '/settings', icon: <Settings size={16} />, label: 'Settings' }}
          isActive={location.pathname === '/settings'}
        />
      </nav>

      {/* Project info */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--bg-border)', borderBottom: '1px solid var(--bg-border)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Active Project</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>Mumbai Refinery Expansion</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>MRE-2026 · Phase 3</div>
      </div>

      {/* User */}
      <div className="sidebar-footer" style={{ padding: '12px 16px' }}>
        <div className="sidebar-user-avatar">RM</div>
        <div>
          <div className="sidebar-user-name">Rajan Mehta</div>
          <div className="sidebar-user-role">Planner · L2</div>
        </div>
        <User size={14} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
      </div>
    </aside>
  );
}

function SidebarNavItem({ item, isActive, badge }: { item: NavItemDef; isActive: boolean; badge?: number }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={`nav-item ${isActive ? 'active' : ''}`}
    >
      <span className="nav-item-icon">{item.icon}</span>
      <span>{item.label}</span>
      {badge != null && badge > 0 && (
        <span className="nav-badge">{badge}</span>
      )}
    </NavLink>
  );
}
