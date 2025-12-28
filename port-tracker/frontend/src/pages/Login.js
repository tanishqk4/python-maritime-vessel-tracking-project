import React, { useState } from "react";
import api from "../services/api";
import "../styles/auth.css";
import { Link } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async () => {
    try {
      const response = await api.post("/auth/login/", {
        username,
        password,
      });

      localStorage.setItem("access", response.data.access);
      localStorage.setItem("refresh", response.data.refresh);

      window.location.href = "/dashboard";
    } catch (error) {
      setMessage("Invalid username or password");
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
          placeholder="Enter your username (e.g. mammu)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        {/* Password */}
        <label>Password</label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* Button */}
        <button onClick={handleLogin}>
          Sign In to Dashboard
        </button>

        {message && <p className="auth-message">{message}</p>}

        {/* Link */}
        <div className="auth-link">
          New to the fleet? <Link to="/register">Create Account</Link>
        </div>
      </div>
    </div>
  );
}
