import React from "react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div style={{ padding: "40px", textAlign: "center", fontFamily: "Poppins, sans-serif" }}>
      <h1>Welcome, {user.name || "User"}!</h1>
      <p>Role: <strong>{user.role || "Not specified"}</strong></p>
      <div style={{ marginTop: "20px" }}>
        <p>This is your {user.role} dashboard.</p>
      </div>
      <button 
        onClick={handleLogout}
        style={{
          marginTop: "30px",
          padding: "10px 20px",
          backgroundColor: "#ff4d4d",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "600"
        }}
      >
        Logout
      </button>
    </div>
  );
};

export default Dashboard;
