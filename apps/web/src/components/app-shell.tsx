import Link from 'next/link';
import type { Route } from 'next';
import type { CSSProperties, ReactNode, SVGProps } from 'react';
import {
  BarChartIcon,
  ChatBubbleIcon,
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
import { ThemeModeToggle } from '@/components/theme-mode-toggle';
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
    return 'Owner';
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
          { key: 'dashboard', href: '/admin', label: 'Portfolio overview', icon: DashboardIcon },
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
          { key: 'leads', href: '/client/leads', label: 'Lead pipeline', icon: BarChartIcon },
          { key: 'calls', href: '/client/calls', label: 'Calls', icon: ChatBubbleIcon },
          { key: 'tickets', href: '/client/tickets', label: 'Requests', icon: FileTextIcon },
          { key: 'campaigns', href: '/client/campaigns', label: 'Campaigns', icon: PaperPlaneIcon },
          { key: 'sandbox', href: '/client/sandbox', label: 'Call tester', icon: MixerHorizontalIcon },
          { key: 'settings', href: '/client/settings', label: 'Workspace', icon: GearIcon },
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
        { key: 'workspace', href: viewer.isPlatformAdmin ? '/admin' : '/client', label: 'Workspace', icon: HomeIcon },
        { key: 'onboarding', href: '/admin/onboarding', label: 'Onboarding', icon: RocketIcon },
      ],
    },
  ] satisfies ShellNavSection[];
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
  const allNavItems = navSections.flatMap((section) => section.items);
  const pageTitle = title ?? allNavItems.find((item) => item.key === activeNav)?.label ?? 'Workspace';
  const readyCount = availability.filter((item) => item.ready).length;
  const readiness = `${readyCount}/${availability.length}`;
  const providerStyle = {
    '--sidebar-width': '17.75rem',
    '--sidebar-width-icon': '4.5rem',
    '--shell-header-height': '5.5rem',
    '--shell-frame-offset': 'calc(var(--shell-header-height) + 2rem)',
  } as CSSProperties;

  return (
    <SidebarProvider defaultOpen style={providerStyle}>
      <div className="platform-theme relative min-h-[100dvh] w-full overflow-hidden bg-background text-foreground">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,59,47,0.13),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(15,59,47,0.08),transparent_26%)]" />
        <div className="pointer-events-none fixed inset-0 opacity-[0.28] [background-image:linear-gradient(rgba(30,41,59,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.05)_1px,transparent_1px)] [background-size:28px_28px]" />

        <header className="fixed inset-x-0 top-0 z-40 px-4 pt-4 md:px-6 xl:px-8">
          <div className="flex h-[var(--shell-header-height)] items-center gap-3 rounded-[30px] border border-border/75 bg-card/92 px-4 shadow-[0_30px_90px_-48px_rgba(15,23,42,0.32),inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl md:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger className="rounded-[18px] border border-border/75 bg-background/86 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.25)]" />
              <div className="flex size-11 shrink-0 items-center justify-center rounded-[18px] border border-primary/20 bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                <DrawingPinFilledIcon className="size-4" />
              </div>
              <div className="hidden min-w-0 md:block">
                <p className="truncate text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">{workspaceName}</p>
                <p className="truncate text-base font-semibold tracking-[-0.03em] text-foreground">{pageTitle}</p>
              </div>
            </div>

            <button
              type="button"
              className="hidden min-w-0 flex-1 items-center gap-3 rounded-[22px] border border-border/75 bg-background/78 px-4 py-3 text-left text-sm text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.52)] transition-colors hover:border-border hover:bg-background md:flex"
            >
              <MagnifyingGlassIcon className="size-4 shrink-0" />
              <span className="truncate">Search calls, transcripts, assistants, or leads</span>
            </button>

            <div className="ml-auto flex items-center gap-2">
              <Badge tone={readyCount === availability.length ? 'success' : 'warning'} className="hidden sm:inline-flex">
                {readiness} integrations
              </Badge>
              <Badge tone={viewer.isPlatformAdmin ? 'cyan' : 'muted'} className="hidden lg:inline-flex">
                {viewerRole(viewer)}
              </Badge>
              <ThemeModeToggle
                side="bottom"
                align="end"
                className="flex h-10 items-center gap-2 rounded-[18px] border border-border/75 bg-background/84 px-3 text-sm text-foreground shadow-[0_18px_38px_-30px_rgba(15,23,42,0.26),inset_0_1px_0_rgba(255,255,255,0.62)] transition-colors hover:bg-accent/70"
              />
            </div>
          </div>
        </header>

        <div className="flex min-h-[100dvh] pt-[var(--shell-frame-offset)]">
          <Sidebar
            collapsible="icon"
            variant="inset"
            className="top-[var(--shell-frame-offset)] bottom-6 h-auto border-none bg-transparent px-2 py-0 transition-[width,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[collapsible=icon]:px-1.5"
          >
            <SidebarHeader className="gap-3 rounded-[30px] border border-sidebar-border/80 bg-sidebar/96 px-3 py-3 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.28)] group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    tooltip={workspaceName}
                    className="min-h-16 rounded-[24px] border border-sidebar-border/75 bg-sidebar-accent/55 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] group-data-[collapsible=icon]:size-14 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                  >
                    <div className="flex size-10 items-center justify-center rounded-[18px] bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_16px_30px_-20px_rgba(15,59,47,0.72)]">
                      <DrawingPinFilledIcon className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left leading-tight transition-all duration-200 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:translate-x-1 group-data-[collapsible=icon]:opacity-0">
                      <span className="truncate text-sm font-semibold">VoiceOps Platform</span>
                      <span className="truncate text-xs text-sidebar-foreground/60">{workspaceName}</span>
                    </div>
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
            </SidebarHeader>

            <SidebarContent className="gap-3 px-3 py-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-3">
              {navSections.map((section) => (
                <SidebarGroup
                  key={section.label}
                  className="rounded-[28px] border border-sidebar-border/75 bg-sidebar/95 p-3 shadow-[0_20px_48px_-32px_rgba(15,23,42,0.28)] group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:shadow-none"
                >
                  <SidebarGroupLabel className="px-2 text-[0.68rem] uppercase tracking-[0.22em] text-sidebar-foreground/45">
                    {section.label}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-2">
                      {section.items.map((item) => {
                        const Icon = item.icon;

                        return (
                          <SidebarMenuItem key={item.key}>
                            <SidebarMenuButton
                              asChild
                              isActive={item.key === activeNav}
                              tooltip={item.label}
                              className="h-11 rounded-[18px] border border-transparent px-3 text-sidebar-foreground/72 group-data-[collapsible=icon]:size-11 group-data-[collapsible=icon]:px-0 hover:border-sidebar-border/70 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground data-[active=true]:border-sidebar-border/80 data-[active=true]:bg-background data-[active=true]:text-sidebar-foreground data-[active=true]:shadow-[0_18px_38px_-28px_rgba(15,23,42,0.38)]"
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

            <SidebarFooter className="px-3 pb-3 pt-0 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
              <SidebarMenu className="rounded-[28px] border border-sidebar-border/75 bg-sidebar/95 p-3 shadow-[0_20px_48px_-32px_rgba(15,23,42,0.28)] group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:shadow-none">
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton
                        size="lg"
                        tooltip={viewerName(viewer)}
                        className="min-h-14 rounded-[22px] border border-sidebar-border/75 bg-sidebar-accent/50 px-3 py-3 group-data-[collapsible=icon]:size-14 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                      >
                        <div className="flex size-10 items-center justify-center rounded-[18px] border border-sidebar-border/75 bg-background/75 text-sm font-semibold text-sidebar-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                          {initials(viewer)}
                        </div>
                        <div className="grid flex-1 text-left leading-tight transition-all duration-200 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:translate-x-1 group-data-[collapsible=icon]:opacity-0">
                          <span className="truncate text-sm font-medium text-sidebar-foreground">{viewerName(viewer)}</span>
                          <span className="truncate text-xs text-sidebar-foreground/58">{viewerRole(viewer)}</span>
                        </div>
                        <DotsHorizontalIcon className="size-4 text-sidebar-foreground/55 transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0" />
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

          <SidebarInset className="min-w-0 bg-transparent">
            <main className="flex min-w-0 flex-1 flex-col gap-6 px-4 pb-6 md:px-6 md:pb-8 xl:px-8">
              {headerMode !== 'hidden' ? (
                <section
                  className={cn(
                    'grid gap-5 rounded-[34px] border border-border/70 bg-card/96 px-6 py-6 shadow-[0_28px_80px_-44px_rgba(15,23,42,0.24),inset_0_1px_0_rgba(255,255,255,0.75)]',
                    headerMode === 'compact'
                      ? 'xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start'
                      : 'xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)] xl:items-start',
                  )}
                >
                  <div className="min-w-0 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 space-y-2">
                        {eyebrow ? (
                          <p className="text-[0.72rem] uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</p>
                        ) : null}
                        <div className="space-y-2">
                          <h1
                            className={cn(
                              'max-w-4xl font-semibold tracking-[-0.055em] text-foreground',
                              headerMode === 'compact' ? 'text-[1.8rem]' : 'text-[2.5rem]',
                            )}
                          >
                            {pageTitle}
                          </h1>
                          {description ? (
                            <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 xl:justify-items-end">
                    {actions ? <div className="flex flex-wrap items-center gap-2 xl:justify-end">{actions}</div> : null}

                    <div className="grid gap-3 sm:grid-cols-3 xl:max-w-[460px]">
                      <div className="rounded-[22px] border border-border/70 bg-background/86 px-4 py-4 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.7)]">
                        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
                        <p className="mt-2 text-sm font-medium text-foreground">{workspaceName}</p>
                      </div>
                      <div className="rounded-[22px] border border-border/70 bg-background/86 px-4 py-4 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.7)]">
                        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Access</p>
                        <p className="mt-2 text-sm font-medium text-foreground">{viewerRole(viewer)}</p>
                      </div>
                      <div className="rounded-[22px] border border-border/70 bg-background/86 px-4 py-4 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.7)]">
                        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Readiness</p>
                        <p className="mt-2 text-sm font-medium text-foreground">{readiness}</p>
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

              <div className="flex min-w-0 flex-col gap-6">{children}</div>
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
