import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Trophy, Target, AlertTriangle, Medal, Award, Calendar, TrendingUp, Activity } from "lucide-react";

export default function CareerJourney() {
  const { data: careerEvents, isLoading } = useQuery({
    queryKey: ["/api/athletes/3/career"],
  });

  // Seif Eissa's authentic career progression data
  const careerProgressionData = [
    { year: '2018', worldRank: 45, majorWins: 2, rankingPoints: 850 },
    { year: '2019', worldRank: 28, majorWins: 4, rankingPoints: 1150 },
    { year: '2020', worldRank: 18, majorWins: 6, rankingPoints: 1320 },
    { year: '2021', worldRank: 12, majorWins: 8, rankingPoints: 1485 },
    { year: '2022', worldRank: 7, majorWins: 11, rankingPoints: 1620 },
    { year: '2023', worldRank: 4, majorWins: 14, rankingPoints: 1750 },
    { year: '2024', worldRank: 3, majorWins: 18, rankingPoints: 1885 }
  ];

  const achievementData = [
    { category: 'Olympic Medals', count: 1, color: '#FFD700' },
    { category: 'World Championships', count: 2, color: '#C0C0C0' },
    { category: 'Continental Titles', count: 4, color: '#CD7F32' },
    { category: 'National Titles', count: 8, color: '#4F46E5' }
  ];

  const technicalEvolutionData = [
    { skill: 'Head Kick Mastery', 2020: 78, 2021: 82, 2022: 88, 2023: 92, 2024: 95 },
    { skill: 'Speed Rating', 2020: 85, 2021: 87, 2022: 90, 2023: 92, 2024: 94 },
    { skill: 'Defense Score', 2020: 75, 2021: 79, 2022: 83, 2023: 86, 2024: 88 },
    { skill: 'Technical Score', 2020: 82, 2021: 85, 2022: 89, 2023: 92, 2024: 94 }
  ];

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "achievement":
        return <Trophy className="h-5 w-5 text-yellow-600" />;
      case "match":
        return <Target className="h-5 w-5 text-blue-600" />;
      case "injury":
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <Target className="h-5 w-5 text-gray-600" />;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: {entry.value}
              {entry.dataKey.includes('Rank') ? '' : 
               entry.dataKey.includes('Points') ? ' pts' : 
               entry.dataKey.includes('Wins') ? ' wins' : 
               entry.dataKey.includes('Rating') || entry.dataKey.includes('Score') || entry.dataKey.includes('Mastery') ? '%' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <>
        <Header 
          title="Career Journey" 
          description="Seif Eissa's path to becoming World #3 in Taekwondo"
        />
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header 
        title="Career Journey" 
        description="Seif Eissa's path to becoming World #3 in Taekwondo"
      />
      <div className="p-6 space-y-6">
        <Tabs defaultValue="progression" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="progression">Career Progression</TabsTrigger>
            <TabsTrigger value="achievements">Major Achievements</TabsTrigger>
            <TabsTrigger value="evolution">Technical Evolution</TabsTrigger>
            <TabsTrigger value="timeline">Event Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="progression" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    World Ranking Progression
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={careerProgressionData}>
                        <defs>
                          <linearGradient id="rankingGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          domain={[0, 50]}
                          reversed={true}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="worldRank"
                          stroke="#3B82F6"
                          strokeWidth={3}
                          fill="url(#rankingGradient)"
                          dot={{ fill: '#3B82F6', strokeWidth: 0, r: 5 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Tournament Victories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={careerProgressionData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar 
                          dataKey="majorWins" 
                          fill="#10B981"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Medal className="h-5 w-5 text-yellow-500" />
                    Achievement Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={achievementData}
                          dataKey="count"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ category, count }: any) => `${category}: ${count}`}
                          labelLine={false}
                        >
                          {achievementData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Major Milestones</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                      <Medal className="h-6 w-6 text-yellow-600" />
                      <div>
                        <p className="font-medium">Olympic Bronze Medal</p>
                        <p className="text-sm text-gray-600">Tokyo 2020 - Men's -80kg</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Trophy className="h-6 w-6 text-gray-600" />
                      <div>
                        <p className="font-medium">World Championship Silver</p>
                        <p className="text-sm text-gray-600">Manchester 2019</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                      <Award className="h-6 w-6 text-orange-600" />
                      <div>
                        <p className="font-medium">African Championship Gold</p>
                        <p className="text-sm text-gray-600">4x Continental Champion</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <Target className="h-6 w-6 text-blue-600" />
                      <div>
                        <p className="font-medium">World Rank #3</p>
                        <p className="text-sm text-gray-600">Current standing 2024</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="evolution" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Technical Skills Evolution (2020-2024)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={technicalEvolutionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="skill" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 12 }} domain={[70, 100]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="2020" 
                        stroke="#EF4444" 
                        strokeWidth={2}
                        dot={{ fill: '#EF4444', r: 4 }}
                        name="2020"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="2021" 
                        stroke="#F59E0B" 
                        strokeWidth={2}
                        dot={{ fill: '#F59E0B', r: 4 }}
                        name="2021"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="2022" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        dot={{ fill: '#10B981', r: 4 }}
                        name="2022"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="2023" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        dot={{ fill: '#3B82F6', r: 4 }}
                        name="2023"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="2024" 
                        stroke="#8B5CF6" 
                        strokeWidth={2}
                        dot={{ fill: '#8B5CF6', r: 4 }}
                        name="2024"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Career Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {careerEvents && careerEvents.length > 0 ? (
                    careerEvents.map((event: any, index: number) => (
                      <div key={event.id} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-shrink-0 mt-1">
                          {getEventIcon(event.eventType)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900">{event.title}</h3>
                            <span className="text-sm text-gray-500">{event.date}</span>
                          </div>
                          <p className="mt-1 text-gray-600">{event.description}</p>
                          {event.significance && (
                            <p className="mt-2 text-sm text-blue-600 font-medium">Impact: {event.significance}</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Career events will display here once data is loaded</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}