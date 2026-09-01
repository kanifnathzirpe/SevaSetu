"use client";

import { useQuery } from "@tanstack/react-query";
import { Pill, Search } from "lucide-react";
import * as React from "react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api";
import type { Medicine } from "@/lib/types";

export default function MedicineIndexPage() {
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["doctor", "medicines", search, category],
    queryFn: () =>
      api.get<Medicine[]>(
        `/api/v1/doctor/medicines?limit=200${search ? `&search=${encodeURIComponent(search)}` : ""}${category ? `&category=${encodeURIComponent(category)}` : ""}`
      ),
  });

  const categories = Array.from(new Set(data.map((medicine) => medicine.category))).sort();

  return (
    <>
      <PageHeader
        title="Medicine index"
        description="District formulary with generic names, forms and essential-medicine status"
        actions={
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search medicines" className="pl-9" />
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setCategory("")}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${category === "" ? "border-[var(--primary)] text-[var(--primary)]" : "border-[var(--border)]"}`}
        >
          All categories
        </button>
        {categories.map((item) => (
          <button
            key={item}
            onClick={() => setCategory(item)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${category === item ? "border-[var(--primary)] text-[var(--primary)]" : "border-[var(--border)]"}`}
          >
            {item}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : data.length === 0 ? (
        <EmptyState icon={Pill} title="No medicines found" description="Try a different search term." />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Brand</TH>
                  <TH>Generic</TH>
                  <TH>Category</TH>
                  <TH>Form</TH>
                  <TH>Strength</TH>
                  <TH>Unit price</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {data.map((medicine) => (
                  <TR key={medicine.id}>
                    <TD className="font-medium">{medicine.name}</TD>
                    <TD>{medicine.generic_name}</TD>
                    <TD>{medicine.category}</TD>
                    <TD>{medicine.form}</TD>
                    <TD>{medicine.strength}</TD>
                    <TD>₹{medicine.unit_price}</TD>
                    <TD>
                      <Badge tone={medicine.is_essential ? "success" : "default"}>
                        {medicine.is_essential ? "Essential" : "Supplementary"}
                      </Badge>
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
