import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Athlete } from "@shared/schema";

interface AthleteCardProps {
  athlete: Athlete;
}

export default function AthleteCard({ athlete }: AthleteCardProps) {
  return (
    <Card className="w-full">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center space-x-3 sm:space-x-4 mb-4 sm:mb-6">
          <img 
            src={athlete.profileImage || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150"} 
            alt="Athlete profile" 
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{athlete.name}</h3>
            <p className="text-gray-500 text-sm sm:text-base">{athlete.sport} Player</p>
            <div className="flex items-center mt-1 sm:mt-2 flex-wrap gap-1">
              <span className="text-xl sm:text-2xl font-bold text-primary">{athlete.worldRank}</span>
              <span className="text-xs sm:text-sm text-gray-500">World Rank</span>
              <span className="px-2 py-1 bg-success/10 text-success text-xs rounded-full">
                <TrendingUp className="inline w-3 h-3 mr-1" />+3
              </span>
            </div>
          </div>
        </div>
        
        {/* Readiness Index */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Readiness Index</span>
            <span className="text-base sm:text-lg font-bold text-secondary">{parseFloat(athlete.readinessIndex || "0").toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
            <div 
              className="bg-secondary h-2 sm:h-3 rounded-full transition-all duration-300" 
              style={{ width: `${parseFloat(athlete.readinessIndex || "0")}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Optimal performance window</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{parseFloat(athlete.winRate || "0").toFixed(0)}%</div>
            <div className="text-xs text-gray-500">Win Rate (L3M)</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{athlete.nextMatchDays}</div>
            <div className="text-xs text-gray-500">Days to Next Match</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
