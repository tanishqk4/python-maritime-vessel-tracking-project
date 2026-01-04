import React, { useContext, useEffect, useState } from "react";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import VesselForm from "../components/VesselForm";

export default function Vessels() {
  const { user } = useContext(AuthContext);

  const [vessels, setVessels] = useState([]);
  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [subscribedIds, setSubscribedIds] = useState([]);

  const fetchVessels = async () => {
    const res = await api.get("/vessels/");
    setVessels(res.data);
  };

  useEffect(() => {
    fetchVessels();
  }, [refresh]);

  const subscribeVessel = async (id) => {
    try {
      const res = await api.post(`/vessels/${id}/subscribe/`);

      // ✅ SUCCESS HANDLING
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
      <h2>Vessels</h2>

      {user?.role === "admin" && (
        <VesselForm onSuccess={() => setRefresh(!refresh)} />
      )}

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>MMSI</th>
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
              <td>{v.status}</td>
              <td>{v.speed}</td>
              <td>
                <button
                  onClick={() => subscribeVessel(v.id)}
                  disabled={subscribedIds.includes(v.id)}
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

      {editing && (
        <VesselForm
          vessel={editing}
          isEdit
          onSuccess={() => {
            setEditing(null);
            setRefresh(!refresh);
          }}
        />
      )}
    </div>
  );
}
