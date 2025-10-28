import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Calendar } from 'lucide-react';
import type { GovernanceOccurrence } from '@/hooks/useGovernanceOccurrences';

interface ListViewProps {
  occurrences: GovernanceOccurrence[];
  onOccurrenceClick: (occurrence: GovernanceOccurrence) => void;
}

const statusColors: Record<string, string> = {
  Planned: 'bg-blue-500',
  Due: 'bg-yellow-500',
  Submitted: 'bg-green-500',
  Completed: 'bg-gray-400',
  Skipped: 'bg-red-500',
  'N/A': 'bg-gray-300',
};

export const ListView = ({ occurrences, onOccurrenceClick }: ListViewProps) => {
  if (occurrences.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No occurrences found for the selected filters
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>SBU</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Owner</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {occurrences.map(occ => (
            <TableRow
              key={occ.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onOccurrenceClick(occ)}
            >
              <TableCell className="font-medium">
                {format(new Date(occ.scheduled_date), 'MMM dd, yyyy')}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {occ.governance_item.type === 'report' ? (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  )}
                  {occ.governance_item.title}
                </div>
              </TableCell>
              <TableCell className="capitalize">{occ.governance_item.type}</TableCell>
              <TableCell>{occ.governance_item.companies.name}</TableCell>
              <TableCell>{occ.governance_item.sbus?.name || '-'}</TableCell>
              <TableCell>{occ.governance_item.category}</TableCell>
              <TableCell>
                <Badge className={statusColors[occ.status] || 'bg-gray-400'}>
                  {occ.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {occ.governance_item.owner_name || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
