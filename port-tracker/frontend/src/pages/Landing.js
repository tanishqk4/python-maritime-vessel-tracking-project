import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Landing.css";

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (token) {
      navigate("/dashboard");
    }
  }, [navigate]);

  return (
    <div className="landing-container">
      <div className="landing-overlay">
        <h1 className="landing-title">Vessel Tracker</h1>
        <p className="landing-subtitle">
          Secure Fleet Management & Real-Time Vessel Monitoring
        </p>

        <div className="landing-buttons">
          <Link to="/login" className="landing-btn primary">
            Login
          </Link>
          <Link to="/register" className="landing-btn secondary">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
