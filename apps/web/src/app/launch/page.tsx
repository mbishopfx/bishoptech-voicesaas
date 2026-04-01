import { redirect } from 'next/navigation';

import { getHomePath, requireViewer } from '@/lib/auth';

export default async function LaunchPage() {
  const viewer = await requireViewer();
  redirect(getHomePath(viewer));
}
