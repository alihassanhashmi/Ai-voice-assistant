// components/AdminPage.jsx
import React from 'react';
import AdminOrders from './AdminOrders';

const AdminPage = () => {
  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>Admin Dashboard</h1>
      <AdminOrders />
    </div>
  );
};

export default AdminPage;