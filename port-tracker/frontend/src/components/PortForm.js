import React, { useState } from "react";
import api from "../services/api";

export default function PortForm({ port, onSuccess }) {
  const [name, setName] = useState(port?.name || "");
  const [country, setCountry] = useState(port?.country || "");
  const [capacity, setCapacity] = useState(port?.docking_capacity || "");

  const isEdit = Boolean(port);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name,
      country,
      docking_capacity: capacity,
    };

    try {
      if (isEdit) {
        await api.put(`/ports/${port.id}/`, payload);
      } else {
        await api.post("/ports/", payload);
      }
      onSuccess();
    } catch (error) {
      alert("Operation failed");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
      <h3>{isEdit ? "Edit Port" : "Add Port"}</h3>

      <input
        placeholder="Port Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      /><br/><br/>

      <input
        placeholder="Country"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        required
      /><br/><br/>

      <input
        type="number"
        placeholder="Docking Capacity"
        value={capacity}
        onChange={(e) => setCapacity(e.target.value)}
        required
      /><br/><br/>

      <button type="submit">
        {isEdit ? "Update Port" : "Create Port"}
      </button>
    </form>
  );
}
