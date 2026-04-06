import { useEffect, useState } from "react";
import { APP_VERSION, BUILD_DATE, BUILD_ID, CHANGELOG, type ChangelogEntry } from "@/config/appVersion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Wrench, TrendingUp, Clock, Hash } from "lucide-react";

const LAST_SEEN_KEY = "app_last_seen_version";

const typeConfig = {
  feature: { label: "New", icon: Sparkles, className: "bg-primary/10 text-primary border-primary/20" },
  fix: { label: "Fix", icon: Wrench, className: "bg-destructive/10 text-destructive border-destructive/20" },
  improvement: { label: "Improved", icon: TrendingUp, className: "bg-accent/10 text-accent-foreground border-accent/20" },
};

function formatBuildDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

interface WhatsNewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WhatsNewDialog({ open, onOpenChange }: WhatsNewDialogProps) {
  useEffect(() => {
    if (open) {
      localStorage.setItem(LAST_SEEN_KEY, APP_VERSION);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            What's New
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1">
              <div className="font-semibold">v{APP_VERSION}</div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Built: {formatBuildDate(BUILD_DATE)}
                </span>
                <span className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {BUILD_ID}
                </span>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[55vh] pr-4">
          <div className="space-y-6">
            {CHANGELOG.map((entry) => (
              <VersionBlock key={entry.version} entry={entry} />
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function VersionBlock({ entry }: { entry: ChangelogEntry }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">v{entry.version} — {entry.title}</h3>
        <span className="text-xs text-muted-foreground">{entry.date}</span>
      </div>
      <div className="space-y-1.5 pl-2 border-l-2 border-border">
        {entry.changes.map((change, i) => {
          const config = typeConfig[change.type];
          const Icon = config.icon;
          return (
            <div key={i} className="flex items-start gap-2 text-sm">
              <Badge variant="outline" className={`${config.className} text-[10px] px-1.5 py-0 shrink-0 mt-0.5`}>
                <Icon className="h-3 w-3 mr-0.5" />
                {config.label}
              </Badge>
              <span className="text-muted-foreground">{change.description}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function useHasNewVersion(): boolean {
  const [hasNew, setHasNew] = useState(false);
  useEffect(() => {
    const lastSeen = localStorage.getItem(LAST_SEEN_KEY);
    setHasNew(lastSeen !== APP_VERSION);
  }, []);
  return hasNew;
}