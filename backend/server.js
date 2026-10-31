import express from 'express';
import cors from 'cors';
import multer from 'multer';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Analysis from './models/Analysis.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/resume_analyzer';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully!'))
  .catch((err) => console.error('❌ MongoDB connection error:', err.message));

// Multer memory storage for PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Keyword dictionary for ATS matching
const MASTER_SKILLS = [
  "javascript", "react", "react.js", "node.js", "nodejs", "express", "express.js",
  "mongodb", "typescript", "docker", "aws", "git", "github", "ci/cd", "python",
  "sql", "html", "css", "problem solving", "data structures", "agile", "scrum",
  "rest api", "tailwind", "next.js", "redux", "graphql"
];

function extractKeywords(text) {
  if (!text) return [];
  const clean = text.toLowerCase();
  return MASTER_SKILLS.filter(skill => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(clean);
  });
}

// Main Analyze Route
app.post('/api/analysis', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No PDF file uploaded" });
    }

    // 1. Parse PDF buffer
    let resumeText = "";
    try {
      const pdfData = await pdfParse(req.file.buffer);
      resumeText = pdfData.text || "";
    } catch (parseErr) {
      console.error("PDF Parsing error:", parseErr);
      return res.status(500).json({ message: "Could not read text from this PDF file" });
    }

    const jdText = req.body.jobDescription || "";

    // 2. Extract skills
    const resumeSkills = extractKeywords(resumeText);
    const jdSkills = extractKeywords(jdText);

    // 3. Calculate intersections
    const matchedSkills = jdSkills.filter(s => resumeSkills.includes(s));
    const missingSkills = jdSkills.filter(s => !resumeSkills.includes(s));

    // Calculate realistic score
    let score = 75;
    if (jdSkills.length > 0) {
      score = Math.round((matchedSkills.length / jdSkills.length) * 100);
    } else if (resumeSkills.length > 0) {
      score = Math.min(90, resumeSkills.length * 8);
    }

    // 4. Save to Database (safe wrapper)
    try {
      const newRecord = new Analysis({
        resumeName: req.file.originalname,
        score,
        matchedSkills,
        missingSkills,
        jobDescription: jdText.substring(0, 500)
      });
      await newRecord.save();
    } catch (dbErr) {
      console.warn("DB Save Warning:", dbErr.message);
    }

    // 5. Send complete response to frontend
    res.json({
      score,
      matchedSkills,
      missingSkills,
      totalResumeSkills: resumeSkills,
      hardSkillScore: Math.min(100, Math.round(score * 0.95)),
      impactScore: Math.max(60, Math.min(95, score - 5))
    });

  } catch (err) {
    console.error("Backend Error:", err);
    res.status(500).json({ message: "Analysis failed on server: " + err.message });
  }
});

// History endpoint
app.get('/api/analysis/history', async (req, res) => {
  try {
    const list = await Analysis.find().sort({ createdAt: -1 }).limit(10);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch history" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));