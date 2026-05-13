/**
 * TransactionLineageDialog
 * 
 * Premium dark-themed dialog rendering a Mermaid diagram for the full
 * lifecycle of a journal entry — Quotation → Order → Invoice → JE → GL.
 * Now includes upstream chain details panel and deep-linking.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
  GitBranch,
  FileText,
  BookOpen,
  User,
  Calendar,
  Layers,
  Link2,
  ExternalLink,
  Package,
  Receipt,
  CreditCard,
  ChevronRight,
  Activity,
  Eye,
  Download,
  Printer,
} from "lucide-react";
import { useTransactionLineage, VEHICLE_STORAGE_BUCKETS } from "@/hooks/useTransactionLineage";
import type { UpstreamDocument } from "@/hooks/useTransactionLineage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

declare global {
  interface Window {
    mermaid: any;
  }
}

interface TransactionLineageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  journalEntryId: string | null;
  entryNumber?: string;
  amount?: number;
  type?: "debit" | "credit";
}

export const TransactionLineageDialog: React.FC<TransactionLineageDialogProps> = ({
  open,
  onOpenChange,
  journalEntryId,
  entryNumber,
  amount,
  type,
}) => {
  const { data: lineage, isLoading, error } = useTransactionLineage(journalEntryId, open);

  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [showChainPanel, setShowChainPanel] = useState(false);

  // Zoom & Pan
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.3));
  const handleReset = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition((prev) => ({
      x: prev.x + e.clientX - dragStart.x,
      y: prev.y + e.clientY - dragStart.y,
    }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  const handleMouseUp = () => setIsDragging(false);

  // ── Document action handlers ──
  const getStorageBucket = () => {
    const vm = lineage?.upstream?.vehicleModule;
    return vm ? VEHICLE_STORAGE_BUCKETS[vm] || "yutong-invoices" : "yutong-invoices";
  };

  const handleViewDocument = async (filePath: string) => {
    try {
      const { data } = await supabase.storage
        .from(getStorageBucket())
        .createSignedUrl(filePath, 300);
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      } else {
        toast.error("Could not generate document URL");
      }
    } catch {
      toast.error("Failed to open document");
    }
  };

  const handleDownloadDocument = async (filePath: string, fileName: string) => {
    try {
      const { data } = await supabase.storage
        .from(getStorageBucket())
        .download(filePath);
      if (data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Downloaded: ${fileName}`);
      }
    } catch {
      toast.error("Failed to download document");
    }
  };

  const handlePrintDocument = async (filePath: string) => {
    try {
      const { data } = await supabase.storage
        .from(getStorageBucket())
        .createSignedUrl(filePath, 300);
      if (data?.signedUrl) {
        const printWindow = window.open(data.signedUrl, "_blank");
        if (printWindow) {
          printWindow.onload = () => printWindow.print();
        }
      }
    } catch {
      toast.error("Failed to print document");
    }
  };

  // Render Mermaid diagram
  useEffect(() => {
    if (!lineage?.mermaidCode || !open) {
      setSvgContent(null);
      setRenderError(null);
      return;
    }
    let isMounted = true;
    const renderChart = async () => {
      try {
        if (!window.mermaid) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js";
            script.onload = () => resolve();
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        window.mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
          fontFamily: "Inter, sans-serif",
          themeVariables: {
            darkMode: true,
            background: "#1e1e2e",
            primaryColor: "#1e40af",
            primaryTextColor: "#fff",
            primaryBorderColor: "#3b82f6",
            lineColor: "#64748b",
            secondaryColor: "#7c3aed",
            tertiaryColor: "#059669",
          },
        });
        const id = `lineage-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await window.mermaid.render(id, lineage.mermaidCode);
        if (isMounted) { setSvgContent(svg); setRenderError(null); }
      } catch (err: any) {
        console.error("Lineage diagram render error:", err);
        if (isMounted) setRenderError(err.message || "Failed to render diagram");
      }
    };
    renderChart();
    return () => { isMounted = false; };
  }, [lineage?.mermaidCode, open]);

  useEffect(() => {
    if (open) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setSvgContent(null);
      setRenderError(null);
      setShowChainPanel(false);
    }
  }, [open, journalEntryId]);

  // Auto-show chain panel when upstream data exists
  useEffect(() => {
    if (lineage?.upstream?.order || lineage?.upstream?.quotation) {
      setShowChainPanel(true);
    }
  }, [lineage]);

  const hasUpstream = !!(lineage?.upstream?.order || lineage?.upstream?.quotation);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 bg-[#0f172a] border-slate-700">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-[#1e293b]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <GitBranch className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogHeader className="p-0">
                <DialogTitle className="text-white text-lg font-semibold tracking-tight">
                  Transaction Lineage
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-sm">
                  Full audit trail for {entryNumber || journalEntryId?.substring(0, 8)}
                  {amount != null && (
                    <Badge
                      className={`ml-2 text-xs font-mono ${
                        type === "credit"
                          ? "bg-red-500/20 text-red-300 border-red-500/30"
                          : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      }`}
                      variant="outline"
                    >
                      LKR {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Badge>
                  )}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasUpstream && (
              <Button
                variant="outline"
                size="sm"
                className={`text-xs border-slate-600 ${showChainPanel ? 'bg-violet-600/20 text-violet-300 border-violet-500/40' : 'text-slate-300 hover:bg-slate-700'}`}
                onClick={() => setShowChainPanel(!showChainPanel)}
              >
                <Activity className="h-3.5 w-3.5 mr-1.5" />
                Audit Chain
                <Badge className="ml-1.5 text-[10px] bg-violet-500/30 text-violet-200 border-0 px-1.5">
                  {lineage?.summary.chainDepth || 0}
                </Badge>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
              <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
              <span className="font-mono text-sm animate-pulse">Tracing transaction lineage...</span>
            </div>
          ) : error || !lineage ? (
            <div className="flex-1 flex items-center justify-center text-red-400 p-8">
              <div className="text-center">
                <p className="font-semibold text-lg">Could not trace this transaction</p>
                <p className="text-sm mt-1 text-slate-500">
                  The journal entry may have been deleted or is inaccessible.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* ── Summary Strip ── */}
              <div className="grid grid-cols-2 md:grid-cols-7 gap-3 px-6 py-4 bg-[#1e293b]/60 border-b border-slate-700/50">
                <SummaryCard
                  icon={<FileText className="h-4 w-4" />}
                  label="Source"
                  value={lineage.summary.sourceDocType}
                  subValue={lineage.summary.sourceDocNumber}
                  color="blue"
                />
                <SummaryCard
                  icon={<User className="h-4 w-4" />}
                  label="Party"
                  value={lineage.summary.partyName || "—"}
                  color="violet"
                />
                <SummaryCard
                  icon={<Calendar className="h-4 w-4" />}
                  label="Date"
                  value={lineage.journalEntry.entry_date ? format(new Date(lineage.journalEntry.entry_date), "dd MMM yyyy") : "—"}
                  color="slate"
                />
                <SummaryCard
                  icon={<BookOpen className="h-4 w-4" />}
                  label="Total DR"
                  value={`LKR ${lineage.summary.totalDebit.toLocaleString()}`}
                  color="emerald"
                />
                <SummaryCard
                  icon={<Layers className="h-4 w-4" />}
                  label="Accounts"
                  value={`${lineage.summary.accountsAffected} affected`}
                  color="amber"
                />
                <SummaryCard
                  icon={<Link2 className="h-4 w-4" />}
                  label="Related"
                  value={`${lineage.summary.relatedCount} txn${lineage.summary.relatedCount !== 1 ? "s" : ""}`}
                  color="cyan"
                />
                <SummaryCard
                  icon={<Activity className="h-4 w-4" />}
                  label="Chain Depth"
                  value={`${lineage.summary.chainDepth} hop${lineage.summary.chainDepth !== 1 ? "s" : ""}`}
                  color="violet"
                />
              </div>

              {/* ── Body: Diagram + Optional Chain Panel ── */}
              <div className="flex-1 flex overflow-hidden">
                {/* Diagram Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Tab bar */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-[#2d2d2d] border-b border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                      </div>
                      <span className="text-xs text-slate-400 font-mono ml-2">
                        transaction_lineage_{lineage.journalEntry.entry_number}.mermaid
                      </span>
                    </div>
                    {svgContent && (
                      <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
                        <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-7 w-7 text-slate-300 hover:text-white hover:bg-slate-700">
                          <ZoomOut className="h-3.5 w-3.5" />
                        </Button>
                        <div className="flex items-center justify-center w-10 text-xs font-mono text-slate-300 bg-slate-900/50 h-7 rounded">
                          {Math.round(scale * 100)}%
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-7 w-7 text-slate-300 hover:text-white hover:bg-slate-700">
                          <ZoomIn className="h-3.5 w-3.5" />
                        </Button>
                        <div className="w-px h-4 bg-slate-700 mx-0.5" />
                        <Button variant="ghost" size="icon" onClick={handleReset} className="h-7 w-7 text-slate-300 hover:text-white hover:bg-slate-700" title="Reset View">
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Canvas */}
                  <div
                    className="flex-1 overflow-hidden bg-[#1e1e2e] relative select-none"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{ cursor: isDragging ? "grabbing" : "grab" }}
                  >
                    {renderError ? (
                      <div className="flex flex-col items-center justify-center h-full text-red-400 p-6">
                        <p className="font-semibold mb-2">Diagram Rendering Error</p>
                        <p className="text-xs text-slate-500 mb-4">{renderError}</p>
                        <pre className="text-xs text-slate-500 bg-black/20 p-4 rounded-lg overflow-auto max-h-[200px] w-full max-w-2xl">
                          {lineage.mermaidCode}
                        </pre>
                      </div>
                    ) : svgContent ? (
                      <div
                        ref={containerRef}
                        className="flex justify-center min-w-full min-h-full items-center text-slate-200 transition-transform duration-75 ease-linear p-8"
                        style={{
                          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                          transformOrigin: "center center",
                        }}
                        dangerouslySetInnerHTML={{ __html: svgContent }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full space-y-4 text-slate-500">
                        <Skeleton className="h-[300px] w-[600px] bg-slate-800 rounded-lg" />
                        <span className="animate-pulse font-mono text-sm">
                          Rendering Lineage Blueprint...
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Upstream Chain Panel (slide-in) ── */}
                {showChainPanel && hasUpstream && (
                  <div className="w-[320px] border-l border-slate-700 bg-[#1e293b] overflow-y-auto flex-shrink-0">
                    <div className="px-4 py-3 border-b border-slate-700/50 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-violet-400" />
                      <span className="text-sm font-semibold text-white">Upstream Audit Chain</span>
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Quotation Card */}
                      {lineage.upstream.quotation && (
                        <ChainCard
                          icon={<Receipt className="h-4 w-4" />}
                          title="Quotation"
                          color="teal"
                          fields={[
                            { label: "Number", value: lineage.upstream.quotation.quotation_number },
                            { label: "Customer", value: lineage.upstream.quotation.customer_name },
                            { label: "Model", value: `${lineage.upstream.quotation.bus_model || '—'} × ${lineage.upstream.quotation.quantity || 1}` },
                            { label: "Total", value: `LKR ${(lineage.upstream.quotation.total_price || 0).toLocaleString()}` },
                            { label: "Status", value: lineage.upstream.quotation.status, isBadge: true },
                          ]}
                        />
                      )}

                      {lineage.upstream.quotation && lineage.upstream.order && (
                        <div className="flex justify-center">
                          <ChevronRight className="h-4 w-4 text-slate-500 rotate-90" />
                        </div>
                      )}

                      {/* Order Card */}
                      {lineage.upstream.order && (
                        <ChainCard
                          icon={<Package className="h-4 w-4" />}
                          title="Sales Order"
                          color="purple"
                          fields={[
                            { label: "Order No", value: lineage.upstream.order.order_no },
                            { label: "Status", value: lineage.upstream.order.status, isBadge: true },
                            { label: "Total Price", value: `LKR ${(lineage.upstream.order.total_price || 0).toLocaleString()}` },
                            { label: "Paid", value: `LKR ${(lineage.upstream.order.total_paid || 0).toLocaleString()}` },
                          ]}
                        />
                      )}

                      {lineage.upstream.order && lineage.upstream.payments.length > 0 && (
                        <div className="flex justify-center">
                          <ChevronRight className="h-4 w-4 text-slate-500 rotate-90" />
                        </div>
                      )}

                      {/* Payments */}
                      {lineage.upstream.payments.length > 0 && (
                        <div className="bg-[#0f172a] border border-cyan-500/20 rounded-lg overflow-hidden">
                          <div className="px-3 py-2 bg-cyan-500/10 border-b border-cyan-500/20 flex items-center gap-2">
                            <CreditCard className="h-3.5 w-3.5 text-cyan-400" />
                            <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                              Customer Payments ({lineage.upstream.payments.length})
                            </span>
                          </div>
                          <div className="divide-y divide-slate-700/50">
                            {lineage.upstream.payments.map((p: any, i: number) => (
                              <div key={i} className="px-3 py-2 text-xs">
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-300 font-mono">{p.payment_reference || `Payment ${i + 1}`}</span>
                                  <span className="text-cyan-300 font-semibold">
                                    LKR {(p.payment_amount || 0).toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between mt-1 text-slate-500">
                                  <span>{p.payment_method || '—'}</span>
                                  <span>{p.payment_date ? format(new Date(p.payment_date), "dd MMM yyyy") : '—'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Source Document */}
                      {lineage.sourceDocument && (
                        <>
                          <div className="flex justify-center">
                            <ChevronRight className="h-4 w-4 text-slate-500 rotate-90" />
                          </div>
                          <ChainCard
                            icon={<FileText className="h-4 w-4" />}
                            title={lineage.summary.sourceDocType}
                            color="blue"
                            fields={[
                              { label: "Number", value: lineage.summary.sourceDocNumber },
                              { label: "Amount", value: `LKR ${(lineage.sourceDocument.total_amount || lineage.sourceDocument.amount || 0).toLocaleString()}` },
                              { label: "Status", value: lineage.sourceDocument.status, isBadge: true },
                            ]}
                          />
                        </>
                      )}

                      {/* ── Invoice Documents (View / Download / Print) ── */}
                      {lineage.upstream.documents && lineage.upstream.documents.length > 0 && (
                        <>
                          <div className="flex justify-center">
                            <ChevronRight className="h-4 w-4 text-slate-500 rotate-90" />
                          </div>
                          <div className="bg-[#0f172a] border border-emerald-500/20 rounded-lg overflow-hidden">
                            <div className="px-3 py-2 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center gap-2">
                              <FileText className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                                Documents ({lineage.upstream.documents.length})
                              </span>
                            </div>
                            <div className="divide-y divide-slate-700/50">
                              {lineage.upstream.documents.map((doc: UpstreamDocument, i: number) => (
                                <div key={doc.id || i} className="px-3 py-2.5">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs text-slate-300 font-mono truncate max-w-[160px]" title={doc.file_name}>
                                      {doc.file_name}
                                    </span>
                                    {doc.invoice_no && (
                                      <Badge className="text-[9px] bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-1.5 py-0">
                                        {doc.invoice_no}
                                      </Badge>
                                    )}
                                  </div>
                                  {doc.invoice_category && (
                                    <p className="text-[10px] text-slate-500 mb-1.5 capitalize">
                                      {doc.invoice_category.replace(/_/g, " ")}
                                    </p>
                                  )}
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 text-[10px] gap-1 px-2 border-slate-600 text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200"
                                      onClick={() => handleViewDocument(doc.file_path)}
                                      title="View PDF"
                                    >
                                      <Eye className="h-3 w-3" /> View
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 text-[10px] gap-1 px-2 border-slate-600 text-blue-300 hover:bg-blue-500/10 hover:text-blue-200"
                                      onClick={() => handleDownloadDocument(doc.file_path, doc.file_name)}
                                      title="Download PDF"
                                    >
                                      <Download className="h-3 w-3" /> Download
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 text-[10px] gap-1 px-2 border-slate-600 text-violet-300 hover:bg-violet-500/10 hover:text-violet-200"
                                      onClick={() => handlePrintDocument(doc.file_path)}
                                      title="Print PDF"
                                    >
                                      <Printer className="h-3 w-3" /> Print
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Related Transactions */}
                      {lineage.relatedJEs.length > 0 && (
                        <div className="mt-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Link2 className="h-3.5 w-3.5 text-amber-400" />
                            <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                              Related Transactions
                            </span>
                          </div>
                          <div className="space-y-2">
                            {lineage.relatedJEs.map((rje: any, i: number) => (
                              <div key={i} className="bg-[#0f172a] border border-amber-500/20 rounded-lg px-3 py-2">
                                <p className="text-xs font-mono text-amber-300">{rje.entry_number}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5 truncate">{rje.description}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">{rje.entry_date}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Summary Card ────────────────────────────────────────────────────────────

const colorMap: Record<string, string> = {
  blue: "text-blue-400",
  violet: "text-violet-400",
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  cyan: "text-cyan-400",
  slate: "text-slate-300",
  red: "text-red-400",
};

function SummaryCard({
  icon,
  label,
  value,
  subValue,
  color = "slate",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  color?: string;
}) {
  return (
    <div className="bg-[#0f172a] border border-slate-700/50 rounded-lg px-3 py-2.5">
      <div className={`flex items-center gap-1.5 mb-1 ${colorMap[color] || colorMap.slate}`}>
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-medium opacity-80">
          {label}
        </span>
      </div>
      <p className="text-sm font-semibold text-white truncate" title={value}>
        {value}
      </p>
      {subValue && (
        <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5" title={subValue}>
          {subValue}
        </p>
      )}
    </div>
  );
}

// ─── Chain Card (Upstream detail) ────────────────────────────────────────────

const chainColorMap: Record<string, { border: string; bg: string; text: string; icon: string }> = {
  teal: { border: "border-teal-500/20", bg: "bg-teal-500/10", text: "text-teal-300", icon: "text-teal-400" },
  purple: { border: "border-violet-500/20", bg: "bg-violet-500/10", text: "text-violet-300", icon: "text-violet-400" },
  blue: { border: "border-blue-500/20", bg: "bg-blue-500/10", text: "text-blue-300", icon: "text-blue-400" },
  amber: { border: "border-amber-500/20", bg: "bg-amber-500/10", text: "text-amber-300", icon: "text-amber-400" },
};

function ChainCard({
  icon,
  title,
  color = "blue",
  fields,
}: {
  icon: React.ReactNode;
  title: string;
  color?: string;
  fields: Array<{ label: string; value: any; isBadge?: boolean }>;
}) {
  const c = chainColorMap[color] || chainColorMap.blue;
  return (
    <div className={`bg-[#0f172a] border ${c.border} rounded-lg overflow-hidden`}>
      <div className={`px-3 py-2 ${c.bg} border-b ${c.border} flex items-center gap-2`}>
        <span className={c.icon}>{icon}</span>
        <span className={`text-xs font-semibold ${c.text} uppercase tracking-wider`}>{title}</span>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        {fields.map((f, i) => (
          <div key={i} className="flex justify-between items-center text-xs">
            <span className="text-slate-500">{f.label}</span>
            {f.isBadge ? (
              <Badge className="text-[10px] bg-slate-700/50 text-slate-300 border-slate-600 px-1.5 py-0">
                {f.value || "—"}
              </Badge>
            ) : (
              <span className="text-slate-200 font-medium truncate max-w-[170px]" title={String(f.value)}>
                {f.value || "—"}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TransactionLineageDialog;
