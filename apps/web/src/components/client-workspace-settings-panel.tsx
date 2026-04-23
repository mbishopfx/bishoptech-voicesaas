'use client';

import Link from 'next/link';
import { BookOpen, LifeBuoy, Phone, Settings2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ClientWorkspaceSettingsPanelProps = {
  organizationName: string;
  organizationSlug: string;
  planName: string | null;
  timezone: string;
  phoneNumberCount: number;
  assistantCount: number;
  campaignCount: number;
};

function SettingKpi({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="space-y-1 rounded-[22px] border border-border/75 bg-background/72 px-4 py-4">
      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <div className="text-xl font-semibold tracking-[-0.04em] text-foreground">{value}</div>
      <p className="text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

export function ClientWorkspaceSettingsPanel({
  organizationName,
  organizationSlug,
  planName,
  timezone,
  phoneNumberCount,
  assistantCount,
  campaignCount,
}: ClientWorkspaceSettingsPanelProps) {
  return (
    <section className="space-y-6">
      <Card className="border-border/80 bg-card/85 py-0 shadow-none">
        <CardHeader className="border-b border-border/70 pb-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="success">{planName ?? 'Active plan'}</Badge>
              <Badge tone="muted">{timezone}</Badge>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl tracking-[-0.04em]">Workspace details</CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                Review the basics for this workspace and use the linked resources whenever you need help, feedback, or changes.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 px-4 py-4 md:grid-cols-2 xl:grid-cols-4">
          <SettingKpi label="Business" value={organizationName} description={organizationSlug} />
          <SettingKpi label="Phone lines" value={String(phoneNumberCount)} description="Numbers currently connected to this workspace." />
          <SettingKpi label="Assistants" value={String(assistantCount)} description="Assistant experiences available for your team." />
          <SettingKpi label="Campaigns" value={String(campaignCount)} description="Saved or active outreach campaigns." />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_340px]">
        <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
          <CardHeader className="border-b border-border/70 pb-4">
            <CardTitle className="text-base">What to use this page for</CardTitle>
            <CardDescription>Keep the workspace focused on the things your team actually needs day to day.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-4 py-4">
            {[
              'Review your workspace name, timezone, phone coverage, and active assistants.',
              'Open playbooks for onboarding guidance, page walkthroughs, and best practices.',
              'Submit a support request whenever you need a change, a review, or a scheduled working session.',
            ].map((item) => (
              <div key={item} className="rounded-[22px] border border-border/75 bg-background/72 px-4 py-4 text-sm leading-6 text-muted-foreground">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/80 py-0 shadow-none">
          <CardHeader className="border-b border-border/70 pb-4">
            <CardTitle className="text-base">Resources</CardTitle>
            <CardDescription>Quick links for help, changes, and call review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4 py-4">
            <Button asChild variant="outline" size="sm" className="h-11 w-full justify-between rounded-[18px] px-4">
              <Link href="/help">
                Client playbooks
                <BookOpen data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-11 w-full justify-between rounded-[18px] px-4">
              <Link href="/client/tickets">
                Support requests
                <LifeBuoy data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-11 w-full justify-between rounded-[18px] px-4">
              <Link href="/client/calls">
                Review calls
                <Phone data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-11 w-full justify-between rounded-[18px] px-4">
              <Link href="/client">
                Back to overview
                <Settings2 data-icon="inline-end" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
