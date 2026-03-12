# AI Resume Analyzer 🚀

An **AI-powered Resume Analyzer** that evaluates resumes against job descriptions using **LLMs**.

Users can upload a resume (PDF) and optionally paste a job description to receive:

- Resume Score
- Job Match Score
- Extracted Skills
- AI-based Resume Analysis

The system uses **Groq LLM** for intelligent resume evaluation.

---

# Live Demo

### Frontend (Vercel)
https://ai-resume-analyzer-wine-mu.vercel.app

### Backend API (Render)
https://ai-resume-analyzer-backend-7o4r.onrender.com

---

# Features

- Upload resume in **PDF format**
- Extract resume text using **pdf-parse**
- AI powered resume scoring
- Job description matching
- Skill extraction
- Clean UI built with **React + Tailwind**
- Deployed using **Vercel + Render**

---

# Tech Stack

## Frontend
- React
- TailwindCSS
- Axios
- Vite

## Backend
- Node.js
- Express
- Multer
- pdf-parse
- Groq API (LLM)

---

# Deployment

- **Vercel** (Frontend)
- **Render** (Backend)

  
---
# Project Architecture
```
Frontend (React + Tailwind)
↓
Upload Resume
↓
Backend (Node.js + Express)
↓
Multer handles file upload
↓
pdf-parse extracts resume text
↓
Groq LLM analyzes resume
↓
Frontend displays result
```


---
# Project Structure
```
ai-resume-analyzer
│
├── frontend
│ ├── src
│ │ ├── Home.jsx
│ │ ├── App.jsx
│ │ └── main.jsx
│ └── package.json
│
├── backend
│ ├── uploads
│ ├── server.js
│ ├── package.json
│ └── .env
│
└── README.md
```
