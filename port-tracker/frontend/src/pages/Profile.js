import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function Profile() {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <p>Loading profile...</p>;
  }

  return (
    <div
      style={{
        maxWidth: "720px",
        margin: "0 auto",
      }}
    >
      <h2 style={{ marginBottom: "20px" }}>My Profile</h2>

      {/* PROFILE CARD */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "#2563eb",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: "bold",
            }}
          >
            {user.username?.[0]?.toUpperCase()}
          </div>

          <div>
            <h3 style={{ margin: 0 }}>
              {user.first_name || "-"} {user.last_name || ""}
            </h3>
            <p style={{ margin: 0, color: "#6b7280" }}>
              @{user.username}
            </p>
          </div>
        </div>

        {/* DETAILS GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          <ProfileField label="First Name" value={user.first_name || "—"} />
          <ProfileField label="Last Name" value={user.last_name || "—"} />
          <ProfileField label="Username" value={user.username} />
          <ProfileField label="Email" value={user.email || "—"} />
          <ProfileField label="Role" value={user.role} />
          <ProfileField
            label="Admin Approved"
            value={user.is_approved ? "Yes" : "No"}
          />
          <ProfileField
            label="Last Login"
            value={
              user.last_login
                ? new Date(user.last_login).toLocaleString()
                : "—"
            }
          />
          <ProfileField
            label="Joined On"
            value={
              user.date_joined
                ? new Date(user.date_joined).toLocaleDateString()
                : "—"
            }
          />
        </div>
      </div>
    </div>
  );
}

function ProfileField({ label, value }) {
  return (
    <div>
      <div
        style={{
          fontSize: "12px",
          color: "#6b7280",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          background: "#f8fafc",
          padding: "10px 12px",
          borderRadius: "8px",
          fontWeight: "500",
        }}
      >
        {value}
      </div>
    </div>
  );
}
