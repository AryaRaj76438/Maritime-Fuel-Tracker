import { useState } from "react";
import { useGetComplianceBalance, useGetBankingRecords, useBankSurplus, useApplyBanked, getGetComplianceBalanceQueryKey, getGetBankingRecordsQueryKey, getGetComplianceSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownRight, ArrowUpRight, PiggyBank, History } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const SHIPS = ["R001", "R002", "R003", "R004", "R005"];

export default function BankingPage() {
  const [shipId, setShipId] = useState<string>("R001");
  const [year, setYear] = useState<string>("2024");
  const [bankAmount, setBankAmount] = useState<string>("");
  const [applyAmount, setApplyAmount] = useState<string>("");

  const queryClient = useQueryClient();
  const queryParams = { shipId, year: parseInt(year) };

  const { data: balance, isLoading: loadingBalance } = useGetComplianceBalance(queryParams, { query: { enabled: true } });
  const { data: records, isLoading: loadingRecords } = useGetBankingRecords(queryParams, { query: { enabled: true } });

  const bankMutation = useBankSurplus();
  const applyMutation = useApplyBanked();

  const handleBank = () => {
    if (!bankAmount || isNaN(Number(bankAmount))) return;
    
    bankMutation.mutate(
      { data: { shipId, year: parseInt(year), amount: Number(bankAmount) } },
      {
        onSuccess: () => {
          toast.success("Surplus banked successfully");
          setBankAmount("");
          queryClient.invalidateQueries({ queryKey: getGetComplianceBalanceQueryKey(queryParams) });
          queryClient.invalidateQueries({ queryKey: getGetBankingRecordsQueryKey(queryParams) });
          queryClient.invalidateQueries({ queryKey: getGetComplianceSummaryQueryKey({ year: parseInt(year) }) });
        },
        onError: (err) => {
          toast.error("Failed to bank surplus", { description: err.error });
        }
      }
    );
  };

  const handleApply = () => {
    if (!applyAmount || isNaN(Number(applyAmount))) return;
    
    applyMutation.mutate(
      { data: { shipId, year: parseInt(year), amount: Number(applyAmount) } },
      {
        onSuccess: () => {
          toast.success("Banked surplus applied successfully");
          setApplyAmount("");
          queryClient.invalidateQueries({ queryKey: getGetComplianceBalanceQueryKey(queryParams) });
          queryClient.invalidateQueries({ queryKey: getGetBankingRecordsQueryKey(queryParams) });
          queryClient.invalidateQueries({ queryKey: getGetComplianceSummaryQueryKey({ year: parseInt(year) }) });
        },
        onError: (err) => {
          toast.error("Failed to apply banked surplus", { description: err.error });
        }
      }
    );
  };

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num);

  const isSurplus = balance?.status === 'surplus';
  const isDeficit = balance?.status === 'deficit';
  const cbValue = balance?.cbGco2eq || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Banking Flexibility</h1>
          <p className="text-muted-foreground">Manage compliance balance through Article 20 banking mechanism.</p>
        </div>
        <div className="flex space-x-2">
          <Select value={shipId} onValueChange={setShipId}>
            <SelectTrigger className="w-[150px] bg-background">
              <SelectValue placeholder="Ship ID" />
            </SelectTrigger>
            <SelectContent>
              {SHIPS.map(id => <SelectItem key={id} value={id}>{id}</SelectItem>)}
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
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center">
              <PiggyBank className="w-5 h-5 mr-2 text-primary" />
              Compliance Balance
            </CardTitle>
            <CardDescription>Current unadjusted balance for {shipId} ({year})</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingBalance ? (
              <div className="h-24 flex items-center justify-center text-muted-foreground">Loading balance...</div>
            ) : balance ? (
              <div className="space-y-6">
                <div className="flex justify-between items-end border-b border-border pb-6">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Current CB (gCO2e)</div>
                    <div className={`text-4xl font-bold ${isSurplus ? 'text-emerald-600' : isDeficit ? 'text-destructive' : 'text-foreground'}`}>
                      {cbValue > 0 ? '+' : ''}{formatNumber(cbValue)}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${isSurplus ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : isDeficit ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-muted text-muted-foreground'}`}>
                    {balance.status.toUpperCase()}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <h4 className="text-sm font-medium mb-3">Banking Actions</h4>
                    
                    {isSurplus && (
                      <div className="space-y-3">
                        <Label htmlFor="bankAmount">Amount to Bank</Label>
                        <div className="flex space-x-2">
                          <Input 
                            id="bankAmount" 
                            type="number" 
                            value={bankAmount} 
                            onChange={(e) => setBankAmount(e.target.value)}
                            placeholder={`Max: ${formatNumber(cbValue)}`}
                            max={cbValue}
                            className="bg-background"
                          />
                          <Button onClick={handleBank} disabled={bankMutation.isPending || !bankAmount || Number(bankAmount) <= 0 || Number(bankAmount) > cbValue}>
                            {bankMutation.isPending ? "Processing..." : "Bank"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {isDeficit && (
                      <div className="space-y-3">
                        <Label htmlFor="applyAmount">Amount to Apply (from previous year)</Label>
                        <div className="flex space-x-2">
                          <Input 
                            id="applyAmount" 
                            type="number" 
                            value={applyAmount} 
                            onChange={(e) => setApplyAmount(e.target.value)}
                            placeholder={`Needed: ${formatNumber(Math.abs(cbValue))}`}
                            className="bg-background"
                          />
                          <Button onClick={handleApply} disabled={applyMutation.isPending || !applyAmount || Number(applyAmount) <= 0}>
                            {applyMutation.isPending ? "Processing..." : "Apply"}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Requires available banked surplus from prior periods.</p>
                      </div>
                    )}
                    
                    {!isSurplus && !isDeficit && (
                       <div className="text-sm text-muted-foreground py-2 text-center bg-muted/50 rounded-md">
                         Balance is zero. No actions available.
                       </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center text-muted-foreground">No balance data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <History className="w-5 h-5 mr-2 text-muted-foreground" />
              Banking History
            </CardTitle>
            <CardDescription>Transaction log for {shipId}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount (gCO2e)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingRecords ? (
                   <TableRow>
                     <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Loading history...</TableCell>
                   </TableRow>
                ) : records && records.length > 0 ? (
                  records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(record.createdAt), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {record.entryType === 'banked' ? (
                            <><ArrowUpRight className="w-3 h-3 mr-1 text-emerald-500" /> Banked</>
                          ) : (
                            <><ArrowDownRight className="w-3 h-3 mr-1 text-destructive" /> Applied</>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-mono text-sm ${record.entryType === 'banked' ? 'text-emerald-600' : 'text-destructive'}`}>
                        {record.entryType === 'banked' ? '+' : '-'}{formatNumber(record.amountGco2eq)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground bg-muted/10">No banking history found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
