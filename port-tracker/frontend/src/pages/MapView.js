import React, { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import api from "../services/api";
import { Circle } from "react-leaflet";
import { Polyline } from "react-leaflet";

/* ======================
   VESSEL ICONS
====================== */
const getVesselIcon = (type) => {
  const iconMap = {
    cargo: "🛳️",
    fishing: "⛵",
    patrol: "🚤",
    tanker: "🚢",
  };

  return L.divIcon({
    html: `<div style="font-size:24px">${iconMap[type] || "🚢"}</div>`,
    className: "",
  });
};

/* ======================
   PORT ICON (CONGESTION)
====================== */
const getPortIcon = (level) => {
  const color =
    level === "High"
      ? "#dc2626"
      : level === "Medium"
      ? "#f59e0b"
      : "#16a34a";

  return L.divIcon({
    className: "port-marker",
    html: `
      <div style="
        width:14px;
        height:14px;
        border-radius:50%;
        background:${color};
        border:2px solid white;
      "></div>
    `,
  });
};

export default function MapView() {
  const [vessels, setVessels] = useState([]);
  const [ports, setPorts] = useState([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [weatherZones, setWeatherZones] = useState([]);
  const [history, setHistory] = useState([]);
  // const [selectedVessel, setSelectedVessel] = useState(null);



  // 🔑 store previous positions for animation
  const vesselPositionsRef = useRef({});

  // const getWeatherColor = (severity) => {
  //   if (severity === "High") return "rgba(220,38,38,0.35)";
  //   if (severity === "Medium") return "rgba(245,158,11,0.35)";
  //   return "rgba(34,197,94,0.25)";
  // };
  useEffect(() => {
    api.get("/weather/zones/")
      .then(res => setWeatherZones(res.data))
      .catch(() => {});
  }, []);


  useEffect(() => {
    setWeatherZones([
      {
        severity: "High",
        coordinates: [
          [19.0, 72.5],
          [19.2, 72.7],
          [19.0, 72.9],
        ],
      },
    ]);
  }, []);



  /* ======================
     FETCH VESSELS (POLL)
  ====================== */
  const fetchVessels = useCallback(async () => {
    const params = {};
    if (search) params.search = search;
    if (type) params.vessel_type = type;

    const res = await api.get("/vessels/", { params });
    setVessels(res.data);
  }, [search, type]);

  useEffect(() => {
    fetchVessels();
    const interval = setInterval(fetchVessels, 15000);
    return () => clearInterval(interval);
  }, [fetchVessels]);

  /* ======================
     FETCH PORTS
  ====================== */
  useEffect(() => {
    api.get("/ports/")
      .then(res => setPorts(res.data))
      .catch(() => {});
  }, []);

  return (
    <div style={{ position: "relative", height: "80vh" }}>
      <h2 style={{ marginBottom: "12px" }}>Live Vessel & Port Map</h2>

      {/* FILTER */}
      <div style={{
        position: "absolute",
        top: "70px",
        left: "20px",
        zIndex: 1000,
        background: "#fff",
        padding: "16px",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        display: "flex",
        gap: "10px"
      }}>
        <input
          placeholder="Search vessel"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All Types</option>
          <option value="cargo">Cargo</option>
          <option value="fishing">Fishing</option>
          <option value="patrol">Patrol</option>
          <option value="tanker">Tanker</option>
        </select>
      </div>

      <MapContainer center={[20, 78]} zoom={4} style={{ height: "100%" }}>
        <TileLayer
          attribution="© OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {weatherZones
          .filter(z => z.radius && !isNaN(z.radius))
          .map((z, idx) => (
          <Circle
            key={`weather-${idx}`}
            center={z.center}
            radius={z.radius * 1000}
            pathOptions={{
              color: z.severity === "High" ? "#dc2626" : "#f59e0b",
              fillOpacity: 0.25,
            }}
        >
            <Popup>
              <strong>⚠ Weather Alert</strong><br />
              Vessel: {z.vessel}<br />
              {z.message}
            </Popup>
          </Circle>
        ))}



        {/* 🚢 VESSELS (ANIMATED) */}
        {vessels
          .filter(v => v.latitude && v.longitude)
          .map((v) => {
            const prev = vesselPositionsRef.current[v.id];
            const position = prev
              ? [
                  prev[0] + (v.latitude - prev[0]) * 0.3,
                  prev[1] + (v.longitude - prev[1]) * 0.3,
                ]
              : [v.latitude, v.longitude];

            vesselPositionsRef.current[v.id] = position;

            return (
              <Marker
                key={`vessel-${v.id}`}
                position={position}
                icon={getVesselIcon(v.vessel_type)}
              >
                <Popup>
                  <div style={{ minWidth: "160px" }}>
                    <strong>{v.name}</strong><br />
                    MMSI: {v.mmsi}<br />
                    Speed: {v.speed} kn<br />
                    Status: {v.status}
                
                    <button
                      style={{
                        marginTop: "8px",
                        padding: "6px 10px",
                        background: "#2563eb",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        // setSelectedVessel(v.id);
                        api.get(`/vessels/${v.id}/history/`)
                          .then(res => setHistory(res.data))
                          .catch(() => {});
                      }}
                    >
                      Replay Voyage
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {history.length > 1 && (
          <Polyline
            positions={history.map(p => [p.lat, p.lng])}
            pathOptions={{ color: "#2563eb", weight: 3 }}
          />
        )}


        {/* ⚓ PORTS */}
        {ports
          .filter(p => p.latitude && p.longitude)
          .map(p => (
            <Marker
              key={`port-${p.id}`}
              position={[p.latitude, p.longitude]}
              icon={getPortIcon(p.congestion_level)}
            >
              <Popup>
                <strong>{p.name}</strong><br />
                Country: {p.country}<br />
                Docked: {p.ships_docked}<br />
                Avg wait: {p.average_wait_time} hrs<br />
                Congestion: {p.congestion_level}
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
