import Link from 'next/link';
import type { Route } from 'next';
import type { ReactNode, SVGProps } from 'react';
import {
  AvatarIcon,
  BarChartIcon,
  ChatBubbleIcon,
  ChevronDownIcon,
  Component1Icon,
  DashboardIcon,
  DotsHorizontalIcon,
  DrawingPinFilledIcon,
  ExitIcon,
  FileTextIcon,
  GearIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  MagicWandIcon,
  MixerHorizontalIcon,
  PaperPlaneIcon,
  PersonIcon,
  ReaderIcon,
  RocketIcon,
} from '@radix-ui/react-icons';

import { logoutAction } from '@/app/auth/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { getIntegrationAvailability } from '@/lib/app-config';
import type { ViewerContext } from '@/lib/types';
import { cn } from '@/lib/utils';

type ShellIcon = React.ComponentType<SVGProps<SVGSVGElement>>;

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
  shortLabel?: string;
  icon: ShellIcon;
};

type ShellNavSection = {
  label: string;
  items: ShellNavItem[];
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

function getNavSections(current: AppShellProps['current'], viewer: ViewerContext) {
  if (current === 'admin') {
    return [
      {
        label: 'Platform',
        items: [
          { key: 'dashboard', href: '/admin', label: 'Command center', shortLabel: 'Overview', icon: DashboardIcon },
          { key: 'clients', href: '/admin/clients', label: 'Clients', icon: PersonIcon },
          { key: 'assistants', href: '/admin/assistants', label: 'Assistants', icon: Component1Icon },
          { key: 'calls', href: '/admin/calls', label: 'Call queue', icon: ChatBubbleIcon },
          { key: 'onboarding', href: '/admin/onboarding', label: 'Onboarding', icon: RocketIcon },
          { key: 'demo-lab', href: '/admin/demo-lab', label: 'Demo lab', icon: MagicWandIcon },
        ],
      },
      {
        label: 'Knowledge',
        items: [{ key: 'playbooks', href: '/help', label: 'Playbooks', icon: ReaderIcon }],
      },
    ] satisfies ShellNavSection[];
  }

  if (current === 'client') {
    return [
      {
        label: 'Workspace',
        items: [
          { key: 'dashboard', href: '/client', label: 'Overview', icon: HomeIcon },
          { key: 'assistants', href: '/client/assistants', label: 'Assistants', icon: Component1Icon },
          { key: 'leads', href: '/client/leads', label: 'Lead pipeline', shortLabel: 'Leads', icon: BarChartIcon },
          { key: 'calls', href: '/client/calls', label: 'Call explorer', shortLabel: 'Calls', icon: ChatBubbleIcon },
          { key: 'tickets', href: '/client/tickets', label: 'Tickets', icon: FileTextIcon },
          { key: 'campaigns', href: '/client/campaigns', label: 'Campaigns', icon: PaperPlaneIcon },
          { key: 'sandbox', href: '/client/sandbox', label: 'Sandbox', icon: MixerHorizontalIcon },
          { key: 'settings', href: '/client/settings', label: 'Settings', icon: GearIcon },
        ],
      },
      {
        label: 'Knowledge',
        items: [{ key: 'playbooks', href: '/help', label: 'Playbooks', icon: ReaderIcon }],
      },
    ] satisfies ShellNavSection[];
  }

  return [
    {
        label: 'Knowledge',
        items: [
          { key: 'playbooks', href: '/help', label: 'Playbooks', icon: ReaderIcon },
          { key: 'workspace', href: viewerDefaultHref(viewer), label: 'Workspace', icon: HomeIcon },
          { key: 'onboarding', href: '/admin/onboarding', label: 'Onboarding', icon: RocketIcon },
        ],
      },
    ] satisfies ShellNavSection[];
}

function viewerDefaultHref(viewer: ViewerContext) {
  return viewer.isPlatformAdmin ? '/admin' : '/client';
}

function rootLabel(current: AppShellProps['current'], workspaceName: string) {
  if (current === 'admin') {
    return 'Admin';
  }

  if (current === 'client') {
    return workspaceName;
  }

  return 'Playbooks';
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
  const navSections = getNavSections(current, viewer);
  const primaryNav = navSections[0]?.items ?? [];
  const allNavItems = navSections.flatMap((section) => section.items);
  const pageTitle = title ?? allNavItems.find((item) => item.key === activeNav)?.label ?? 'Workspace';
  const readyCount = availability.filter((item) => item.ready).length;
  const readiness = `${readyCount}/${availability.length}`;

  return (
    <SidebarProvider defaultOpen>
      <div className="platform-theme relative min-h-[100dvh] w-full overflow-hidden bg-background text-foreground">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(15,59,47,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(15,59,47,0.08),transparent_24%)]" />
        <div className="pointer-events-none fixed inset-0 opacity-40 [background-image:linear-gradient(rgba(17,24,39,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(17,24,39,0.035)_1px,transparent_1px)] [background-size:24px_24px]" />

        <Sidebar collapsible="icon" variant="inset" className="border-sidebar-border/80 bg-sidebar/95">
          <SidebarHeader className="gap-3 border-b border-sidebar-border/80 px-2 py-3">
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className="h-auto min-h-14 rounded-2xl border border-sidebar-border/80 bg-white/75 px-3 py-3 text-sidebar-foreground data-[state=open]:bg-white"
                    >
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_10px_20px_-12px_rgba(15,59,47,0.65)]">
                        <DrawingPinFilledIcon className="size-4" />
                      </div>
                      <div className="grid flex-1 text-left leading-tight">
                        <span className="truncate text-sm font-semibold">VoiceOps Platform</span>
                        <span className="truncate text-xs text-sidebar-foreground/65">{workspaceName}</span>
                      </div>
                      <ChevronDownIcon className="ml-auto size-4 text-sidebar-foreground/55" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" side="bottom" className="w-72 rounded-2xl">
                    <DropdownMenuLabel className="text-[0.68rem] uppercase tracking-[0.2em] text-muted-foreground">
                      Workspace
                    </DropdownMenuLabel>
                    <div className="space-y-1 px-2 py-2">
                      <p className="text-sm font-medium">{workspaceName}</p>
                      <p className="text-xs text-muted-foreground">{viewer.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    {availability.map((item) => (
                      <DropdownMenuItem key={item.label} className="items-start gap-3 rounded-xl py-2">
                        <span
                          className={cn(
                            'mt-1.5 size-2 shrink-0 rounded-full',
                            item.ready ? 'bg-emerald-600' : 'bg-amber-500',
                          )}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm">{item.label}</p>
                          <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent className="px-2 py-4">
            {navSections.map((section) => (
              <SidebarGroup key={section.label} className="px-0">
                <SidebarGroupLabel className="px-3 text-[0.68rem] uppercase tracking-[0.18em] text-sidebar-foreground/45">
                  {section.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;

                      return (
                        <SidebarMenuItem key={item.key}>
                          <SidebarMenuButton
                            asChild
                            isActive={item.key === activeNav}
                            tooltip={item.label}
                            className="h-11 rounded-2xl border border-transparent px-3 text-sidebar-foreground/70 transition-all hover:border-sidebar-border/70 hover:bg-white/70 hover:text-sidebar-foreground data-[active=true]:border-sidebar-border/80 data-[active=true]:bg-white data-[active=true]:text-sidebar-foreground"
                          >
                            <Link href={item.href as Route}>
                              <Icon className="size-4" />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarSeparator className="bg-sidebar-border/80" />

          <SidebarFooter className="px-2 py-3">
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className="h-auto min-h-14 rounded-2xl border border-sidebar-border/80 bg-white/75 px-3 py-3"
                    >
                      <div className="flex size-10 items-center justify-center rounded-2xl border border-sidebar-border/80 bg-sidebar-accent/50 text-sm font-semibold text-sidebar-foreground">
                        {initials(viewer)}
                      </div>
                      <div className="grid flex-1 text-left leading-tight">
                        <span className="truncate text-sm font-medium text-sidebar-foreground">{viewerName(viewer)}</span>
                        <span className="truncate text-xs text-sidebar-foreground/60">{viewerRole(viewer)}</span>
                      </div>
                      <DotsHorizontalIcon className="ml-auto size-4 text-sidebar-foreground/55" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="start" className="w-60 rounded-2xl">
                    <DropdownMenuLabel>{viewerName(viewer)}</DropdownMenuLabel>
                    <div className="flex flex-wrap gap-1.5 px-2 pb-2">
                      <Badge tone={viewer.isPlatformAdmin ? 'cyan' : 'muted'}>{viewerRole(viewer)}</Badge>
                      <Badge tone={readyCount === availability.length ? 'success' : 'warning'}>{readiness} ready</Badge>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/help" className="rounded-xl">
                        <ReaderIcon className="size-4" />
                        Playbooks
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <form action={logoutAction} className="px-1 pb-1">
                      <Button type="submit" variant="ghost" size="sm" className="w-full justify-start rounded-xl">
                        <ExitIcon />
                        Logout
                      </Button>
                    </form>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="bg-transparent">
          <header className="sticky top-0 z-20 border-b border-border/70 bg-background/82 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 lg:px-8">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <SidebarTrigger className="-ml-1 rounded-2xl border border-border/70 bg-card/80 shadow-none hover:bg-card" />
                  <div className="hidden min-w-0 md:block">
                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                      {rootLabel(current, workspaceName)}
                    </p>
                    <p className="truncate text-sm font-medium text-foreground">{pageTitle}</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="lg"
                  className="h-11 min-w-[240px] flex-1 justify-start rounded-2xl border-border/80 bg-card/88 px-4 text-muted-foreground shadow-none"
                >
                  <MagnifyingGlassIcon />
                  Search calls, transcripts, assistants, or leads
                </Button>

                <div className="flex items-center gap-2">
                  <Badge tone={readyCount === availability.length ? 'success' : 'warning'}>{readiness} integrations</Badge>
                  <Badge tone="muted">{viewerRole(viewer)}</Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {primaryNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.key === activeNav;

                  return (
                    <Button
                      key={item.key}
                      asChild
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'rounded-full px-3',
                        !isActive && 'bg-card/75',
                      )}
                    >
                      <Link href={item.href as Route}>
                        <Icon />
                        {item.shortLabel ?? item.label}
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </div>
          </header>

          <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 px-4 py-6 lg:px-8">
            {headerMode !== 'hidden' ? (
              <section
                className={cn(
                  'grid gap-5 rounded-[30px] border border-border/70 bg-card/92 shadow-[0_30px_80px_-48px_rgba(17,24,39,0.22)]',
                  headerMode === 'compact'
                    ? 'px-5 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center'
                    : 'px-5 py-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-7 lg:py-7',
                )}
              >
                <div className="space-y-3">
                  {eyebrow ? (
                    <p className="text-[0.72rem] uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</p>
                  ) : null}
                  <div className="space-y-2">
                    <h1
                      className={cn(
                        'max-w-4xl font-semibold tracking-[-0.05em] text-foreground',
                        headerMode === 'compact' ? 'text-[1.8rem]' : 'text-[2.4rem]',
                      )}
                    >
                      {pageTitle}
                    </h1>
                    {description ? (
                      <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                    <div className="rounded-2xl border border-border/70 bg-background/82 px-4 py-3">
                      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{workspaceName}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/82 px-4 py-3">
                      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Access</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{viewerRole(viewer)}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/82 px-4 py-3">
                      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Readiness</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{readiness}</p>
                    </div>
                  </div>

                  {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
                </div>
              </section>
            ) : null}

            <div className="flex flex-col gap-6">{children}</div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
