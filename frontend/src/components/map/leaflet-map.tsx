"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as React from "react";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";

export interface MapMarker {
  id: string | number;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  kind?: "hospital" | "phc" | "ambulance" | "patient" | "household" | "sos";
  radius?: number;
  color?: string;
}

const KIND_COLORS: Record<string, string> = {
  hospital: "#0d9488",
  phc: "#2563eb",
  ambulance: "#f59e0b",
  patient: "#7c3aed",
  household: "#16a34a",
  sos: "#dc2626",
};

const EMOJI: Record<string, string> = {
  hospital: "🏥",
  phc: "🩺",
  ambulance: "🚑",
  patient: "🧍",
  household: "🏠",
  sos: "🆘",
};

function pinIcon(kind: string) {
  const color = KIND_COLORS[kind] ?? "#0d9488";
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50% 50% 50% 6px;transform:rotate(-45deg);background:${color};box-shadow:0 6px 16px rgba(0,0,0,.28);border:2px solid #fff"><span style="transform:rotate(45deg);font-size:14px">${EMOJI[kind] ?? "📍"}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });
}

function FitBounds({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  React.useEffect(() => {
    if (markers.length === 0) return;
    const bounds = L.latLngBounds(markers.map((marker) => [marker.lat, marker.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [markers, map]);
  return null;
}

export default function LeafletMap({
  markers,
  center = [18.5204, 73.8567],
  zoom = 11,
  heat = false,
  className = "h-[420px] w-full",
}: {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  heat?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom className="h-full w-full rounded-2xl">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds markers={markers} />
        {markers.map((marker) =>
          heat ? (
            <CircleMarker
              key={marker.id}
              center={[marker.lat, marker.lng]}
              radius={marker.radius ?? 10}
              pathOptions={{
                color: marker.color ?? KIND_COLORS[marker.kind ?? "hospital"],
                fillColor: marker.color ?? KIND_COLORS[marker.kind ?? "hospital"],
                fillOpacity: 0.45,
                weight: 1,
              }}
            >
              <Tooltip>{marker.title}</Tooltip>
              <Popup>
                <p className="text-sm font-semibold">{marker.title}</p>
                {marker.subtitle ? <p className="text-xs">{marker.subtitle}</p> : null}
              </Popup>
            </CircleMarker>
          ) : (
            <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={pinIcon(marker.kind ?? "hospital")}>
              <Popup>
                <p className="text-sm font-semibold">{marker.title}</p>
                {marker.subtitle ? <p className="text-xs">{marker.subtitle}</p> : null}
              </Popup>
            </Marker>
          )
        )}
      </MapContainer>
    </div>
  );
}
