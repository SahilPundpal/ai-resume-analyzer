const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pdfParse = require("pdf-parse");
const Groq = require("groq-sdk");
const rateLimit = require("express-rate-limit");
require("dotenv").config();
console.log("API Key loaded:", process.env.GROQ_API_KEY ? "YES" : "NO");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret-in-production";

// In-memory users store for demo purposes (email -> user)
const users = new Map();

// In-memory cache: hash -> { analysis, timestamp }
const analysisCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limit: max 5 uploads per minute per IP
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { message: "Too many requests. Please wait a minute before trying again." }
});

// Rate limit: max 20 auth requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many auth attempts. Please try again later." }
});

const createToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized. Missing token." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized. Invalid token." });
  }
};

app.get("/", (req, res) => {
  res.send("AI Resume Analyzer Backend Running 🚀");
});

app.post("/auth/register", authLimiter, async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    if (!email.includes("@")) {
      return res.status(400).json({ message: "Please provide a valid email." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    if (users.has(email)) {
      return res.status(409).json({ message: "User already exists. Please log in." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      id: crypto.randomUUID(),
      email,
      passwordHash,
      createdAt: new Date().toISOString()
    };

    users.set(email, user);

    const token = createToken(user);

    return res.status(201).json({
      message: "Account created successfully.",
      token,
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Failed to register user." });
  }
});

app.post("/auth/login", authLimiter, async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = users.get(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = createToken(user);

    return res.json({
      message: "Logged in successfully.",
      token,
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Failed to log in." });
  }
});

app.get("/auth/me", authenticateToken, (req, res) => {
  return res.json({ user: { id: req.user.id, email: req.user.email } });
});

const path = require("path");

const uploadPath = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {

  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files allowed"), false);
  }

};
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter
});

app.post("/upload", authenticateToken, uploadLimiter, upload.single("resume"), async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded"
      });
    }

    console.log("File received:", req.file.originalname);

    const dataBuffer = req.file.buffer;

    const pdfData = await pdfParse(dataBuffer);

    const resumeText = pdfData.text || "";
    const jobDescription = req.body.jobDescription || "";

    // Cache: hash the resume text to check for duplicates
    const resumeHash = crypto.createHash("sha256").update(resumeText).digest("hex");
    const cached = analysisCache.get(resumeHash);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      console.log("Cache hit for resume:", req.file.originalname);
      return res.json({
        message: "Resume analyzed successfully (cached)",
        analysis: cached.analysis
      });
    }

    const prompt = `
    You are an ATS resume analyzer.

    Resume:
    ${resumeText.slice(0,5000)}

    Job Description:
    ${jobDescription}

    Score the resume quality out of 100 based on:

    - clarity of projects
    - technical skills
    - structure and formatting
    - quantified achievements
    - relevance to software engineering roles

    Most student resumes should score between 60 and 85.

    Return ONLY JSON in this format:

    {
    "score": number,
    "match_score": number,
    "skills": [],
    "matched_skills": [],
    "missing_skills": [],
    "strengths": [],
    "improvements": []
    }

    Rules:
    -match_score = percentage of resume skills matching job description
    -matched_skills = skills that appear in BOTH the resume and the job description
    -missing_skills = skills mentioned in the job description but NOT found in the resume
    `;

    console.log("Calling Groq API...");
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are an expert resume reviewer. Always respond with ONLY valid JSON, no markdown, no code blocks, no extra text." },
        { role: "user", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    let aiResponse = chatCompletion.choices[0]?.message?.content || "{}";
    console.log("Groq API raw response:", aiResponse.substring(0, 200));

    // Clean markdown code blocks if present
    aiResponse = aiResponse.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    // Validate it's proper JSON
    try {
      JSON.parse(aiResponse);
    } catch {
      console.error("Invalid JSON from Groq, wrapping raw response");
      aiResponse = JSON.stringify({ score: 0, skills: [], missing_skills: [], strengths: [], improvements: ["Error parsing AI response. Please try again."] });
    }

    console.log("Groq API response received.");

    // Store in cache
    analysisCache.set(resumeHash, { analysis: aiResponse, timestamp: Date.now() });

    console.log("Resume Text Extracted:");
    console.log(resumeText.substring(0, 500));

    res.json({
      message: "Resume analyzed successfully",
      analysis: aiResponse
    });

  } catch (error) {

    console.error("FULL ERROR:");
    console.error(error);
    console.error(error.stack);

    res.status(500).json({
      message: "Error processing resume"
    });

  }
});

app.use((err, req, res, next) => {

  console.error("Multer Error:", err.message);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      message: err.message
    });
  }

  if (err) {
    return res.status(400).json({
      message: err.message
    });
  }

  next();

});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`\n✅ Server running on http://localhost:${PORT}`);
  console.log(`🟢 Waiting for resume uploads...\n`);
});