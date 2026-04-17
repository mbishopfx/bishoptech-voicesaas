'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { OrganizationSummary, RecentCall } from '@/lib/types';

function parseDurationLabel(value: string) {
  if (!value) {
    return 0;
  }

  const minuteMatch = value.match(/(\d+)\s*m/i);
  const secondMatch = value.match(/(\d+)\s*s/i);
  const compactMatch = value.match(/^(\d+):(\d+)$/);

  if (compactMatch) {
    return Number(compactMatch[1]) * 60 + Number(compactMatch[2]);
  }

  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
  const seconds = secondMatch ? Number(secondMatch[1]) : 0;

  return minutes * 60 + seconds;
}

function compactLabel(value: string, index: number) {
  const lower = value.toLowerCase();

  if (lower.includes('minute')) {
    return `${index + 1}m`;
  }

  if (lower.includes('hour')) {
    return `${index + 1}h`;
  }

  if (lower.includes('day')) {
    return `${index + 1}d`;
  }

  return `C${index + 1}`;
}

export function PulseAreaChart({ recentCalls }: { recentCalls: RecentCall[] }) {
  const data = recentCalls
    .slice(0, 7)
    .reverse()
    .map((call, index) => ({
      label: compactLabel(call.createdAt, index),
      duration: Math.max(parseDurationLabel(call.duration), 10),
      transcript: Math.max(call.transcript.length * 6, 8),
      quality: call.outcome.toLowerCase().includes('missed')
        ? 42
        : call.outcome.toLowerCase().includes('queued')
          ? 58
          : 76,
    }));

  const fallback = [
    { label: '1', duration: 24, transcript: 18, quality: 62 },
    { label: '2', duration: 18, transcript: 22, quality: 54 },
    { label: '3', duration: 28, transcript: 20, quality: 71 },
    { label: '4', duration: 16, transcript: 26, quality: 68 },
    { label: '5', duration: 22, transcript: 24, quality: 73 },
  ];

  return (
    <div className="chart-shell">
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data.length ? data : fallback} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="pulse-duration" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d2b774" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#d2b774" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="pulse-quality" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8cb9a0" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#8cb9a0" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(243, 227, 177, 0.08)" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'rgba(219,205,185,0.72)', fontSize: 12 }} />
          <YAxis hide />
          <Tooltip
            cursor={{ stroke: 'rgba(243, 227, 177, 0.18)', strokeWidth: 1 }}
            contentStyle={{
              background: 'rgba(25, 21, 17, 0.96)',
              border: '1px solid rgba(243, 227, 177, 0.14)',
              borderRadius: '14px',
              color: '#f2e8d9',
            }}
            labelStyle={{ color: 'rgba(219,205,185,0.72)' }}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="quality"
            stroke="#8cb9a0"
            strokeWidth={1.4}
            fill="url(#pulse-quality)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="duration"
            stroke="#d2b774"
            strokeWidth={2}
            fill="url(#pulse-duration)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OrganizationLoadChart({ organizations }: { organizations: OrganizationSummary[] }) {
  const data = organizations.slice(0, 6).map((organization) => ({
    name: organization.name.length > 16 ? `${organization.name.slice(0, 16)}…` : organization.name,
    liveAgents: organization.liveAgentCount,
    members: organization.memberCount,
  }));

  return (
    <div className="chart-shell compact">
      <ResponsiveContainer width="100%" height={248}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="rgba(243, 227, 177, 0.08)" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'rgba(219,205,185,0.72)', fontSize: 11 }} />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              background: 'rgba(25, 21, 17, 0.96)',
              border: '1px solid rgba(243, 227, 177, 0.14)',
              borderRadius: '14px',
              color: '#f2e8d9',
            }}
            isAnimationActive={false}
          />
          <Bar dataKey="liveAgents" radius={[8, 8, 0, 0]} isAnimationActive={false}>
            {data.map((entry) => (
              <Cell key={entry.name} fill="#d2b774" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OutcomeBarChart({ recentCalls }: { recentCalls: RecentCall[] }) {
  const grouped = Array.from(
    recentCalls.reduce<Map<string, number>>((accumulator, call) => {
      accumulator.set(call.outcome, (accumulator.get(call.outcome) ?? 0) + 1);
      return accumulator;
    }, new Map()),
  )
    .slice(0, 6)
    .map(([outcome, total]) => ({
      outcome: outcome.length > 18 ? `${outcome.slice(0, 18)}…` : outcome,
      total,
    }));

  const fallback = [
    { outcome: 'Resolved', total: 4 },
    { outcome: 'Queued', total: 2 },
    { outcome: 'Escalated', total: 1 },
  ];

  return (
    <div className="chart-shell compact">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={grouped.length ? grouped : fallback} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="rgba(243, 227, 177, 0.08)" vertical={false} />
          <XAxis dataKey="outcome" tickLine={false} axisLine={false} tick={{ fill: 'rgba(219,205,185,0.72)', fontSize: 11 }} />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              background: 'rgba(25, 21, 17, 0.96)',
              border: '1px solid rgba(243, 227, 177, 0.14)',
              borderRadius: '14px',
              color: '#f2e8d9',
            }}
            isAnimationActive={false}
          />
          <Bar dataKey="total" radius={[8, 8, 0, 0]} fill="#8cb9a0" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
