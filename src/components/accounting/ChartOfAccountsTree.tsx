import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Folder, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
            "flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer",
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
                className="flex items-center gap-2 py-1 px-2 hover:bg-muted rounded"
                style={{ paddingLeft: `${(level + 1) * 20 + 8}px` }}
              >
                <span className="w-4" />
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">
                  {account.account_code}
                </span>
                <span className="flex-1 truncate text-sm">
                  {account.level5 || account.account_name}
                </span>
                {getAccountTypeBadge(account.account_type)}
                <span className={cn(
                  "text-sm",
                  account.current_balance < 0 && "text-destructive"
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
    <div className="border rounded-lg p-2">
      {Array.from(tree.entries()).map(([name, node]) => renderTreeNode(node, name, 0))}
    </div>
  );
};
