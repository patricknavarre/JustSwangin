"use client";

import { useEffect, useRef } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLng } from "@/lib/geo";

function fixLeafletIcons() {
  const proto = L.Icon.Default.prototype as unknown as { _getIconUrl?: string };
  delete proto._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

function MapResize({ userPos }: { userPos: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map, userPos]);
  return null;
}

/** One-time fly-to when GPS first becomes available so the user sees their area. */
function RecenterOnFirstFix({ userPos }: { userPos: LatLng | null }) {
  const map = useMap();
  const centered = useRef(false);
  useEffect(() => {
    if (userPos && !centered.current) {
      map.setView([userPos.lat, userPos.lng], 16);
      centered.current = true;
    }
  }, [map, userPos]);
  return null;
}

function MapClickHandler({ onPick }: { onPick: (ll: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

type Props = {
  userPos: LatLng | null;
  target: LatLng | null;
  onTargetChange: (ll: LatLng) => void;
  onMapPick: (ll: LatLng) => void;
};

export default function RangeFinderMap({ userPos, target, onTargetChange, onMapPick }: Props) {
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  const center = userPos ?? target ?? { lat: 39.8, lng: -98.5 };
  const zoom = userPos || target ? 16 : 4;

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      className="h-[220px] w-full rounded-xl"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapResize userPos={userPos} />
      <RecenterOnFirstFix userPos={userPos} />
      <MapClickHandler onPick={onMapPick} />
      {userPos ? (
        <CircleMarker
          center={[userPos.lat, userPos.lng]}
          radius={8}
          pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.9 }}
        />
      ) : null}
      {target ? (
        <Marker
          position={[target.lat, target.lng]}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const m = e.target as L.Marker;
              const p = m.getLatLng();
              onTargetChange({ lat: p.lat, lng: p.lng });
            },
          }}
        />
      ) : null}
    </MapContainer>
  );
}
