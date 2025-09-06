// src/components/Manager.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import { ToastContainer, toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { getPasswords, addPassword, updatePassword, deletePassword, removeToken, getUser, isAuthenticated } from "../services/api";
import "react-toastify/dist/ReactToastify.css";

const Manager = () => {
  const navigate = useNavigate();
  const passwordRef = useRef();
  const eyeRef = useRef();
  
  const [form, setForm] = useState({ site: "", username: "", password: "" });
  const [passwordArray, setPasswordArray] = useState([]);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  

  // Handle logout
  const handleLogout = useCallback(() => {
    removeToken();
    toast.info("Logged out successfully");
    navigate("/");
  }, [navigate]);

  // Fetch passwords from API
  const fetchPasswords = useCallback(async () => {
    try {
      setLoading(true);
      const passwords = await getPasswords();
      setPasswordArray(passwords);
    } catch (error) {
      console.error("Fetch passwords error:", error);
      if (error.message.includes("401") || error.message.includes("token")) {
        handleLogout();
      } else {
        toast.error("Unable to load passwords. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [handleLogout]);

  // Check authentication on component mount
  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error("Please login to access the password manager");
      navigate("/");
      return;
    }
    
    const userData = getUser();
    setUser(userData);
    fetchPasswords();
  }, [navigate, fetchPasswords]);

  // Form validation
  const validateForm = () => {
    if (!form.site.trim()) {
      toast.error("Please enter a website URL");
      return false;
    }
    if (!form.username.trim()) {
      toast.error("Please enter a username");
      return false;
    }
    if (!form.password.trim()) {
      toast.error("Please enter a password");
      return false;
    }
    if (form.site.trim().length < 3) {
      toast.error("Website URL must be at least 3 characters long");
      return false;
    }
    return true;
  };

  // Copy text to clipboard
  const copyText = async (text, type = "text") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type} copied to clipboard!`, {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: true,
      });
    } catch (error) {
      console.error("Copy failed:", error);
      toast.error("Failed to copy to clipboard");
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    const passwordInput = passwordRef.current;
    const eyeIcon = eyeRef.current;
    
    if (passwordInput && eyeIcon) {
      const isPassword = passwordInput.type === "password";
      passwordInput.type = isPassword ? "text" : "password";
      eyeIcon.src = isPassword ? "/icons/eyecross.png" : "/icons/eye.png";
    }
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Clear form
  const clearForm = () => {
    setForm({ site: "", username: "", password: "" });
    setEditId(null);
    // Reset password visibility
    if (passwordRef.current) {
      passwordRef.current.type = "password";
    }
    if (eyeRef.current) {
      eyeRef.current.src = "/icons/eye.png";
    }
  };

  // Save or update password
  const savePassword = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (editId) {
        // UPDATE existing password
        await updatePassword(editId, form);
        toast.success("Password updated successfully!");
      } else {
        // ADD new password
        await addPassword(form);
        toast.success("Password saved successfully!");
      }
      
      clearForm();
      await fetchPasswords();
    } catch (error) {
      console.error("Save password error:", error);
      if (error.message.includes("401") || error.message.includes("token")) {
        handleLogout();
      } else {
        toast.error(error.message || "Failed to save password");
      }
    } finally {
      setLoading(false);
    }
  };

  // Delete password
  const handleDeletePassword = async (id) => {
    if (!window.confirm("Are you sure you want to delete this password? This action cannot be undone.")) {
      return;
    }

    setLoading(true);

    try {
      await deletePassword(id);
      toast.success("Password deleted successfully!");
      await fetchPasswords();
    } catch (error) {
      console.error("Delete password error:", error);
      if (error.message.includes("401") || error.message.includes("token")) {
        handleLogout();
      } else {
        toast.error(error.message || "Failed to delete password");
      }
    } finally {
      setLoading(false);
    }
  };

  // Edit password
  const handleEditPassword = (id) => {
    const itemToEdit = passwordArray.find((item) => item._id === id);
    if (!itemToEdit) {
      toast.error("Password not found");
      return;
    }

    setForm({
      site: itemToEdit.site || "",
      username: itemToEdit.username || "",
      password: itemToEdit.password || "",
    });
    setEditId(id);
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Filter passwords based on search term
  const filteredPasswords = passwordArray.filter((item) => {
    const search = searchTerm.toLowerCase();
    return (
      item.site?.toLowerCase().includes(search) ||
      item.username?.toLowerCase().includes(search)
    );
  });

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      
      {/* Navigation Header */}
      <nav className="bg-slate-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">
                <span className="text-green-500">&lt;</span>Pass<span className="text-green-500">OP/&gt;</span>
              </h1>
              {user && (
                <span className="text-gray-300 text-sm">
                  Welcome, {user.username}!
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition duration-200 font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6 min-h-screen bg-gray-50">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Password Manager</h2>
          <p className="text-gray-600">Securely store and manage your passwords</p>
        </div>

        {/* Password Form */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">
            {editId ? "Update Password" : "Add New Password"}
          </h3>
          
          <form onSubmit={(e) => { e.preventDefault(); savePassword(); }} className="space-y-4">
            {/* Website URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website URL
              </label>
              <input
                type="url"
                name="site"
                value={form.site}
                onChange={handleChange}
                placeholder="https://example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username/Email
                </label>
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Enter username or email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    ref={passwordRef}
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                    disabled={loading}
                  >
                    <img
                      ref={eyeRef}
                      src="/icons/eye.png"
                      alt="Toggle password visibility"
                      className="w-5 h-5"
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : (editId ? "Update Password" : "Save Password")}
              </button>
              
              {editId && (
                <button
                  type="button"
                  onClick={clearForm}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition duration-200"
                  disabled={loading}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Passwords List */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 md:mb-0">
              Your Passwords ({passwordArray.length})
            </h3>
            
            {/* Search Bar */}
            {passwordArray.length > 0 && (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search passwords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent w-full md:w-64"
                />
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
              <p className="mt-2 text-gray-600">Loading passwords...</p>
            </div>
          ) : passwordArray.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-600 mb-2">No passwords saved yet</h4>
              <p className="text-gray-500">Start by adding your first password above!</p>
            </div>
          ) : filteredPasswords.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No passwords match your search term.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Website
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Password
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPasswords.map((item) => (
                    <tr key={item._id} className="hover:bg-gray-50">
                      {/* Website */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <a
                            href={item.site.startsWith('http') ? item.site : `https://${item.site}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline truncate max-w-xs"
                            title={item.site}
                          >
                            {item.site}
                          </a>
                          <button
                            onClick={() => copyText(item.site, "Website URL")}
                            className="p-1 hover:bg-gray-200 rounded transition duration-150"
                            title="Copy website URL"
                          >
                            <img src="/icons/copy.png" alt="Copy" className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <span className="text-gray-900 truncate max-w-xs" title={item.username}>
                            {item.username}
                          </span>
                          <button
                            onClick={() => copyText(item.username, "Username")}
                            className="p-1 hover:bg-gray-200 rounded transition duration-150"
                            title="Copy username"
                          >
                            <img src="/icons/copy.png" alt="Copy" className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                      {/* Password */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <span className="text-gray-900 font-mono">
                            {"●".repeat(Math.min(item.password.length, 8))}
                          </span>
                          <button
                            onClick={() => copyText(item.password, "Password")}
                            className="p-1 hover:bg-gray-200 rounded transition duration-150"
                            title="Copy password"
                          >
                            <img src="/icons/copy.png" alt="Copy" className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => handleEditPassword(item._id)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition duration-150"
                            title="Edit password"
                          >
                            <img src="/icons/edit.png" alt="Edit" className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePassword(item._id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition duration-150"
                            title="Delete password"
                          >
                            <img src="/icons/bin.png" alt="Delete" className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Manager;
