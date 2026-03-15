"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Palmtree, Heart, ArrowRightLeft, RefreshCw } from "lucide-react";
import { adjustLeaveBalance, cashoutFlexToToil, processAccruals } from "@/app/(authenticated)/leave/actions";
import { formatToilMinutes, formatDateAU } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { LeaveBalance, LeaveTransaction } from "@/lib/types/database";

interface LeavePageClientProps {
  leaveBalances: LeaveBalance[];
  toilBalance: number;
  transactions: LeaveTransaction[];
}

const leaveConfig = {
  annual: { label: "Annual Leave", icon: Palmtree, color: "text-blue-600 dark:text-blue-400" },
  personal: { label: "Personal Leave", icon: Heart, color: "text-orange-600 dark:text-orange-400" },
  toil: { label: "TOIL", icon: ArrowRightLeft, color: "text-purple-600 dark:text-purple-400" },
};

export function LeavePageClient({ leaveBalances, toilBalance, transactions }: LeavePageClientProps) {
  const [adjustType, setAdjustType] = useState("annual");
  const [adjustHours, setAdjustHours] = useState("");
  const [adjustDescription, setAdjustDescription] = useState("");
  const [cashoutHours, setCashoutHours] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState("all");

  const handleAdjust = async () => {
    const hours = parseFloat(adjustHours);
    if (isNaN(hours) || !adjustDescription.trim()) {
      toast.error("Please enter valid hours and description");
      return;
    }
    setSaving(true);
    try {
      await adjustLeaveBalance(adjustType, hours, adjustDescription);
      toast.success("Leave balance adjusted");
      setAdjustHours("");
      setAdjustDescription("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to adjust");
    } finally {
      setSaving(false);
    }
  };

  const handleCashout = async () => {
    const hours = parseFloat(cashoutHours);
    if (isNaN(hours) || hours <= 0) {
      toast.error("Please enter valid hours");
      return;
    }
    setSaving(true);
    try {
      await cashoutFlexToToil(hours);
      toast.success(`${hours}h cashed out to TOIL`);
      setCashoutHours("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cashout");
    } finally {
      setSaving(false);
    }
  };

  const handleAccruals = async () => {
    setSaving(true);
    try {
      await processAccruals();
      toast.success("Accruals processed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to process accruals");
    } finally {
      setSaving(false);
    }
  };

  const filteredTransactions = filterType === "all"
    ? transactions
    : transactions.filter((t) => t.leave_type === filterType);

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(["annual", "personal", "toil"] as const).map((type) => {
          const balance = leaveBalances.find((b) => b.leave_type === type);
          const config = leaveConfig[type];
          const hours = balance ? Number(balance.balance_hours) : 0;
          const days = hours / 7.5;

          return (
            <Card key={type}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                <config.icon className={`h-4 w-4 ${config.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{days.toFixed(1)}d</div>
                <p className="text-xs text-muted-foreground mt-1">{hours.toFixed(1)} hours</p>
                {balance && Number(balance.accrual_rate_hours_per_fortnight) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Accrual: {Number(balance.accrual_rate_hours_per_fortnight).toFixed(2)}h/fn
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TOIL Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              toilBalance > 0 && "text-green-600 dark:text-green-400",
              toilBalance < 0 && "text-red-600 dark:text-red-400",
            )}>
              {formatToilMinutes(toilBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="adjust">Adjust Balance</TabsTrigger>
          <TabsTrigger value="cashout">TOIL Cashout</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <div className="flex items-center justify-between">
            <Select value={filterType} onValueChange={(v) => v && setFilterType(v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="toil">TOIL</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleAccruals} disabled={saving}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Process Accruals
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{formatDateAU(t.date)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{t.leave_type}</Badge>
                        </TableCell>
                        <TableCell className={cn(
                          "font-medium",
                          Number(t.hours) > 0 && "text-green-600 dark:text-green-400",
                          Number(t.hours) < 0 && "text-red-600 dark:text-red-400",
                        )}>
                          {Number(t.hours) > 0 ? "+" : ""}{Number(t.hours).toFixed(2)}h
                        </TableCell>
                        <TableCell className="text-sm">{t.description}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adjust">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Manual Adjustment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Leave Type</Label>
                  <Select value={adjustType} onValueChange={(v) => v && setAdjustType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="toil">TOIL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Hours (+/-)</Label>
                  <Input
                    type="number"
                    step="0.25"
                    value={adjustHours}
                    onChange={(e) => setAdjustHours(e.target.value)}
                    placeholder="e.g. 7.5 or -7.5"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={adjustDescription}
                  onChange={(e) => setAdjustDescription(e.target.value)}
                  placeholder="Reason for adjustment..."
                  rows={2}
                />
              </div>
              <Button onClick={handleAdjust} disabled={saving}>
                {saving ? "Saving..." : "Apply Adjustment"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashout">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">TOIL Cashout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Convert TOIL balance to leave. Current TOIL balance: {formatToilMinutes(toilBalance)}
              </p>
              <div className="space-y-2">
                <Label>Hours to Convert</Label>
                <Input
                  type="number"
                  step="0.25"
                  min="0"
                  value={cashoutHours}
                  onChange={(e) => setCashoutHours(e.target.value)}
                  placeholder="e.g. 7.5"
                />
              </div>
              <AlertDialog>
                <AlertDialogTrigger render={<Button disabled={saving || !cashoutHours} />}>
                  {saving ? "Processing..." : "Cash Out"}
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Cashout</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will debit {cashoutHours}h from your TOIL balance and credit it to leave.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCashout}>Confirm</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
