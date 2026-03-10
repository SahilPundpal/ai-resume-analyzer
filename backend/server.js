const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const crypto = require("crypto");
const pdfParse = require("pdf-parse");
const Groq = require("groq-sdk");
const rateLimit = require("express-rate-limit");
require("dotenv").config();
console.log("API Key loaded:", process.env.GROQ_API_KEY ? "YES" : "NO");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const app = express();

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

app.get("/", (req, res) => {
  res.send("AI Resume Analyzer Backend Running 🚀");
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

app.post("/upload", uploadLimiter, upload.single("resume"), async (req, res) => {
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
    You are an expert resume reviewer and career advisor.

    Score the resume out of 100 using this scale:
    - 90-100: Exceptional resume with strong experience, clear formatting, quantified achievements
    - 70-89: Good resume with relevant skills and projects, minor improvements needed
    - 50-69: Average resume, needs more detail or better formatting
    - 30-49: Below average, missing key sections or poorly structured
    - 0-29: Very incomplete or poorly written resume

    Most resumes from students/freshers with projects and skills should score between 55-80.

    Analyze the resume and return ONLY valid JSON in this format:

    {
      "score": number,
      "skills": ["skill1", "skill2", ...],
      "strengths": ["strength1", "strength2", ...],
      "improvements": ["improvement1", "improvement2", ...]
    }

    Provide at least 3 items in each array.

    Resume:
    ${resumeText.slice(0, 5000)}
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
      aiResponse = JSON.stringify({ score: 0, skills: [], strengths: [], improvements: ["Error parsing AI response. Please try again."] });
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