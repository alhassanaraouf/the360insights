import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Users, 
  Trophy, 
  Target,
  Medal,
  Calendar,
  Globe,
  Sparkles
} from "lucide-react";

interface SportStatisticsProps {
  performanceData?: any[];
}

export default function SportStatistics({ performanceData }: SportStatisticsProps) {
  // Sport-wide analytics data
  const sportMetrics = [
    {
      label: "Global Participation",
      value: 94,
      description: "Athletes across 206 countries",
      trend: "+12% this year",
      color: "bg-blue-500",
      icon: Globe
    },
    {
      label: "Competition Activity",
      value: 87,
      description: "Major tournaments this season",
      trend: "+8% vs last season",
      color: "bg-emerald-500",
      icon: Trophy
    },
    {
      label: "Youth Development",
      value: 92,
      description: "Junior programs worldwide",
      trend: "+15% growth",
      color: "bg-purple-500",
      icon: Target
    },
    {
      label: "Elite Performance",
      value: 89,
      description: "Olympic qualification standards",
      trend: "+5% improvement",
      color: "bg-amber-500",
      icon: Medal
    }
  ];

  const recentHighlights = [
    {
      title: "World Championship Qualifiers",
      subtitle: "Paris 2024 Olympic preparations",
      value: "156 Athletes",
      status: "Active",
      color: "bg-yellow-100 text-yellow-800"
    },
    {
      title: "Asian Games Performance",
      subtitle: "Record-breaking participation",
      value: "89% Success Rate",
      status: "Completed",
      color: "bg-green-100 text-green-800"
    },
    {
      title: "Youth Championships",
      subtitle: "Next generation development",
      value: "12 Countries",
      status: "Upcoming",
      color: "bg-blue-100 text-blue-800"
    }
  ];

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-900 dark:to-purple-950/10">
      <CardHeader className="mobile-card">
        <div className="mobile-flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center mobile-space-x">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex-shrink-0">
              <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0">
              <CardTitle className="mobile-heading">Sport Analytics</CardTitle>
              <p className="mobile-text text-muted-foreground">Global Taekwondo insights</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 self-start lg:self-center">
            <Activity className="h-3 w-3 mr-1" />
            Live Data
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sport Metrics */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Performance Indicators</h3>
          <div className="space-y-4">
            {sportMetrics.map((metric, index) => {
              const IconComponent = metric.icon;
              return (
                <div key={index} className="group relative p-4 rounded-xl bg-gradient-to-r from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-700/50 border hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${metric.color}/10`}>
                        <IconComponent className={`h-4 w-4 ${metric.color.replace('bg-', 'text-')}`} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{metric.label}</p>
                        <p className="text-sm text-muted-foreground">{metric.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground">{metric.value}%</p>
                      <p className="text-xs text-emerald-600 font-medium">{metric.trend}</p>
                    </div>
                  </div>
                  <Progress value={metric.value} className="h-2" />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Sparkles className="h-3 w-3 text-purple-500" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Highlights */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Recent Highlights</h3>
          <div className="space-y-3">
            {recentHighlights.map((highlight, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-white to-gray-50/30 dark:from-gray-800 dark:to-gray-700/30 border">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                    <Calendar className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{highlight.title}</p>
                    <p className="text-xs text-muted-foreground">{highlight.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{highlight.value}</p>
                  </div>
                  <Badge className={`text-xs ${highlight.color}`}>
                    {highlight.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 border border-blue-200 dark:border-blue-800/30">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Active Athletes</p>
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">2,847</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">+156 this month</p>
          </div>
          
          <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/50 border border-emerald-200 dark:border-emerald-800/30">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Performance</p>
            </div>
            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">94.2%</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">+2.1% vs last quarter</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
