import React, { useState } from "react";
import api from "../services/api";

export default function VesselForm({ vessel, onSuccess, isEdit }) {
  const [form, setForm] = useState(
    vessel || {
      name: "",
      mmsi: "",
      latitude: "",
      longitude: "",
      speed: "",
      heading: "",
      status: "at_sea",
      vessel_type: "cargo",
    }
  );

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const payload = {
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        speed: parseFloat(form.speed),
        heading: parseFloat(form.heading),
    };
    try {
      if (isEdit) {
        await api.patch(`/vessels/${vessel.id}/`, form);
      } else {
        await api.post("/vessels/", form);
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

      {["name", "mmsi", "latitude", "longitude", "speed", "heading"].map((f) => (
        <input
          key={f}
          name={f}
          placeholder={f}
          value={form[f]}
          onChange={handleChange}
          style={{ marginRight: "10px", marginBottom: "10px" }}
        />
      ))}

      <select
        name="status"
        value={form.status}
        onChange={handleChange}
      >
        <option value="at_sea">At Sea</option>
        <option value="at_port">At Port</option>
      </select>
      <select
        name="vessel_type"
        value={form.vessel_type}
        onChange={handleChange}
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
