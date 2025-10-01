import { Card, CardContent } from "@/components/ui/card";
import { Plus, AlertTriangle } from "lucide-react";
import type { Strength, Weakness } from "@shared/schema";

interface StrengthsWeaknessesProps {
  strengths: Strength[];
  weaknesses: Weakness[];
}

export default function StrengthsWeaknesses({ strengths, weaknesses }: StrengthsWeaknessesProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Strengths Card */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Plus className="text-success mr-2" />
            Top Strengths
          </h3>
          <div className="space-y-4">
            {strengths.map((strength) => (
              <div key={strength.id} className="flex items-center justify-between p-3 bg-success/5 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{strength.name}</p>
                  <p className="text-sm text-gray-600">{strength.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-success">{strength.score}</div>
                  <div className="text-xs text-gray-500">KPI Score</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weaknesses Card */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="text-warning mr-2" />
            Areas for Improvement
          </h3>
          <div className="space-y-4">
            {weaknesses.map((weakness) => {
              const score = weakness.score;
              const severity = score < 60 ? 'danger' : 'warning';
              const bgColor = severity === 'danger' ? 'bg-danger/5' : 'bg-warning/5';
              const textColor = severity === 'danger' ? 'text-danger' : 'text-warning';
              
              return (
                <div key={weakness.id} className={`flex items-center justify-between p-3 ${bgColor} rounded-lg`}>
                  <div>
                    <p className="font-medium text-gray-900">{weakness.name}</p>
                    <p className="text-sm text-gray-600">{weakness.description}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${textColor}`}>{score}</div>
                    <div className="text-xs text-gray-500">KPI Score</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
