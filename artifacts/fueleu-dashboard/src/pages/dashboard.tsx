import { useGetComplianceSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowDown, ArrowUp, Ship, TrendingDown, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: summary2024, isLoading: loading2024 } = useGetComplianceSummary({ year: 2024 });
  const { data: summary2025, isLoading: loading2025 } = useGetComplianceSummary({ year: 2025 });

  const targetIntensity = 89.3368;

  if (loading2024 || loading2025) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Compliance Overview</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const currentSummary = summary2024;
  if (!currentSummary) return null;

  const chartData = [
    { year: "2024", intensity: summary2024?.averageGhgIntensity || 0, target: targetIntensity },
    { year: "2025", intensity: summary2025?.averageGhgIntensity || 0, target: targetIntensity },
  ];

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compliance Overview</h1>
          <p className="text-muted-foreground">Fleet performance against FuelEU Maritime targets.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ships</CardTitle>
            <Ship className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentSummary.totalShips}</div>
            <p className="text-xs text-muted-foreground mt-1">Active fleet in scope</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ships in Surplus</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{currentSummary.surplusShips}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((currentSummary.surplusShips / currentSummary.totalShips) * 100)}% of fleet
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ships in Deficit</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{currentSummary.deficitShips}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((currentSummary.deficitShips / currentSummary.totalShips) * 100)}% of fleet
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Banked Balance</CardTitle>
            <ArrowUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(currentSummary.totalBanked)}</div>
            <p className="text-xs text-muted-foreground mt-1">gCO2e</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Average GHG Intensity vs Target</CardTitle>
            <CardDescription>Year-over-year comparison (gCO2e/MJ)</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis domain={['dataMin - 5', 'dataMax + 5']} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => formatNumber(val)} />
                  <Tooltip 
                    cursor={{fill: 'hsl(var(--muted)/0.5)'}}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                  />
                  <ReferenceLine y={targetIntensity} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ position: 'top', value: 'Target', fill: 'hsl(var(--destructive))', fontSize: 12 }} />
                  <Bar dataKey="intensity" radius={[4, 4, 0, 0]} maxBarSize={60}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.intensity > targetIntensity ? "hsl(var(--destructive))" : "hsl(var(--primary))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Fleet Compliance Status</CardTitle>
            <CardDescription>2024 Operational Year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium flex items-center"><CheckCircle2 className="h-4 w-4 text-emerald-500 mr-2" /> Surplus</span>
                  <span className="text-muted-foreground">{currentSummary.surplusShips} ships</span>
                </div>
                <Progress value={(currentSummary.surplusShips / currentSummary.totalShips) * 100} className="h-2 [&>div]:bg-emerald-500" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium flex items-center"><AlertTriangle className="h-4 w-4 text-destructive mr-2" /> Deficit</span>
                  <span className="text-muted-foreground">{currentSummary.deficitShips} ships</span>
                </div>
                <Progress value={(currentSummary.deficitShips / currentSummary.totalShips) * 100} className="h-2 [&>div]:bg-destructive" />
              </div>
              <div className="pt-4 border-t border-border mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Average GHG Intensity</span>
                  <span className={`text-lg font-bold ${currentSummary.averageGhgIntensity > targetIntensity ? 'text-destructive' : 'text-emerald-600'}`}>
                    {formatNumber(currentSummary.averageGhgIntensity)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                  <span>Target: {targetIntensity}</span>
                  <span className="flex items-center">
                    {currentSummary.averageGhgIntensity > targetIntensity ? (
                      <><TrendingUp className="h-3 w-3 mr-1 text-destructive" /> {formatNumber(currentSummary.averageGhgIntensity - targetIntensity)} over target</>
                    ) : (
                      <><TrendingDown className="h-3 w-3 mr-1 text-emerald-500" /> {formatNumber(targetIntensity - currentSummary.averageGhgIntensity)} under target</>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
