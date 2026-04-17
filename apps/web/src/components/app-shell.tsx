import Link from 'next/link';
import type { Route } from 'next';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Bot,
  Building2,
  ClipboardPenLine,
  FileCheck2,
  FlaskConical,
  FolderKanban,
  House,
  LogOut,
  PhoneCall,
  RadioTower,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Workflow,
} from 'lucide-react';

import { logoutAction } from '@/app/auth/actions';
import { getIntegrationAvailability } from '@/lib/app-config';
import type { ViewerContext } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
};

function viewerName(viewer: ViewerContext) {
  return viewer.fullName?.trim() || viewer.email.split('@')[0] || 'Operator';
}

function viewerRole(viewer: ViewerContext) {
  if (viewer.isPlatformAdmin) {
    return 'Platform Admin';
  }

  return viewer.memberships[0]?.role ?? 'Viewer';
}

function initials(viewer: ViewerContext) {
  return viewerName(viewer)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function getNav(current: AppShellProps['current'], viewer: ViewerContext) {
  const defaultHref = viewer.isPlatformAdmin ? '/admin' : '/client';

  if (current === 'admin') {
    return [
      { key: 'dashboard', href: '/admin', label: 'Command Center', icon: House },
      { key: 'templates', href: '/admin#templates', label: 'ICP Library', icon: FolderKanban },
      { key: 'factory', href: '/admin#factory', label: 'Assistant Factory', icon: Workflow },
      { key: 'numbers', href: '/admin#numbers', label: 'Number Pool', icon: RadioTower },
      { key: 'recovery', href: '/admin#recovery', label: 'Recovery + QA', icon: FileCheck2 },
      { key: 'playbooks', href: '/help', label: 'Playbooks', icon: BookOpen },
    ] satisfies ShellNavItem[];
  }

  if (current === 'client') {
    return [
      { key: 'dashboard', href: '/client', label: 'Overview', icon: House },
      { key: 'agents', href: '/client/agents', label: 'Agent Studio', icon: Bot },
      { key: 'leads', href: '/client/leads', label: 'Lead Pipeline', icon: Building2 },
      { key: 'calls', href: '/client/calls', label: 'Call Explorer', icon: PhoneCall },
      { key: 'playground', href: '/client#playground', label: 'Playground', icon: FlaskConical },
      { key: 'settings', href: '/client/settings', label: 'Settings', icon: Settings },
    ] satisfies ShellNavItem[];
  }

  return [
    { key: 'playbooks', href: '/help', label: 'Playbooks', icon: BookOpen },
    { key: 'workspace', href: defaultHref, label: 'Workspace', icon: House },
    { key: 'onboarding', href: '/admin/onboarding', label: 'Onboarding', icon: ClipboardPenLine },
  ] satisfies ShellNavItem[];
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
  const workspaceName = viewer.memberships[0]?.organizationName ?? 'BishopTech VoiceOps';
  const nav = getNav(current, viewer);
  const pageTitle = title ?? nav.find((item) => item.key === activeNav)?.label ?? 'Workspace';
  const readiness = `${availability.filter((item) => item.ready).length}/${availability.length}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen max-w-[1720px] grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="border-b border-border bg-[#12110f] px-5 py-5 xl:border-b-0 xl:border-r">
          <div className="space-y-5 xl:sticky xl:top-0 xl:py-2">
            <Link
              href={(current === 'admin' ? '/admin' : current === 'client' ? '/client' : '/help') as Route}
              className="block rounded-2xl border border-border bg-card"
            >
              <div className="flex items-start gap-3 px-4 py-4">
                <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-background">
                  <ShieldCheck className="size-4 text-amber-200" />
                </div>
                <div className="space-y-1">
                  <p className="text-[0.68rem] uppercase tracking-[0.24em] text-muted-foreground">BishopTech</p>
                  <h1 className="text-sm font-semibold tracking-[-0.03em]">VoiceOps Command</h1>
                  <p className="text-xs text-muted-foreground">{workspaceName}</p>
                </div>
              </div>
            </Link>

            <Card className="rounded-2xl border-border bg-card shadow-none">
              <CardContent className="space-y-3 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{viewerName(viewer)}</p>
                    <p className="text-xs text-muted-foreground">{viewer.email}</p>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-background text-sm font-semibold">
                    {initials(viewer)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={viewer.isPlatformAdmin ? 'cyan' : 'muted'}>{viewerRole(viewer)}</Badge>
                  <Badge tone={availability.every((item) => item.ready) ? 'success' : 'warning'}>{readiness} ready</Badge>
                </div>
              </CardContent>
            </Card>

            <nav className="space-y-1">
              {nav.map((item) => {
                const Icon = item.icon;
                const active = activeNav === item.key;
                const className = cn(
                  'flex items-center gap-3 rounded-xl border px-3 py-3 text-sm transition-colors',
                  active
                    ? 'border-amber-500/25 bg-amber-500/10 text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-border hover:bg-card hover:text-foreground',
                );

                return item.href.startsWith('#') ? (
                  <a key={item.key} href={item.href} className={className}>
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </a>
                ) : (
                  <Link key={item.key} href={item.href as Route} className={className}>
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <Button asChild variant="outline" className="justify-start rounded-xl">
                <Link href="/help">
                  <BookOpen className="size-4" />
                  Playbooks
                </Link>
              </Button>
              <form action={logoutAction}>
                <Button type="submit" variant="outline" className="w-full justify-start rounded-xl">
                  <LogOut className="size-4" />
                  Logout
                </Button>
              </form>
            </div>
          </div>
        </aside>

        <main className="min-w-0 border-b border-border xl:border-b-0 xl:border-r">
          <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-5 py-4 backdrop-blur">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="muted">
                    {eyebrow ?? (current === 'admin' ? 'Operator workspace' : current === 'client' ? 'Client workspace' : 'Knowledge center')}
                  </Badge>
                  <Badge tone={current === 'admin' ? 'cyan' : current === 'client' ? 'success' : 'muted'}>
                    {current === 'admin' ? 'Managed Vapi first' : current === 'client' ? 'Guardrailed editing' : 'Docs + runbooks'}
                  </Badge>
                </div>
                {headerMode !== 'hidden' ? (
                  <>
                    <h2 className={cn('font-semibold tracking-[-0.04em]', headerMode === 'compact' ? 'text-2xl' : 'text-3xl')}>
                      {pageTitle}
                    </h2>
                    {description ? <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
                  </>
                ) : (
                  <h2 className="text-lg font-semibold tracking-[-0.03em]">{pageTitle}</h2>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative min-w-[220px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    readOnly
                    value=""
                    placeholder="Search calls, leads, revisions"
                    className="h-10 rounded-xl bg-card pl-9"
                  />
                </div>
                {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
              </div>
            </div>
          </header>

          <div className="space-y-6 px-5 py-5">{children}</div>
        </main>

        <aside className="hidden bg-[#171513] px-5 py-5 xl:block">
          <div className="sticky top-0 space-y-4 py-2">
            <Card className="rounded-2xl border-border bg-card shadow-none">
              <CardContent className="space-y-3 px-4 py-4">
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Utility Rail</p>
                  <h3 className="mt-2 text-base font-semibold tracking-[-0.03em]">Ops signals</h3>
                </div>
                {availability.map((item) => (
                  <div key={item.label} className="rounded-xl border border-border bg-background px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className={cn('size-2 rounded-full', item.ready ? 'bg-emerald-400' : 'bg-amber-400')} />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border bg-card shadow-none">
              <CardContent className="space-y-3 px-4 py-4">
                <div className="flex items-center gap-2">
                  <RadioTower className="size-4 text-amber-200" />
                  <span className="text-sm font-semibold">Command rules</span>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Managed demos should reserve a free number before any live test call.</li>
                  <li>Client edits stay inside approved business/tone/FAQ blocks only.</li>
                  <li>Any failed structured capture must flow into transcript recovery or QA review.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}
