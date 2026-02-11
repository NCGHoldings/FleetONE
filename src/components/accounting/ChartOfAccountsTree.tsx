import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Folder, FileText, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DrillDownModal } from "./DrillDownModal";

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  level1: string | null;
  level2: string | null;
  level3: string | null;
  level4: string | null;
  level5: string | null;
  account_level: number | null;
  current_balance: number;
  is_active: boolean;
  is_header: boolean | null;
}

interface ChartOfAccountsTreeProps {
  accounts: Account[];
  searchTerm?: string;
}

interface TreeNode {
  name: string;
  accounts: Account[];
  children: Map<string, TreeNode>;
  totalBalance: number;
}

export const ChartOfAccountsTree = ({ accounts, searchTerm = "" }: ChartOfAccountsTreeProps) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["Assets", "Liabilities", "Equity", "Revenue", "Expenses"]));
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [drillDownAccountIds, setDrillDownAccountIds] = useState<string[]>([]);
  const [drillDownLabel, setDrillDownLabel] = useState<string>("");
  const [drillDownOpen, setDrillDownOpen] = useState(false);

  const filteredAccounts = useMemo(() => {
    if (!searchTerm) return accounts;
    const term = searchTerm.toLowerCase();
    return accounts.filter(
      (acc) =>
        acc.account_name.toLowerCase().includes(term) ||
        acc.account_code.toLowerCase().includes(term) ||
        acc.level1?.toLowerCase().includes(term) ||
        acc.level2?.toLowerCase().includes(term) ||
        acc.level3?.toLowerCase().includes(term) ||
        acc.level4?.toLowerCase().includes(term) ||
        acc.level5?.toLowerCase().includes(term)
    );
  }, [accounts, searchTerm]);

  // Build tree structure
  const tree = useMemo(() => {
    const root = new Map<string, TreeNode>();

    filteredAccounts.forEach((account) => {
      const level1 = account.level1 || account.account_type || "Other";
      const level2 = account.level2 || "";
      const level3 = account.level3 || "";
      const level4 = account.level4 || "";

      // Ensure level1 node exists
      if (!root.has(level1)) {
        root.set(level1, { name: level1, accounts: [], children: new Map(), totalBalance: 0 });
      }
      const l1Node = root.get(level1)!;
      l1Node.totalBalance += account.current_balance || 0;

      if (!level2) {
        l1Node.accounts.push(account);
        return;
      }

      // Ensure level2 node exists
      if (!l1Node.children.has(level2)) {
        l1Node.children.set(level2, { name: level2, accounts: [], children: new Map(), totalBalance: 0 });
      }
      const l2Node = l1Node.children.get(level2)!;
      l2Node.totalBalance += account.current_balance || 0;

      if (!level3) {
        l2Node.accounts.push(account);
        return;
      }

      // Ensure level3 node exists
      if (!l2Node.children.has(level3)) {
        l2Node.children.set(level3, { name: level3, accounts: [], children: new Map(), totalBalance: 0 });
      }
      const l3Node = l2Node.children.get(level3)!;
      l3Node.totalBalance += account.current_balance || 0;

      if (!level4) {
        l3Node.accounts.push(account);
        return;
      }

      // Ensure level4 node exists
      if (!l3Node.children.has(level4)) {
        l3Node.children.set(level4, { name: level4, accounts: [], children: new Map(), totalBalance: 0 });
      }
      const l4Node = l3Node.children.get(level4)!;
      l4Node.totalBalance += account.current_balance || 0;
      l4Node.accounts.push(account);
    });

    return root;
  }, [filteredAccounts]);

  const toggleNode = (path: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleAccountClick = (account: Account, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAccount(account);
    setDrillDownAccountIds([account.id]);
    setDrillDownLabel(`${account.account_code} - ${account.account_name}`);
    setDrillDownOpen(true);
  };

  // Recursively collect all account IDs under a tree node
  const collectAccountIds = (node: TreeNode): string[] => {
    const ids: string[] = node.accounts.map((a) => a.id);
    node.children.forEach((childNode) => {
      ids.push(...collectAccountIds(childNode));
    });
    return ids;
  };

  const handleFolderDrillDown = (node: TreeNode, label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ids = collectAccountIds(node);
    if (ids.length === 0) return;
    setSelectedAccount(null);
    setDrillDownAccountIds(ids);
    setDrillDownLabel(label);
    setDrillDownOpen(true);
  };

  const getAccountTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      asset: "default",
      liability: "destructive",
      equity: "secondary",
      revenue: "outline",
      expense: "outline",
    };
    return <Badge variant={variants[type] || "default"} className="text-xs">{type}</Badge>;
  };

  const formatBalance = (balance: number) => {
    return `LKR ${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const renderTreeNode = (node: TreeNode, path: string, level: number) => {
    const isExpanded = expandedNodes.has(path);
    const hasChildren = node.children.size > 0 || node.accounts.length > 0;

    return (
      <div key={path} className="select-none">
        <div
          className={cn(
            "flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer group",
            level === 0 && "font-semibold text-primary"
          )}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => toggleNode(path)}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0" />
            )
          ) : (
            <span className="w-4" />
          )}
          <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="flex-1 truncate">{node.name}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => handleFolderDrillDown(node, path, e)}
            title={`View all transactions under ${node.name}`}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {formatBalance(node.totalBalance)}
          </span>
        </div>

        {isExpanded && (
          <>
            {Array.from(node.children.entries()).map(([childName, childNode]) =>
              renderTreeNode(childNode, `${path}/${childName}`, level + 1)
            )}
            {node.accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center gap-2 py-1 px-2 hover:bg-accent rounded cursor-pointer group transition-colors"
                style={{ paddingLeft: `${(level + 1) * 20 + 8}px` }}
                onClick={(e) => handleAccountClick(account, e)}
              >
                <span className="w-4" />
                <FileText className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">
                  {account.account_code}
                </span>
                <span className="flex-1 truncate text-sm group-hover:text-foreground">
                  {account.level5 || account.account_name}
                </span>
                {getAccountTypeBadge(account.account_type)}
                <span className={cn(
                  "text-sm font-mono",
                  account.current_balance < 0 && "text-destructive",
                  account.current_balance >= 0 && "text-green-600 dark:text-green-400"
                )}>
                  {formatBalance(account.current_balance)}
                </span>
                <Badge variant={account.is_active ? "default" : "secondary"} className="text-xs">
                  {account.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            ))}
          </>
        )}
      </div>
    );
  };

  if (filteredAccounts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {searchTerm ? "No accounts match your search" : "No accounts found. Upload a Chart of Accounts to get started."}
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg p-2">
        {Array.from(tree.entries()).map(([name, node]) => renderTreeNode(node, name, 0))}
      </div>

      <DrillDownModal
        open={drillDownOpen}
        onOpenChange={setDrillDownOpen}
        accountId={selectedAccount?.id || null}
        accountIds={drillDownAccountIds}
        accountName={drillDownLabel || (selectedAccount ? `${selectedAccount.account_code} - ${selectedAccount.account_name}` : undefined)}
      />
    </>
  );
};
