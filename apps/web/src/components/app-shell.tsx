import Link from 'next/link';
import type { Route } from 'next';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Bot,
  Building2,
  ChevronsUpDown,
  ClipboardPenLine,
  FileCheck2,
  FlaskConical,
  FolderKanban,
  House,
  LogOut,
  MoreHorizontal,
  PhoneCall,
  RadioTower,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Workflow,
} from 'lucide-react';

import { logoutAction } from '@/app/auth/actions';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
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
  const defaultHref = viewer.isPlatformAdmin ? '/admin' : '/client';

  if (current === 'admin') {
    return [
      {
        label: 'Platform',
        items: [
          { key: 'dashboard', href: '/admin', label: 'Command Center', icon: House },
          { key: 'organizations', href: '/admin/organizations', label: 'Organizations', icon: Building2 },
          { key: 'calls', href: '/admin/calls', label: 'Call Queue', icon: PhoneCall },
          { key: 'onboarding', href: '/admin/onboarding', label: 'Onboarding', icon: ClipboardPenLine },
          { key: 'demo-lab', href: '/admin/demo-lab', label: 'Demo Lab', icon: FlaskConical },
        ],
      },
      {
        label: 'Resources',
        items: [{ key: 'playbooks', href: '/help', label: 'Playbooks', icon: BookOpen }],
      },
    ] satisfies ShellNavSection[];
  }

  if (current === 'client') {
    return [
      {
        label: 'Workspace',
        items: [
          { key: 'dashboard', href: '/client', label: 'Overview', icon: House },
          { key: 'agents', href: '/client/agents', label: 'Agent Studio', icon: Bot },
          { key: 'leads', href: '/client/leads', label: 'Lead Pipeline', icon: Building2 },
          { key: 'calls', href: '/client/calls', label: 'Call Explorer', icon: PhoneCall },
          { key: 'campaigns', href: '/client/campaigns', label: 'Campaigns', icon: Send },
          { key: 'settings', href: '/client/settings', label: 'Settings', icon: Settings },
        ],
      },
      {
        label: 'Resources',
        items: [{ key: 'playbooks', href: '/help', label: 'Playbooks', icon: BookOpen }],
      },
    ] satisfies ShellNavSection[];
  }

  return [
    {
      label: 'Knowledge',
      items: [
        { key: 'playbooks', href: '/help', label: 'Playbooks', icon: BookOpen },
        { key: 'workspace', href: defaultHref, label: 'Workspace', icon: House },
        { key: 'onboarding', href: '/admin/onboarding', label: 'Onboarding', icon: ClipboardPenLine },
      ],
    },
  ] satisfies ShellNavSection[];
}

function rootLabel(current: AppShellProps['current'], workspaceName: string) {
  if (current === 'admin') {
    return 'Admin';
  }

  if (current === 'client') {
    return workspaceName;
  }

  return 'Help';
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

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader className="gap-3 border-b border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                    <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                      <ShieldCheck className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">VoiceOps Command</span>
                      <span className="truncate text-xs text-sidebar-foreground/70">{workspaceName}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="bottom" className="w-64">
                  <DropdownMenuLabel className="text-xs uppercase tracking-[0.18em]">Workspace</DropdownMenuLabel>
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{workspaceName}</p>
                    <p className="text-xs text-muted-foreground">{viewer.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  {availability.map((item) => (
                    <DropdownMenuItem key={item.label} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm">{item.label}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                      <span className={cn('mt-1 size-2 rounded-full', item.ready ? 'bg-emerald-500' : 'bg-amber-500')} />
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {navSections.map((section) => (
            <SidebarGroup key={section.label}>
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => {
                    const Icon = item.icon;

                    return (
                      <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton asChild isActive={item.key === activeNav} tooltip={item.label}>
                          <Link href={item.href as Route}>
                            <Icon />
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

        <SidebarSeparator />

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg">
                    <div className="flex size-8 items-center justify-center rounded-md border border-sidebar-border bg-sidebar-accent/40 text-xs font-semibold">
                      {initials(viewer)}
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{viewerName(viewer)}</span>
                      <span className="truncate text-xs text-sidebar-foreground/70">{viewerRole(viewer)}</span>
                    </div>
                    <MoreHorizontal className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-56">
                  <DropdownMenuLabel>{viewerName(viewer)}</DropdownMenuLabel>
                  <div className="px-2 pb-2">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone={viewer.isPlatformAdmin ? 'cyan' : 'muted'}>{viewerRole(viewer)}</Badge>
                      <Badge tone={readyCount === availability.length ? 'success' : 'warning'}>{readiness} ready</Badge>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/help" className="cursor-pointer">
                      <BookOpen className="size-4" />
                      Playbooks
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <form action={logoutAction}>
                    <button type="submit" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">
                      <LogOut className="size-4" />
                      Logout
                    </button>
                  </form>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/95 px-5 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:px-8">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink asChild>
                  <Link href={(current === 'admin' ? '/admin' : current === 'client' ? '/client' : '/help') as Route}>
                    {rootLabel(current, workspaceName)}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden w-full max-w-sm items-center md:flex">
              <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
              <Input readOnly value="" placeholder="Search calls, leads, assistants" className="h-10 pl-9" />
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-8 p-5 lg:p-8">
          {headerMode !== 'hidden' ? (
            <section className="flex flex-col gap-5 border-b pb-8 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                {eyebrow ? <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p> : null}
                <div className="space-y-1">
                  <h1 className={cn('font-semibold tracking-tight', headerMode === 'compact' ? 'text-2xl' : 'text-3xl')}>
                    {pageTitle}
                  </h1>
                  {description ? <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
                </div>
              </div>
              {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
            </section>
          ) : null}

          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
