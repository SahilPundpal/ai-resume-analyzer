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

    const prompt = `You are an expert resume reviewer.

Analyze the following resume and provide:

1. Resume Score out of 100
2. Key skills detected
3. Strengths of the resume
4. Suggestions for improvement

Resume:
${resumeText.slice(0, 3000)}`;

    console.log("Calling Groq API...");
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content || "No analysis generated.";
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