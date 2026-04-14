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
  House,
  LogOut,
  PhoneCall,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from 'lucide-react';

import { logoutAction } from '@/app/auth/actions';
import { getIntegrationAvailability } from '@/lib/app-config';
import type { ViewerContext } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar';

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
      ],
      quickAction: {
        href: '/admin/onboarding',
        label: 'Onboard account',
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
        { key: 'settings', href: '/client/settings', label: 'Settings', icon: Settings, active: activeNav === 'settings' },
      ],
      quickAction: {
        href: '/client/campaigns',
        label: 'Launch campaign',
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

function NavLink({ item }: { item: ShellNavItem }) {
  const Icon = item.icon;

  if (item.href.startsWith('#')) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton tooltip={item.label} isActive={item.active} size="lg" asChild>
          <a href={item.href}>
            <Icon />
            <span>{item.label}</span>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton tooltip={item.label} isActive={item.active} size="lg" asChild>
        <Link href={item.href as Route}>
          <Icon />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
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
  const readinessCount = availability.filter((item) => item.ready).length;
  const statusTone = readinessCount === availability.length ? 'success' : 'warning';
  const pageTitle = title ?? shellConfig.sideLinks.find((item) => item.active)?.label ?? 'Workspace';

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" variant="inset" className="border-r border-sidebar-border/70 bg-sidebar/95">
        <SidebarHeader className="gap-4 border-b border-sidebar-border/70 px-4 py-4">
          <Link href={(current === 'admin' ? '/admin' : current === 'client' ? '/client' : '/help') as Route} className="flex items-start gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-3">
            <div className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-primary">
              <ShieldCheck className="size-4" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                BishopTech
              </p>
              <p className="truncate text-sm font-semibold text-foreground">Voice Platform</p>
              <p className="truncate text-xs text-muted-foreground">{workspaceName}</p>
            </div>
          </Link>

          <Card className="rounded-lg border border-white/8 bg-white/[0.02] py-0 shadow-none">
            <CardContent className="space-y-3 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{viewerName}</p>
                  <p className="truncate text-xs text-muted-foreground">{viewer.email}</p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-background text-sm font-semibold text-foreground">
                  {getInitials(viewer)}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Badge tone={viewer.isPlatformAdmin ? 'cyan' : 'muted'}>{viewerBadge}</Badge>
                <Badge tone={statusTone}>
                  {readinessCount}/{availability.length} ready
                </Badge>
              </div>
            </CardContent>
          </Card>
        </SidebarHeader>

        <SidebarContent className="gap-2">
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {shellConfig.sideLinks.map((item) => (
                  <NavLink key={item.key} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>Platform status</SidebarGroupLabel>
            <SidebarGroupContent className="space-y-2 px-2">
              {availability.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <span className={`size-2 rounded-full ${item.ready ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="gap-3 border-t border-sidebar-border/70 px-4 py-4">
          {shellConfig.quickAction ? (
            <Button asChild className="h-10 justify-start rounded-lg bg-primary text-primary-foreground">
              <Link href={shellConfig.quickAction.href as Route}>
                <shellConfig.quickAction.icon data-icon="inline-start" />
                {shellConfig.quickAction.label}
              </Link>
            </Button>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline" className="justify-start rounded-lg border-white/10 bg-transparent">
              <Link href="/help">
                <BookOpen data-icon="inline-start" />
                Help
              </Link>
            </Button>
            <form action={logoutAction}>
              <Button type="submit" variant="outline" className="w-full justify-start rounded-lg border-white/10 bg-transparent">
                <LogOut data-icon="inline-start" />
                Logout
              </Button>
            </form>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="bg-transparent">
        <div className="flex min-h-svh flex-col">
          <header className="sticky top-0 z-30 border-b border-white/8 bg-background/80 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-6">
              <SidebarTrigger className="rounded-lg border border-white/10 bg-white/[0.03] md:hidden" />

              <div className="flex flex-wrap items-center gap-2">
                {shellConfig.topLinks.map((link) =>
                  link.href.startsWith('#') ? (
                    <Button
                      key={link.href}
                      asChild
                      variant={link.active ? 'secondary' : 'ghost'}
                      size="sm"
                      className="rounded-lg"
                    >
                      <a href={link.href}>{link.label}</a>
                    </Button>
                  ) : (
                    <Button
                      key={link.href}
                      asChild
                      variant={link.active ? 'secondary' : 'ghost'}
                      size="sm"
                      className="rounded-lg"
                    >
                      <Link href={link.href as Route}>{link.label}</Link>
                    </Button>
                  ),
                )}
              </div>

              <div className="min-w-[220px] flex-1">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    readOnly
                    value=""
                    placeholder="Search calls, agents, campaigns, settings"
                    className="h-10 rounded-lg border-white/10 bg-white/[0.03] pl-9 text-sm placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <Badge tone={statusTone}>
                  {readinessCount === availability.length ? 'Platform ready' : 'Attention needed'}
                </Badge>
                <Button asChild variant="ghost" size="icon-sm" className="rounded-lg">
                  <Link href={(current === 'admin' ? '/admin/calls' : '/client/calls') as Route} aria-label="Recent activity">
                    <Bell />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="icon-sm" className="rounded-lg">
                  <Link href="/help" aria-label="Help">
                    <Settings />
                  </Link>
                </Button>
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 py-4 md:px-6 md:py-6">
            {headerMode !== 'hidden' ? (
              <Card className={`mb-6 border border-white/8 bg-card/90 shadow-panel ${headerMode === 'compact' ? 'py-0' : 'py-0'}`}>
                <CardContent className="flex flex-col gap-5 px-5 py-5 md:flex-row md:items-end md:justify-between md:px-6">
                  <div className="space-y-2">
                    <p className="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                      {eyebrow ?? (current === 'admin' ? 'Admin workspace' : current === 'client' ? 'Client workspace' : 'Playbooks')}
                    </p>
                    <div className="space-y-2">
                      <h1 className={`${headerMode === 'hero' ? 'text-3xl md:text-4xl' : 'text-2xl'} font-semibold tracking-[-0.04em] text-foreground`}>
                        {pageTitle}
                      </h1>
                      {description ? (
                        <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">{description}</p>
                      ) : null}
                    </div>
                  </div>

                  {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
                </CardContent>
              </Card>
            ) : null}

            <div className="space-y-6">{children}</div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
