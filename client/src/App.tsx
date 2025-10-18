import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AthleteProvider } from "@/lib/athlete-context";
import { EgyptFilterProvider } from "@/lib/egypt-filter-context";
import { SportProvider } from "@/lib/sport-context";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Athletes from "@/pages/athletes";
import Athlete360 from "@/pages/athlete360";
import CareerJourney from "@/pages/career-journey";

import AiInsights from "@/pages/ai-insights";
import OpponentAnalysis from "@/pages/opponent-analysis";
import LiveMatch from "@/pages/live-match";
import TrainingPlanner from "@/pages/training-planner";
import RankUp from "@/pages/rank-up";
import SponsorshipHub from "@/pages/sponsorship-hub";
import CompetitionDraws from "@/pages/competition-draws";
import Competitions from "@/pages/competitions";
import CompetitionDetail from "@/pages/competition-detail";
import DrawsheetPage from "@/pages/drawsheet";



import AccountSettings from "@/pages/account-settings";
import DataScraper from "@/pages/data-scraper";
import ResponsiveLayout from "@/components/layout/responsive-layout";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />
      
      {/* Protected routes */}
      {isAuthenticated ? (
        <>
          <Route path="/">
            <ResponsiveLayout>
              <Dashboard />
            </ResponsiveLayout>
          </Route>
          <Route path="/athletes">
            <ResponsiveLayout>
              <Athletes />
            </ResponsiveLayout>
          </Route>
          <Route path="/athlete360">
            <ResponsiveLayout>
              <Athlete360 />
            </ResponsiveLayout>
          </Route>
          <Route path="/career-journey">
            <ResponsiveLayout>
              <CareerJourney />
            </ResponsiveLayout>
          </Route>
          <Route path="/opponent-analysis">
            <ResponsiveLayout>
              <OpponentAnalysis />
            </ResponsiveLayout>
          </Route>
          <Route path="/live-match">
            <ResponsiveLayout>
              <LiveMatch />
            </ResponsiveLayout>
          </Route>
          <Route path="/training-planner">
            <ResponsiveLayout>
              <TrainingPlanner />
            </ResponsiveLayout>
          </Route>
          <Route path="/rank-up">
            <ResponsiveLayout>
              <RankUp />
            </ResponsiveLayout>
          </Route>
          <Route path="/sponsorship-hub">
            <ResponsiveLayout>
              <SponsorshipHub />
            </ResponsiveLayout>
          </Route>
          <Route path="/competition-draws">
            <ResponsiveLayout>
              <CompetitionDraws />
            </ResponsiveLayout>
          </Route>
          <Route path="/competitions">
            <ResponsiveLayout>
              <Competitions />
            </ResponsiveLayout>
          </Route>
          <Route path="/competition/:id">
            <ResponsiveLayout>
              <CompetitionDetail />
            </ResponsiveLayout>
          </Route>
          <Route path="/competition/:competitionId/drawsheet/:weightCategory">
            <ResponsiveLayout>
              <DrawsheetPage />
            </ResponsiveLayout>
          </Route>

          <Route path="/ai-insights">
            <ResponsiveLayout>
              <AiInsights />
            </ResponsiveLayout>
          </Route>

          <Route path="/account-settings">
            <ResponsiveLayout>
              <AccountSettings />
            </ResponsiveLayout>
          </Route>
          <Route path="/data-scraper">
            <ResponsiveLayout>
              <DataScraper />
            </ResponsiveLayout>
          </Route>

        </>
      ) : (
        <>
          {/* Unauthenticated users see landing page on root, login page on /login */}
          <Route path="/" component={Landing} />
          {/* Redirect protected routes to login */}
          <Route path="/rank-up" component={() => <Login />} />
          <Route path="/sponsorship-hub" component={() => <Login />} />
          <Route path="/competition-draws" component={() => <Login />} />
          <Route path="/competitions" component={() => <Login />} />
          <Route path="/competition/:id" component={() => <Login />} />
          <Route path="/athletes" component={() => <Login />} />
          <Route path="/training-planner" component={() => <Login />} />
          <Route path="/ai-insights" component={() => <Login />} />
          <Route path="/opponent-analysis" component={() => <Login />} />
          <Route path="/live-match" component={() => <Login />} />
          <Route path="/account-settings" component={() => <Login />} />
          <Route path="/data-scraper" component={() => <Login />} />
          <Route path="/athlete360" component={() => <Login />} />
          <Route path="/career-journey" component={() => <Login />} />
        </>
      )}
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SportProvider>
        <EgyptFilterProvider>
          <AthleteProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </AthleteProvider>
        </EgyptFilterProvider>
      </SportProvider>
    </QueryClientProvider>
  );
}

export default App;
