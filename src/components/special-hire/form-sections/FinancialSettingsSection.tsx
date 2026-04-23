import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Users, TrendingUp, DollarSign, Plus, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface FinancialSettingsSectionProps {
  referralAgents: any[];
  selectedAgent: any;
  setShowAddAgentModal: (show: boolean) => void;
  handleAgentSelect: (agentId: string) => void;
  costData: any;
}

export function FinancialSettingsSection({
  referralAgents,
  selectedAgent,
  setShowAddAgentModal,
  handleAgentSelect,
  costData
}: FinancialSettingsSectionProps) {
  const form = useFormContext();

  return (
    <Card className="shadow-sm border-2 border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
      <CardContent className="p-4 sm:p-6 md:p-8 space-y-8">
        {/* Commission and Discount Settings */}
        <div className="space-y-6">
          <div className="text-xl font-bold text-foreground pb-4 border-b">
            Commission & Discount Settings
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="commissionPct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Total Commission (%)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="5.0"
                      className="h-10 text-base"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                  <div className="text-xs text-muted-foreground">
                    Commission that company pays
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="commissionPassThroughPct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Pass to Customer (%)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max={form.watch('commissionPct') || 100}
                      placeholder="0.0"
                      className="h-10 text-base"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                  <div className="text-xs text-muted-foreground">
                    Commission added to customer bill (max: {form.watch('commissionPct') || 0}%)
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discountType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">Discount Type</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('discountPct', 0);
                      form.setValue('discountAmount', 0);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10 text-base">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="amount">Fixed Amount (LKR)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('discountType') === 'percentage' ? (
              <FormField
                control={form.control}
                name="discountPct"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">
                      Discount Percentage (%)
                      {field.value > 0 && (
                        <Badge variant="outline" className="ml-2 text-xs text-orange-600 border-orange-300">
                          Admin Approval Required
                        </Badge>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="0.0"
                        className="h-10 text-base"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                    <div className="text-xs text-muted-foreground">
                      {field.value > 0
                        ? `${field.value}% discount will be applied (requires admin approval)`
                        : 'Percentage discount to subtract from total'
                      }
                    </div>
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="discountAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">
                      Discount Amount (LKR)
                      {field.value > 0 && (
                        <Badge variant="outline" className="ml-2 text-xs text-orange-600 border-orange-300">
                          Admin Approval Required
                        </Badge>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="h-10 text-base"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                    <div className="text-xs text-muted-foreground">
                      {field.value > 0
                        ? `LKR ${field.value.toLocaleString()} discount will be applied (requires admin approval)`
                        : 'Fixed amount discount to subtract from total'
                      }
                    </div>
                  </FormItem>
                )}
              />
            )}
          </div>

          {/* Referral Agent Section */}
          <div className="col-span-2 border-t pt-8 mt-6 bg-muted/20 -mx-6 px-6 pb-6 rounded-lg">
            <div className="flex items-center gap-3 mb-6">
              <Users className="h-6 w-6 text-primary" />
              <div className="text-lg font-bold">Referral Agent</div>
              <div className="text-sm text-muted-foreground font-medium">(Optional)</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Agent Selector - Full width on large screens */}
              <div className="lg:col-span-3">
                <FormField
                  control={form.control}
                  name="referralAgentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Select Agent</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          if (value === 'add-new') {
                            setShowAddAgentModal(true);
                          } else {
                            field.onChange(value);
                            handleAgentSelect(value);
                          }
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 text-base">
                            <SelectValue placeholder="Choose an agent or add new" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="add-new">
                            <div className="flex items-center gap-2 py-1 font-medium text-primary">
                              <Plus className="h-4 w-4" />
                              Add New Agent
                            </div>
                          </SelectItem>
                          {referralAgents.length > 0 && (
                            <>
                              <Separator className="my-1" />
                              {referralAgents.map((agent) => (
                                <SelectItem key={agent.id} value={agent.id}>
                                  <div className="py-1">
                                    <div className="font-semibold text-base">{agent.agent_name}</div>
                                    <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                      <span>{agent.phone || 'No phone'}</span>
                                      <span>•</span>
                                      <span className="font-medium">{agent.total_referrals} referrals</span>
                                      <span>•</span>
                                      <span className="font-medium">LKR {agent.total_commission_earned?.toLocaleString() || '0'}</span>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Commission Percentage */}
              <FormField
                control={form.control}
                name="referralCommissionPct"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Commission %</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="3.0"
                        className="h-12 text-base font-medium"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        disabled={!form.watch('referralAgentId')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Calculated Commission Amount (Read-only) */}
              <FormItem className="lg:col-span-2">
                <FormLabel className="text-base font-semibold">Commission Amount</FormLabel>
                <Input
                  type="text"
                  value={
                    form.watch('referralAgentId') && costData?.customerTotalWithFuel
                      ? `LKR ${Math.round((costData.customerTotalWithFuel * form.watch('referralCommissionPct')) / 100).toLocaleString()}`
                      : 'LKR 0'
                  }
                  disabled
                  className="h-12 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-lg font-bold text-green-700 dark:text-green-400"
                />
                <div className="text-sm text-muted-foreground mt-2 font-medium">
                  Auto-calculated from total revenue
                </div>
              </FormItem>
            </div>

            {/* Show Agent Stats */}
            {selectedAgent && form.watch('referralAgentId') && (
              <div className="mt-8 p-6 bg-white dark:bg-slate-900 rounded-xl border-2 shadow-sm">
                <div className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-6">
                  Agent Performance History
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Stat 1 - Total Trips */}
                  <div className="space-y-3 p-5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border-2 border-blue-200/70 dark:border-blue-800/50">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <TrendingUp className="h-5 w-5" />
                      <span className="text-xs font-bold uppercase tracking-wide">Total Trips</span>
                    </div>
                    <div className="text-4xl font-bold tracking-tight text-blue-900 dark:text-blue-100">
                      {selectedAgent.total_referrals}
                    </div>
                    <div className="text-base font-medium text-blue-700 dark:text-blue-300">
                      Trips Referred
                    </div>
                  </div>

                  {/* Stat 2 - Commission Earned */}
                  <div className="space-y-3 p-5 rounded-lg bg-green-50/70 dark:bg-green-950/30 border-2 border-green-200/70 dark:border-green-800/50">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <DollarSign className="h-5 w-5" />
                      <span className="text-xs font-bold uppercase tracking-wide">Earned</span>
                    </div>
                    <div className="text-3xl font-bold tracking-tight text-green-900 dark:text-green-100">
                      LKR {selectedAgent.total_commission_earned?.toLocaleString() || '0'}
                    </div>
                    <div className="text-base font-medium text-green-700 dark:text-green-300">
                      Total Commission
                    </div>
                  </div>
                  {/* Stat 3 - Phone */}
                  <div className="space-y-3 p-5 rounded-lg bg-orange-50/70 dark:bg-orange-950/30 border-2 border-orange-200/70 dark:border-orange-800/50">
                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                      <Phone className="h-5 w-5" />
                      <span className="text-xs font-bold uppercase tracking-wide">Contact</span>
                    </div>
                    <div className="text-2xl font-bold tracking-tight text-orange-900 dark:text-orange-100 truncate">
                      {selectedAgent.phone || 'N/A'}
                    </div>
                    <div className="text-base font-medium text-orange-700 dark:text-orange-300">
                      Phone Number
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
