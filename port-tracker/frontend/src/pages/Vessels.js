import React, { useContext, useEffect, useState } from "react";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import VesselForm from "../components/VesselForm";

export default function Vessels() {
  const { user } = useContext(AuthContext);

  const [vessels, setVessels] = useState([]);
  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(false);

  // 🔍 Search & filter state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");

  // 🔔 Subscriptions (frontend-only state)
  const [subscribedIds, setSubscribedIds] = useState([]);

  const fetchVessels = async () => {
    const params = {};
    if (search) params.search = search;
    if (status) params.status = status;
    if (type) params.vessel_type = type;

    const res = await api.get("/vessels/", { params });
    setVessels(res.data);
  };

  useEffect(() => {
    fetchVessels();
  }, [refresh, search, status, type]);

  const deleteVessel = async (id) => {
    if (!window.confirm("Delete this vessel?")) return;
    try {
      await api.delete(`/vessels/${id}/`);
      setRefresh(!refresh);
    } catch {
      alert("Permission denied");
    }
  };

  const subscribeVessel = async (id) => {
    try {
      const res = await api.post(`/vessels/${id}/subscribe/`);

      if (res.status === 200 || res.status === 201) {
        setSubscribedIds((prev) => [...prev, id]);
        alert(res.data.message || "Subscribed successfully");
      }
    } catch (error) {
      console.error("Subscription error:", error.response);
      alert(
        error.response?.data?.message ||
          "Subscription failed. Try again."
      );
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: "20px" }}>Vessels</h2>

      {/* 🔍 Filters */}
      <div
        style={{
          background: "#f8fafc",
          padding: "16px",
          borderRadius: "12px",
          marginBottom: "20px",
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <input
          placeholder="Search by name or MMSI"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: "220px" }}
        />

        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="at_sea">At Sea</option>
          <option value="at_port">At Port</option>
        </select>

        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All Types</option>
          <option value="cargo">Cargo</option>
          <option value="fishing">Fishing</option>
          <option value="patrol">Patrol</option>
          <option value="tanker">Tanker</option>
        </select>
      </div>

      {/* ➕ Add Vessel */}
      {user?.role === "admin" && (
        <div style={{ marginBottom: "20px" }}>
          <VesselForm onSuccess={() => setRefresh(!refresh)} />
        </div>
      )}

      {/* 📊 Vessel Table */}
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>MMSI</th>
              <th>Type</th>
              <th>Status</th>
              <th>Speed</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {vessels.map((v) => (
              <tr key={v.id}>
                <td>{v.name}</td>
                <td>{v.mmsi}</td>
                <td>{v.vessel_type}</td>
                <td>{v.status}</td>
                <td>{v.speed} kn</td>

                <td style={{ display: "flex", gap: "8px" }}>
                  {/* ✏️ Edit */}
                  {(user?.role === "admin" ||
                    user?.role === "operator") && (
                    <button
                      style={{ background: "#16a34a" }}
                      onClick={() => setEditing(v)}
                    >
                      Edit
                    </button>
                  )}

                  {/* 🗑 Delete */}
                  {user?.role === "admin" && (
                    <button
                      style={{ background: "#dc2626" }}
                      onClick={() => deleteVessel(v.id)}
                    >
                      Delete
                    </button>
                  )}

                  {/* 🔔 Subscribe */}
                  <button
                    style={{ background: "#2563eb" }}
                    disabled={subscribedIds.includes(v.id)}
                    onClick={() => subscribeVessel(v.id)}
                  >
                    {subscribedIds.includes(v.id)
                      ? "Subscribed"
                      : "Subscribe"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ✏️ Edit Vessel Form */}
      {editing && (
        <div style={{ marginTop: "20px" }}>
          <VesselForm
            vessel={editing}
            isEdit
            onSuccess={() => {
              setEditing(null);
              setRefresh(!refresh);
            }}
          />
        </div>
      )}
    </div>
  );
}
