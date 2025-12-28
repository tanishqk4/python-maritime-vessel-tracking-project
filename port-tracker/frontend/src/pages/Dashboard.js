import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function Dashboard() {
  const [total, setTotal] = useState(0);
  const [atSea, setAtSea] = useState(0);
  const [atPort, setAtPort] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get("/vessels/");
        const vessels = response.data;

        setTotal(vessels.length);
        setAtSea(vessels.filter(v => v.status === "at_sea").length);
        setAtPort(vessels.filter(v => v.status === "at_port").length);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <p>Loading dashboard...</p>;

  return (
    <div>
      <h2>Dashboard</h2>

      <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
        <div style={cardStyle}>
          <h3>Total Vessels</h3>
          <p style={numberStyle}>{total}</p>
        </div>

        <div style={cardStyle}>
          <h3>At Sea</h3>
          <p style={numberStyle}>{atSea}</p>
        </div>

        <div style={cardStyle}>
          <h3>At Port</h3>
          <p style={numberStyle}>{atPort}</p>
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  background: "#f1f5f9",
  padding: "20px",
  borderRadius: "8px",
  width: "200px",
  textAlign: "center",
};

const numberStyle = {
  fontSize: "32px",
  fontWeight: "bold",
};
