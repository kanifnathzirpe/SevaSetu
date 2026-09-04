"use client";

import { useQuery } from "@tanstack/react-query";
import { Ambulance as AmbulanceIcon } from "lucide-react";

import { MapView, type MapMarker } from "@/components/map";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingBlock } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Ambulance } from "@/lib/types";
import { titleCase } from "@/lib/utils";

export default function AmbulanceTrackingPage() {
  const { user } = useAuth();
  const isHospitalAdmin = user?.role === "hospital_admin";

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "ambulances"],
    queryFn: () => api.get<Ambulance[]>("/api/v1/admin/ambulances"),
    refetchInterval: 30_000,
  });

  const markers: MapMarker[] = data.map((ambulance) => ({
    id: ambulance.id,
    lat: ambulance.latitude,
    lng: ambulance.longitude,
    title: ambulance.vehicle_number,
    subtitle: `${titleCase(ambulance.vehicle_type)} · ${titleCase(ambulance.status)} · ${ambulance.driver_name}`,
    kind: "ambulance",
  }));

  const hospitalAmbulances = data.filter(
    (a) =>
      a.hospital_name?.toLowerCase().includes("sassoon") ||
      (user?.locality && a.hospital_name?.toLowerCase().includes(user.locality.toLowerCase()))
  );

  const available = (isHospitalAdmin ? hospitalAmbulances : data).filter((item) => item.status === "available").length;
  const dispatched = (isHospitalAdmin ? hospitalAmbulances : data).filter((item) => item.status === "on_duty").length;

  const pageTitle = isHospitalAdmin
    ? "Ambulance Bay & Emergency Fleet"
    : "District Emergency Fleet Management";
  const pageDesc = isHospitalAdmin
    ? "Stationed 108/102 emergency vehicles at trauma center and district-wide fleet map"
    : "Live fleet positions and emergency readiness across Pune District";

  return (
    <>
      <PageHeader title={pageTitle} description={pageDesc} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={isHospitalAdmin ? "Stationed Vehicles" : "District Fleet Size"}
          value={isHospitalAdmin ? hospitalAmbulances.length : data.length}
          hint={isHospitalAdmin ? "Base facility: Sassoon General" : "Registered vehicles across district"}
          icon={AmbulanceIcon}
          tone="primary"
          index={0}
        />
        <StatCard
          label="Available at Bay"
          value={available}
          hint="Ready for instant dispatch"
          icon={AmbulanceIcon}
          tone="success"
          index={1}
        />
        <StatCard
          label="On Active Run"
          value={dispatched}
          hint="Dispatched or on scene"
          icon={AmbulanceIcon}
          tone="warning"
          index={2}
        />
      </div>

      <Card className="mt-4 overflow-hidden">
        <CardContent className="p-0">
          <MapView markers={markers} className="h-[380px] w-full" />
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingBlock />
      ) : data.length === 0 ? (
        <EmptyState icon={AmbulanceIcon} title="No ambulances registered" description="Fleet vehicles appear here." />
      ) : (
        <Card className="mt-4">
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Vehicle</TH>
                  <TH>Type</TH>
                  <TH>Driver</TH>
                  <TH>Phone</TH>
                  <TH>Base facility</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {data.map((ambulance) => (
                  <TR key={ambulance.id}>
                    <TD className="font-medium">{ambulance.vehicle_number}</TD>
                    <TD>{titleCase(ambulance.vehicle_type)}</TD>
                    <TD>{ambulance.driver_name}</TD>
                    <TD>
                      <a className="text-[var(--primary)]" href={`tel:${ambulance.driver_phone}`}>
                        {ambulance.driver_phone}
                      </a>
                    </TD>
                    <TD>{ambulance.hospital_name}</TD>
                    <TD>
                      <Badge
                        tone={
                          ambulance.status === "available"
                            ? "success"
                            : ambulance.status === "maintenance"
                              ? "default"
                              : "warning"
                        }
                      >
                        {titleCase(ambulance.status)}
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
