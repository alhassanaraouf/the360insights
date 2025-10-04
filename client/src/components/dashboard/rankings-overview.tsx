import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Trophy,
  Award,
  TrendingUp,
  TrendingDown,
  Medal,
  Users,
  Crown,
  Star,
  Sparkles,
  Minus,
} from "lucide-react";
import { useLocation } from "wouter";
import RankChangeIndicator from "@/components/ui/rank-change-indicator";
import { calculateRankChange, getRankChangeClasses } from "@/lib/rank-utils";
import { getCountryFlagWithFallback } from "@/lib/country-flags";

interface Athlete {
  id: number;
  name: string;
  worldRank?: number;
  olympicRank?: number;
  worldRankChange?: number;
  olympicRankChange?: number;
  worldPreviousRank?: number;
  olympicPreviousRank?: number;
  worldCategory?: string;
  olympicCategory?: string;
  nationality: string;
  profileImage?: string;
}

interface RankingsOverviewProps {
  athletes: Athlete[];
}

export default function RankingsOverview({ athletes }: RankingsOverviewProps) {
  const [, navigate] = useLocation();

  // Sort athletes by world ranking
  const worldRankings = athletes
    .filter((athlete) => athlete.worldRank)
    .sort((a, b) => (a.worldRank || 999) - (b.worldRank || 999))
    .slice(0, 10);

  // Sort athletes by Olympic ranking
  const olympicRankings = athletes
    .filter((athlete) => athlete.olympicRank)
    .sort((a, b) => (a.olympicRank || 999) - (b.olympicRank || 999))
    .slice(0, 10);

  const handleAthleteClick = (athleteId: number) => {
    navigate(`/athlete360?athlete=${athleteId}`);
  };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full max-w-full">
      {/* World Rankings */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-900 dark:to-blue-950/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <Trophy className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <span className="text-lg font-bold">World Rankings</span>
                <p className="text-sm text-muted-foreground font-normal">
                  Global elite athletes
                </p>
              </div>
            </div>
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
            >
              Top {worldRankings.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {worldRankings.map((athlete, index) => (
              <div
                key={athlete.id}
                onClick={() => handleAthleteClick(athlete.id)}
                className={`group relative flex items-center space-x-4 p-4 rounded-xl transition-all duration-200 cursor-pointer hover:shadow-md ${
                  athlete.worldRank === 1
                    ? "bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border border-yellow-200 dark:border-yellow-800/30"
                    : athlete.worldRank === 2
                      ? "bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 border border-gray-200 dark:border-gray-700"
                      : athlete.worldRank === 3
                        ? "bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-800/30"
                        : "bg-gradient-to-r from-blue-50/50 to-blue-100/50 dark:from-blue-900/10 dark:to-blue-800/10 border border-blue-100 dark:border-blue-800/20 hover:from-blue-100/70 hover:to-blue-200/70 dark:hover:from-blue-900/20 dark:hover:to-blue-800/20"
                }`}
              >
                <div
                  className={`relative flex items-center justify-center w-12 h-12 rounded-full text-sm font-bold shadow-sm ${
                    athlete.worldRank === 1
                      ? "bg-gradient-to-br from-yellow-400 to-yellow-500 text-yellow-900 shadow-yellow-200"
                      : athlete.worldRank === 2
                        ? "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800 shadow-gray-200"
                        : athlete.worldRank === 3
                          ? "bg-gradient-to-br from-orange-400 to-orange-500 text-orange-900 shadow-orange-200"
                          : "bg-gradient-to-br from-blue-400 to-blue-500 text-blue-900 shadow-blue-200"
                  }`}
                >
                  {athlete.worldRank}
                  {athlete.worldRank === 1 && (
                    <Crown className="absolute -top-1 -right-1 h-4 w-4 text-yellow-600" />
                  )}
                </div>

                <Avatar className="h-12 w-12 border-2 border-white dark:border-gray-800 shadow-sm">
                  <AvatarImage src={athlete.profileImage} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 font-semibold">
                    {athlete.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="font-semibold text-foreground truncate">
                      {athlete.name}
                    </p>
                    {athlete.worldRank && athlete.worldRank <= 3 && (
                      <Star
                        className={`h-4 w-4 ${
                          athlete.worldRank === 1
                            ? "text-yellow-500"
                            : athlete.worldRank === 2
                              ? "text-gray-500"
                              : "text-orange-500"
                        }`}
                      />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="mr-1">{getCountryFlagWithFallback(athlete.nationality)}</span>
                    {athlete.nationality} • {athlete.worldCategory}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {athlete.worldRank && athlete.worldRank <= 3 && (
                    <Medal
                      className={`h-5 w-5 ${
                        athlete.worldRank === 1
                          ? "text-yellow-500"
                          : athlete.worldRank === 2
                            ? "text-gray-500"
                            : "text-orange-500"
                      }`}
                    />
                  )}
                  {athlete.worldRank && (
                    <div className="flex items-center">
                      {(() => {
                        const rankChange = calculateRankChange(athlete.worldRank, athlete.worldPreviousRank);
                        if (!rankChange) return null;
                        
                        const iconClass = "h-3 w-3";
                        const Icon = rankChange.direction === 'up' ? TrendingUp 
                          : rankChange.direction === 'down' ? TrendingDown 
                          : rankChange.direction === 'new' ? Star
                          : Minus;
                        
                        return (
                          <div className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md ${getRankChangeClasses(rankChange.color)}`}>
                            <Icon className={iconClass} />
                            <span>{rankChange.displayText}</span>
                          </div>
                        );
                      })()} 
                    </div>
                  )}
                </div>
              </div>
            ))}
            {worldRankings.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                  <Trophy className="h-8 w-8 opacity-50" />
                  <Sparkles className="absolute -top-1 -right-1 h-4 w-4 opacity-30" />
                </div>
                <p className="font-medium">No world rankings available</p>
                <p className="text-sm mt-1 opacity-75">
                  Rankings will appear as data becomes available
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Olympic Rankings */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-amber-50/50 dark:from-gray-900 dark:to-amber-950/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <span className="text-lg font-bold">Olympic Rankings</span>
                <p className="text-sm text-muted-foreground font-normal">
                  Tokyo 2024 qualified
                </p>
              </div>
            </div>
            <Badge
              variant="secondary"
              className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
            >
              Elite {olympicRankings.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {olympicRankings.map((athlete, index) => (
              <div
                key={athlete.id}
                onClick={() => handleAthleteClick(athlete.id)}
                className={`group relative flex items-center space-x-4 p-4 rounded-xl transition-all duration-200 cursor-pointer hover:shadow-md ${
                  athlete.olympicRank === 1
                    ? "bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-amber-200 dark:border-amber-800/30"
                    : athlete.olympicRank === 2
                      ? "bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/50 border border-gray-200 dark:border-gray-700"
                      : athlete.olympicRank === 3
                        ? "bg-gradient-to-r from-orange-50 to-amber-50/70 dark:from-orange-900/20 dark:to-amber-900/15 border border-orange-200 dark:border-orange-800/30"
                        : "bg-gradient-to-r from-amber-50/50 to-amber-100/50 dark:from-amber-900/10 dark:to-amber-800/10 border border-amber-100 dark:border-amber-800/20 hover:from-amber-100/70 hover:to-amber-200/70 dark:hover:from-amber-900/20 dark:hover:to-amber-800/20"
                }`}
              >
                <div
                  className={`relative flex items-center justify-center w-12 h-12 rounded-full text-sm font-bold shadow-sm ${
                    athlete.olympicRank === 1
                      ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-amber-900 shadow-amber-200"
                      : athlete.olympicRank === 2
                        ? "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800 shadow-gray-200"
                        : athlete.olympicRank === 3
                          ? "bg-gradient-to-br from-orange-400 to-amber-500 text-amber-900 shadow-amber-200"
                          : "bg-gradient-to-br from-amber-400 to-amber-500 text-amber-900 shadow-amber-200"
                  }`}
                >
                  {athlete.olympicRank}
                  {athlete.olympicRank === 1 && (
                    <Crown className="absolute -top-1 -right-1 h-4 w-4 text-amber-600" />
                  )}
                </div>

                <Avatar className="h-12 w-12 border-2 border-white dark:border-gray-800 shadow-sm">
                  <AvatarImage src={athlete.profileImage} />
                  <AvatarFallback className="bg-gradient-to-br from-amber-100 to-amber-200 text-amber-800 font-semibold">
                    {athlete.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="font-semibold text-foreground truncate">
                      {athlete.name}
                    </p>
                    {athlete.olympicRank && athlete.olympicRank <= 3 && (
                      <Star
                        className={`h-4 w-4 ${
                          athlete.olympicRank === 1
                            ? "text-yellow-500"
                            : athlete.olympicRank === 2
                              ? "text-gray-500"
                              : "text-orange-500"
                        }`}
                      />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="mr-1">{getCountryFlagWithFallback(athlete.nationality)}</span>
                    {athlete.nationality} • {athlete.olympicCategory}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {athlete.olympicRank && athlete.olympicRank <= 3 && (
                    <Medal
                      className={`h-5 w-5 ${
                        athlete.olympicRank === 1
                          ? "text-yellow-500"
                          : athlete.olympicRank === 2
                            ? "text-gray-500"
                            : "text-orange-500"
                      }`}
                    />
                  )}
                  {athlete.olympicRank && (
                    <div className="flex items-center">
                      {(() => {
                        const rankChange = calculateRankChange(athlete.olympicRank, athlete.olympicPreviousRank);
                        if (!rankChange) return null;
                        
                        const iconClass = "h-3 w-3";
                        const Icon = rankChange.direction === 'up' ? TrendingUp 
                          : rankChange.direction === 'down' ? TrendingDown 
                          : rankChange.direction === 'new' ? Star
                          : Minus;
                        
                        return (
                          <div className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md ${getRankChangeClasses(rankChange.color)}`}>
                            <Icon className={iconClass} />
                            <span>{rankChange.displayText}</span>
                          </div>
                        );
                      })()} 
                    </div>
                  )}
                </div>
              </div>
            ))}
            {olympicRankings.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                  <Award className="h-8 w-8 opacity-50" />
                  <Sparkles className="absolute -top-1 -right-1 h-4 w-4 opacity-30" />
                </div>
                <p className="font-medium">No Olympic rankings available</p>
                <p className="text-sm mt-1 opacity-75">
                  Olympic ranked athletes will appear here
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
