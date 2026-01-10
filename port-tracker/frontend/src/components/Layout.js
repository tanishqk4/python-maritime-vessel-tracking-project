import React, { useContext, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";

export default function Layout({ children }) {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  const [alerts, setAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);

  useEffect(() => {
    const fetchAlerts = () => {
      api
        .get("/alerts/")
        .then((res) => setAlerts(res.data))
        .catch(() => {});
    };
    fetchAlerts(); // initial load

    const interval = setInterval(fetchAlerts, 15000); // 15 sec

    return () => clearInterval(interval);
  }, []);


  const unreadCount = alerts.filter((a) => !a.is_read).length;

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!user) return <div>Unauthorized</div>;

  const logout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const isActive = (path) =>
    location.pathname === path ? "active" : "";

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* SIDEBAR */}
      <aside
        style={{
          width: "240px",
          background: "#020617",
          color: "#e5e7eb",
          padding: "24px",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          overflowY: "auto",
        }}
      >
        <h2 style={{ color: "#fff", marginBottom: "16px" }}>
          🚢 Port Tracker
        </h2>
        

        {/* PROFILE + ALERT */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          {/* PROFILE */}
          <Link
            to="/profile"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "#2563eb",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
              }}
            >
              {user.username[0].toUpperCase()}
            </div>

            <div>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>
                {user.username}
              </div>
              <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                {user.role}
              </div>
            </div>
          </Link>

          {/* ALERT BELL */}
          <div style={{ position: "relative" }}>
            <span
              style={{ cursor: "pointer" }}
              onClick={() => setShowAlerts(!showAlerts)}
            >
              🔔
            </span>

            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-8px",
                  background: "#dc2626",
                  color: "#fff",
                  borderRadius: "50%",
                  fontSize: "11px",
                  padding: "2px 6px",
                }}
              >
                {unreadCount}
              </span>
            )}

            {/* ALERT DROPDOWN */}
            {showAlerts && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "30px",
                  width: "280px",
                  background: "#fff",
                  color: "#000",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  zIndex: 1000,
                  maxHeight: "300px",
                  overflowY: "auto",
                }}
              >
                {alerts.length === 0 ? (
                  <div style={{ padding: "12px" }}>No alerts</div>
                ) : (
                  alerts.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        padding: "10px",
                        borderBottom: "1px solid #e5e7eb",
                        background: a.is_read
                          ? "#f9fafb"
                          : "#eef2ff",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        api.post(`/alerts/${a.id}/read/`);
                        setAlerts((prev) =>
                          prev.map((x) =>
                            x.id === a.id
                              ? { ...x, is_read: true }
                              : x
                          )
                        );
                      }}
                    >
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                        }}
                      >
                        {a.vessel}
                      </div>
                      <div style={{ fontSize: "12px" }}>
                        {a.message}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* NAV */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {(user.role === "admin" || user.role === "analyst") && (
            <Link to="/dashboard" style={navStyle}>
              Dashboard
            </Link>
          )}

          {(user.role === "admin" || user.role === "operator") && (
            <Link to="/vessels" style={navStyle}>
              Vessels
            </Link>
          )}

          <Link to="/map" style={navStyle}>
            Map
          </Link>
          <Link to="/ports" style={navStyle}>
            Ports
          </Link>

          <button
            onClick={logout}
            style={{
              marginTop: "30px",
              background: "#dc2626",
              color: "#fff",
            }}
          >
            Logout
          </button>
        </nav>
      </aside>

      {/* CONTENT */}
      <main
        style={{
          flex: 1,
          marginLeft: "240px",
          padding: "30px",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "24px",
            minHeight: "100%",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

const navStyle = {
  textDecoration: "none",
  padding: "10px 14px",
  borderRadius: "8px",
  color: "#e5e7eb",
  fontWeight: "500",
};
