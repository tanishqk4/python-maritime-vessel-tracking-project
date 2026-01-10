import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function Profile() {
  const { user } = useContext(AuthContext);

  if (!user) return null;

  return (
    <div style={{ maxWidth: "500px" }}>
      <h2 style={{ marginBottom: "20px" }}>My Profile</h2>

      <div style={cardStyle}>
        <div style={avatarStyle}>
          {user.username[0].toUpperCase()}
        </div>

        <div style={{ marginTop: "20px" }}>
          <ProfileRow label="Username" value={user.username} />
          <ProfileRow label="Email" value={user.email || "-"} />
          <ProfileRow label="Role" value={user.role} />
        </div>
      </div>
    </div>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ fontSize: "12px", color: "#6b7280" }}>
        {label}
      </div>
      <div style={{ fontSize: "16px", fontWeight: 500 }}>
        {value}
      </div>
    </div>
  );
}

const cardStyle = {
  background: "#f8fafc",
  padding: "24px",
  borderRadius: "14px",
};

const avatarStyle = {
  width: "80px",
  height: "80px",
  borderRadius: "50%",
  background: "#2563eb",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "32px",
  fontWeight: "bold",
};
