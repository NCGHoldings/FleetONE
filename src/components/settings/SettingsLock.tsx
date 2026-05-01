import React, { useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface SettingsLockProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  valueExists?: boolean;
}

export function SettingsLock({ label, required, children, valueExists }: SettingsLockProps) {
  // If there's a value, it starts locked. If empty, it starts unlocked.
  const [isLocked, setIsLocked] = useState(!!valueExists);

  const handleToggle = () => {
    if (isLocked) {
      toast.warning("Setting Unlocked: Changing core financial mappings can cause GL posting failures. Please be careful.", {
        duration: 5000,
      });
    }
    setIsLocked(!isLocked);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1">
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
        {valueExists && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={`h-6 w-6 p-0 ${isLocked ? 'text-muted-foreground hover:text-foreground' : 'text-destructive animate-pulse'}`}
                  onClick={handleToggle}
                >
                  {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isLocked ? "Click to unlock setting" : "Setting is unlocked - Proceed with caution"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="relative">
        {children}
        {isLocked && (
          <div 
            className="absolute inset-0 bg-background/50 z-10 cursor-not-allowed rounded-md ring-1 ring-border/50" 
            title="Setting is locked. Click the padlock to unlock."
          />
        )}
      </div>
    </div>
  );
}
