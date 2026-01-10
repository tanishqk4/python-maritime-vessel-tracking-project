import React, { useEffect, useState, useContext } from "react";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import PortForm from "../components/PortForm";

export default function Ports() {
  const { user } = useContext(AuthContext);
  const [ports, setPorts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    api.get("/ports/")
      .then(res => setPorts(res.data))
      .catch(() => setPorts([]));
  }, [refresh]);

  const deletePort = async (id) => {
    if (!window.confirm("Delete this port?")) return;
    try {
      await api.delete(`/ports/${id}/`);
      setRefresh(!refresh);
    } catch {
      alert("Permission denied");
    }
  };

  return (
    <div>
      <h2>Ports</h2>

      {["admin", "operator"].includes(user?.role) && (
        <PortForm onSuccess={() => setRefresh(!refresh)} />
      )}

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Country</th>
            <th>Capacity</th>
            <th>Ships Docked</th>
            <th>Avg Wait</th>
            <th>Congestion</th>
            {user?.role === "admin" && <th>Actions</th>}
          </tr>
        </thead>

        <tbody>
          {ports.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.country}</td>
              <td>{p.docking_capacity}</td>
              <td>{p.ships_docked}</td>
              <td>{p.average_wait_time}</td>
              <td>{p.congestion_level}</td>

              {["admin", "operator"].includes(user?.role) && (
                <td>
                  <button onClick={() => setEditing(p)}>Edit</button>
                  {user?.role === "admin" && (
                    <button onClick={() => deletePort(p.id)}>Delete</button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <PortForm
          port={editing}
          onSuccess={() => {
            setEditing(null);
            setRefresh(!refresh);
          }}
        />
      )}
    </div>
  );
}
