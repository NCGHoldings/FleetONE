import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Key, Clock, Copy, UserPlus, Ban, RefreshCw, Eye, EyeOff, Printer } from "lucide-react";
import { useTemporaryAccounts, TemporaryAccount } from "@/hooks/useTemporaryAccounts";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { toast } from "sonner";

interface CreatedAccountInfo {
  accountCode: string;
  email: string;
  password: string;
  validUntil: string;
  validityHours: number;
  role: string;
}

export function TemporaryAccountsSection() {
  const { accounts, loading, createAccount, revokeAccount, extendValidity } = useTemporaryAccounts();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<CreatedAccountInfo | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [validityPeriod, setValidityPeriod] = useState("24");
  const [customHours, setCustomHours] = useState("");
  const [notes, setNotes] = useState("");
  const [role, setRole] = useState("staff");

  const handleCreate = async () => {
    const hours = validityPeriod === "custom" ? parseInt(customHours) : parseInt(validityPeriod);
    if (!hours || hours <= 0) {
      toast.error('Please enter a valid validity period');
      return;
    }

    setCreating(true);
    const result = await createAccount(hours, notes || undefined, role);
    setCreating(false);

    if (result) {
      setCreatedAccount(result);
      setCreateDialogOpen(false);
      // Reset form
      setValidityPeriod("24");
      setCustomHours("");
      setNotes("");
      setRole("staff");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const copyAllCredentials = () => {
    if (!createdAccount) return;
    const text = `Account Code: ${createdAccount.accountCode}\nEmail: ${createdAccount.email}\nPassword: ${createdAccount.password}\nValid Until: ${format(new Date(createdAccount.validUntil), 'PPpp')}\nRole: ${createdAccount.role}`;
    navigator.clipboard.writeText(text);
    toast.success('All credentials copied to clipboard');
  };

  const printCredentials = () => {
    if (!createdAccount) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Temporary Account Credentials</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .card { border: 2px solid #333; padding: 20px; max-width: 400px; margin: 0 auto; }
              .title { font-size: 18px; font-weight: bold; margin-bottom: 15px; text-align: center; }
              .field { margin: 10px 0; }
              .label { font-weight: bold; color: #555; }
              .value { font-size: 14px; padding: 5px; background: #f5f5f5; border-radius: 4px; margin-top: 2px; word-break: break-all; }
              .warning { color: #dc2626; font-size: 12px; margin-top: 15px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="title">🔐 Temporary Access Credentials</div>
              <div class="field">
                <div class="label">Account Code:</div>
                <div class="value">${createdAccount.accountCode}</div>
              </div>
              <div class="field">
                <div class="label">Email:</div>
                <div class="value">${createdAccount.email}</div>
              </div>
              <div class="field">
                <div class="label">Password:</div>
                <div class="value">${createdAccount.password}</div>
              </div>
              <div class="field">
                <div class="label">Valid Until:</div>
                <div class="value">${format(new Date(createdAccount.validUntil), 'PPpp')}</div>
              </div>
              <div class="field">
                <div class="label">Role:</div>
                <div class="value">${createdAccount.role}</div>
              </div>
              <div class="warning">⚠️ Keep these credentials secure. This is a one-time display.</div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getStatusBadge = (account: TemporaryAccount) => {
    if (account.status === 'revoked') {
      return <Badge variant="destructive">Revoked</Badge>;
    }
    if (account.status === 'expired' || isPast(new Date(account.valid_until))) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
  };

  const getTimeRemaining = (validUntil: string) => {
    const date = new Date(validUntil);
    if (isPast(date)) return "Expired";
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Temporary Access Accounts
              </CardTitle>
              <CardDescription>
                Auto-generated login credentials with expiration
              </CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Temporary Account
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Temporary Access Account</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Validity Period *</Label>
                    <Select value={validityPeriod} onValueChange={setValidityPeriod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Hour</SelectItem>
                        <SelectItem value="4">4 Hours</SelectItem>
                        <SelectItem value="24">1 Day (24 hours)</SelectItem>
                        <SelectItem value="72">3 Days</SelectItem>
                        <SelectItem value="168">7 Days</SelectItem>
                        <SelectItem value="720">30 Days</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {validityPeriod === "custom" && (
                    <div>
                      <Label>Custom Hours</Label>
                      <Input
                        type="number"
                        value={customHours}
                        onChange={(e) => setCustomHours(e.target.value)}
                        placeholder="Enter hours"
                        min="1"
                      />
                    </div>
                  )}

                  <div>
                    <Label>Role</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="driver">Driver</SelectItem>
                        <SelectItem value="conductor">Conductor</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Purpose of this account..."
                      rows={2}
                    />
                  </div>

                  <Button onClick={handleCreate} className="w-full" disabled={creating}>
                    {creating ? "Creating..." : "Generate Credentials"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">Loading...</div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No temporary accounts created yet</p>
              <p className="text-sm">Click "Create Temporary Account" to generate auto-login credentials</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">{account.account_code}</span>
                      {getStatusBadge(account)}
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">{account.generated_email}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {getTimeRemaining(account.valid_until)}
                      </span>
                      {account.login_count > 0 && (
                        <span>Logins: {account.login_count}</span>
                      )}
                      {account.notes && (
                        <span className="truncate max-w-[150px]">{account.notes}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {account.status === 'active' && !isPast(new Date(account.valid_until)) && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => extendValidity(account.id, 24)}
                          title="Extend by 24 hours"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => revokeAccount(account.id)}
                          title="Revoke access"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Created Account Credentials Dialog */}
      <Dialog open={!!createdAccount} onOpenChange={() => setCreatedAccount(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-green-500" />
              Account Created Successfully
            </DialogTitle>
          </DialogHeader>
          {createdAccount && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200 font-medium mb-2">
                  ⚠️ Save these credentials now! The password will not be shown again.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Account Code</Label>
                  <div className="flex items-center gap-2">
                    <Input value={createdAccount.accountCode} readOnly className="font-mono" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(createdAccount.accountCode, 'Account code')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <div className="flex items-center gap-2">
                    <Input value={createdAccount.email} readOnly className="font-mono text-sm" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(createdAccount.email, 'Email')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Password</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={createdAccount.password}
                      readOnly
                      type={showPassword ? "text" : "password"}
                      className="font-mono"
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(createdAccount.password, 'Password')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Valid Until</Label>
                    <div className="text-sm font-medium">
                      {format(new Date(createdAccount.validUntil), 'PPpp')}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Role</Label>
                    <Badge variant="secondary" className="capitalize">{createdAccount.role}</Badge>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={copyAllCredentials}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All
                </Button>
                <Button variant="outline" className="flex-1" onClick={printCredentials}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
