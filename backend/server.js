const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const dotenv = require("dotenv");
const bodyparser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

dotenv.config();

// Environment variables validation
if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET is required in .env file");
  process.exit(1);
}

const url = process.env.MONGO_URI || "mongodb://localhost:27017";
const client = new MongoClient(url);
const dbName = "passop";

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(bodyparser.json({ limit: '10mb' }));
app.use(bodyparser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ✅ Middleware to verify JWT
function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // "Bearer TOKEN"
    
    if (!token) {
      return res.status(401).json({ success: false, message: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id: userId }
    next();
  } catch (err) {
    console.error("JWT verification error:", err.message);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: "Token expired. Please login again." });
    }
    return res.status(401).json({ success: false, message: "Invalid token." });
  }
}

// Input validation helpers
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password) {
  return password && password.length >= 6; // minimum 6 characters
}

function validateUsername(username) {
  return username && username.trim().length >= 2; // minimum 2 characters
}

async function startServer() {
  await client.connect();
  console.log("✅ Connected successfully to MongoDB");

  const db = client.db(dbName);
  const usersCollection = db.collection("users");
  const passwordsCollection = db.collection("passwords");

  // 🔹 Register
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password } = req.body;

      // Input validation
      if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: "All fields are required" });
      }

      if (!validateEmail(email)) {
        return res.status(400).json({ success: false, message: "Please provide a valid email address" });
      }

      if (!validateUsername(username)) {
        return res.status(400).json({ success: false, message: "Username must be at least 2 characters long" });
      }

      if (!validatePassword(password)) {
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" });
      }

      // Check if user already exists
      const existingUser = await usersCollection.findOne({ 
        $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] 
      });
      
      if (existingUser) {
        const field = existingUser.email === email.toLowerCase() ? 'Email' : 'Username';
        return res.status(400).json({ success: false, message: `${field} already exists` });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const result = await usersCollection.insertOne({ 
        username: username.trim(),
        email: email.toLowerCase(),
        password: hashedPassword,
        createdAt: new Date()
      });

      console.log("✅ User registered successfully:", result.insertedId);
      res.status(201).json({ 
        success: true, 
        message: "User registered successfully", 
        userId: result.insertedId 
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  // 🔹 Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      // Input validation
      if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password are required" });
      }

      if (!validateEmail(email)) {
        return res.status(400).json({ success: false, message: "Please provide a valid email address" });
      }

      // Find user
      const user = await usersCollection.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
      );

      console.log("✅ User logged in successfully:", user.email);
      res.json({
        success: true,
        token,
        user: { id: user._id, username: user.username, email: user.email },
        message: "Login successful"
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  // 🔹 Protected Password Routes

  // Get all passwords of logged-in user
  app.get("/api/passwords", verifyToken, async (req, res) => {
    try {
      const findResult = await passwordsCollection.find({ 
        userId: req.user.id 
      }).sort({ createdAt: -1 }).toArray();
      
      console.log(`✅ Retrieved ${findResult.length} passwords for user:`, req.user.id);
      res.json(findResult);
    } catch (error) {
      console.error("Get passwords error:", error);
      res.status(500).json({ success: false, message: "Failed to retrieve passwords" });
    }
  });

  // Save a password
  app.post("/api/passwords", verifyToken, async (req, res) => {
    try {
      const { site, username, password } = req.body;
      
      // Input validation
      if (!site || !username || !password) {
        return res.status(400).json({ 
          success: false, 
          message: "Site, username, and password are required" 
        });
      }

      if (site.trim().length < 3) {
        return res.status(400).json({ 
          success: false, 
          message: "Site must be at least 3 characters long" 
        });
      }

      if (username.trim().length < 1) {
        return res.status(400).json({ 
          success: false, 
          message: "Username cannot be empty" 
        });
      }

      if (password.length < 1) {
        return res.status(400).json({ 
          success: false, 
          message: "Password cannot be empty" 
        });
      }

      const passwordData = {
        site: site.trim(),
        username: username.trim(),
        password,
        userId: req.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await passwordsCollection.insertOne(passwordData);
      console.log("✅ Password saved successfully:", result.insertedId);
      res.status(201).json({ 
        success: true, 
        insertedId: result.insertedId,
        message: "Password saved successfully" 
      });
    } catch (error) {
      console.error("Save password error:", error);
      res.status(500).json({ success: false, message: "Failed to save password" });
    }
  });

  // Update a password by ID
  app.put("/api/passwords/:id", verifyToken, async (req, res) => {
    try {
      const id = req.params.id;
      const { site, username, password } = req.body;

      // Validate ObjectId format
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid password ID format" });
      }

      // Input validation
      if (!site || !username || !password) {
        return res.status(400).json({ 
          success: false, 
          message: "Site, username, and password are required" 
        });
      }

      if (site.trim().length < 3) {
        return res.status(400).json({ 
          success: false, 
          message: "Site must be at least 3 characters long" 
        });
      }

      // Check if password exists and belongs to user
      const exists = await passwordsCollection.findOne({ 
        _id: new ObjectId(id), 
        userId: req.user.id 
      });
      
      if (!exists) {
        return res.status(404).json({ success: false, message: "Password not found or access denied" });
      }

      // Update password
      const updatedData = {
        site: site.trim(),
        username: username.trim(),
        password,
        updatedAt: new Date()
      };

      await passwordsCollection.updateOne(
        { _id: new ObjectId(id) }, 
        { $set: updatedData }
      );
      
      console.log("✅ Password updated successfully:", id);
      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      console.error("Update password error:", error);
      res.status(500).json({ success: false, message: "Failed to update password" });
    }
  });

  // Delete a password by ID
  app.delete("/api/passwords/:id", verifyToken, async (req, res) => {
    try {
      const id = req.params.id;

      // Validate ObjectId format
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid password ID format" });
      }

      // Check if password exists and belongs to user
      const exists = await passwordsCollection.findOne({ 
        _id: new ObjectId(id), 
        userId: req.user.id 
      });
      
      if (!exists) {
        return res.status(404).json({ success: false, message: "Password not found or access denied" });
      }

      // Delete password
      await passwordsCollection.deleteOne({ _id: new ObjectId(id) });
      
      console.log("✅ Password deleted successfully:", id);
      res.json({ success: true, message: "Password deleted successfully" });
    } catch (error) {
      console.error("Delete password error:", error);
      res.status(500).json({ success: false, message: "Failed to delete password" });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "OK", 
      message: "PassOP Backend Server is running", 
      timestamp: new Date().toISOString() 
    });
  });

  // Handle 404 routes
  app.use("*", (req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
  });

  // Global error handler
  app.use((error, req, res, next) => {
    console.error("Global error handler:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  });

  app.listen(port, () => {
    console.log(`🚀 PassOP Backend Server is running on http://localhost:${port}`);
    console.log(`🔄 Health check available at http://localhost:${port}/api/health`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch((err) => {
  console.error("❌ Failed to start server:", err);
});
