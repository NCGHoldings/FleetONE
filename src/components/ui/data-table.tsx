import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  PaginationState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Filter, Download, Eye, Settings } from "lucide-react";
import { EnhancedSearch } from "@/components/ui/enhanced-search";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import "@/styles/professional-erp.css";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchKeys?: string[];
  title?: string;
  onExport?: () => void;
  onAdd?: () => void;
  customSearch?: (data: TData[], query: string) => TData[];
  customFilter?: (data: TData[]) => TData[];
  onDateRangeChange?: (range: { from: Date; to: Date } | undefined) => void;
  editableFields?: string[];
  onCellEdit?: (rowId: string, field: string, value: any) => Promise<void>;
  enableColumnFilters?: boolean;
  variant?: "default" | "professional";
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchKeys = [],
  title,
  onExport,
  onAdd,
  customSearch,
  customFilter,
  onDateRangeChange,
  editableFields = [],
  onCellEdit,
  enableColumnFilters = false,
  variant = "default",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [editingCell, setEditingCell] = React.useState<{ rowId: string; field: string } | null>(null);
  const [editingValue, setEditingValue] = React.useState<string>("");

  // Apply custom filtering and search
  const filteredData = React.useMemo(() => {
    let result = data;
    
    // Apply custom filter first
    if (customFilter) {
      result = customFilter(result);
    }
    
    // Apply custom search
    if (globalFilter && customSearch) {
      result = customSearch(result, globalFilter);
    }
    
    return result;
  }, [data, customFilter, customSearch, globalFilter]);

  const handleCellEdit = (rowId: string, field: string, currentValue: any) => {
    setEditingCell({ rowId, field });
    setEditingValue(String(currentValue || ""));
  };

  const handleSaveEdit = async () => {
    if (!editingCell || !onCellEdit) return;
    
    try {
      await onCellEdit(editingCell.rowId, editingCell.field, editingValue);
      setEditingCell(null);
      setEditingValue("");
    } catch (error) {
      console.error("Failed to save edit:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditingValue("");
  };

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
    },
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {title && <h2 className="text-2xl font-bold text-foreground">{title}</h2>}
        </div>
        <div className="flex items-center gap-2">
          {onExport && (
            <Button variant="outline" onClick={onExport} className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          )}
          {onAdd && (
            <Button onClick={onAdd} className="gap-2">
              Add New
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          {customSearch && (
            <EnhancedSearch
              onSearch={setGlobalFilter}
              searchKeys={searchKeys}
              className="max-w-sm"
            />
          )}
          
          {onDateRangeChange && (
            <DateRangePicker
              onDateRangeChange={onDateRangeChange}
              className="max-w-sm"
            />
          )}
          
          {!customSearch && !onDateRangeChange && searchKey && (
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={`Search ${searchKey}...`}
                value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
                onChange={(event) => {
                  const column = table.getColumn(searchKey);
                  if (column) {
                    column.setFilterValue(event.target.value);
                  }
                }}
                className="pl-10"
              />
            </div>
          )}
        </div>

        {/* Column Visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Eye className="w-4 h-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className={`rounded-lg border border-border/50 bg-card overflow-hidden ${variant === 'professional' ? 'erp-table-professional' : ''}`}>
        <div className="overflow-x-auto">
          <Table className={`w-full ${variant === 'professional' ? 'erp-table-professional' : ''}`}>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-border/50 bg-muted/50">
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    return (
                      <TableHead 
                        key={header.id} 
                        className={`
                          ${variant === 'professional' ? 'font-bold' : 'font-semibold'} 
                          text-foreground/90 px-4 py-3 text-left
                          ${canSort ? 'cursor-pointer hover:bg-muted/70 transition-colors select-none' : ''}
                          ${header.column.getIsSorted() ? 'bg-muted/80' : ''}
                          whitespace-nowrap
                        `}
                        data-column-type={
                          (() => {
                            const h = (header.column.columnDef.header as string)?.toLowerCase() || "";
                            return h.includes('lkr') || h.includes('amount') || h.includes('balance') || 
                                   h.includes('price') || h.includes('cost') || h.includes('value') || 
                                   h.includes('rate') || h.includes('quantity') || h.includes('qty') || 
                                   h.includes('level') || h.includes('accum') || h.includes('depr') ||
                                   h.includes('total') || h.includes('hours') || h.includes('km')
                                   ? "number" : "text";
                          })()
                        }
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        style={{
                          width: header.getSize() !== 150 ? header.getSize() : 'auto',
                          minWidth: variant === 'professional' ? '80px' : '120px'
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                          {canSort && (
                            <span className="text-xs text-muted-foreground">
                              {header.column.getIsSorted() === 'asc' ? '↑' : 
                               header.column.getIsSorted() === 'desc' ? '↓' : '↕'}
                            </span>
                          )}
                        </div>
                        {enableColumnFilters && header.column.getCanFilter() && (
                          <div className="mt-2 pr-2">
                            <Input
                              placeholder={`Filter ${header.column.columnDef.header as string}...`}
                              value={(header.column.getFilterValue() ?? '') as string}
                              onChange={e => header.column.setFilterValue(e.target.value)}
                              className="h-7 text-xs font-normal"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell 
                        key={cell.id} 
                        className={`px-4 py-3 ${variant === 'professional' ? 'text-[13px]' : 'text-sm'}`}
                        data-column-type={
                          (() => {
                            const h = (cell.column.columnDef.header as string)?.toLowerCase() || "";
                            return h.includes('lkr') || h.includes('amount') || h.includes('balance') || 
                                   h.includes('price') || h.includes('cost') || h.includes('value') || 
                                   h.includes('rate') || h.includes('quantity') || h.includes('qty') || 
                                   h.includes('level') || h.includes('accum') || h.includes('depr') ||
                                   h.includes('total') || h.includes('hours') || h.includes('km')
                                   ? "number" : "text";
                          })()
                        }
                        style={{
                          width: cell.column.getSize() !== 150 ? cell.column.getSize() : 'auto',
                          minWidth: variant === 'professional' ? '80px' : '120px'
                        }}
                       >
                         <div className="truncate" title={typeof cell.getValue() === 'string' ? String(cell.getValue()) : undefined}>
                           {editableFields.includes(cell.column.id) && 
                            editingCell?.rowId === row.id && 
                            editingCell?.field === cell.column.id ? (
                             <div className="flex items-center gap-1">
                               <Input
                                 value={editingValue}
                                 onChange={(e) => setEditingValue(e.target.value)}
                                 className="h-8 w-full text-sm"
                                 type={cell.column.id.includes('lkr') || cell.column.id.includes('hours') || cell.column.id.includes('km') ? 'number' : 'text'}
                                 onKeyDown={(e) => {
                                   if (e.key === 'Enter') {
                                     handleSaveEdit();
                                   } else if (e.key === 'Escape') {
                                     handleCancelEdit();
                                   }
                                 }}
                                 autoFocus
                               />
                               <Button size="sm" variant="ghost" onClick={handleSaveEdit} className="h-6 w-6 p-0">
                                 ✓
                               </Button>
                               <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-6 w-6 p-0">
                                 ✕
                               </Button>
                             </div>
                           ) : (
                             <div 
                               className={`${editableFields.includes(cell.column.id) && onCellEdit ? 'cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5' : ''}`}
                               onClick={() => {
                                 if (editableFields.includes(cell.column.id) && onCellEdit) {
                                   handleCellEdit(row.id, cell.column.id, cell.getValue());
                                 }
                               }}
                             >
                               {flexRender(cell.column.columnDef.cell, cell.getContext())}
                             </div>
                           )}
                         </div>
                       </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-4xl">📄</div>
                      <div>No results found</div>
                      <div className="text-xs">Try adjusting your search or filter criteria</div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {(() => {
              const totalRows = table.getFilteredRowModel().rows.length;
              if (totalRows === 0) return "0 results";
              
              const { pageIndex, pageSize } = table.getState().pagination;
              const startIndex = pageIndex * pageSize + 1;
              const endIndex = Math.min(startIndex + pageSize - 1, totalRows);
              
              return `${startIndex}-${endIndex} of ${totalRows} results`;
            })()}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <select
              value={table.getState().pagination.pageSize >= 999999 ? 'all' : table.getState().pagination.pageSize}
              onChange={(e) => {
                const value = e.target.value;
                table.setPageSize(value === 'all' ? 999999 : Number(value));
              }}
              className="h-8 w-[100px] rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}