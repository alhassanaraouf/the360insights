import { calculateRankChange, getRankChangeClasses, type RankChange } from "@/lib/rank-utils";
import { TrendingUp, TrendingDown, Minus, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RankChangeIndicatorProps {
  currentRank: number | null;
  previousRank: number | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function RankChangeIndicator({ 
  currentRank, 
  previousRank, 
  size = 'md',
  className 
}: RankChangeIndicatorProps) {
  const rankChange = calculateRankChange(currentRank, previousRank);

  if (!rankChange) {
    return null;
  }

  const getIcon = (direction: RankChange['direction']) => {
    const iconProps = {
      className: cn(
        size === 'sm' && "h-3 w-3",
        size === 'md' && "h-3.5 w-3.5", 
        size === 'lg' && "h-4 w-4"
      )
    };

    switch (direction) {
      case 'up':
        return <TrendingUp {...iconProps} />;
      case 'down':
        return <TrendingDown {...iconProps} />;
      case 'same':
        return <Minus {...iconProps} />;
      case 'new':
        return <Star {...iconProps} />;
      default:
        return <Minus {...iconProps} />;
    }
  };

  const sizeClasses = {
    sm: "text-sm px-2 py-0.5",
    md: "text-base px-2.5 py-1", 
    lg: "text-lg px-3 py-1.5"
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "inline-flex items-center gap-1.5 border-none font-bold",
        getRankChangeClasses(rankChange.color),
        sizeClasses[size],
        className
      )}
      data-testid={`rank-change-${rankChange.direction}`}
    >
      {getIcon(rankChange.direction)}
      <span>{rankChange.displayText}</span>
    </Badge>
  );
}

// Export for reuse in other components
export { calculateRankChange } from "@/lib/rank-utils";