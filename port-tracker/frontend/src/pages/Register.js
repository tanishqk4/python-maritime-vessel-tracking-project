import React, { useState } from "react";
import api from "../services/api";
import "../styles/auth.css";
import { Link } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "operator",
  });

  const [message, setMessage] = useState("");

  const handleRegister = async () => {
    try {
      await api.post("/auth/register/", form);
      setMessage("Registration successful! You can now log in.");
    } catch (error) {
      setMessage("Registration failed. Please try again.");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo">🚢</div>

        {/* Title */}
        <div className="auth-title">Vessel Tracker</div>
        <div className="auth-subtitle">
          Secure Fleet Management System
        </div>

        {/* Username */}
        <label>Username</label>
        <input
          type="text"
          placeholder="Choose a username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />

        {/* Email */}
        <label>Email</label>
        <input
          type="email"
          placeholder="Enter your email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        {/* Password */}
        <label>Password</label>
        <input
          type="password"
          placeholder="Create a password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        {/* Role */}
        <label>Role</label>
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          <option value="operator">Operator</option>
          <option value="analyst">Analyst</option>
          <option value="admin">Admin</option>
        </select>

        {/* Button */}
        <button onClick={handleRegister}>
          Create Account
        </button>

        {message && <p className="auth-message">{message}</p>}

        {/* Link */}
        <div className="auth-link">
          Already have an account? <Link to="/login">Sign In</Link>
        </div>

      </div>
    </div>
  );
}
