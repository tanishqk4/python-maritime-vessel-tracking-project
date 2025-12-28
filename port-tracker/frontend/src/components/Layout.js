import React, { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Layout({ children }) {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!user) return <div>Unauthorized</div>;

  const logout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const isActive = (path) =>
    location.pathname === path ? "active" : "";

  return (
    <div 
      style={{
        display: "flex", 
        minHeight: "100vh", 
        flexDirection: window.innerWidth < 768 ? "colume" : "row",
        }}>
      {/* Sidebar */}
      <aside
        style={{
          width: window.innerWidth < 768 ? "100%" : "240px",
          background: "#020617",
          color: "#e5e7eb",
          padding: "24px",
        }}
      >
        <h2 style={{ color: "#fff", marginBottom: "30px" }}>
          🚢 Port Tracker
        </h2>

        <nav style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {(user.role === "admin" || user.role === "analyst") && (
            <Link
              to="/dashboard"
              className={isActive("/dashboard")}
              style={navStyle}
            >
              Dashboard
            </Link>
          )}

          {(user.role === "admin" || user.role === "operator") && (
            <Link
              to="/vessels"
              className={isActive("/vessels")}
              style={navStyle}
            >
              Vessels
            </Link>
          )}

          <Link
            to="/map"
            className={isActive("/map")}
            style={navStyle}
          >
            Map
          </Link>

          <button
            onClick={logout}
            style={{
              marginTop: "30px",
              background: "#dc2626",
            }}
          >
            Logout
          </button>
        </nav>
      </aside>

      {/* Main content */}
      <main
        style={{
          flex: 1,
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
