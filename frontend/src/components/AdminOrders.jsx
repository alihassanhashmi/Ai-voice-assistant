// components/AdminOrders.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState({});

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:8000/admin/orders");
      console.log(response.data.orders); // <-- Add this line
      setOrders(response.data.orders);
      
      // Initialize status selection for each order
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

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await axios.patch(
        `http://localhost:8000/admin/orders/${orderId}`,
        { status: newStatus }
      );
      
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
      
      // Update selected status
      setSelectedStatus(prev => ({ ...prev, [orderId]: newStatus }));
      
      alert(response.data.message);
    } catch (err) {
      console.error("Error updating order:", err);
      alert(err.response?.data?.detail || "Failed to update order status");
    }
  };

  const handleStatusChange = (orderId, newStatus) => {
    if (window.confirm(`Are you sure you want to change the status to ${newStatus}?`)) {
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

  if (loading) return <div>Loading orders...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <Link to="/" style={{ padding: "0.5rem 1rem", backgroundColor: "#333", color: "white", textDecoration: "none", marginRight: "1rem" }}>
          Back to Voice Assistant
        </Link>
        <button 
          onClick={fetchOrders} 
          style={{ 
            padding: "0.5rem 1rem", 
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Refresh Orders
        </button>
      </div>

      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ 
            width: "100%", 
            borderCollapse: "collapse",
            backgroundColor: "black",
            boxShadow: "0 2px 8px rgba(255, 255, 255, 0.1)"
          }}>
            <thead>
              <tr style={{ backgroundColor: "#000000ff" }}>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ffffffff" }}>Order ID</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ffffffff" }}>Customer</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Items</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Quantity</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Status</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Order Date</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} style={{ borderBottom: "1px solid #000000ff" }}>
                  <td style={{ padding: "12px" }}>#{order.id}</td>
                  <td style={{ padding: "12px" }}>{order.customer_name} <br /> {order.phone_number}</td>
                  <td style={{ padding: "12px" }}>{order.item}</td>
                  <td style={{ padding: "12px" }}>{order.quantity}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{
                      padding: "4px 8px",
                      borderRadius: "12px",
                      fontSize: "0.85rem",
                      fontWeight: "bold",
                      backgroundColor: 
                        order.status === "delivered" ? "#4CAF50" :
                        order.status === "canceled" ? "#f44336" :
                        "#2196F3",
                      color: "white"
                    }}>
                      {order.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>{formatDate(order.created_at)}</td>
                  <td style={{ padding: "12px" }}>
                    <select
                      value={selectedStatus[order.id] || order.status}
                      onChange={(e) => setSelectedStatus({
                        ...selectedStatus,
                        [order.id]: e.target.value
                      })}
                      style={{ 
                        padding: "6px", 
                        marginRight: "8px",
                        borderRadius: "4px",
                        border: "1px solid #ddd"
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
                        padding: "6px 12px",
                        backgroundColor: "#4CAF50",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: selectedStatus[order.id] === order.status ? "not-allowed" : "pointer",
                        opacity: selectedStatus[order.id] === order.status ? 0.6 : 1
                      }}
                    >
                      Update
                    </button>
                    {canCancelOrder(order) && (
                      <button
                        onClick={() => handleStatusChange(order.id, "canceled")}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#f44336",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          marginLeft: "8px"
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;