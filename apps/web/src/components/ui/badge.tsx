import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'default' | 'success' | 'warning' | 'muted' | 'cyan';
};

export function Badge({ className, tone = 'default', ...props }: BadgeProps) {
  return <span className={cn('app-badge', `is-${tone}`, className)} {...props} />;
}
