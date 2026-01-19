import React, { useEffect, useState } from "react";
import api from "../services/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [trendData, setTrendData] = useState([]);
  const [typeData, setTypeData] = useState([]);
  const [portRanking, setPortRanking] = useState([]);
  const [kpiTrends, setKpiTrends] = useState({});


  /* =======================
     KPI DATA
  ======================= */
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get("/dashboard/port-congestion/");
        setData(res.data);
      } catch (error) {
        console.error("Failed to load dashboard", error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  useEffect(() => {
    api.get("/analytics/kpi-trends/")
      .then(res => setKpiTrends(res.data))
      .catch(() => {});
  }, []);


  /* =======================
     ARRIVALS VS DEPARTURES
  ======================= */
  useEffect(() => {
    api.get("/analytics/arrivals-departures/")
      .then((res) => {
        const arrivals = res.data.arrivals;
        const departures = res.data.departures;

        const map = {};

        arrivals.forEach((a) => {
          map[a.date] = {
            date: a.date,
            arrivals: a.count,
            departures: 0,
          };
        });

        departures.forEach((d) => {
          if (!map[d.date]) {
            map[d.date] = {
              date: d.date,
              arrivals: 0,
              departures: d.count,
            };
          } else {
            map[d.date].departures = d.count;
          }
        });

        setTrendData(Object.values(map));
      })
      .catch(() => {});
  }, []);

  /* =======================
     VESSEL TYPE DISTRIBUTION
  ======================= */
  useEffect(() => {
    api.get("/analytics/vessel-type-distribution/")
      .then((res) => {
        setTypeData(
          res.data.map((d) => ({
            name: d.vessel_type,
            value: d.count,
          }))
        );
      })
      .catch(() => {});
  }, []);

  /* =======================
     PORT CONGESTION RANKING
  ======================= */
  useEffect(() => {
    api.get("/analytics/port-congestion-ranking/")
      .then((res) => setPortRanking(res.data))
      .catch(() => {});
  }, []);

  if (loading) return <p>Loading dashboard...</p>;
  if (!data) return <p>Unable to load dashboard data</p>;

  const trendIndicator = (value) => {
    if (value > 0) return <span style={{ color: "green" }}>↑ {value}%</span>;
    if (value < 0) return <span style={{ color: "red" }}>↓ {Math.abs(value)}%</span>;
    return <span style={{ color: "gray" }}>→ 0%</span>;
  };


  return (
    <div>
      <h2>Analytics Dashboard</h2>

      {/* ================= KPI CARDS ================= */}
      <div style={kpiContainer}>
        <div style={cardStyle}>
          <h3>Arrivals (At Port)</h3>
          <p style={numberStyle}>{data.arrivals}
            <div>{trendIndicator(kpiTrends.arrivals_change)}</div>
          </p>
        </div>

        <div style={cardStyle}>
          <h3>Departures (At Sea)</h3>
          <p style={numberStyle}>{data.departures}
            <div>{trendIndicator(kpiTrends.departures_change)}</div>
          </p>
        </div>

        <div style={cardStyle}>
          <h3>Avg Wait Time</h3>
          <p style={numberStyle}>{data.average_wait_time_hours} hrs</p>
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

      {/* ================= TREND CHART ================= */}
      <Section title="Arrivals vs Departures Trend">
        <LineChart data={trendData}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="arrivals" stroke="#2563eb" />
          <Line type="monotone" dataKey="departures" stroke="#16a34a" />
        </LineChart>
      </Section>

      {/* ================= PIE CHART ================= */}
      <Section title="Vessel Type Distribution">
        <PieChart>
          <Pie
            data={typeData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label
          >
            {typeData.map((_, index) => (
              <Cell
                key={index}
                fill={
                  ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed"][
                    index % 5
                  ]
                }
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </Section>

      {/* ================= RANKING TABLE ================= */}
      <div style={{ marginTop: "40px" }}>
        <h3>Top Congested Ports</h3>

        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Port</th>
              <th style={thStyle}>Country</th>
              <th style={thStyle}>Docked Ships</th>
              <th style={thStyle}>Avg Wait (hrs)</th>
              <th style={thStyle}>Congestion %</th>
            </tr>
          </thead>
          <tbody>
            {portRanking.map((p, i) => (
              <tr key={i}>
                <td>{p.port}</td>
                <td>{p.country}</td>
                <td>{p.docked}</td>
                <td>{p.avg_wait}</td>
                <td>{p.congestion_score}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =======================
   REUSABLE COMPONENT
======================= */
function Section({ title, children }) {
  return (
    <div style={{ marginTop: "40px" }}>
      <h3>{title}</h3>
      <div style={chartBox}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* =======================
   STYLES
======================= */
const kpiContainer = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "20px",
  marginTop: "20px",
};


const cardStyle = {
  background: "#ffffff",
  padding: "20px",
  borderRadius: "12px",
  textAlign: "center",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
  transition: "transform 0.2s ease",
};


const numberStyle = {
  fontSize: "32px",
  fontWeight: "bold",
};

const chartBox = {
  width: "100%",
  height: "320px",
  background: "#ffffff",
  borderRadius: "12px",
  padding: "20px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
};


const tableStyle = {
  width: "100%",
  marginTop: "12px",
  borderCollapse: "collapse",
  background: "#ffffff",
  borderRadius: "10px",
  overflow: "hidden",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
};

const thStyle = {
  textAlign: "left",
  padding: "12px",
  background: "#f1f5f9",
  fontSize: "13px",
  fontWeight: 600,
};

// const tdStyle = {
//   padding: "12px",
//   fontSize: "13px",
//   borderBottom: "1px solid #e5e7eb",
// };

