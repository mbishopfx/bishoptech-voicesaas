import { redirect } from 'next/navigation';

import type { OrganizationRole, ViewerContext, ViewerMembership } from '@/lib/types';
import { createSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

const manageableRoles = new Set<OrganizationRole>(['owner', 'admin', 'manager']);

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  plan_name: string | null;
  is_active: boolean;
};

type MembershipRow = {
  organization_id: string;
  role: OrganizationRole;
};

export function getDefaultOrganizationId(viewer: ViewerContext) {
  return viewer.defaultOrganizationId ?? viewer.memberships[0]?.organizationId ?? null;
}

export function canManageOrganization(viewer: ViewerContext, organizationId: string) {
  if (viewer.isPlatformAdmin) {
    return true;
  }

  return viewer.memberships.some(
    (membership) => membership.organizationId === organizationId && manageableRoles.has(membership.role),
  );
}

export function getHomePath(viewer: ViewerContext) {
  return viewer.isPlatformAdmin ? '/admin' : '/client';
}

export async function getViewerContext(): Promise<ViewerContext | null> {
  if (!isSupabaseServerConfigured()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [platformAdminResult, profileResult, membershipResult] = await Promise.all([
    supabase.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle(),
    supabase.from('user_profiles').select('full_name, default_organization_id').eq('id', user.id).maybeSingle(),
    supabase.from('organization_members').select('organization_id, role').eq('user_id', user.id),
  ]);

  const isPlatformAdmin = Boolean(platformAdminResult.data?.user_id);
  const profile = profileResult.data as { full_name?: string | null; default_organization_id?: string | null } | null;
  const membershipRows = (membershipResult.data ?? []) as MembershipRow[];
  const scopedOrganizationIds = Array.from(new Set(membershipRows.map((item) => item.organization_id)));

  let organizations: OrganizationRow[] = [];

  if (isPlatformAdmin) {
    const result = await supabase
      .from('organizations')
      .select('id, name, slug, timezone, plan_name, is_active')
      .order('created_at', { ascending: true });

    organizations = (result.data ?? []) as OrganizationRow[];
  } else if (scopedOrganizationIds.length) {
    const result = await supabase
      .from('organizations')
      .select('id, name, slug, timezone, plan_name, is_active')
      .in('id', scopedOrganizationIds)
      .order('created_at', { ascending: true });

    organizations = (result.data ?? []) as OrganizationRow[];
  }

  const organizationMap = new Map(organizations.map((organization) => [organization.id, organization]));

  const memberships: ViewerMembership[] = membershipRows
    .map((membership) => {
      const organization = organizationMap.get(membership.organization_id);

      if (!organization) {
        return null;
      }

      return {
        organizationId: organization.id,
        role: membership.role,
        organizationName: organization.name,
        organizationSlug: organization.slug,
        timezone: organization.timezone,
        planName: organization.plan_name,
        isActive: organization.is_active,
      };
    })
    .filter((membership): membership is ViewerMembership => Boolean(membership));

  return {
    id: user.id,
    email: user.email ?? '',
    fullName: profile?.full_name ?? null,
    isPlatformAdmin,
    defaultOrganizationId: profile?.default_organization_id ?? null,
    memberships,
  };
}

export async function requireViewer(): Promise<ViewerContext> {
  const viewer = await getViewerContext();

  if (!viewer) {
    redirect('/');
  }

  return viewer;
}

export async function requirePlatformAdmin(): Promise<ViewerContext> {
  const viewer = await requireViewer();

  if (!viewer.isPlatformAdmin) {
    redirect('/client');
  }

  return viewer;
}
