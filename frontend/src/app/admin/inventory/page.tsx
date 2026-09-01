"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PackagePlus, Search, Warehouse } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api";
import { formatDate, titleCase } from "@/lib/utils";

interface InventoryRow {
  id: number;
  hospital_id: number;
  hospital_name: string;
  medicine_id: number;
  medicine_name: string;
  category: string;
  strength: string;
  batch_no: string;
  quantity: number;
  reorder_level: number;
  expiry_date: string;
  expiring_soon: boolean;
  status: "critical" | "low" | "healthy";
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [lowOnly, setLowOnly] = React.useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "inventory", search, lowOnly],
    queryFn: () =>
      api.get<InventoryRow[]>(
        `/api/v1/admin/inventory?${new URLSearchParams({ ...(search ? { search } : {}), low_stock_only: String(lowOnly) })}`
      ),
  });

  const restock = useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) =>
      api.patch<{ message: string }>(`/api/v1/admin/inventory/${id}/restock?quantity=${quantity}`),
    onSuccess: (response) => {
      toast.success(response.message);
      queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const critical = data.filter((row) => row.status === "critical").length;
  const expiring = data.filter((row) => row.expiring_soon).length;

  return (
    <>
      <PageHeader
        title="Medicine inventory"
        description="Stock levels, batch expiry and reorder alerts across district facilities"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Switch checked={lowOnly} onCheckedChange={setLowOnly} />
              Low stock only
            </div>
            <div className="relative w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search medicine" className="pl-9" />
            </div>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Line items" value={data.length} hint="Tracked batches" icon={Warehouse} tone="primary" index={0} />
        <StatCard label="Critical stock" value={critical} hint="Below 40% of reorder level" icon={PackagePlus} tone="danger" index={1} />
        <StatCard label="Expiring soon" value={expiring} hint="Within 90 days" icon={PackagePlus} tone="warning" index={2} />
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : data.length === 0 ? (
        <EmptyState icon={Warehouse} title="No inventory records" description="Adjust the filters to view stock." />
      ) : (
        <Card className="mt-4">
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Medicine</TH>
                  <TH>Facility</TH>
                  <TH>Batch</TH>
                  <TH>Quantity</TH>
                  <TH>Reorder at</TH>
                  <TH>Expiry</TH>
                  <TH>Status</TH>
                  <TH>Action</TH>
                </TR>
              </THead>
              <TBody>
                {data.map((row) => (
                  <TR key={row.id}>
                    <TD className="font-medium">
                      {row.medicine_name}
                      <span className="ml-1 text-xs text-[var(--muted-foreground)]">{row.strength}</span>
                    </TD>
                    <TD>{row.hospital_name}</TD>
                    <TD className="font-mono text-xs">{row.batch_no}</TD>
                    <TD className="font-semibold">{row.quantity}</TD>
                    <TD>{row.reorder_level}</TD>
                    <TD className={row.expiring_soon ? "text-[var(--warning)]" : ""}>{formatDate(row.expiry_date)}</TD>
                    <TD>
                      <Badge tone={row.status === "critical" ? "danger" : row.status === "low" ? "warning" : "success"}>
                        {titleCase(row.status)}
                      </Badge>
                    </TD>
                    <TD>
                      <Button size="sm" variant="outline" onClick={() => restock.mutate({ id: row.id, quantity: row.reorder_level * 3 })}>
                        Restock
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
