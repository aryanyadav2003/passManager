// src/services/api.js

const API_URL = "http://localhost:3000/api"; // Updated to include /api prefix

// Helper function to handle API responses
const handleResponse = async (response) => {
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }
  
  return data;
};

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

// Token management functions
export const setToken = (token) => {
  localStorage.setItem("token", token);
};

export const getToken = () => {
  return localStorage.getItem("token");
};

export const removeToken = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const getUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!getToken();
};

// Auth API calls
export const registerUser = async (userData) => {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error("Register API error:", error);
    throw error;
  }
};

export const loginUser = async (userData) => {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error("Login API error:", error);
    throw error;
  }
};

// Password management API calls
export const getPasswords = async () => {
  try {
    const response = await fetch(`${API_URL}/passwords`, {
      headers: getAuthHeaders(),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error("Get passwords API error:", error);
    throw error;
  }
};

export const addPassword = async (passwordData) => {
  try {
    const response = await fetch(`${API_URL}/passwords`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(passwordData),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error("Add password API error:", error);
    throw error;
  }
};

export const updatePassword = async (id, updatedData) => {
  try {
    const response = await fetch(`${API_URL}/passwords/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(updatedData),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error("Update password API error:", error);
    throw error;
  }
};

export const deletePassword = async (id) => {
  try {
    const response = await fetch(`${API_URL}/passwords/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error("Delete password API error:", error);
    throw error;
  }
};

// Health check
export const healthCheck = async () => {
  try {
    const response = await fetch(`${API_URL}/health`);
    return await handleResponse(response);
  } catch (error) {
    console.error("Health check API error:", error);
    throw error;
  }
};
