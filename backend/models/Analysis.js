import mongoose from 'mongoose';

const AnalysisSchema = new mongoose.Schema({
  resumeName: {
    type: String,
    default: 'Resume.pdf'
  },
  score: {
    type: Number,
    default: 0
  },
  matchedSkills: {
    type: [String],
    default: []
  },
  missingSkills: {
    type: [String],
    default: []
  },
  jobDescription: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Analysis = mongoose.models.Analysis || mongoose.model('Analysis', AnalysisSchema);
export default Analysis;