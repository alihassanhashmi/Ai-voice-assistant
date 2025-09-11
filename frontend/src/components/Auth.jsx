import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Auth from "./auth"; // Import the Auth component

const AdminOrders = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const fileInputRef = useRef(null);

  // Check if user is already logged in
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
      fetchOrders(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userToken) => {
    setToken(userToken);
    setIsAuthenticated(true);
    localStorage.setItem("token", userToken);
    fetchOrders(userToken);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    setToken("");
    setOrders([]);
  };

  const fetchOrders = async (userToken) => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:8000/admin/orders", {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      });
      setOrders(response.data.orders);
      // ... rest of your existing fetchOrders code
    } catch (err) {
      if (err.response?.status === 401) {
        // Token expired or invalid
        handleLogout();
      }
      setError("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  // Update all your API calls to include the token
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await axios.patch(
        `http://localhost:8000/admin/orders/${orderId}`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      // ... rest of your existing code
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const handleFileUpload = async (event) => {
    // ... your existing code but add authorization header
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await axios.post("http://localhost:8000/admin/upload-document", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`
        }
      });
      // ... rest of your code
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
      }
    }
  };

  // Show authentication form if not logged in
  if (!isAuthenticated) {
    return <Auth onLogin={handleLogin} />;
  }

  // Your existing AdminOrders JSX return here, but add logout button:
  return (
    <div style={{ 
      padding: "2rem", 
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      minHeight: "100vh",
      backgroundColor: "#ffffff",
      color: "#1a1a1a"
    }}>
      {/* Add Logout button to header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "2rem",
        paddingBottom: "1.5rem",
        borderBottom: "1px solid #f0f0f0"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{
            width: "40px",
            height: "40px",
            backgroundColor: "#000",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: "bold",
            fontSize: "1.2rem"
          }}>
            SS
          </div>
          <h1 style={{ 
            margin: 0, 
            fontSize: "1.8rem", 
            fontWeight: 400,
            letterSpacing: "-0.02em"
          }}>
            Order Management
          </h1>
        </div>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <Link 
            to="/" 
            style={{ 
              padding: "0.75rem 1.5rem",
              textDecoration: "none",
              color: "#1a1a1a",
              border: "1px solid #f0f0f0",
              borderRadius: "8px",
              transition: "all 0.3s ease"
            }}
          >
            ← Back to Voice
          </Link>
          
          <button 
            onClick={handleLogout}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#f44336",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
          >
            Logout
          </button>

          <button 
            onClick={fetchOrders}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#000",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* ... rest of your existing AdminOrders JSX */}
    </div>
  );
};

export default AdminOrders;