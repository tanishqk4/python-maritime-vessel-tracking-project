import { useEffect, useState } from "react";
import api from "../services/api";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    api.get("/alerts/").then(res => setAlerts(res.data));
  }, []);

  return (
    <div>
      <h2>My Alerts</h2>
      {alerts.map(a => (
        <div key={a.id} style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
          <b>{a.vessel}</b>
          <p>{a.message}</p>
        </div>
      ))}
    </div>
  );
}
