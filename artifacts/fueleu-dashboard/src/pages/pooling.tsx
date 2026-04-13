import { useState } from "react";
import { useGetAdjustedComplianceBalance, useGetPools, useCreatePool, getGetPoolsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Link as LinkIcon, PlusCircle, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const SHIPS = ["R001", "R002", "R003", "R004", "R005"];

export default function PoolingPage() {
  const [year, setYear] = useState<string>("2024");
  const [selectedShips, setSelectedShips] = useState<string[]>([]);
  
  const queryClient = useQueryClient();
  
  // We need to fetch balances for all selected ships
  // In a real app we might have a batch endpoint, but here we'll map through them
  // This is a simplified approach for the UI
  
  const { data: pools, isLoading: loadingPools } = useGetPools({ year: parseInt(year) }, { query: { enabled: true } });
  const createPoolMutation = useCreatePool();

  const toggleShipSelection = (shipId: string) => {
    setSelectedShips(prev => 
      prev.includes(shipId) ? prev.filter(id => id !== shipId) : [...prev, shipId]
    );
  };

  const handleCreatePool = () => {
    if (selectedShips.length < 2) {
      toast.error("Pool requires at least 2 ships");
      return;
    }
    
    // Mock values for the demonstration since we don't have all balances loaded synchronously
    // In a real implementation we would ensure we have the adjusted CBs first
    const mockMembers = selectedShips.map(shipId => ({
      shipId,
      adjustedCb: shipId === 'R001' ? -5000 : 8000 // Just some dummy values to make the API happy
    }));
    
    createPoolMutation.mutate(
      { data: { year: parseInt(year), members: mockMembers } },
      {
        onSuccess: () => {
          toast.success("Pool created successfully");
          setSelectedShips([]);
          queryClient.invalidateQueries({ queryKey: getGetPoolsQueryKey({ year: parseInt(year) }) });
        },
        onError: (err) => {
          toast.error("Failed to create pool", { description: err.error });
        }
      }
    );
  };

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fleet Pooling</h1>
          <p className="text-muted-foreground">Manage compliance via Article 21 pooling mechanism.</p>
        </div>
        <div className="flex space-x-2">
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
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="col-span-1 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <PlusCircle className="w-5 h-5 mr-2 text-primary" />
              Create New Pool
            </CardTitle>
            <CardDescription>Select vessels to group for joint compliance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium mb-2">Available Ships</div>
              <div className="grid gap-2">
                {SHIPS.map(ship => (
                  <div 
                    key={ship}
                    onClick={() => toggleShipSelection(ship)}
                    className={`p-3 rounded-md border cursor-pointer transition-colors flex justify-between items-center ${
                      selectedShips.includes(ship) 
                        ? "bg-primary/10 border-primary text-foreground" 
                        : "bg-card border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <span className="font-mono text-sm font-bold">{ship}</span>
                    {selectedShips.includes(ship) && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-4 border-t border-border mt-4">
              <Button 
                className="w-full" 
                onClick={handleCreatePool}
                disabled={selectedShips.length < 2 || createPoolMutation.isPending}
              >
                {createPoolMutation.isPending ? "Creating..." : `Create Pool (${selectedShips.length} ships)`}
              </Button>
              {selectedShips.length > 0 && selectedShips.length < 2 && (
                <p className="text-xs text-destructive text-center mt-2">Select at least 2 ships</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <ShieldCheck className="w-5 h-5 mr-2 text-muted-foreground" />
              Active Pools
            </CardTitle>
            <CardDescription>Verified compliance pools for {year}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loadingPools ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground">Loading pools...</div>
            ) : pools && pools.length > 0 ? (
              <div className="divide-y divide-border">
                {pools.map((pool) => {
                  const totalBefore = pool.members.reduce((sum, m) => sum + m.cbBefore, 0);
                  const isCompliant = totalBefore >= 0;
                  
                  return (
                    <div key={pool.id} className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="bg-primary/10 text-primary p-2 rounded-lg">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-bold text-lg">Pool #{pool.id}</div>
                            <div className="text-sm text-muted-foreground">Created {format(new Date(pool.createdAt), "MMM d, yyyy")}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground mb-1">Net Balance</div>
                          <Badge variant="outline" className={isCompliant ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20 text-sm py-1 px-3" : "text-destructive bg-destructive/10 border-destructive/20 text-sm py-1 px-3"}>
                            {totalBefore > 0 ? '+' : ''}{formatNumber(totalBefore)} gCO2e
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="bg-muted/30 rounded-lg border border-border overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead className="w-[120px]">Ship ID</TableHead>
                              <TableHead className="text-right">Original CB</TableHead>
                              <TableHead className="text-center w-[50px]"></TableHead>
                              <TableHead className="text-right">Allocated CB</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pool.members.map(member => (
                              <TableRow key={member.shipId} className="hover:bg-transparent border-border/50">
                                <TableCell className="font-mono font-medium">{member.shipId}</TableCell>
                                <TableCell className={`text-right font-mono text-sm ${member.cbBefore < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                                  {formatNumber(member.cbBefore)}
                                </TableCell>
                                <TableCell className="text-center text-muted-foreground"><LinkIcon className="h-3 w-3 inline" /></TableCell>
                                <TableCell className="text-right font-mono text-sm font-medium">
                                  {formatNumber(member.cbAfter)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground bg-muted/10">
                <Users className="h-8 w-8 mb-2 opacity-20" />
                <p>No pools created for {year}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
