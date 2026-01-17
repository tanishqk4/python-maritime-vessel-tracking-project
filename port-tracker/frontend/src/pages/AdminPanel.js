import React, { useEffect, useState } from "react";
import api from "../services/api";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function AdminPanel() {
  /* ================= STATE ================= */
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [pendingAdmins, setPendingAdmins] = useState([]);
  const [adminPage, setAdminPage] = useState(1);

  const [users, setUsers] = useState([]);
  const [userPage, setUserPage] = useState(1);

  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState("all");
  const [sending, setSending] = useState(false);

  /* ================= CONSTANTS ================= */
  const PAGE_SIZE = 10;

  /* ================= LOAD DATA ================= */
  const loadOverview = () => {
    api
      .get("/admin/overview/")
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  const loadPendingAdmins = () => {
    api
      .get("/admin/pending-admins/")
      .then((res) => setPendingAdmins(res.data))
      .catch(() => setPendingAdmins([]));
  };

  const loadUsers = () => {
    api
      .get("/admin/users/")
      .then((res) => setUsers(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    loadOverview();
    loadPendingAdmins();
    loadUsers();
  }, []);

  /* ================= ACTIONS ================= */
  const handleAdminAction = (id, action) => {
    api
      .post(`/admin/admin-approval/${id}/`, { action })
      .then(() => {
        loadOverview();
        loadPendingAdmins();
      })
      .catch(() => alert("Action failed"));
  };

  const sendBroadcast = () => {
    if (!broadcastMsg.trim()) {
      alert("Message required");
      return;
    }

    setSending(true);
    api
      .post("/admin/broadcast/", {
        message: broadcastMsg,
        target: broadcastTarget,
      })
      .then(() => {
        alert("Broadcast sent");
        setBroadcastMsg("");
      })
      .catch(() => alert("Failed to send broadcast"))
      .finally(() => setSending(false));
  };

  const toggleUser = (id) => {
    api.patch(`/admin/users/${id}/toggle/`).then((res) => {
      setUsers((u) =>
        u.map((x) =>
          x.id === id ? { ...x, is_active: res.data.is_active } : x
        )
      );
    });
  };

  /* ================= PAGINATION ================= */
  const adminStart = (adminPage - 1) * PAGE_SIZE;
  const paginatedAdmins = pendingAdmins.slice(
    adminStart,
    adminStart + PAGE_SIZE
  );
  const adminTotalPages = Math.ceil(pendingAdmins.length / PAGE_SIZE);

  const userStart = (userPage - 1) * PAGE_SIZE;
  const paginatedUsers = users.slice(userStart, userStart + PAGE_SIZE);
  const userTotalPages = Math.ceil(users.length / PAGE_SIZE);

  if (loading) return <p>Loading admin panel...</p>;
  if (!data) return <p>Failed to load admin data</p>;

  const roleChartData = Object.entries(data.users_by_role).map(
    ([role, count]) => ({ name: role, value: count })
  );

  const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626"];

  return (
    <div>
      <h2>Admin Panel</h2>

      {/* ================= KPI CARDS ================= */}
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginTop: "20px" }}>
        <Card title="Total Users" value={data.total_users} />
        <Card title="Total Vessels" value={data.total_vessels} />
        <Card title="Total Ports" value={data.total_ports} />
        <Card title="Pending Admin Requests" value={data.pending_admin_requests} highlight />
      </div>

      {/* ================= PIE + BROADCAST ================= */}
      <div style={{ marginTop: "40px", display: "flex", gap: "20px", flexWrap: "wrap" }}>
        <div style={box}>
          <h3>User Role Distribution</h3>
          <div style={{ height: "260px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={roleChartData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {roleChartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={box}>
          <h3>Broadcast Alert</h3>
          <select value={broadcastTarget} onChange={(e) => setBroadcastTarget(e.target.value)} style={{ width: "100%" }}>
            <option value="all">All Users</option>
            <option value="admin">Admins</option>
            <option value="operator">Operators</option>
            <option value="analyst">Analysts</option>
          </select>

          <textarea
            rows={4}
            placeholder="Enter broadcast message..."
            value={broadcastMsg}
            onChange={(e) => setBroadcastMsg(e.target.value)}
            style={{ width: "100%", marginTop: "10px" }}
          />

          <button onClick={sendBroadcast} disabled={sending} style={primaryBtn}>
            {sending ? "Sending..." : "Send Broadcast"}
          </button>
        </div>
      </div>

      {/* ================= ADMIN APPROVAL ================= */}
      <Section title="Pending Admin Approval Requests">
        {paginatedAdmins.length === 0 ? (
          <p>No pending requests 🎉</p>
        ) : (
          <>
            <table style={table}>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Requested At</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAdmins.map((u) => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.role}</td>
                    <td>{new Date(u.date_joined).toLocaleString()}</td>
                    <td>
                      <span style={badge}>Pending</span>
                    </td>
                    <td>
                      <button onClick={() => handleAdminAction(u.id, "approve")} style={approveBtn}>
                        Approve
                      </button>
                      <button onClick={() => handleAdminAction(u.id, "reject")} style={rejectBtn}>
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination page={adminPage} setPage={setAdminPage} total={adminTotalPages} />
          </>
        )}
      </Section>

      {/* ================= USER MANAGEMENT ================= */}
      <Section title="User Management">
        <table style={table}>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Approved</th>
              <th>Last Login</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map((u) => (
              <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                <td>{u.username}</td>
                <td>{u.role}</td>
                <td>{u.is_approved ? "Yes" : "No"}</td>
                <td>{u.last_login ? new Date(u.last_login).toLocaleString() : "—"}</td>
                <td>{u.is_active ? "Active" : "Inactive"}</td>
                <td>
                  <button onClick={() => toggleUser(u.id)}>
                    {u.is_active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Pagination page={userPage} setPage={setUserPage} total={userTotalPages} />
      </Section>
    </div>
  );
}

/* ================= REUSABLE UI ================= */

const Section = ({ title, children }) => (
  <div style={{ marginTop: "40px" }}>
    <h3>{title}</h3>
    {children}
  </div>
);

const Pagination = ({ page, setPage, total }) => (
  total > 1 && (
    <div style={{ marginTop: "12px" }}>
      <button disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</button>
      <span style={{ margin: "0 10px" }}>Page {page} of {total}</span>
      <button disabled={page === total} onClick={() => setPage(page + 1)}>Next</button>
    </div>
  )
);

function Card({ title, value, highlight }) {
  return (
    <div style={{
      background: "#f1f5f9",
      padding: "20px",
      borderRadius: "12px",
      width: "220px",
      textAlign: "center",
      border: highlight ? "2px solid #dc2626" : "none",
    }}>
      <h4>{title}</h4>
      <p style={{ fontSize: "32px", fontWeight: "bold" }}>{value}</p>
    </div>
  );
}

/* ================= STYLES ================= */

const box = {
  flex: 1,
  minWidth: "320px",
  background: "#f8fafc",
  padding: "16px",
  borderRadius: "12px",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "12px",
};

const badge = {
  padding: "4px 8px",
  borderRadius: "6px",
  background: "#f59e0b",
  color: "#fff",
  fontSize: "12px",
};

const primaryBtn = {
  marginTop: "10px",
  width: "100%",
  background: "#2563eb",
  color: "#fff",
  padding: "10px",
  borderRadius: "8px",
};

const approveBtn = { background: "#16a34a", color: "#fff", marginRight: "6px" };
const rejectBtn = { background: "#dc2626", color: "#fff" };
