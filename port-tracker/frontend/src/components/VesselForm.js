import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function VesselForm({ vessel, onSuccess, isEdit }) {
  const [form, setForm] = useState({
    name: vessel?.name || "",
    mmsi: vessel?.mmsi || "",
    latitude: vessel?.latitude || "",
    longitude: vessel?.longitude || "",
    speed: vessel?.speed || "",
    heading: vessel?.heading ?? 0,
    status: vessel?.status || "at_sea",
    vessel_type: vessel?.vessel_type || "cargo",
  });

  const [ports, setPorts] = useState([]);
  const [currentPort, setCurrentPort] = useState(
    vessel?.current_port || ""
  );

  // fetch ports
  useEffect(() => {
    api.get("/ports/")
      .then((res) => setPorts(res.data))
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const payload = {
      ...form,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      speed: parseFloat(form.speed),
      heading: form.status === "at_sea" ? parseFloat(form.heading) : null,
      current_port: form.status === "at_port" ? currentPort : null,
    };

    try {
      if (isEdit) {
        await api.patch(`/vessels/${vessel.id}/`, payload);
      } else {
        await api.post("/vessels/", payload);
      }
      onSuccess();
    } catch (err) {
      console.error(err.response?.data);
      alert(
        JSON.stringify(err.response?.data || "Unknown error", null, 2)
      );
    }
  };

  return (
    <div style={{ marginBottom: "20px" }}>
      <h3>{isEdit ? "Edit Vessel" : "Add Vessel"}</h3>

      {["name", "mmsi", "latitude", "longitude", "speed"].map((f) => (
        <input
          key={f}
          name={f}
          placeholder={f}
          value={form[f]}
          onChange={handleChange}
          style={{ marginRight: "10px", marginBottom: "10px" }}
        />
      ))}

      {/* Heading only when at sea */}
      {form.status === "at_sea" && (
        <input
          name="heading"
          placeholder="heading"
          value={form.heading}
          onChange={handleChange}
          style={{ marginRight: "10px", marginBottom: "10px" }}
        />
      )}

      <select
        name="status"
        value={form.status}
        onChange={handleChange}
        style={{ marginRight: "10px" }}
      >
        <option value="at_sea">At Sea</option>
        <option value="at_port">At Port</option>
      </select>

      {/* Port dropdown only when at port */}
      {form.status === "at_port" && (
        <select
          value={currentPort}
          onChange={(e) => setCurrentPort(e.target.value)}
          required
          style={{ marginRight: "10px" }}
        >
          <option value="">Select Port</option>
          {ports.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.country})
            </option>
          ))}
        </select>
      )}

      <select
        name="vessel_type"
        value={form.vessel_type}
        onChange={handleChange}
        style={{ marginRight: "10px" }}
      >
        <option value="cargo">Cargo</option>
        <option value="fishing">Fishing</option>
        <option value="patrol">Patrol</option>
        <option value="tanker">Tanker</option>
      </select>

      <br />
      <button onClick={handleSubmit}>
        {isEdit ? "Update Vessel" : "Create Vessel"}
      </button>
    </div>
  );
}
