/**
 * Transaction Fee Settings Component
 * 
 * Admin UI to configure the transaction fee/commission system.
 * - Master enable/disable toggle
 * - Fee percentage control
 * - GL account mapping
 * - Module selection
 * - Fee log with summary stats
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Percent, ToggleLeft, DollarSign, TrendingUp, FileText, Zap } from 'lucide-react';
import { SearchableFinanceAccountSelector } from './SearchableFinanceAccountSelector';
import { useCompany } from '@/contexts/CompanyContext';
import {
    useTransactionFeeSettings,
    useSaveTransactionFeeSettings,
    useTransactionFeeLog,
    useTransactionFeeSummary,
    type TransactionFeeSettings as TFSettings,
} from '@/hooks/useTransactionFees';

interface GLAccount {
    id: string;
    account_code: string;
    account_name: string;
    account_type: string;
}

const AVAILABLE_MODULES = [
    { value: 'all', label: 'All Modules' },
    { value: 'school_bus', label: 'School Bus' },
    { value: 'public_bus', label: 'Public Bus' },
    { value: 'special_hire', label: 'Special Hire' },
    { value: 'yutong', label: 'Yutong' },
    { value: 'sinotruck', label: 'Sinotruck' },
    { value: 'light_vehicle', label: 'Light Vehicle' },
    { value: 'ncg_express', label: 'NCG Express' },
    { value: 'ar_payment', label: 'AR Payments' },
    { value: 'ap_payment', label: 'AP Payments' },
];

export function TransactionFeeSettings() {
    const { selectedCompanyId, companyName } = useCompany();
    const [accounts, setAccounts] = useState<GLAccount[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(true);

    // Hooks
    const { data: settings, isLoading: settingsLoading } = useTransactionFeeSettings();
    const saveSettings = useSaveTransactionFeeSettings();
    const { data: feeLog, isLoading: logLoading } = useTransactionFeeLog(20);
    const { data: summary } = useTransactionFeeSummary();

    // Local state for editing
    const [localSettings, setLocalSettings] = useState<TFSettings>({
        is_enabled: false,
        fee_percentage: 0.5,
        fee_revenue_account_id: null,
        fee_receivable_account_id: null,
        auto_post_to_gl: true,
        gl_prefix: 'TXFEE',
        applicable_modules: ['all'],
    });

    // Sync remote settings to local state
    useEffect(() => {
        if (settings) {
            setLocalSettings(settings);
        }
    }, [settings]);

    // Load chart of accounts
    useEffect(() => {
        if (selectedCompanyId) {
            loadAccounts(selectedCompanyId);
        }
    }, [selectedCompanyId]);

    const loadAccounts = async (companyId: string) => {
        setLoadingAccounts(true);
        try {
            const { data, error } = await supabase
                .from('chart_of_accounts')
                .select('id, account_code, account_name, account_type')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('account_code');

            if (error) throw error;
            setAccounts(data || []);
        } catch (error) {
            console.error('Error loading accounts:', error);
        } finally {
            setLoadingAccounts(false);
        }
    };

    const handleSave = () => {
        saveSettings.mutate(localSettings);
    };

    const handleModuleToggle = (moduleValue: string) => {
        const current = localSettings.applicable_modules;

        if (moduleValue === 'all') {
            // Toggle all
            setLocalSettings({ ...localSettings, applicable_modules: current.includes('all') ? [] : ['all'] });
            return;
        }

        // Remove 'all' if selecting specific modules
        let updated = current.filter(m => m !== 'all');

        if (updated.includes(moduleValue)) {
            updated = updated.filter(m => m !== moduleValue);
        } else {
            updated.push(moduleValue);
        }

        // If all specific modules are selected, switch to 'all'
        const allSpecific = AVAILABLE_MODULES.filter(m => m.value !== 'all').map(m => m.value);
        if (allSpecific.every(m => updated.includes(m))) {
            updated = ['all'];
        }

        setLocalSettings({ ...localSettings, applicable_modules: updated });
    };

    if (!selectedCompanyId) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center p-6 text-muted-foreground">
                    Select a company to configure Transaction Fee settings
                </CardContent>
            </Card>
        );
    }

    if (settingsLoading || loadingAccounts) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Master Control Card */}
            <Card className={localSettings.is_enabled ? 'border-green-500/30 bg-green-500/5' : ''}>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Percent className="h-5 w-5" />
                            Transaction Fee System {companyName && `(${companyName})`}
                        </span>
                        <div className="flex items-center gap-3">
                            <Badge variant={localSettings.is_enabled ? "default" : "secondary"}>
                                {localSettings.is_enabled ? '● Active' : '○ Inactive'}
                            </Badge>
                            <Switch
                                checked={localSettings.is_enabled}
                                onCheckedChange={(checked) => setLocalSettings({ ...localSettings, is_enabled: checked })}
                            />
                        </div>
                    </CardTitle>
                    <CardDescription>
                        Automatically charge a commission fee on payment transactions across modules.
                        Fees are tracked and posted to the General Ledger.
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Configuration Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <ToggleLeft className="h-5 w-5" />
                        Fee Configuration
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Fee Percentage */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Fee Percentage (%)</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={localSettings.fee_percentage}
                                    onChange={(e) => setLocalSettings({ ...localSettings, fee_percentage: parseFloat(e.target.value) || 0 })}
                                    className="max-w-[120px]"
                                />
                                <span className="text-sm text-muted-foreground">
                                    e.g. 0.5% of LKR 100,000 = LKR 500
                                </span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>GL Entry Prefix</Label>
                            <Input
                                value={localSettings.gl_prefix}
                                onChange={(e) => setLocalSettings({ ...localSettings, gl_prefix: e.target.value.toUpperCase() })}
                                className="max-w-[120px]"
                                placeholder="TXFEE"
                            />
                            <p className="text-xs text-muted-foreground">Prefix for journal entry numbers</p>
                        </div>
                    </div>

                    <Separator />

                    {/* GL Account Mapping */}
                    <div>
                        <h3 className="text-base font-medium mb-3 flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-primary" />
                            GL Account Mapping
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Fee Receivable Account (Asset - DR)</Label>
                                <p className="text-xs text-muted-foreground">Debited when fee is charged</p>
                                <SearchableFinanceAccountSelector
                                    value={localSettings.fee_receivable_account_id}
                                    onValueChange={(v) => setLocalSettings({ ...localSettings, fee_receivable_account_id: v })}
                                    accounts={accounts}
                                    placeholder="Select Fee Receivable Account"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Fee Revenue Account (Revenue - CR)</Label>
                                <p className="text-xs text-muted-foreground">Credited when fee is charged</p>
                                <SearchableFinanceAccountSelector
                                    value={localSettings.fee_revenue_account_id}
                                    onValueChange={(v) => setLocalSettings({ ...localSettings, fee_revenue_account_id: v })}
                                    accounts={accounts}
                                    placeholder="Select Fee Revenue Account"
                                />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Auto-Post Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="flex items-center gap-2">
                                <Zap className="h-4 w-4" />
                                Auto-Post to GL
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Automatically create journal entries when fees are charged
                            </p>
                        </div>
                        <Switch
                            checked={localSettings.auto_post_to_gl}
                            onCheckedChange={(checked) => setLocalSettings({ ...localSettings, auto_post_to_gl: checked })}
                        />
                    </div>

                    <Separator />

                    {/* Module Selection */}
                    <div>
                        <h3 className="text-base font-medium mb-3">Applicable Modules</h3>
                        <p className="text-xs text-muted-foreground mb-3">
                            Select which modules should be charged transaction fees
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {AVAILABLE_MODULES.map((mod) => {
                                const isActive = localSettings.applicable_modules.includes(mod.value) ||
                                    (mod.value !== 'all' && localSettings.applicable_modules.includes('all'));
                                return (
                                    <Badge
                                        key={mod.value}
                                        variant={isActive ? "default" : "outline"}
                                        className={`cursor-pointer transition-all ${isActive ? 'bg-primary hover:bg-primary/80' : 'hover:bg-primary/10'}`}
                                        onClick={() => handleModuleToggle(mod.value)}
                                    >
                                        {mod.label}
                                    </Badge>
                                );
                            })}
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSave} disabled={saveSettings.isPending}>
                            {saveSettings.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            Save Settings
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Stats */}
            {summary && summary.transactionCount > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <TrendingUp className="h-5 w-5" />
                            Fee Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <p className="text-xs text-blue-400">Total Fees Earned</p>
                                <p className="text-lg font-bold text-blue-300">
                                    LKR {summary.totalFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                <p className="text-xs text-green-400">Posted to GL</p>
                                <p className="text-lg font-bold text-green-300">
                                    LKR {summary.postedFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                <p className="text-xs text-orange-400">Pending</p>
                                <p className="text-lg font-bold text-orange-300">
                                    LKR {summary.pendingFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                <p className="text-xs text-purple-400">Total Transactions</p>
                                <p className="text-lg font-bold text-purple-300">{summary.transactionCount}</p>
                            </div>
                        </div>

                        {/* By Module Breakdown */}
                        {Object.keys(summary.byModule).length > 0 && (
                            <div className="mt-4">
                                <p className="text-sm font-medium mb-2">Fees by Module</p>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(summary.byModule).map(([mod, amount]) => (
                                        <Badge key={mod} variant="outline" className="text-xs">
                                            {mod.replace(/_/g, ' ')}: LKR {(amount as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Recent Fee Log */}
            {feeLog && feeLog.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <FileText className="h-5 w-5" />
                            Recent Transaction Fees
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-2 px-2">Date</th>
                                        <th className="text-left py-2 px-2">Module</th>
                                        <th className="text-right py-2 px-2">Transaction</th>
                                        <th className="text-right py-2 px-2">Fee %</th>
                                        <th className="text-right py-2 px-2">Fee Amount</th>
                                        <th className="text-center py-2 px-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {feeLog.map((fee) => (
                                        <tr key={fee.id} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="py-2 px-2 text-muted-foreground">
                                                {new Date(fee.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="py-2 px-2">
                                                {fee.source_module.replace(/_/g, ' ')}
                                            </td>
                                            <td className="py-2 px-2 text-right">
                                                LKR {fee.transaction_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-2 px-2 text-right">{fee.fee_percentage}%</td>
                                            <td className="py-2 px-2 text-right font-medium">
                                                LKR {fee.fee_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-2 px-2 text-center">
                                                <Badge variant={fee.status === 'posted' ? 'default' : fee.status === 'pending' ? 'secondary' : 'outline'} className="text-xs">
                                                    {fee.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
