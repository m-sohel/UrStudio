'use client';

import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSettingsStore } from '@/store/settings-store';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, updateSettings } = useSettingsStore();

  const toggleTheme = () => {
    if (theme === 'dark') {
      updateSettings({ theme: 'light' });
    } else {
      updateSettings({ theme: 'dark' });
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 transition-colors ${className || ''}`}
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          />
        }
      >
        {theme === 'dark' ? (
          <Sun className="w-4 h-4 text-amber-400 hover:text-amber-300 transition-transform rotate-0 scale-100" />
        ) : (
          <Moon className="w-4 h-4 text-cyan-600 hover:text-cyan-700 transition-transform rotate-0 scale-100" />
        )}
      </TooltipTrigger>
      <TooltipContent>
        {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      </TooltipContent>
    </Tooltip>
  );
}
