import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get("/dashboard/port-congestion/");
        setData(res.data);
      } catch (error) {
        console.error("Failed to load congestion dashboard", error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) return <p>Loading dashboard...</p>;
  if (!data) return <p>Unable to load dashboard data</p>;

  return (
    <div>
      <h2>Port Congestion Dashboard</h2>

      <div style={{ display: "flex", gap: "20px", marginTop: "20px", flexWrap: "wrap" }}>
        <div style={cardStyle}>
          <h3>Arrivals (At Port)</h3>
          <p style={numberStyle}>{data.arrivals}</p>
        </div>

        <div style={cardStyle}>
          <h3>Departures (At Sea)</h3>
          <p style={numberStyle}>{data.departures}</p>
        </div>

        <div style={cardStyle}>
          <h3>Avg Wait Time</h3>
          <p style={numberStyle}>
            {data.average_wait_time_hours} hrs
          </p>
        </div>

        <div
          style={{
            ...cardStyle,
            border:
              data.congestion_level === "High"
                ? "2px solid red"
                : data.congestion_level === "Medium"
                ? "2px solid orange"
                : "2px solid green",
          }}
        >
          <h3>Congestion Level</h3>
          <p
            style={{
              ...numberStyle,
              color:
                data.congestion_level === "High"
                  ? "red"
                  : data.congestion_level === "Medium"
                  ? "orange"
                  : "green",
            }}
          >
            {data.congestion_level}
          </p>
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  background: "#f1f5f9",
  padding: "20px",
  borderRadius: "8px",
  width: "220px",
  textAlign: "center",
};

const numberStyle = {
  fontSize: "32px",
  fontWeight: "bold",
};
