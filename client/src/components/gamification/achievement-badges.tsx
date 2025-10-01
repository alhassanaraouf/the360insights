import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Star, Target, Zap, Crown, Shield, Award } from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  unlockedDate?: string;
  progress?: number;
  maxProgress?: number;
}

interface AchievementBadgesProps {
  athleteId: number;
}

export default function AchievementBadges({ athleteId }: AchievementBadgesProps) {
  const achievements: Achievement[] = [
    {
      id: 'first_victory',
      name: 'First Victory',
      description: 'Win your first competitive match',
      icon: <Trophy className="h-6 w-6" />,
      rarity: 'common',
      unlocked: true,
      unlockedDate: '2024-03-15',
    },
    {
      id: 'technique_master',
      name: 'Technique Master',
      description: 'Achieve level 10 in kick techniques',
      icon: <Target className="h-6 w-6" />,
      rarity: 'rare',
      unlocked: true,
      unlockedDate: '2024-04-20',
    },
    {
      id: 'power_striker',
      name: 'Power Striker',
      description: 'Deal maximum damage in 5 consecutive matches',
      icon: <Zap className="h-6 w-6" />,
      rarity: 'epic',
      unlocked: false,
      progress: 3,
      maxProgress: 5,
    },
    {
      id: 'championship_gold',
      name: 'Championship Gold',
      description: 'Win a major championship tournament',
      icon: <Crown className="h-6 w-6" />,
      rarity: 'legendary',
      unlocked: false,
      progress: 0,
      maxProgress: 1,
    },
    {
      id: 'defensive_wall',
      name: 'Defensive Wall',
      description: 'Block 100 opponent attacks',
      icon: <Shield className="h-6 w-6" />,
      rarity: 'rare',
      unlocked: false,
      progress: 67,
      maxProgress: 100,
    },
    {
      id: 'speed_demon',
      name: 'Speed Demon',
      description: 'Achieve maximum agility level',
      icon: <Star className="h-6 w-6" />,
      rarity: 'epic',
      unlocked: false,
      progress: 8,
      maxProgress: 10,
    }
  ];

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'from-gray-400 to-gray-500';
      case 'rare': return 'from-blue-400 to-blue-600';
      case 'epic': return 'from-purple-400 to-purple-600';
      case 'legendary': return 'from-yellow-400 to-orange-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  const getRarityBorder = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-300';
      case 'rare': return 'border-blue-400';
      case 'epic': return 'border-purple-400';
      case 'legendary': return 'border-yellow-400';
      default: return 'border-gray-300';
    }
  };

  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const lockedAchievements = achievements.filter(a => !a.unlocked);

  return (
    <div className="space-y-6">
      {/* Achievement Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {unlockedAchievements.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Unlocked
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {achievements.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {unlockedAchievements.filter(a => a.rarity === 'epic' || a.rarity === 'legendary').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Rare+
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {Math.round((unlockedAchievements.length / achievements.length) * 100)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Complete
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unlocked Achievements */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Award className="h-5 w-5" />
          Unlocked Achievements ({unlockedAchievements.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {unlockedAchievements.map((achievement) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              className="cursor-pointer"
            >
              <Card className={`border-2 ${getRarityBorder(achievement.rarity)} overflow-hidden`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-3 rounded-lg bg-gradient-to-r ${getRarityColor(achievement.rarity)} text-white`}>
                      {achievement.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{achievement.name}</h4>
                        <Badge variant="secondary" className="capitalize text-xs">
                          {achievement.rarity}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {achievement.description}
                      </p>
                      <div className="text-xs text-green-600 dark:text-green-400">
                        Unlocked: {achievement.unlockedDate}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Locked Achievements */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Medal className="h-5 w-5" />
          In Progress ({lockedAchievements.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lockedAchievements.map((achievement) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              className="cursor-pointer"
            >
              <Card className="border-2 border-dashed border-gray-300 dark:border-gray-600 opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-500">
                      {achievement.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-700 dark:text-gray-300">
                          {achievement.name}
                        </h4>
                        <Badge variant="outline" className="capitalize text-xs">
                          {achievement.rarity}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {achievement.description}
                      </p>
                      {achievement.progress !== undefined && achievement.maxProgress && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Progress</span>
                            <span>{achievement.progress}/{achievement.maxProgress}</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}