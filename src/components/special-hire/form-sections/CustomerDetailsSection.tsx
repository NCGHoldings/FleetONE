import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function CustomerDetailsSection() {
  const form = useFormContext();

  return (
    <Card className="shadow-sm border-2 border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 md:px-6 pt-3 sm:pt-4">
        <CardTitle className="text-sm sm:text-base md:text-lg">Customer Details</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 md:p-6">
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs sm:text-sm">Company (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Company name" {...field} className="h-9 text-sm" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="customerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs sm:text-sm">Customer Name *</FormLabel>
              <FormControl>
                <Input placeholder="Customer name" {...field} className="h-9 text-sm" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="customerPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs sm:text-sm">Phone *</FormLabel>
              <FormControl>
                <Input placeholder="Phone number" {...field} className="h-9 text-sm" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="customerEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs sm:text-sm">Email (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Email address" {...field} className="h-9 text-sm" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="sm:col-span-2">
          <FormField
            control={form.control}
            name="specialRequest"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs sm:text-sm">Special Request</FormLabel>
                <FormControl>
                  <Textarea placeholder="Any special requirements..." {...field} className="min-h-[60px] sm:min-h-[80px] resize-none text-sm" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
