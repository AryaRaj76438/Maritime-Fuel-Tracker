import { useGetRoutesComparison } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import { CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";

export default function ComparePage() {
  const { data: comparison, isLoading } = useGetRoutesComparison();

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num);
  const formatPercent = (num: number) => new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2, signDisplay: 'always' }).format(num / 100);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Intensity Comparison</h1>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!comparison) return null;

  const chartData = comparison.comparisons.map(c => ({
    name: c.routeId,
    intensity: c.ghgIntensity,
    isBaseline: c.isBaseline,
    compliant: c.compliant
  }));

  if (comparison.baseline && !chartData.find(d => d.name === comparison.baseline?.routeId)) {
     chartData.unshift({
       name: comparison.baseline.routeId + " (Base)",
       intensity: comparison.baseline.ghgIntensity,
       isBaseline: true,
       compliant: comparison.baseline.compliant
     });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Intensity Comparison</h1>
          <p className="text-muted-foreground">Compare route GHG intensities against established baseline and target.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>GHG Intensity Comparison</CardTitle>
            <CardDescription>Target: {comparison.targetIntensity} gCO2e/MJ</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis domain={['auto', 'auto']} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: 'hsl(var(--muted)/0.5)'}}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                  />
                  <ReferenceLine y={comparison.targetIntensity} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ position: 'top', value: 'Target', fill: 'hsl(var(--destructive))', fontSize: 12 }} />
                  {comparison.baseline && (
                     <ReferenceLine y={comparison.baseline.ghgIntensity} stroke="hsl(var(--primary))" strokeDasharray="3 3" label={{ position: 'bottom', value: 'Baseline', fill: 'hsl(var(--primary))', fontSize: 12 }} />
                  )}
                  <Bar dataKey="intensity" radius={[4, 4, 0, 0]} maxBarSize={50}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.isBaseline ? "hsl(var(--primary))" : (entry.compliant ? "hsl(var(--chart-2))" : "hsl(var(--muted-foreground))")} 
                        fillOpacity={entry.compliant ? 1 : 0.6}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center mt-4 space-x-6 text-sm">
              <div className="flex items-center"><div className="w-3 h-3 bg-primary rounded-sm mr-2" /> Baseline</div>
              <div className="flex items-center"><div className="w-3 h-3 bg-chart-2 rounded-sm mr-2" /> Compliant</div>
              <div className="flex items-center"><div className="w-3 h-3 bg-muted-foreground opacity-60 rounded-sm mr-2" /> Non-Compliant</div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Analysis Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Baseline Route</div>
              {comparison.baseline ? (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md border border-border">
                  <div className="font-medium">{comparison.baseline.routeId}</div>
                  <div className="font-mono">{formatNumber(comparison.baseline.ghgIntensity)}</div>
                </div>
              ) : (
                <div className="text-sm p-3 bg-muted/50 rounded-md border border-border text-muted-foreground flex items-center">
                  <HelpCircle className="h-4 w-4 mr-2" /> No baseline set
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">Compliance Overview</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                  <div className="text-emerald-600 flex items-center mb-1"><CheckCircle2 className="h-4 w-4 mr-1"/> Compliant</div>
                  <div className="text-2xl font-bold">{comparison.comparisons.filter(c => c.compliant).length}</div>
                </div>
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                  <div className="text-destructive flex items-center mb-1"><AlertTriangle className="h-4 w-4 mr-1"/> Deficit</div>
                  <div className="text-2xl font-bold">{comparison.comparisons.filter(c => !c.compliant).length}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Route Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Route ID</TableHead>
                <TableHead>Vessel Type</TableHead>
                <TableHead>Fuel Type</TableHead>
                <TableHead className="text-right">GHG Intensity</TableHead>
                <TableHead className="text-right">vs Baseline</TableHead>
                <TableHead className="text-center">Target</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.comparisons.map((route) => (
                <TableRow key={route.routeId} className={route.isBaseline ? "bg-muted/30" : ""}>
                  <TableCell className="font-mono text-xs">
                    {route.routeId} {route.isBaseline && <Badge variant="secondary" className="ml-2">Baseline</Badge>}
                  </TableCell>
                  <TableCell>{route.vesselType}</TableCell>
                  <TableCell>{route.fuelType}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatNumber(route.ghgIntensity)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {route.percentDiff !== undefined && route.percentDiff !== null ? (
                       <span className={route.percentDiff > 0 ? "text-destructive" : "text-emerald-600"}>
                         {formatPercent(route.percentDiff)}
                       </span>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm text-muted-foreground">{route.targetIntensity}</TableCell>
                  <TableCell className="text-center">
                    {route.compliant ? (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-600/30 bg-emerald-500/10">Compliant</Badge>
                    ) : (
                      <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">Deficit</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
