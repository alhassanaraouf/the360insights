import { Card, CardContent } from "@/components/ui/card";
import { Target, RotateCcw, Activity, Brain, TrendingUp, TrendingDown } from "lucide-react";
import type { KpiMetric } from "@shared/schema";

interface KpiMetricsProps {
  kpis: KpiMetric[];
}

const getIcon = (metricName: string) => {
  switch (metricName.toLowerCase()) {
    case "serve accuracy":
      return Target;
    case "return game":
      return RotateCcw;
    case "court coverage":
      return Activity;
    case "mental resilience":
      return Brain;
    default:
      return Target;
  }
};

const getIconColor = (metricName: string) => {
  switch (metricName.toLowerCase()) {
    case "serve accuracy":
      return "text-primary";
    case "return game":
      return "text-secondary";
    case "court coverage":
      return "text-accent";
    case "mental resilience":
      return "text-purple-600";
    default:
      return "text-primary";
  }
};

const getBgColor = (metricName: string) => {
  switch (metricName.toLowerCase()) {
    case "serve accuracy":
      return "bg-primary/10";
    case "return game":
      return "bg-secondary/10";
    case "court coverage":
      return "bg-accent/10";
    case "mental resilience":
      return "bg-purple-100";
    default:
      return "bg-primary/10";
  }
};

export default function KpiMetrics({ kpis }: KpiMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi) => {
        const Icon = getIcon(kpi.metricName);
        const trend = parseFloat(kpi.trend || "0");
        const isPositive = trend > 0;
        
        return (
          <Card key={kpi.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{kpi.metricName}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {parseFloat(kpi.value).toFixed(1)}%
                  </p>
                </div>
                <div className={`w-12 h-12 ${getBgColor(kpi.metricName)} rounded-lg flex items-center justify-center`}>
                  <Icon className={`${getIconColor(kpi.metricName)}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-xs ${isPositive ? 'text-success' : 'text-warning'}`}>
                  {isPositive ? (
                    <TrendingUp className="inline w-3 h-3 mr-1" />
                  ) : (
                    <TrendingDown className="inline w-3 h-3 mr-1" />
                  )}
                  {isPositive ? '+' : ''}{trend.toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500 ml-2">vs last month</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
