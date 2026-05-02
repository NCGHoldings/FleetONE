import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const INTERNAL_COMPANIES = [
  // Lyceum & Education Sector
  { name: 'LYCEUM GLOBAL HOLDINGS (PRIVATE) LIMITED', group: 'Lyceum & Education Sector' },
  { name: 'LYCEUM EDUCATION HOLDINGS (PRIVATE) LIMITED', group: 'Lyceum & Education Sector' },
  { name: 'LYCEUM LEAF SCHOOL (PRIVATE) LIMITED', group: 'Lyceum & Education Sector' },
  { name: 'LYCEUM INTERNATIONAL SCHOOL (PRIVATE) LIMITED', group: 'Lyceum & Education Sector' },
  { name: 'LYCEUM DAY CARE (PRIVATE) LIMITED', group: 'Lyceum & Education Sector' },
  { name: 'THE LYCEUM CAMPUS (PRIVATE) LIMITED', group: 'Lyceum & Education Sector' },
  { name: 'LYCEUM PLACEMENTS (PRIVATE) LIMITED', group: 'Lyceum & Education Sector' },
  { name: 'LYCEUM GUARDIAN (PRIVATE) LIMITED', group: 'Lyceum & Education Sector' },
  { name: 'LYCEUM ASSESSMENTS (PRIVATE) LIMITED', group: 'Lyceum & Education Sector' },
  { name: 'THE LYCEUM ACADEMY (PRIVATE) LIMITED', group: 'Lyceum & Education Sector' },
  { name: 'LYCEUM COLLECTION (PRIVATE) LIMITED', group: 'Lyceum & Education Sector' },

  // NCG Holdings & Core Operations
  { name: 'N C G HOLDINGS (PRIVATE) LIMITED', group: 'NCG Holdings & Core Operations' },
  { name: 'N C G SPEED HOLDINGS (PRIVATE) LIMITED', group: 'NCG Holdings & Core Operations' },
  { name: 'N C G AUTOMOTIVE SOLUTIONS (PRIVATE) LIMITED', group: 'NCG Holdings & Core Operations' },
  { name: 'N C G EXPRESS (PRIVATE) LIMITED', group: 'NCG Holdings & Core Operations' },
  { name: 'NCG FLEET MANAGEMENT (PRIVATE) LIMITED', group: 'NCG Holdings & Core Operations' },
  { name: 'N C G SPARES (PRIVATE) LIMITED', group: 'NCG Holdings & Core Operations' },
  { name: 'NCG Maxload (Private) Limited', group: 'NCG Holdings & Core Operations' },
  { name: 'NCG READ HOLDINGS (PRIVATE) LIMITED', group: 'NCG Holdings & Core Operations' },
  { name: 'NCG BUILD HOLDINGS (PRIVATE) LIMITED', group: 'NCG Holdings & Core Operations' },
  { name: 'NCG SERENGETI PROPERTY MANAGEMENT (PRIVATE) LIMITED', group: 'NCG Holdings & Core Operations' },
  { name: 'NCG WAREHOUSE SOLUTIONS (PRIVATE) LIMITED', group: 'NCG Holdings & Core Operations' },
  { name: 'NCG TECH HOLDINGS (PRIVATE) LIMITED', group: 'NCG Holdings & Core Operations' },
  { name: 'NCG KIT HOLDINGS (PRIVATE) LIMITED', group: 'NCG Holdings & Core Operations' },

  // NextGen & Specialized Services
  { name: 'NEXTGEN HUMAN CAPITAL SOLUTIONS (PRIVATE) LIMITED', group: 'NextGen & Specialized Services' },
  { name: 'NEXTGEN PUBLICATIONS (PRIVATE) LIMITED', group: 'NextGen & Specialized Services' },
  { name: 'NEXTGEN LIBRARY SOLUTIONS (PRIVATE) LIMITED', group: 'NextGen & Specialized Services' },
  { name: 'NEXTGEN FACILITY MANAGEMENT (PRIVATE) LIMITED', group: 'NextGen & Specialized Services' },
  { name: 'N C G Facility Management (Private) Limited', group: 'NextGen & Specialized Services' },
  { name: 'NEXTGEN SHIELD (PRIVATE) LIMITED', group: 'NextGen & Specialized Services' },
  { name: 'N C G GREEN ENERGY (PRIVATE) LIMITED', group: 'NextGen & Specialized Services' },

  // Heracle (Sports, Health & Wellness)
  { name: 'HERACLE HOLDINGS (PRIVATE) LIMITED', group: 'Heracle (Sports, Health & Wellness)' },
  { name: 'HERACLE SPORTS EDUCATION (PRIVATE) LIMITED', group: 'Heracle (Sports, Health & Wellness)' },
  { name: 'HERACLE NUTRITION (PRIVATE) LIMITED', group: 'Heracle (Sports, Health & Wellness)' },
  { name: 'HERCLE EARTH (PRIVATE) LIMITED', group: 'Heracle (Sports, Health & Wellness)' },
  { name: 'HERACLE CARE & WELLNESS (PRIVATE) LIMITED', group: 'Heracle (Sports, Health & Wellness)' },
  { name: 'Heracle Sports Cafe (Private) Limited', group: 'Heracle (Sports, Health & Wellness)' },
  { name: 'Heracle Fresh (Private) Limited', group: 'Heracle (Sports, Health & Wellness)' },
  { name: 'Heracle Active (Private) Limited', group: 'Heracle (Sports, Health & Wellness)' },
  { name: 'Heracle Adventure (Private) Limited', group: 'Heracle (Sports, Health & Wellness)' },
  { name: 'ZEUS GYMNASIUM AND REHABILITATION (PRIVATE) LIMITED', group: 'Heracle (Sports, Health & Wellness)' },

  // Technology, Media & Events
  { name: 'LEDGERWALL (PRIVATE) LIMITED', group: 'Technology, Media & Events' },
  { name: 'ZUSE TECHNOLOGIES (PRIVATE) LIMITED', group: 'Technology, Media & Events' },
  { name: 'BITROCK (PRIVATE) LIMITED', group: 'Technology, Media & Events' },
  { name: 'DREAM TEAM MEDIA (PRIVATE) LIMITED', group: 'Technology, Media & Events' },
  { name: 'DREAM TEAM EVENTS (PRIVATE) LIMITED', group: 'Technology, Media & Events' },
  { name: 'EventiQ (Private) Limited', group: 'Technology, Media & Events' },

  // Other Ventures
  { name: 'JOURNEY BY DESIGN (PRIVATE) LIMITED', group: 'Other Ventures' },
  { name: 'THE BOOK STUDIO (PRIVATE) LIMITED', group: 'Other Ventures' },
  { name: 'VEBUILD INNOVATIONS BY NCG (PRIVATE) LIMITED', group: 'Other Ventures' },
  { name: 'THE UNIFORM HUB (PRIVATE) LIMITED', group: 'Other Ventures' },
  { name: 'L Y F E KITCHEN (PRIVATE) LIMITED', group: 'Other Ventures' },
  { name: 'Leaf & Bean (Private) Limited', group: 'Other Ventures' },
  { name: 'Medivex Biotech (Private) Limited', group: 'Other Ventures' },
];

export function CustomerDetailsSection() {
  const form = useFormContext();
  const hireType = form.watch('hireType');

  // Group companies for the dropdown
  const groupedCompanies = INTERNAL_COMPANIES.reduce((acc, company) => {
    if (!acc[company.group]) {
      acc[company.group] = [];
    }
    acc[company.group].push(company.name);
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <Card className="shadow-sm border-2 border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 md:px-6 pt-3 sm:pt-4">
        <CardTitle className="text-sm sm:text-base md:text-lg">Customer & Hire Details</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 md:p-6">
        <FormField
          control={form.control}
          name="hireType"
          render={({ field }) => (
            <FormItem className="sm:col-span-2 mb-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <FormLabel className="text-sm font-semibold text-primary">Hire Type *</FormLabel>
              <Select onValueChange={(val) => {
                field.onChange(val);
                // Clear company name if switching from internal to outside, or outside to internal
                if ((val === 'Outside' && (hireType === 'Internal' || hireType === 'Lyceum')) || 
                    ((val === 'Internal' || val === 'Lyceum') && hireType === 'Outside')) {
                  form.setValue('companyName', '');
                }
              }} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select hire type..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Outside" className="font-medium">Outside (External Customer)</SelectItem>
                  <SelectItem value="Lyceum" className="font-medium">Lyceum</SelectItem>
                  <SelectItem value="Internal" className="font-medium">Internal (NCG / Subsidiaries)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs sm:text-sm">
                Company {(hireType === 'Lyceum' || hireType === 'Internal') ? '*' : '(Optional)'}
              </FormLabel>
              {(hireType === 'Internal' || hireType === 'Lyceum') ? (
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select internal company..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[300px]">
                    {Object.entries(groupedCompanies).map(([group, companies]) => (
                      <SelectGroup key={group}>
                        <SelectLabel className="font-semibold text-slate-800 bg-slate-50">{group}</SelectLabel>
                        {companies.map(name => (
                          <SelectItem key={name} value={name} className="ml-2 text-sm">{name}</SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <FormControl>
                  <Input placeholder="Company name" {...field} className="h-9 text-sm" />
                </FormControl>
              )}
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
