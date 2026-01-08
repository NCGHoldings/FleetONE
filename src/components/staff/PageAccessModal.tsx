import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PAGES, PageItem } from "@/lib/pages";
import { usePagePermissions } from "@/hooks/usePagePermissions";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface PageAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  userName?: string;
}

export function PageAccessModal({ open, onOpenChange, userId, userName }: PageAccessModalProps) {
  const { user } = useAuth();
  const {
    permissions,
    hasAccess,
    setAccess,
    bulkSetAccess,
    savePermissions,
    loading,
  } = usePagePermissions(userId || undefined);

  const categories = useMemo(() => ([
    { key: 'main', label: 'Main', items: PAGES.main },
    { key: 'operations', label: 'Operations', items: PAGES.operations },
    { key: 'business', label: 'Business', items: PAGES.business },
    { key: 'finance', label: 'Finance', items: PAGES.finance },
    { key: 'marketing', label: 'Marketing', items: PAGES.marketing },
    { key: 'yutong', label: 'Yutong Sales', items: PAGES.yutong },
    { key: 'sinotruck', label: 'Sinotruck Operations', items: PAGES.sinotruck },
    { key: 'lightvehicle', label: 'Light Vehicle Sales', items: PAGES.lightvehicle },
    { key: 'governance', label: 'Governance', items: PAGES.governance },
    { key: 'nsp', label: 'NSP', items: PAGES.nsp },
  ]), []);

  const toggleAll = (items: PageItem[], value: boolean) => {
    bulkSetAccess(items, value);
  };

  const onSave = async () => {
    const res = await savePermissions(user?.id);
    if ((res as any).error) {
      toast.error((res as any).error);
    } else {
      toast.success("Page access updated");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Page Access{userName ? ` — ${userName}` : ''}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {categories.map((cat, idx) => (
              <div key={cat.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{cat.label}</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleAll(cat.items, true)}>Select all</Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleAll(cat.items, false)}>Clear</Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cat.items.map((page) => (
                    <label key={page.id} className="flex items-center gap-3 rounded-md border p-3 hover:bg-accent/10 cursor-pointer">
                      <Checkbox
                        checked={hasAccess(page.id)}
                        onCheckedChange={(v) => setAccess(page.id, !!v)}
                      />
                      <div>
                        <div className="font-medium">{page.title}</div>
                        <div className="text-xs text-muted-foreground">{page.url}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {idx < categories.length - 1 && <Separator className="my-2" />}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={loading}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
