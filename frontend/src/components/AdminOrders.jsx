// components/AdminOrders.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:8000/admin/orders");
      setOrders(response.data.orders);
      
      const statusMap = {};
      response.data.orders.forEach(order => {
        statusMap[order.id] = order.status;
      });
      setSelectedStatus(statusMap);
      
      setError(null);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validTypes = ['.pdf', '.txt', '.docx'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validTypes.includes(fileExtension)) {
      setUploadMessage("Please upload PDF, TXT, or DOCX files only.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      setUploadMessage("");
      const response = await axios.post("http://localhost:8000/admin/upload-document", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      setUploadMessage(`✅ ${response.data.message}: ${response.data.result}`);
      event.target.value = "";
    } catch (err) {
      console.error("Upload error:", err);
      setUploadMessage("❌ Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await axios.patch(
        `http://localhost:8000/admin/orders/${orderId}`,
        { status: newStatus }
      );
      
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
      
      setSelectedStatus(prev => ({ ...prev, [orderId]: newStatus }));
      
      // Show success notification instead of alert
      setUploadMessage(`✅ Order #${orderId} status updated to ${newStatus}`);
      setTimeout(() => setUploadMessage(""), 3000);
      
    } catch (err) {
      console.error("Error updating order:", err);
      setUploadMessage("❌ Failed to update order status");
      setTimeout(() => setUploadMessage(""), 3000);
    }
  };

  const handleStatusChange = (orderId, newStatus) => {
    if (window.confirm(`Change order #${orderId} status to ${newStatus}?`)) {
      updateOrderStatus(orderId, newStatus);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const canCancelOrder = (order) => {
    const orderDate = new Date(order.created_at);
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000);
    return orderDate > fiveMinutesAgo && order.status !== "canceled";
  };

  if (loading) return (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      height: "100vh",
      fontFamily: "'Inter', sans-serif",
      color: "#666"
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
        <p>Loading orders...</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      height: "100vh",
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{ textAlign: "center", color: "#f44336" }}>
        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>❌</div>
        <p>{error}</p>
        <button 
          onClick={fetchOrders}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#000",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            marginTop: "1rem"
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ 
      padding: "2rem", 
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      minHeight: "100vh",
      backgroundColor: "#ffffff",
      color: "#1a1a1a"
    }}>
      
      {/* Header */}
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
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#f8f8f8";
              e.target.style.borderColor = "#ddd";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.borderColor = "#f0f0f0";
            }}
          >
            ← Back to Voice
          </Link>
          
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
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#333";
              e.target.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "#000";
              e.target.style.transform = "translateY(0)";
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Upload Button */}
      
<div style={{ 
  position: "fixed", 
  top: "2rem", 
  right: "1.5rem", 
  zIndex: 1001,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: "0.0rem"
}}>
  {/* Main Upload Button */}
  <label style={{
    padding: "0.5rem 0.5rem",
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    color: "#ffffffff",
    border: "1.5px dashed #ddd",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "0.95rem",
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)"
  }}
  onMouseEnter={(e) => {
    e.target.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
    e.target.style.borderColor = "#999";
    e.target.style.transform = "translateY(-1px)";
    e.target.style.boxShadow = "0 6px 25px rgba(0, 0, 0, 0.08)";
  }}
  onMouseLeave={(e) => {
    e.target.style.backgroundColor = "rgba(0, 0, 0, 0.02)";
    e.target.style.borderColor = "#ddd";
    e.target.style.transform = "translateY(0)";
    e.target.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.05)";
  }}>
    <span style={{
      fontSize: "1.2rem",
      transition: "transform 0.3s ease"
    }}>
     ↑ 
    </span>
    Upload 
    <input
      type="file"
      accept=".pdf,.txt,.docx"
      onChange={handleFileUpload}
      style={{ display: "none" }}
      disabled={uploading}
    />
  </label>

  {/* Upload Status Indicators */}
  {uploading && (
    <div style={{
      padding: "0.875rem 1.25rem",
      backgroundColor: "rgba(255, 152, 0, 0.1)",
      color: "#f57c00",
      border: "1px solid rgba(255, 152, 0, 0.2)",
      borderRadius: "10px",
      fontSize: "0.9rem",
      fontWeight: 500,
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      backdropFilter: "blur(10px)",
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
      animation: "pulse 2s infinite"
    }}>
      <span style={{ fontSize: "1.1rem" }}>⏳</span>
      Processing document...
    </div>
  )}
  
  {uploadMessage && (
    <div style={{
      padding: "0.875rem 1.25rem",
      backgroundColor: uploadMessage.includes("✅") ? 
        "rgba(76, 175, 80, 0.1)" : "rgba(244, 67, 54, 0.1)",
      color: uploadMessage.includes("✅") ? "#2e7d32" : "#f44336",
      border: uploadMessage.includes("✅") ? 
        "1px solid rgba(76, 175, 80, 0.2)" : "1px solid rgba(244, 67, 54, 0.2)",
      borderRadius: "10px",
      fontSize: "0.9rem",
      fontWeight: 500,
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      backdropFilter: "blur(10px)",
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
      maxWidth: "320px",
      lineHeight: "1.4"
    }}>
      <span style={{ fontSize: "1.1rem" }}>
        {uploadMessage.includes("✅") ? "✅" : "❌"}
      </span>
      {uploadMessage.replace("✅ ", "").replace("❌ ", "")}
    </div>
  )}

  {/* Add CSS animation */}
  <style>
    {`
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
      }
    `}
  </style>
</div>

      {/* Orders Table */}
      <div style={{ 
        backgroundColor: "#fafafa",
        borderRadius: "16px",
        padding: "2rem",
        border: "1px solid #f0f0f0",
        overflow: "hidden"
      }}>
        {orders.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            color: "#999",
            padding: "3rem"
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🍕</div>
            <h3 style={{ margin: "0 0 0.5rem 0", fontWeight: 400 }}>No orders yet</h3>
            <p style={{ margin: 0 }}>Orders will appear here once customers start ordering</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ 
              width: "100%", 
              borderCollapse: "collapse",
              backgroundColor: "#fff",
              borderRadius: "12px",
              overflow: "hidden"
            }}>
              <thead>
                <tr style={{ backgroundColor: "#f8f8f8" }}>
                  <th style={{ 
                    padding: "1rem", 
                    textAlign: "left", 
                    borderBottom: "1px solid #f0f0f0",
                    fontWeight: 500,
                    fontSize: "0.9rem",
                    color: "#666"
                  }}>Order ID</th>
                  <th style={{ 
                    padding: "1rem", 
                    textAlign: "left", 
                    borderBottom: "1px solid #f0f0f0",
                    fontWeight: 500,
                    fontSize: "0.9rem",
                    color: "#666"
                  }}>Customer</th>
                  <th style={{ 
                    padding: "1rem", 
                    textAlign: "left", 
                    borderBottom: "1px solid #f0f0f0",
                    fontWeight: 500,
                    fontSize: "0.9rem",
                    color: "#666"
                  }}>Items</th>
                  <th style={{ 
                    padding: "1rem", 
                    textAlign: "left", 
                    borderBottom: "1px solid #f0f0f0",
                    fontWeight: 500,
                    fontSize: "0.9rem",
                    color: "#666"
                  }}>Qty</th>
                  <th style={{ 
                    padding: "1rem", 
                    textAlign: "left", 
                    borderBottom: "1px solid #f0f0f0",
                    fontWeight: 500,
                    fontSize: "0.9rem",
                    color: "#666"
                  }}>Status</th>
                  <th style={{ 
                    padding: "1rem", 
                    textAlign: "left", 
                    borderBottom: "1px solid #f0f0f0",
                    fontWeight: 500,
                    fontSize: "0.9rem",
                    color: "#666"
                  }}>Order Date</th>
                  <th style={{ 
                    padding: "1rem", 
                    textAlign: "left", 
                    borderBottom: "1px solid #f0f0f0",
                    fontWeight: 500,
                    fontSize: "0.9rem",
                    color: "#666"
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} style={{ 
                    borderBottom: "1px solid #f0f0f0",
                    backgroundColor: order.status === "canceled" ? "#fff0f0" : "transparent",
                    transition: "background-color 0.3s ease"
                  }}>
                    <td style={{ 
                      padding: "1rem",
                      fontWeight: 500,
                      color: order.status === "canceled" ? "#f44336" : "#1a1a1a"
                    }}>#{order.id}</td>
                    <td style={{ padding: "1rem" }}>
                      <div style={{ fontWeight: 500 }}>{order.customer_name}</div>
                      <div style={{ color: "#666", fontSize: "0.9rem" }}>{order.phone_number}</div>
                    </td>
                    <td style={{ padding: "1rem", maxWidth: "200px" }}>{order.item}</td>
                    <td style={{ padding: "1rem", textAlign: "center" }}>{order.quantity}</td>
                    <td style={{ padding: "1rem" }}>
                      <span style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "20px",
                        fontSize: "0.8rem",
                        fontWeight: 500,
                        backgroundColor: 
                          order.status === "delivered" ? "#e8f5e8" :
                          order.status === "canceled" ? "#ffebee" :
                          order.status === "ready" ? "#fff3e0" :
                          order.status === "preparing" ? "#e3f2fd" :
                          "#f5f5f5",
                        color: 
                          order.status === "delivered" ? "#2e7d32" :
                          order.status === "canceled" ? "#f44336" :
                          order.status === "ready" ? "#f57c00" :
                          order.status === "preparing" ? "#1976d2" :
                          "#757575",
                        display: "inline-block",
                        minWidth: "80px",
                        textAlign: "center"
                      }}>
                        {order.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "1rem", color: "#666", fontSize: "0.9rem" }}>
                      {formatDate(order.created_at)}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <select
                          value={selectedStatus[order.id] || order.status}
                          onChange={(e) => setSelectedStatus({
                            ...selectedStatus,
                            [order.id]: e.target.value
                          })}
                          style={{ 
                            padding: "0.5rem",
                            borderRadius: "6px",
                            border: "1px solid #ddd",
                            fontSize: "0.9rem",
                            minWidth: "100px"
                          }}
                        >
                          <option value="pending">Pending</option>
                          <option value="preparing">Preparing</option>
                          <option value="ready">Ready</option>
                          <option value="delivered">Delivered</option>
                          <option value="canceled">Canceled</option>
                        </select>
                        <button
                          onClick={() => handleStatusChange(order.id, selectedStatus[order.id])}
                          disabled={selectedStatus[order.id] === order.status}
                          style={{
                            padding: "0.5rem 1rem",
                            backgroundColor: selectedStatus[order.id] === order.status ? "#ccc" : "#000",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: selectedStatus[order.id] === order.status ? "not-allowed" : "pointer",
                            fontSize: "0.9rem",
                            transition: "all 0.3s ease"
                          }}
                          onMouseEnter={(e) => {
                            if (selectedStatus[order.id] !== order.status) {
                              e.target.style.backgroundColor = "#333";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedStatus[order.id] !== order.status) {
                              e.target.style.backgroundColor = "#000";
                            }
                          }}
                        >
                          Update
                        </button>
                        {canCancelOrder(order) && (
                          <button
                            onClick={() => handleStatusChange(order.id, "canceled")}
                            style={{
                              padding: "0.5rem 1rem",
                              backgroundColor: "#ffebee",
                              color: "#f44336",
                              border: "1px solid #f44336",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "0.9rem",
                              transition: "all 0.3s ease"
                            }}
                            onMouseEnter={(e) => {
                              e.target.backgroundColor = "#f44336";
                              e.target.color = "#fff";
                            }}
                            onMouseLeave={(e) => {
                              e.target.backgroundColor = "#ffebee";
                              e.target.color = "#f44336";
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats Footer */}
      <div style={{ 
        marginTop: "2rem",
        padding: "1.5rem",
        backgroundColor: "#f8f8f8",
        borderRadius: "12px",
        border: "1px solid #f0f0f0"
      }}>
        <div style={{ display: "flex", gap: "2rem", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 500, color: "#000" }}>
              {orders.length}
            </div>
            <div style={{ color: "#666", fontSize: "0.9rem" }}>Total Orders</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 500, color: "#4CAF50" }}>
              {orders.filter(o => o.status === 'delivered').length}
            </div>
            <div style={{ color: "#666", fontSize: "0.9rem" }}>Delivered</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 500, color: "#f44336" }}>
              {orders.filter(o => o.status === 'canceled').length}
            </div>
            <div style={{ color: "#666", fontSize: "0.9rem" }}>Canceled</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;