import { Badge } from "@/components/ui/badge";
import { useBusCategories } from "@/hooks/useBusCategories";
import { Bus, GraduationCap, Star, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface BusCategoryBadgeProps {
  categoryId?: string | null;
  subCategoryId?: string | null;
  showSubCategory?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  'bus': Bus,
  'graduation-cap': GraduationCap,
  'star': Star,
  'tag': Tag
};

export function BusCategoryBadge({ 
  categoryId, 
  subCategoryId, 
  showSubCategory = true,
  size = 'md',
  className 
}: BusCategoryBadgeProps) {
  const { getCategoryBadgeInfo } = useBusCategories();
  const { category, subCategory, color, icon } = getCategoryBadgeInfo(categoryId, subCategoryId);

  if (!category) {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "bg-muted/50 text-muted-foreground border-muted",
          size === 'sm' && "text-xs px-1.5 py-0",
          size === 'lg' && "text-sm px-3 py-1",
          className
        )}
      >
        <Tag className={cn("mr-1", size === 'sm' ? "h-3 w-3" : size === 'lg' ? "h-4 w-4" : "h-3.5 w-3.5")} />
        Uncategorized
      </Badge>
    );
  }

  const IconComponent = iconMap[icon] || Bus;
  
  // Determine colors based on category code
  const colorClasses: Record<string, string> = {
    'public_bus': 'bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400',
    'school_bus': 'bg-purple-500/15 text-purple-700 border-purple-500/30 dark:text-purple-400',
    'special_hire': 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
  };

  const badgeColor = colorClasses[category.code] || 'bg-gray-500/15 text-gray-700 border-gray-500/30';

  return (
    <Badge 
      variant="outline"
      className={cn(
        badgeColor,
        "font-medium",
        size === 'sm' && "text-xs px-1.5 py-0",
        size === 'lg' && "text-sm px-3 py-1",
        className
      )}
    >
      <IconComponent className={cn("mr-1", size === 'sm' ? "h-3 w-3" : size === 'lg' ? "h-4 w-4" : "h-3.5 w-3.5")} />
      {showSubCategory && subCategory ? (
        <span>
          {category.name} <span className="opacity-60">|</span> {subCategory.name}
        </span>
      ) : (
        category.name
      )}
    </Badge>
  );
}
