import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Activity,
  BarChart3,
  Shield,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import logoImage from "@assets/76391ba4-3093-4647-ba0e-5a5f17895db7_1760365957109.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="flex items-center justify-center">
              <img
                src={logoImage}
                alt="The360 Insights Logo"
                className="h-50 w-auto object-contain"
              />
            </div>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Advanced sports analytics platform for Taekwondo athletes. Get
            AI-powered insights, opponent analysis, training recommendations,
            and injury prevention strategies.
          </p>
          <Button
            size="lg"
            className="text-lg px-8 py-4"
            onClick={() => (window.location.href = "/login")}
          >
            Get Started
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full w-fit mb-4">
                <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>
                Track KPIs, analyze trends, and monitor your athletic
                performance with comprehensive dashboards.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full w-fit mb-4">
                <Target className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>AI-Powered Insights</CardTitle>
              <CardDescription>
                Get intelligent opponent analysis, strategic recommendations,
                and personalized training plans.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full w-fit mb-4">
                <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle>Injury Prevention</CardTitle>
              <CardDescription>
                Predictive health monitoring and recovery protocols to keep you
                at peak performance.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-full w-fit mb-4">
                <Activity className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle>Real-time Analysis</CardTitle>
              <CardDescription>
                Live match analysis with tactical suggestions and adaptive
                recommendations during competition.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="bg-red-100 dark:bg-red-900 p-3 rounded-full w-fit mb-4">
                <Users className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle>Opponent Intelligence</CardTitle>
              <CardDescription>
                Comprehensive opponent profiles with tactical analysis and
                strategic matchup insights.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="bg-indigo-100 dark:bg-indigo-900 p-3 rounded-full w-fit mb-4">
                <Trophy className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <CardTitle>Career Tracking</CardTitle>
              <CardDescription>
                Document achievements, track milestones, and visualize your
                athletic journey over time.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-blue-600 text-white rounded-lg p-12">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Elevate Your Performance?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join elite Taekwondo athletes using AI-powered analytics to gain
            competitive advantage.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="text-lg px-8 py-4"
            onClick={() => (window.location.href = "/login")}
          >
            Start Your Journey
          </Button>
        </div>
      </div>
    </div>
  );
}
