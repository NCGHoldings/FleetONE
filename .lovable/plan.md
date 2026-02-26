

# Show Account Codes on All Tree Levels (Folder Nodes)

## Problem
Currently, only level-5 leaf accounts display their `account_code` / GL code. The intermediate folder nodes (ASSETS, NON CURRENT ASSET, PROPERTY PLANT & EQUIPMENT, LAND, etc.) show only names with no code, requiring you to drill down to the deepest level to see any codes.

## Solution
Derive a representative GL code for each folder node from its child accounts' common prefix, padded with zeros. For example:
- **ASSETS** -> `10000000` (all children start with `1`)
- **NON CURRENT ASSET** -> `11000000` (all children start with `11`)
- **PROPERTY, PLANT & EQUIPMENT - COST** -> `11100000` (children start with `111`)
- **LAND** (level 4 folder) -> `11101000` (children start with `11101`)

## Changes to: `src/components/accounting/ChartOfAccountsTree.tsx`

### 1. Add a `representativeCode` field to the `TreeNode` interface
```text
interface TreeNode {
  name: string;
  accounts: Account[];
  children: Map<string, TreeNode>;
  totalBalance: number;
  representativeCode: string;  // <-- new field
}
```

### 2. Compute the representative code during tree building
When creating each tree node, collect all descendant account codes and compute the longest common prefix (LCP). Pad the LCP with zeros to the standard 8-character code length.

Example logic:
- Children of ASSETS folder: `11101001`, `11102001`, `12101001`, etc.
- LCP = `1` -> pad to `10000000`

### 3. Display the code on folder rows
In `renderTreeNode`, add the representative code in a `font-mono` span (same style as leaf account codes) between the folder icon and the folder name:

```text
<Folder icon> <code in mono text> <folder name>    <balance>
```

This matches the leaf account row layout where the code appears before the name.

### 4. Collapsed view also shows codes
Since the code is shown directly on the folder row (not inside the expanded children), it is always visible whether the folder is collapsed or expanded. This addresses the requirement to "see codes even when collapsed."

## Technical Details

**Common prefix computation:**
- Collect all `account_code` values from `node.accounts` plus recursively from `node.children`
- Find the longest common prefix string
- Pad with `0` to reach the standard code length (8 chars, matching existing codes like `11101001`)
- If no common prefix, show nothing

**Node initialization change (in the `useMemo` tree builder):**
- Initialize `representativeCode: ""` when creating nodes
- After tree is fully built, run a recursive pass to compute codes bottom-up

**Render change (line ~444 area):**
- Add: `{node.representativeCode && <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">{node.representativeCode}</span>}` before the node name span

