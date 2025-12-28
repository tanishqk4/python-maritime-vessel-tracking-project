import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Vessels from "./pages/Vessels";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import MapView from "./pages/MapView";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";



function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/vessels"
          element={
            <ProtectedRoute>
              <Layout>
                <Vessels />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <Layout>
                <MapView />
              </Layout>
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
