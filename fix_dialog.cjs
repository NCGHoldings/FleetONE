const fs = require('fs');

let content = fs.readFileSync('src/components/accounting/APInvoiceForm.tsx', 'utf-8');

// The SingleAPInvoiceForm starts returning around line 438
// It has:
/*
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit AP Invoice" : "Record AP Invoice (Vendor Bill)"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
*/

content = content.replace(
  /<Dialog open=\{open\} onOpenChange=\{onOpenChange\}>\s*<DialogContent[^>]*>\s*<DialogHeader>\s*<DialogTitle>[^<]*<\/DialogTitle>\s*<\/DialogHeader>/,
  `<div className={cn("space-y-6", !isActive && "hidden")}>`
);

content = content.replace(
  /<DialogFooter>\s*<Button variant="outline" onClick=\{[^}]+\} disabled=\{isPending\}>\s*Cancel\s*<\/Button>\s*<Button type="submit" disabled=\{isPending\}>\s*\{isPending \? \(\s*<Loader2 className="h-4 w-4 mr-2 animate-spin" \/>\s*\) : \(\s*<Check className="h-4 w-4 mr-2" \/>\s*\)\}\s*\{isEditing \? "Update Invoice" : "Record Invoice"\}\s*<\/Button>\s*<\/DialogFooter>\s*<\/DialogContent>\s*<\/Dialog>/,
  `</div>`
);

// We also need to remove 'open' and 'onOpenChange' references in SingleAPInvoiceForm.
// Wait, the regex might not match exactly.
// Let's just do a simpler replace.

fs.writeFileSync('src/components/accounting/APInvoiceForm.tsx', content);
console.log('Fixed Dialog wrappers');
