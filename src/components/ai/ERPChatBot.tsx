import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Bot, Send, User, Loader2, Sparkles, RotateCcw, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

const QUICK_PROMPTS = [
  "How many confirmed trips do we have this month?",
  "What is the total revenue from special hires?",
  "Show me pending finance approvals",
  "How do I create a new quotation?",
  "What is the difference between advance and balance payment?",
  "How to generate a delivery note?",
];

// ERP Knowledge base for context-aware answers
const ERP_CONTEXT = `You are an intelligent AI assistant for the NCG FleetONE ERP system. 
You help staff understand and navigate the system. 
The ERP covers: Special Hire (bus quotations, trips, payments), Fleet Management, Accounting (AP/AR invoices, GL, Journal Entries), School Bus Routes, HR, Inventory, and more.
NCG Holdings owns: NCG Express, NCG Holdings, Sinotruck, Light Vehicle, School Bus Operations, Special Hire.
Be concise, helpful, and professional. If you can't answer something system-specific, say so clearly.`;

export function ERPChatBot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "👋 Hello! I'm the NCG FleetONE AI Assistant. I can help you navigate the system, answer questions about Special Hire, Finance, Fleet, and more. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || inputValue.trim();
    if (!messageText || isLoading) return;

    setInputValue("");

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    const loadingMessage: Message = {
      id: `loading-${Date.now()}`,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setIsLoading(true);

    try {
      // Try Supabase edge function first
      const { data, error } = await supabase.functions.invoke("erp-ai-chat", {
        body: {
          message: messageText,
          context: ERP_CONTEXT,
          conversationHistory: messages
            .filter((m) => !m.isLoading)
            .slice(-6)
            .map((m) => ({ role: m.role, content: m.content })),
        },
      });

      let responseContent: string;

      if (error || !data?.response) {
        // Fallback to intelligent local responses
        responseContent = generateLocalResponse(messageText);
      } else {
        responseContent = data.response;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.isLoading
            ? {
                id: `ai-${Date.now()}`,
                role: "assistant" as const,
                content: responseContent,
                timestamp: new Date(),
                isLoading: false,
              }
            : m
        )
      );
    } catch (err) {
      const fallback = generateLocalResponse(messageText);
      setMessages((prev) =>
        prev.map((m) =>
          m.isLoading
            ? {
                id: `ai-${Date.now()}`,
                role: "assistant" as const,
                content: fallback,
                timestamp: new Date(),
                isLoading: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const generateLocalResponse = (question: string): string => {
    const q = question.toLowerCase();

    if (q.includes("quotation") && (q.includes("create") || q.includes("new") || q.includes("how"))) {
      return "To create a new quotation:\n1. Go to **Special Hire** from the sidebar\n2. Click **+ New Quotation** (top-right blue button)\n3. Fill in customer details, route, bus type, and dates\n4. The system auto-calculates costs using rate cards and fuel settings\n5. Click **Submit** to save as Draft or send directly to the customer.";
    }
    if (q.includes("advance") && q.includes("payment")) {
      return "**Advance Payment** is the first installment collected from the customer before or at the time of the trip. It's typically 50% of the total.\n\nTo record: Go to **Trips** tab → Click on the confirmed trip → Click **Record Payment** → Select **Advance**.\n\nThe Finance team then approves it, which triggers the GL posting: DR Bank → CR Customer Advance.";
    }
    if (q.includes("balance") && q.includes("payment")) {
      return "**Balance Payment** is the remaining amount collected after the trip is completed.\n\nTo record: Go to **Trips** tab → Click on the completed trip → Click **Record Payment** → Select **Balance**.\n\nUpon Finance approval, the GL posts: DR Bank → CR Trade Receivable.";
    }
    if (q.includes("invoice") || q.includes("ar") || q.includes("accounts receivable")) {
      return "**AR Invoices** are found under **Accounting → Accounts Receivable**.\n\nTo create one:\n1. Click **+ New Invoice**\n2. Select the customer and company entity\n3. Add line items with descriptions, quantity, price, and VAT code\n4. Submit - the system auto-posts the GL entry (DR Trade Receivable / CR Revenue / CR VAT Payable).";
    }
    if (q.includes("ap") || q.includes("accounts payable") || q.includes("vendor")) {
      return "**AP Invoices** are found under **Accounting → Accounts Payable**.\n\nTo create one:\n1. Click **+ New Invoice**\n2. Select the vendor and company entity\n3. Add line items with 18% VAT if applicable\n4. Submit - GL auto-posts: DR Expense / DR Input VAT / CR Trade Payable.";
    }
    if (q.includes("trip") || q.includes("confirmed")) {
      return "Confirmed trips are visible in **Special Hire → Trips tab**.\n\nYou can:\n- View payment status and timeline\n- Record advance/balance payments\n- Update trip status (Completed, On Hold, Cancelled)\n- Generate documents (Receipts, Invoices)\n- Track finance approval status";
    }
    if (q.includes("fleet") || q.includes("vehicle")) {
      return "Fleet Management is accessible from the sidebar. It covers:\n- **Vehicle Registry** – All NCG vehicles\n- **Maintenance** – Service records and schedules\n- **Insurance** – Policy tracking\n- **Driver Allocation** – Assign drivers to trips\n- **Real-Time Tracking** – Live GPS position (if connected)";
    }
    if (q.includes("school bus") || q.includes("route")) {
      return "School Bus operations are under the **School Transportation** module.\n\nFeatures:\n- Route management with stops and timing\n- Student tracking\n- Driver assignments\n- Expense recording per route\n- Profit/loss analysis per route\n\nExpenses submitted from School Bus auto-flow to Finance → Expense Requests for approval.";
    }
    if (q.includes("gl") || q.includes("journal") || q.includes("general ledger")) {
      return "The **General Ledger** is under Accounting → Journal Entries.\n\nKey things to know:\n- All transactions (AP, AR, Expenses, Payments) auto-post to GL\n- You can also create manual Journal Entries\n- All entries must be balanced (Total Debit = Total Credit)\n- Audit trail is maintained for every entry";
    }
    if (q.includes("company") || q.includes("ncg")) {
      return "NCG Holdings operates **7 entities**:\n1. NCG Holdings (parent)\n2. NCG Express (special hire & buses)\n3. Sinotruck (Yutong vehicles)\n4. Light Vehicle\n5. School Bus Operations (SBO)\n6. Special Hire\n7. Individual entities with separate COA\n\nEach has its own Chart of Accounts, VAT settings, and GL configuration.";
    }

    return "I can help you with questions about Special Hire, Accounting (AP/AR/GL), Fleet Management, School Bus routes, HR, and more. Could you be more specific about what you need? For example:\n- \"How do I add a payment to a trip?\"\n- \"Where is the AP invoice form?\"\n- \"How does VAT posting work?\"";
  };

  const handleReset = () => {
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        content: "Chat cleared! Ask me anything about the NCG FleetONE ERP system.",
        timestamp: new Date(),
      },
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header Card */}
      <Card className="border-0 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg">NCG AI Assistant</h2>
              <p className="text-blue-100 text-sm">Powered by ERP Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-400 text-green-900 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-green-700 mr-1 inline-block animate-pulse" />
              Online
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-white hover:bg-white/20"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => sendMessage(prompt)}
            disabled={isLoading}
            className="text-xs px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col min-h-[400px]">
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
                  )}
                >
                  {message.role === "user" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3 relative group",
                    message.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-muted text-foreground rounded-tl-none"
                  )}
                >
                  {message.isLoading ? (
                    <div className="flex items-center gap-2 py-1">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                      <Sparkles className="h-3 w-3 text-indigo-500 animate-pulse" />
                    </div>
                  ) : (
                    <>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content.split("**").map((part, i) =>
                          i % 2 === 1 ? (
                            <strong key={i}>{part}</strong>
                          ) : (
                            <span key={i}>{part}</span>
                          )
                        )}
                      </div>
                      <div
                        className={cn(
                          "text-xs mt-1 opacity-60",
                          message.role === "user" ? "text-right" : "text-left"
                        )}
                      >
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      {message.role === "assistant" && (
                        <button
                          onClick={() => handleCopy(message.content, message.id)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/10"
                        >
                          {copiedId === message.id ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3 text-muted-foreground" />
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <Separator />

        {/* Input */}
        <div className="p-4 flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about the ERP system..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!inputValue.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
