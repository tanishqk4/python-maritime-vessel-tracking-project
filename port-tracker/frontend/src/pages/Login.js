import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import logo from "../assets/logo.png";
import "../styles/auth.css";



export default function Login() {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await api.post("/auth/login/", {
        username,
        password,
      });

      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);

      const userRes = await api.get("/auth/me/");
      localStorage.setItem("user", JSON.stringify(userRes.data));

      setUser(userRes.data);
      navigate("/dashboard", { replace: true });
    } catch {
      setError("Invalid username or password");
    }
  };

  return (
    <div className="auth-container">
      <div
        style={{
          background: "#ffffff",
          padding: "32px",
          borderRadius: "12px",
          width: "360px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
        }}
      >
       
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <img
            src={logo}
            alt="Port Tracker"
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
          <h2 style={{ margin: 0 }}>Port Tracker</h2>
        </div>

        <form onSubmit={handleLogin}>
          <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
            Login
          </h2>

          {error && (
            <p style={{ color: "red", marginBottom: "12px" }}>{error}</p>
          )}

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ width: "100%", padding: "10px", marginBottom: "12px" }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "10px", marginBottom: "16px" }}
          />

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "10px",
              background: "#032e5a",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Login
          </button>

          <p className="auth-footer">
            New user?{" "}
            <span
              onClick={() => navigate("/register")}
            >
              Register here
            </span>
          </p>
        </form>
      </div>
    </div>
  );
}
