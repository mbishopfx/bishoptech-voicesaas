import Link from 'next/link';
import type { Route } from 'next';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  BookOpen,
  Bot,
  Building2,
  ChartNoAxesCombined,
  ClipboardPenLine,
  Headphones,
  House,
  LogOut,
  PhoneCall,
  Send,
  Settings,
  ShieldCheck,
  Search,
  Sparkles,
  WandSparkles,
  Workflow,
} from 'lucide-react';

import { logoutAction } from '@/app/auth/actions';
import { getIntegrationAvailability } from '@/lib/app-config';
import type { ViewerContext } from '@/lib/types';

type AppShellProps = {
  current: 'admin' | 'client' | 'help';
  viewer: ViewerContext;
  eyebrow?: string;
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  headerMode?: 'hero' | 'compact' | 'hidden';
  activeNav?: string;
};

type ShellNavItem = {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
};

type ShellConfig = {
  topLinks: Array<{
    href: string;
    label: string;
    active?: boolean;
  }>;
  sideLinks: ShellNavItem[];
  quickAction?: {
    href: string;
    label: string;
    icon: LucideIcon;
  };
};

function getViewerBadge(viewer: ViewerContext) {
  if (viewer.isPlatformAdmin) {
    return 'Platform Admin';
  }

  return viewer.memberships[0]?.role ?? 'Viewer';
}

function getViewerName(viewer: ViewerContext) {
  if (viewer.fullName?.trim()) {
    return viewer.fullName;
  }

  return viewer.email.split('@')[0] || 'Workspace user';
}

function getInitials(viewer: ViewerContext) {
  const name = getViewerName(viewer);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join('');

  return initials || 'BT';
}

function getShellConfig(current: AppShellProps['current'], viewer: ViewerContext, activeNav: string): ShellConfig {
  const helpLink = { href: '/help', label: 'Help', active: current === 'help' };
  const publicLink = { href: '/', label: 'Platform' };

  if (current === 'admin') {
    return {
      topLinks: [
        { href: '/admin', label: 'Dashboard', active: true },
        helpLink,
        publicLink,
      ],
      sideLinks: [
        { key: 'dashboard', href: '/admin', label: 'Dashboard', icon: House, active: activeNav === 'dashboard' },
        { key: 'organizations', href: '/admin/organizations', label: 'Organizations', icon: Building2, active: activeNav === 'organizations' },
        { key: 'onboarding', href: '/admin/onboarding', label: 'Onboarding', icon: ClipboardPenLine, active: activeNav === 'onboarding' },
        { key: 'demo-lab', href: '/admin/demo-lab', label: 'Demo Lab', icon: Sparkles, active: activeNav === 'demo-lab' },
        { key: 'calls', href: '/admin/calls', label: 'Calls', icon: PhoneCall, active: activeNav === 'calls' },
        { key: 'workflow', href: '/admin/workflow', label: 'Workflow', icon: Workflow, active: activeNav === 'workflow' },
      ],
      quickAction: {
        href: '/admin/onboarding',
        label: 'Onboard Account',
        icon: Sparkles,
      },
    };
  }

  if (current === 'client') {
    return {
      topLinks: [
        { href: '/client', label: 'Dashboard', active: true },
        helpLink,
        publicLink,
      ],
      sideLinks: [
        { key: 'dashboard', href: '/client', label: 'Dashboard', icon: House, active: activeNav === 'dashboard' },
        { key: 'agents', href: '/client/agents', label: 'Agents', icon: Bot, active: activeNav === 'agents' },
        { key: 'leads', href: '/client/leads', label: 'Leads', icon: ChartNoAxesCombined, active: activeNav === 'leads' },
        { key: 'calls', href: '/client/calls', label: 'Calls', icon: PhoneCall, active: activeNav === 'calls' },
        { key: 'campaigns', href: '/client/campaigns', label: 'Campaigns', icon: Send, active: activeNav === 'campaigns' },
        { key: 'workflow', href: '/client/workflow', label: 'Workflow', icon: Workflow, active: activeNav === 'workflow' },
      ],
      quickAction: {
        href: '/client/campaigns',
        label: 'Launch Campaign',
        icon: Send,
      },
    };
  }

  const defaultHref = viewer.isPlatformAdmin ? '/admin' : '/client';

  return {
    topLinks: [
      { href: '/help', label: 'Playbooks', active: true },
      { href: defaultHref, label: 'Dashboard' },
      publicLink,
    ],
    sideLinks: [
      { key: 'playbooks', href: '/help', label: 'Playbooks', icon: BookOpen, active: activeNav === 'playbooks' },
      { key: 'prompts', href: '#prompt-starters', label: 'Prompts', icon: WandSparkles, active: activeNav === 'prompts' },
      { key: 'routes', href: '#live-routes', label: 'Routes', icon: ClipboardPenLine, active: activeNav === 'routes' },
      { key: 'workspace', href: defaultHref, label: 'Workspace', icon: ChartNoAxesCombined, active: activeNav === 'workspace' },
    ],
  };
}

function NavLink({ item, className }: { item: ShellNavItem; className: string }) {
  const Icon = item.icon;
  const content = (
    <>
      <Icon size={18} />
      <span>{item.label}</span>
    </>
  );

  if (item.href.startsWith('#')) {
    return (
      <a className={`${className} ${item.active ? 'is-active' : ''}`} href={item.href}>
        {content}
      </a>
    );
  }

  return (
    <Link className={`${className} ${item.active ? 'is-active' : ''}`} href={item.href as Route}>
      {content}
    </Link>
  );
}

export function AppShell({
  current,
  viewer,
  eyebrow,
  title,
  description,
  children,
  actions,
  headerMode = 'hero',
  activeNav = 'dashboard',
}: AppShellProps) {
  const availability = getIntegrationAvailability();
  const viewerName = getViewerName(viewer);
  const viewerBadge = getViewerBadge(viewer);
  const shellConfig = getShellConfig(current, viewer, activeNav);
  const workspaceName = viewer.memberships[0]?.organizationName ?? 'BishopTech Voice';
  const activityHref =
    current === 'help' ? '#prompt-starters' : current === 'admin' ? '/admin/calls' : '/client/calls';
  const readinessCount = availability.filter((item) => item.ready).length;

  return (
    <div className="command-shell">
      <header className="command-topbar">
        <div className="command-topbar-brand">
          <Link className="command-brand-lockup" href={current === 'admin' ? '/admin' : current === 'client' ? '/client' : '/help'}>
            <span className="command-brand-mark">
              <ShieldCheck size={16} strokeWidth={2.2} />
            </span>
            <span>BishopTech Voice</span>
          </Link>

          <nav className="command-top-links" aria-label="Top navigation">
            {shellConfig.topLinks.map((link) =>
              link.href.startsWith('#') ? (
                <a key={link.href} className={`command-top-link ${link.active ? 'is-active' : ''}`} href={link.href}>
                  {link.label}
                </a>
              ) : (
                <Link key={link.href} className={`command-top-link ${link.active ? 'is-active' : ''}`} href={link.href as Route}>
                  {link.label}
                </Link>
              ),
            )}
          </nav>
        </div>

        <div className="command-topbar-center">
          <label className="command-search-shell" aria-label="Search the workspace">
            <Search size={16} />
            <input type="search" placeholder="Search calls, agents, prompts, campaigns..." />
          </label>
        </div>

        <div className="command-topbar-tools">
          <div className="command-runtime-pill">
            <span className="command-runtime-dot" />
            <span>{readinessCount === availability.length ? 'Platform ready' : `${readinessCount}/${availability.length} services ready`}</span>
          </div>
          <a className="command-icon-button" href={activityHref} aria-label="Recent activity">
            <Bell size={18} />
          </a>
          <Link className="command-icon-button" href="/help" aria-label="Open help">
            <Settings size={18} />
          </Link>
          <div className="command-avatar" aria-hidden="true">
            {getInitials(viewer)}
          </div>
        </div>
      </header>

      <aside className="command-sidebar">
        <div className="command-sidebar-head">
          <div className="command-sidebar-title-row">
            <div className="command-sidebar-mic">
              <Headphones size={16} />
            </div>
            <div>
              <h2>Voice Workspace</h2>
              <p>{workspaceName}</p>
            </div>
          </div>
          <span className="command-sidebar-kicker">
            {current === 'admin' ? 'Admin operations' : current === 'client' ? 'Workspace operations' : 'Guides and playbooks'}
          </span>
          <div className="command-sidebar-live">
            <span className="command-live-dot" />
            <span>{viewerBadge}</span>
          </div>
        </div>

        <nav className="command-sidebar-nav" aria-label="Section navigation">
          {shellConfig.sideLinks.map((item) => (
            <NavLink key={item.href} item={item} className="command-side-link" />
          ))}
        </nav>

        {shellConfig.quickAction ? (
          shellConfig.quickAction.href.startsWith('#') ? (
            <a className="command-primary-action" href={shellConfig.quickAction.href}>
              <shellConfig.quickAction.icon size={18} />
              <span>{shellConfig.quickAction.label}</span>
            </a>
          ) : (
            <Link className="command-primary-action" href={shellConfig.quickAction.href as Route}>
              <shellConfig.quickAction.icon size={18} />
              <span>{shellConfig.quickAction.label}</span>
            </Link>
          )
        ) : null}

        <div className="glass-card command-status-card">
          <div className="command-status-head">
            <div>
              <span className="eyebrow-text">Environment</span>
              <h3>Connected services</h3>
            </div>
            <ClipboardPenLine size={18} />
          </div>

          <div className="status-list">
            {availability.map((item) => (
              <div key={item.label} className="status-row">
                <span className={`status-dot ${item.ready ? 'is-ready' : 'is-blocked'}`} />
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="command-sidebar-footer">
          <Link className="command-footer-link" href="/help">
            <BookOpen size={16} />
            <span>Playbooks</span>
          </Link>
          <form action={logoutAction}>
            <button className="command-footer-link command-footer-button" type="submit">
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </form>
        </div>
      </aside>

      <main className={`command-main ${headerMode === 'hidden' ? 'is-header-hidden' : ''}`}>
        {headerMode !== 'hidden' ? (
          <section className={`command-page-head ${headerMode === 'compact' ? 'is-compact' : ''}`}>
            <div className="command-page-copy">
              {eyebrow ? <span className="eyebrow-text">{eyebrow}</span> : null}
              {title ? <h1>{title}</h1> : null}
              {description ? <p>{description}</p> : null}
            </div>

            <div className="command-page-tools">
              <div className="command-user-card">
                <strong>{viewerName}</strong>
                <span>{viewerBadge}</span>
              </div>
              {actions ? <div className="command-page-actions">{actions}</div> : null}
            </div>
          </section>
        ) : null}

        <div className="page-stack">{children}</div>
      </main>
    </div>
  );
}
