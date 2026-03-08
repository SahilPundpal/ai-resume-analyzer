const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const pdfParse = require("pdf-parse");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.post("/upload", upload.single("resume"), async (req, res) => {
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

    console.log("Resume Text Extracted:");
    console.log(resumeText.substring(0, 500));

    res.json({
      message: "Resume uploaded and parsed successfully",
      text: resumeText
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
  console.log(`Server running on port ${PORT}`);
});