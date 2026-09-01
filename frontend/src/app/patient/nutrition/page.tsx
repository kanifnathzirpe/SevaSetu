"use client";

import { useQuery } from "@tanstack/react-query";
import { Apple, Flame, Salad, UtensilsCrossed } from "lucide-react";

import { DonutChart } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingBlock } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

interface NutritionPlan {
  bmi: number;
  band: string;
  target_calories: number;
  macros: { carbs_g: number; protein_g: number; fat_g: number };
  meal_plan: { meal: string; items: string }[];
  tips: string[];
}

export default function NutritionPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["patient", "nutrition"],
    queryFn: () => api.get<NutritionPlan>("/api/v1/patient/nutrition"),
  });

  if (isLoading || !data) return <LoadingBlock rows={4} />;

  const macroData = [
    { name: "Carbohydrates", grams: data.macros.carbs_g },
    { name: "Protein", grams: data.macros.protein_g },
    { name: "Fat", grams: data.macros.fat_g },
  ];

  return (
    <>
      <PageHeader
        title="Nutrition plan"
        description="Locally available, affordable Maharashtrian meals matched to your body mass index"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Body mass index" value={data.bmi} hint={data.band} icon={Salad} tone="primary" index={0} />
        <StatCard label="Daily calories" value={data.target_calories} hint="Target intake" icon={Flame} tone="warning" index={1} />
        <StatCard label="Protein target" value={`${data.macros.protein_g} g`} hint="Per day" icon={Apple} tone="success" index={2} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-[var(--primary)]" /> Daily meal plan
            </CardTitle>
            <CardDescription>Built around jowar, bajra, dal and seasonal vegetables</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.meal_plan.map((meal) => (
              <div key={meal.meal} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-4">
                <p className="font-semibold">{meal.meal}</p>
                <p className="text-sm text-[var(--muted-foreground)]">{meal.items}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Macronutrient split</CardTitle>
            </CardHeader>
            <CardContent>
              <DonutChart data={macroData} nameKey="name" valueKey="grams" height={220} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Health tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {data.tips.map((tip) => (
                  <li key={tip} className="flex gap-2">
                    <span className="text-[var(--success)]">•</span> {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
