import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import api from "../services/api";

const getIcon = (type) => {
  const iconMap = {
    cargo: "🚢",
    fishing: "🎣",
    patrol: "🚓",
    tanker: "⛽",
  };

  return L.divIcon({
    html: `<div style="font-size:24px">${iconMap[type] || "🚢"}</div>`,
    className: "",
  });
};

export default function MapView() {
  const [vessels, setVessels] = useState([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");

  const fetchVessels = async () => {
    const params = {};
    if (search) params.search = search;
    if (type) params.vessel_type = type;

    const res = await api.get("/vessels/", { params });
    setVessels(res.data);
  };

  useEffect(() => {
    fetchVessels();
  }, [search, type]);

  return (
    <div 
      style={{ 
        position: "relative", 
        height: window.innerWidth < 768 ? "60vh" : "80vh" 
      }}
    >
      <h2 style={{ marginBottom: "12px" }}>Live Vessel Map</h2>

      {/* 🔍 Floating Filter Card */}
      <div
        style={{
          position: "absolute",
          top: "70px",
          left: "20px",
          zIndex: 1000,
          background: "#ffffff",
          padding: "16px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <input
          placeholder="Search vessel"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: "180px" }}
        />

        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All Types</option>
          <option value="cargo">Cargo</option>
          <option value="fishing">Fishing</option>
          <option value="patrol">Patrol</option>
          <option value="tanker">Tanker</option>
        </select>
      </div>

      {/* 🗺️ Map */}
      <MapContainer
        center={[20, 78]}
        zoom={4}
        style={{
          height: "100%",
          width: "100%",
          borderRadius: "14px",
          overflow: "hidden",
        }}
      >
        <TileLayer
          attribution="© OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {vessels.map((v) => (
          <Marker
            key={v.id}
            position={[v.latitude, v.longitude]}
            icon={getIcon(v.vessel_type)}
          >
            <Popup>
              <b>{v.name}</b>
              <br />
              MMSI: {v.mmsi}
              <br />
              Type: {v.vessel_type}
              <br />
              Speed: {v.speed} kn
              <br />
              Status: {v.status}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
