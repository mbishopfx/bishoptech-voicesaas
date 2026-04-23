'use client';

import {
  DesktopIcon,
  MoonIcon,
  SunIcon,
} from '@radix-ui/react-icons';
import { useTheme } from 'next-themes';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type ThemeModeToggleProps = {
  className?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
};

function themeIcon(theme: string | undefined, resolvedTheme: string | undefined) {
  if (theme === 'system') {
    return DesktopIcon;
  }

  return resolvedTheme === 'dark' ? MoonIcon : SunIcon;
}

function themeLabel(theme: string | undefined) {
  if (theme === 'system') {
    return 'System';
  }

  return theme === 'dark' ? 'Dark' : 'Light';
}

export function ThemeModeToggle({
  className,
  side = 'right',
  align = 'start',
}: ThemeModeToggleProps) {
  const { theme = 'system', resolvedTheme, setTheme } = useTheme();
  const Icon = themeIcon(theme, resolvedTheme);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Theme"
          aria-label="Theme"
          className={cn(className)}
        >
          <Icon className="size-4" />
          <span className="truncate">Theme</span>
          <span className="ml-auto truncate text-[0.72rem] text-current/65 group-data-[collapsible=icon]:hidden">
            {themeLabel(theme)}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} className="w-44 rounded-2xl">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="system">
            <DesktopIcon className="size-4" />
            System
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">
            <SunIcon className="size-4" />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <MoonIcon className="size-4" />
            Dark
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
