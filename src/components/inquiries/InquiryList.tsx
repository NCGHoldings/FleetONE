import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, UserPlus, Search } from "lucide-react";
import { format } from "date-fns";
import { InquiryDetailsModal } from "./InquiryDetailsModal";
import { CustomerClassBadge } from "./CustomerClassBadge";

interface InquiryListProps {
  filter: "all" | "yutong" | "sinotruck" | "manual";
  customerClassFilter?: "all" | "C0" | "C1" | "C2" | "C3";
}

export const InquiryList = ({ filter, customerClassFilter = "all" }: InquiryListProps) => {
  const [search, setSearch] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState<string | null>(null);

  const { data: inquiries, isLoading, refetch } = useQuery({
    queryKey: ["inquiries", filter, customerClassFilter, search],
    queryFn: async () => {
      let query = supabase
        .from("vehicle_inquiries")
        .select(`
          *,
          assigned_profile:profiles!vehicle_inquiries_assigned_to_fkey(first_name, last_name)
        `)
        .order("created_at", { ascending: false });

      // Apply product type filters
      if (filter === "yutong") {
        query = query.eq("product_type", "yutong");
      } else if (filter === "sinotruck") {
        query = query.eq("product_type", "sinotruck");
      } else if (filter === "manual") {
        query = query.in("source", ["phone", "walk-in"]);
      }

      // Apply customer class filter
      if (customerClassFilter && customerClassFilter !== "all") {
        query = query.eq("customer_class", customerClassFilter);
      }

      if (search) {
        query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,inquiry_number.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      new: "default",
      contacted: "secondary",
      qualified: "outline",
      converted: "default",
      lost: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status.toUpperCase()}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: "bg-red-500",
      high: "bg-orange-500",
      medium: "bg-yellow-500",
      low: "bg-blue-500",
    };
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${colors[priority]}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const getSourceIcon = (source: string) => {
    const icons: Record<string, string> = {
      website: "🌐",
      phone: "📞",
      whatsapp: "💬",
      "walk-in": "🚶",
      referral: "👥",
      other: "📝",
    };
    return icons[source] || "📝";
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading inquiries...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer name, phone, or inquiry number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Inquiry #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inquiries?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground">
                  No inquiries found
                </TableCell>
              </TableRow>
            ) : (
              inquiries?.map((inquiry: any) => (
                <TableRow key={inquiry.id}>
                  <TableCell className="font-medium">{inquiry.inquiry_number}</TableCell>
                  <TableCell>{format(new Date(inquiry.created_at), "MMM dd, yyyy")}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{inquiry.customer_name}</div>
                      <div className="text-sm text-muted-foreground">{inquiry.customer_phone}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <CustomerClassBadge customerClass={inquiry.customer_class} showLabel={false} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{inquiry.product_type.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{inquiry.interested_model || "-"}</TableCell>
                  <TableCell>
                    <span className="text-lg" title={inquiry.source}>
                      {getSourceIcon(inquiry.source)}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(inquiry.status)}</TableCell>
                  <TableCell>{getPriorityBadge(inquiry.priority)}</TableCell>
                  <TableCell>
                    {inquiry.assigned_profile ? (
                      <div className="text-sm">
                        {inquiry.assigned_profile.first_name} {inquiry.assigned_profile.last_name}
                      </div>
                    ) : (
                      <Badge variant="outline">Unassigned</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedInquiry(inquiry.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedInquiry && (
        <InquiryDetailsModal
          inquiryId={selectedInquiry}
          open={!!selectedInquiry}
          onClose={() => setSelectedInquiry(null)}
          onRefresh={refetch}
        />
      )}
    </div>
  );
};