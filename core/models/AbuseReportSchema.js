const mongoose = require('mongoose');
const { AbuseCategoryEnum } = require('./AbuseCategoryEnum'); // percorso corretto al file

const AbuseReportSchema = new mongoose.Schema({
  abuseIpDbId: { type: mongoose.Schema.Types.ObjectId, ref: 'AbuseIpDb', required: true },

  reportedAt: { type: Date, required: true },     // Quando è stato inviato il report al DB
  comment: { type: String, required: true },       // Commento/report testuale
  categories: { type: [Number], enum: Object.values(AbuseCategoryEnum), default: [] },     // Categorie associate al report (opzionale)
  tags: { type: [String], default: [] },           // Tag arbitrari per classificare
  reporterId: { type: Number },
  reporterCountryCode: { type: String },
  reporterCountryName: { type: String }  

}, { timestamps: true });

// Collezione: abusereports
module.exports = mongoose.model('AbuseReport', AbuseReportSchema);


