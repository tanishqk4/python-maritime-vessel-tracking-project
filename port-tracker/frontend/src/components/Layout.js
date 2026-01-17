import React, { useContext, useEffect, useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";

export default function Layout({ children }) {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  const [alerts, setAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const isActive = (path) => location.pathname.startsWith(path);


  const alertRef = useRef(null);

  const READ_ALERTS_KEY = user
    ? `read_alerts_${user.id}`
    : null;

  /* =======================
     FETCH ALERTS (POLLING)
  ======================= */
  useEffect(() => {
    if (!user) return;

    const fetchAlerts = () => {
      api.get("/alerts/")
        .then((res) => {
          const readIds = JSON.parse(
            localStorage.getItem(READ_ALERTS_KEY) || "[]"
          );

          const normalized = res.data.map((a) => ({
            ...a,
            is_read: readIds.includes(a.id),
          }));

          setAlerts(normalized);
        })
        .catch(() => {});
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, [user, READ_ALERTS_KEY]);

  /* =======================
     CLOSE ON OUTSIDE CLICK
  ======================= */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (alertRef.current && !alertRef.current.contains(e.target)) {
        setShowAlerts(false);
      }
    };

    if (showAlerts) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAlerts]);

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!user) return <div>Unauthorized</div>;

  const logout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

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
          <div style={{ position: "relative" }} ref={alertRef}>
            <span
              style={{ cursor: "pointer", fontSize: "18px" }}
              onClick={(e) => {
                e.stopPropagation();
                setShowAlerts((p) => !p);
              }}
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

            {showAlerts && (
              <div
                style={{
                  position: "fixed",
                  left: "260px",
                  top: "80px",
                  width: "340px",
                  background: "#fff",
                  color: "#000",
                  borderRadius: "12px",
                  boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
                  zIndex: 2000,
                  maxHeight: "420px",
                  overflowY: "auto",
                }}
              >
                <div
                  style={{
                    padding: "12px",
                    borderBottom: "1px solid #e5e7eb",
                    fontWeight: 600,
                  }}
                >
                  Notifications
                </div>

                {alerts.length === 0 && (
                  <div style={{ padding: "12px" }}>No alerts</div>
                )}

                {alerts.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      padding: "12px",
                      borderBottom: "1px solid #f1f5f9",
                      background: a.is_read ? "#fff" : "#eef2ff",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      const readIds = JSON.parse(
                        localStorage.getItem(READ_ALERTS_KEY) || "[]"
                      );

                      if (!readIds.includes(a.id)) {
                        readIds.push(a.id);
                        localStorage.setItem(
                          READ_ALERTS_KEY,
                          JSON.stringify(readIds)
                        );
                      }

                      setAlerts((prev) =>
                        prev.map((x) =>
                          x.id === a.id
                            ? { ...x, is_read: true }
                            : x
                        )
                      );
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: 600 }}>
                      {a.vessel}
                    </div>
                    <div style={{ fontSize: "12px" }}>
                      {a.message}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#6b7280",
                        marginTop: "4px",
                      }}
                    >
                      {new Date(a.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* NAV */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {(user.role === "admin" || user.role === "analyst") && (
            <Link to="/dashboard" style={navStyle(isActive("/dashboard"))}>Dashboard</Link>
          )}
          {(user.role === "admin" || user.role === "operator") && (
            <Link to="/vessels" style={navStyle(isActive("/vessels"))}>Vessels</Link>
          )}
          <Link to="/map" style={navStyle(isActive("/map"))}>Map</Link>
          <Link to="/ports" style={navStyle(isActive("/ports"))}>Ports</Link>

          {(user.role === "admin" && user.is_approved) && (
            <Link 
              to="/admin-panel" 
              style={navStyle(isActive("/admin-panel"))}>
              Admin Panel
            </Link>
          )}


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

const navStyle = (active) => ({
  textDecoration: "none",
  padding: "10px 14px",
  borderRadius: "8px",
  color: active ? "#ffffff" : "#e5e7eb",
  background: active ? "#2563eb" : "transparent",
  fontWeight: active ? "600" : "500",
});
