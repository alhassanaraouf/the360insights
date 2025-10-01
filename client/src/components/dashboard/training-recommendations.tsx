import { Card, CardContent } from "@/components/ui/card";
import { Dumbbell } from "lucide-react";
import type { TrainingRecommendation } from "@shared/schema";

interface TrainingRecommendationsProps {
  recommendations: TrainingRecommendation[];
}

export default function TrainingRecommendations({ recommendations }: TrainingRecommendationsProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Dumbbell className="text-accent mr-2" />
          AI Training Recommendations
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Priority Drills (This Week)</h4>
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <div key={rec.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{rec.drillName}</p>
                    <p className="text-sm text-gray-600">{rec.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-accent">
                      +{parseFloat(rec.expectedUplift || "0").toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-500">Expected Uplift</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Tactical Focus</h4>
            <div className="space-y-3">
              <div className="p-3 bg-primary/5 rounded-lg">
                <h5 className="font-medium text-gray-900 mb-2">vs. Rafael Silva Strategy</h5>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Target his backhand with deep shots</li>
                  <li>• Use slice to disrupt his rhythm</li>
                  <li>• Come to net on short balls</li>
                </ul>
              </div>
              
              <div className="p-3 bg-secondary/5 rounded-lg">
                <h5 className="font-medium text-gray-900 mb-2">Physical Preparation</h5>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Core stability exercises (3x/week)</li>
                  <li>• Lateral movement drills</li>
                  <li>• Recovery protocols</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
