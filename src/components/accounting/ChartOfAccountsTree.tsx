import { useState, useMemo, useCallback } from "react";
import { ChevronRight, ChevronDown, Folder, FileText, Eye, Plus, Check, X, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DrillDownModal } from "./DrillDownModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AccountEditForm } from "./AccountEditForm";
import { useCompanyCreateAccount } from "@/hooks/useCompanyMutations";

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
  parent_account_id: string | null;
}

interface ChartOfAccountsTreeProps {
  accounts: Account[];
  allAccounts: Account[];
  searchTerm?: string;
  onAccountCreated?: () => void;
}

interface TreeNode {
  name: string;
  accounts: Account[];
  children: Map<string, TreeNode>;
  totalBalance: number;
  representativeCode: string;
}

// Collect all descendant account codes from a tree node
const collectAllCodes = (node: TreeNode): string[] => {
  const codes: string[] = node.accounts.map(a => a.account_code);
  node.children.forEach(child => {
    codes.push(...collectAllCodes(child));
  });
  return codes;
};

// Compute longest common prefix of an array of strings
const longestCommonPrefix = (strs: string[]): string => {
  if (strs.length === 0) return "";
  let prefix = strs[0];
  for (let i = 1; i < strs.length; i++) {
    while (strs[i].indexOf(prefix) !== 0) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return "";
    }
  }
  return prefix;
};

// Recursively compute representative codes for all tree nodes
const computeRepresentativeCodes = (node: TreeNode, codeLength: number = 8): void => {
  // Process children first (bottom-up)
  node.children.forEach(child => computeRepresentativeCodes(child, codeLength));
  
  const allCodes = collectAllCodes(node);
  if (allCodes.length === 0) {
    node.representativeCode = "";
    return;
  }
  const lcp = longestCommonPrefix(allCodes);
  if (!lcp) {
    node.representativeCode = "";
    return;
  }
  node.representativeCode = lcp.padEnd(codeLength, "0");
};

const ACCOUNT_TYPE_MAP: Record<string, string> = {
  "Assets": "asset",
  "Liabilities": "liability",
  "Equity": "equity",
  "Revenue": "revenue",
  "Expenses": "expense",
  "Income": "revenue",
  "Expense": "expense",
};

// Auto-suggest next account code based on sibling codes
const suggestNextCode = (siblingCodes: string[]): string => {
  if (siblingCodes.length === 0) return "";
  const numericCodes = siblingCodes
    .map(c => c.replace(/[^0-9]/g, ""))
    .filter(c => c.length > 0)
    .map(Number)
    .sort((a, b) => a - b);
  if (numericCodes.length === 0) return "";
  const highest = numericCodes[numericCodes.length - 1];
  // Determine increment: if codes look like 2110, 2120 → step 10; if 2100, 2200 → step 100; else step 1
  if (numericCodes.length >= 2) {
    const diffs = numericCodes.slice(1).map((v, i) => v - numericCodes[i]);
    const commonDiff = diffs[0];
    if (commonDiff > 0 && diffs.every(d => d === commonDiff)) {
      return String(highest + commonDiff);
    }
  }
  // Fallback: increment by 10 if code >= 100, else by 1
  const step = highest >= 100 ? 10 : 1;
  return String(highest + step);
};

// Derive level fields for a new child account
const deriveLevelsForChild = (
  accountName: string,
  parentPath: string[],
  parentAccount: Account | null
): {
  level1: string | null;
  level2: string | null;
  level3: string | null;
  level4: string | null;
  level5: string | null;
  account_level: number;
} => {
  if (parentAccount) {
    const parentLevel = parentAccount.account_level || 1;
    const nextLevel = Math.min(parentLevel + 1, 5);
    const result = {
      level1: parentAccount.level1,
      level2: parentAccount.level2,
      level3: parentAccount.level3,
      level4: parentAccount.level4,
      level5: parentAccount.level5,
      account_level: nextLevel,
    };
    switch (nextLevel) {
      case 2: result.level2 = accountName; result.level3 = null; result.level4 = null; result.level5 = null; break;
      case 3: result.level3 = accountName; result.level4 = null; result.level5 = null; break;
      case 4: result.level4 = accountName; result.level5 = null; break;
      case 5: result.level5 = accountName; break;
    }
    return result;
  }
  // For folder-node parents, derive from the path
  const level = Math.min(parentPath.length + 1, 5);
  const result: Record<string, string | number | null> = { level1: null, level2: null, level3: null, level4: null, level5: null, account_level: level };
  parentPath.forEach((seg, i) => {
    if (i < 5) result[`level${i + 1}`] = seg;
  });
  result[`level${level}`] = accountName;
  return result as { level1: string | null; level2: string | null; level3: string | null; level4: string | null; level5: string | null; account_level: number };
};

export const ChartOfAccountsTree = ({ accounts, allAccounts, searchTerm = "", onAccountCreated }: ChartOfAccountsTreeProps) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["Assets", "Liabilities", "Equity", "Revenue", "Expenses"]));
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [drillDownAccountIds, setDrillDownAccountIds] = useState<string[]>([]);
  const [drillDownLabel, setDrillDownLabel] = useState<string>("");
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Inline add state
  const [addingUnderPath, setAddingUnderPath] = useState<string | null>(null);
  const [addingUnderAccountId, setAddingUnderAccountId] = useState<string | null>(null);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<string>("asset");
  const [isSaving, setIsSaving] = useState(false);

  const createAccount = useCompanyCreateAccount();

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
        root.set(level1, { name: level1, accounts: [], children: new Map(), totalBalance: 0, representativeCode: "" });
      }
      const l1Node = root.get(level1)!;
      l1Node.totalBalance += account.current_balance || 0;

      if (!level2) {
        l1Node.accounts.push(account);
        return;
      }

      // Ensure level2 node exists
      if (!l1Node.children.has(level2)) {
        l1Node.children.set(level2, { name: level2, accounts: [], children: new Map(), totalBalance: 0, representativeCode: "" });
      }
      const l2Node = l1Node.children.get(level2)!;
      l2Node.totalBalance += account.current_balance || 0;

      if (!level3) {
        l2Node.accounts.push(account);
        return;
      }

      // Ensure level3 node exists
      if (!l2Node.children.has(level3)) {
        l2Node.children.set(level3, { name: level3, accounts: [], children: new Map(), totalBalance: 0, representativeCode: "" });
      }
      const l3Node = l2Node.children.get(level3)!;
      l3Node.totalBalance += account.current_balance || 0;

      if (!level4) {
        l3Node.accounts.push(account);
        return;
      }

      // Ensure level4 node exists
      if (!l3Node.children.has(level4)) {
        l3Node.children.set(level4, { name: level4, accounts: [], children: new Map(), totalBalance: 0, representativeCode: "" });
      }
      const l4Node = l3Node.children.get(level4)!;
      l4Node.totalBalance += account.current_balance || 0;
      l4Node.accounts.push(account);
    });

    // Compute representative codes for all folder nodes
    root.forEach(node => computeRepresentativeCodes(node));

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

  // Open inline add form under a folder node
  const handleAddUnderFolder = useCallback((path: string, level: number, e: React.MouseEvent) => {
    e.stopPropagation();
    // Expand the node so the inline form is visible
    setExpandedNodes(prev => new Set(prev).add(path));
    
    const pathSegments = path.split("/");
    // Find sibling account codes under this folder path
    const siblingCodes = allAccounts
      .filter(acc => {
        // Match accounts that share the same path prefix
        for (let i = 0; i < pathSegments.length; i++) {
          const levelKey = `level${i + 1}` as keyof Account;
          if (acc[levelKey] !== pathSegments[i]) return false;
        }
        // Must be exactly one level deeper
        return (acc.account_level || 0) === pathSegments.length + 1;
      })
      .map(acc => acc.account_code);
    
    const suggested = suggestNextCode(siblingCodes);
    
    // Infer account type from path
    const rootName = pathSegments[0];
    const inferredType = ACCOUNT_TYPE_MAP[rootName] || "asset";
    
    setAddingUnderPath(path);
    setAddingUnderAccountId(null);
    setNewCode(suggested);
    setNewName("");
    setNewType(inferredType);
  }, [allAccounts]);

  // Open inline add form under a leaf account
  const handleAddUnderAccount = useCallback((account: Account, path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Find sibling accounts (children of this account)
    const childCodes = allAccounts
      .filter(acc => acc.parent_account_id === account.id)
      .map(acc => acc.account_code);
    
    const suggested = childCodes.length > 0
      ? suggestNextCode(childCodes)
      : account.account_code + "0";
    
    setAddingUnderPath(path);
    setAddingUnderAccountId(account.id);
    setNewCode(suggested);
    setNewName("");
    setNewType(account.account_type);
  }, [allAccounts]);

  const handleCancelAdd = useCallback(() => {
    setAddingUnderPath(null);
    setAddingUnderAccountId(null);
    setNewCode("");
    setNewName("");
  }, []);

  const handleSaveNewAccount = useCallback(async () => {
    if (!newCode.trim() || !newName.trim()) return;
    setIsSaving(true);
    try {
      const pathSegments = (addingUnderPath || "").split("/");
      const parentAccount = addingUnderAccountId
        ? allAccounts.find(a => a.id === addingUnderAccountId) || null
        : null;
      
      const levels = deriveLevelsForChild(newName, pathSegments, parentAccount);
      
      await createAccount.mutateAsync({
        account_code: newCode,
        account_name: newName,
        account_type: newType as "asset" | "liability" | "equity" | "revenue" | "expense",
        parent_account_id: addingUnderAccountId || undefined,
        is_header: false,
        level1: levels.level1,
        level2: levels.level2,
        level3: levels.level3,
        level4: levels.level4,
        level5: levels.level5,
        account_level: levels.account_level,
        gl_code: newCode,
      });
      handleCancelAdd();
      onAccountCreated?.();
    } finally {
      setIsSaving(false);
    }
  }, [newCode, newName, newType, addingUnderPath, addingUnderAccountId, allAccounts, createAccount, handleCancelAdd, onAccountCreated]);

  // Render the inline add form row
  const renderInlineAddForm = (level: number, parentPath: string) => {
    if (addingUnderPath !== parentPath) return null;
    return (
      <div
        className="flex items-center gap-2 py-1.5 px-2 bg-primary/5 border border-dashed border-primary/30 rounded my-1 animate-in fade-in-0 slide-in-from-top-1 duration-200"
        style={{ paddingLeft: `${(level + 1) * 20 + 8}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        <Plus className="h-4 w-4 text-primary shrink-0" />
        <Input
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          placeholder="Code"
          className="h-7 w-24 text-xs font-mono"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSaveNewAccount();
            if (e.key === "Escape") handleCancelAdd();
          }}
        />
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Account name"
          className="h-7 flex-1 text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSaveNewAccount();
            if (e.key === "Escape") handleCancelAdd();
          }}
        />
        <Select value={newType} onValueChange={setNewType}>
          <SelectTrigger className="h-7 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asset">Asset</SelectItem>
            <SelectItem value="liability">Liability</SelectItem>
            <SelectItem value="equity">Equity</SelectItem>
            <SelectItem value="revenue">Revenue</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
          onClick={handleSaveNewAccount}
          disabled={isSaving || !newCode.trim() || !newName.trim()}
          title="Save"
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
          onClick={handleCancelAdd}
          disabled={isSaving}
          title="Cancel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
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
          {node.representativeCode && (
            <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">
              {node.representativeCode}
            </span>
          )}
          <span className="flex-1 truncate">{node.name}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => handleAddUnderFolder(path, level, e)}
            title={`Add child account under ${node.name}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); setEditingAccount(account); }}
                  title={`Edit ${account.account_code}`}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleAddUnderAccount(account, path + "/" + account.account_code, e)}
                  title={`Add child under ${account.account_code}`}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {renderInlineAddForm(level, path)}
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

      <Dialog open={!!editingAccount} onOpenChange={(open) => { if (!open) setEditingAccount(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
          </DialogHeader>
          {editingAccount && (
            <AccountEditForm
              account={editingAccount}
              onSuccess={() => {
                setEditingAccount(null);
                onAccountCreated?.();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
