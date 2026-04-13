import { useState } from "react";
import { useGetRoutes, useSetBaseline, getGetRoutesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function RoutesPage() {
  const [year, setYear] = useState<string>("2024");
  const [vesselType, setVesselType] = useState<string>("all");
  
  const queryClient = useQueryClient();
  
  const queryParams = {
    year: parseInt(year),
    ...(vesselType !== "all" ? { vesselType } : {})
  };

  const { data: routes, isLoading } = useGetRoutes(queryParams, { query: { enabled: true } });
  const setBaselineMutation = useSetBaseline();

  const handleSetBaseline = (routeId: string) => {
    setBaselineMutation.mutate(
      { routeId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetRoutesQueryKey(queryParams) });
        }
      }
    );
  };

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Route Registry</h1>
          <p className="text-muted-foreground">Manage vessel routes and establish compliance baselines.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between bg-muted/50 border-b border-border pb-4">
          <CardTitle className="text-lg font-medium flex items-center">
            Route Data
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 ml-2 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Data from verified voyage reports.</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <div className="flex space-x-2">
            <Select value={vesselType} onValueChange={setVesselType}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Vessel Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Container">Container</SelectItem>
                <SelectItem value="Bulk Carrier">Bulk Carrier</SelectItem>
                <SelectItem value="Tanker">Tanker</SelectItem>
                <SelectItem value="Ro-Ro">Ro-Ro</SelectItem>
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[120px] bg-background">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Route ID</TableHead>
                <TableHead>Ship ID</TableHead>
                <TableHead>Vessel Type</TableHead>
                <TableHead>Fuel Type</TableHead>
                <TableHead className="text-right">GHG Intensity</TableHead>
                <TableHead className="text-right">Consumption (t)</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading routes...</TableCell>
                </TableRow>
              ) : routes && routes.length > 0 ? (
                routes.map((route) => (
                  <TableRow key={route.id}>
                    <TableCell className="font-mono text-xs">{route.routeId}</TableCell>
                    <TableCell className="font-medium">{route.shipId}</TableCell>
                    <TableCell>{route.vesselType}</TableCell>
                    <TableCell>{route.fuelType}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatNumber(route.ghgIntensity)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatNumber(route.fuelConsumption)}</TableCell>
                    <TableCell className="text-center">
                      {route.isBaseline ? (
                        <Badge variant="default" className="bg-primary hover:bg-primary">Baseline</Badge>
                      ) : (
                        <Badge variant="outline">Recorded</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!route.isBaseline && (
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleSetBaseline(route.routeId)}
                          disabled={setBaselineMutation.isPending}
                        >
                          {setBaselineMutation.isPending ? "Setting..." : "Set Baseline"}
                        </Button>
                      )}
                      {route.isBaseline && (
                        <Button variant="ghost" size="sm" disabled className="opacity-50">
                          <Check className="h-4 w-4 mr-1" /> Set
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No routes found matching criteria.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
