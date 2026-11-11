/**
 * ============================================================================
 * ARUNACHAL PEOPLES OPINION - NODE.JS / EXPRESS BACKEND ARCHITECTURE
 * File: server.js
 * Purpose:
 *   1. One-Way Salted SHA-256 Citizen Mobile Hashing (DPDP Act 2023 Compliance)
 *   2. Strict Official 28-District Validation
 *   3. Geo-Pinboard Moderation Enforcement (is_approved = false default)
 *   4. Write-Only Endpoint Isolation for Anonymous Speak Free Ledger
 *   5. 2-Page Printable Executive Admin Aggregation Pipeline by District
 * ============================================================================
 */

const express = require("express");
const crypto = require("crypto");
const path = require("path");

const app = express();
app.use(express.json({ limit: "256kb" })); // Low-bandwidth payload constraint
app.use(express.static(path.join(__dirname, "public")));

// Server-side cryptographic secret salt (Loaded from environment in production)
const SERVER_CRYPTO_SALT =
  process.env.DPDP_SHA256_SALT || "ARUNACHAL_STATE_DPDP_2023_SECRET_SALT_V1";

const ADMIN_API_KEY =
  process.env.ADMIN_API_KEY || "EXEC_ADMIN_SECRET_TOKEN_2026";

// Official 28 Arunachal Pradesh Districts Whitelist (Synced with Frontend)
const VALID_DISTRICTS = new Set([
  "Tawang", "West Kameng", "Bichom", "East Kameng", "Pakke-Kessang", "Pakke Kessang",
  "Kurung Kumey", "Kra Daadi", "Papum Pare", "Itanagar Capital Complex",
  "Lower Subansiri", "Keyi Panyor", "Kamle", "Upper Subansiri", "Shi-Yomi", "Shi Yomi",
  "West Siang", "Lepa-Rada", "Lepa Rada", "Lower Siang", "Siang", "Upper Siang",
  "East Siang", "Dibang Valley", "Lower Dibang Valley", "Lohit",
  "Anjaw", "Namsai", "Changlang", "Tirap", "Longding"
]);

// ============================================================================
// IN-MEMORY / DATABASE LEDGER TABLES (PRODUCTION SCHEMA REPRESENTATION)
// Notice: Zero raw phone numbers exist in any schema.
// ============================================================================
const db = {
  authenticatedSessions: new Set(), // Stores ONLY salted SHA-256 hashes
  publicPolls: [],                  // { id, citizenHash, district, resolutionId, selectedOption, createdAt }
  geoPinboardQueue: [],             // { id, citizenHash, district, category, description, coordinates, imageName, is_approved: false, createdAt }
  schemeTracker: [],                // { id, citizenHash, district, schemeCode, status, createdAt }
  youthRegistry: [],                // { id, citizenHash, age, district, qualification, desiredSupport, createdAt }
  isolatedSpeakFreeLedger: []       // STRICTLY PRIVATE: { id, citizenHash, district, message, createdAt }
};

// ============================================================================
// ONE-WAY CRYPTOGRAPHIC SHA-256 HASHING PIPELINE
// ============================================================================
function anonymizeMobileNumber(rawPhoneString) {
  const normalized = String(rawPhoneString).replace(/\D/g, "");
  const hashToken = crypto
    .createHash("sha256")
    .update(`${normalized}::${SERVER_CRYPTO_SALT}`, "utf8")
    .digest("hex");

  // Explicitly overwrite local reference before returning
  rawPhoneString = null;
  return hashToken;
}

// ============================================================================
// 1. PROTOTYPE OTP AUTHENTICATION ENDPOINT
// Accepts "123456" or any 6-digit numeric sequence, hashes phone immediately,
// discards raw phone string from memory, and returns only the SHA-256 token.
// ============================================================================
app.post("/api/auth/verify-otp", (req, res) => {
  let { phone, otp } = req.body;

  if (!phone || !/^\d{10}$/.test(String(phone).trim())) {
    return res.status(400).json({ error: "Valid 10-digit mobile number required." });
  }

  // Prototype verification: accepts "123456" or any 6-digit numeric sequence
  if (!otp || !/^\d{6}$/.test(String(otp).trim())) {
    return res.status(401).json({ error: "Invalid 6-digit OTP sequence." });
  }

  // Immediately compute one-way SHA-256 hash and overwrite raw phone variable in req.body
  const citizenHash = anonymizeMobileNumber(phone);
  req.body.phone = null;
  phone = null;

  db.authenticatedSessions.add(citizenHash);

  return res.status(200).json({
    status: "VERIFIED",
    dpdpCompliance: "RAW_PHONE_DISCARDED_SHA256_ONLY",
    citizenHash
  });
});

// ============================================================================
// 2. TAB 1: PUBLIC POLLING ENDPOINT
// ============================================================================
app.post("/api/polls/vote", (req, res) => {
  const { citizenHash, district, resolutionId, selectedOption } = req.body;

  if (!VALID_DISTRICTS.has(district)) {
    return res.status(400).json({ error: "Mandatory official Arunachal Pradesh district selection required." });
  }
  if (!selectedOption) {
    return res.status(400).json({ error: "Poll option is required." });
  }

  const record = {
    id: crypto.randomUUID(),
    citizenHash: citizenHash || "ANONYMOUS_SESSION",
    district,
    resolutionId: resolutionId || "AP-2026-09",
    selectedOption: String(selectedOption).slice(0, 160),
    createdAt: new Date().toISOString()
  };

  db.publicPolls.push(record);
  return res.status(201).json({ status: "VOTE_RECORDED", id: record.id });
});

// ============================================================================
// 3. TAB 2: GEO-PINBOARD CIVIC REPORTING ENDPOINT
// Enforces `is_approved = false` by default so items never go live automatically.
// ============================================================================
app.post("/api/pinboard/submit", (req, res) => {
  const { citizenHash, district, category, description, coordinates, imageName } = req.body;
  const allowedCategories = new Set(["Roads", "Water", "School", "Electricity"]);

  if (!VALID_DISTRICTS.has(district) || !allowedCategories.has(category)) {
    return res.status(400).json({ error: "Valid district and civic category (Roads, Water, School, Electricity) required." });
  }

  const pinEntry = {
    id: crypto.randomUUID(),
    citizenHash: citizenHash || "ANONYMOUS_SESSION",
    district,
    category,
    description: String(description || "").slice(0, 400),
    coordinates: coordinates ? String(coordinates).slice(0, 64) : null,
    imageName: imageName ? String(imageName).slice(0, 120) : null,
    is_approved: false, // STRICT SECURITY RULE: Defaults to false until Admin approval
    createdAt: new Date().toISOString()
  };

  db.geoPinboardQueue.push(pinEntry);
  return res.status(201).json({
    status: "QUEUED_FOR_ADMIN_REVIEW",
    is_approved: pinEntry.is_approved,
    pinId: pinEntry.id
  });
});

// Public Geo-Pinboard Feed (Strictly filters for is_approved === true ONLY)
app.get("/api/pinboard/approved", (req, res) => {
  const approvedPins = db.geoPinboardQueue.filter(pin => pin.is_approved === true);
  return res.status(200).json({ count: approvedPins.length, pins: approvedPins });
});

// ============================================================================
// 4. TAB 3: SCHEME TRACKER ENDPOINT
// ============================================================================
app.post("/api/schemes/track", (req, res) => {
  const { citizenHash, district, schemeCode, status } = req.body;
  const validStatuses = new Set(["Benefited / Reached", "Not Reached"]);

  if (!schemeCode || !validStatuses.has(status)) {
    return res.status(400).json({ error: "Valid schemeCode and binary status required." });
  }

  const entry = {
    id: crypto.randomUUID(),
    citizenHash: citizenHash || "ANONYMOUS_SESSION",
    district: VALID_DISTRICTS.has(district) ? district : "Unspecified",
    schemeCode: String(schemeCode).slice(0, 60),
    status,
    createdAt: new Date().toISOString()
  };

  db.schemeTracker.push(entry);
  return res.status(201).json({ status: "SCHEME_METRIC_LOGGED", id: entry.id });
});

// ============================================================================
// 5. TAB 4: YOUTH TRACKER ENDPOINT
// ============================================================================
app.post("/api/youth/register", (req, res) => {
  const { citizenHash, age, district, qualification, desiredSupport } = req.body;

  if (!VALID_DISTRICTS.has(district)) {
    return res.status(400).json({ error: "Valid Arunachal Pradesh district required." });
  }

  const entry = {
    id: crypto.randomUUID(),
    citizenHash: citizenHash || "ANONYMOUS_SESSION",
    age: Number(age) || 18,
    district,
    qualification: String(qualification || "").slice(0, 120),
    desiredSupport: Array.isArray(desiredSupport) ? desiredSupport.slice(0, 10) : [],
    createdAt: new Date().toISOString()
  };

  db.youthRegistry.push(entry);
  return res.status(201).json({ status: "YOUTH_PROFILE_LOGGED", id: entry.id });
});

// ============================================================================
// 6. TAB 5: ANONYMOUS SPEAK FREE (WRITE-ONLY ENDPOINT ISOLATION)
// Zero public GET endpoints expose `db.isolatedSpeakFreeLedger`.
// ============================================================================
app.post("/api/speak-free", (req, res) => {
  const { citizenHash, district, message } = req.body;

  if (!VALID_DISTRICTS.has(district) || !message || !String(message).trim()) {
    return res.status(400).json({ error: "District and feedback text are required." });
  }

  db.isolatedSpeakFreeLedger.push({
    id: crypto.randomUUID(),
    citizenHash: citizenHash || "ANONYMOUS_SESSION",
    district,
    message: String(message).trim().slice(0, 2000),
    createdAt: new Date().toISOString()
  });

  // Return minimal confirmation without echoing sensitive content back
  return res.status(201).json({ status: "COMMITTED_TO_ISOLATED_ADMIN_LEDGER" });
});

// ============================================================================
// 7. EXPORT-OPTIMIZED ADMIN DATA AGGREGATION PIPELINE
// ============================================================================
const STOPWORDS = new Set([
  "the", "and", "for", "that", "this", "with", "from", "have", "are",
  "was", "were", "has", "not", "but", "what", "all", "our", "near",
  "need", "very", "into", "since", "been", "more", "some", "also"
]);

function extractTopDistrictKeywords(messages, limit = 5) {
  const freq = {};
  messages.forEach(msg => {
    const words = String(msg)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length >= 4 && !STOPWORDS.has(w));
    words.forEach(w => {
      freq[w] = (freq[w] || 0) + 1;
    });
  });

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

app.get("/api/admin/export-summary", (req, res) => {
  const providedKey = req.headers["x-admin-key"];
  if (providedKey !== ADMIN_API_KEY) {
    return res.status(403).json({ error: "Unauthorized: Executive Admin Key required." });
  }

  const districtBreakdown = {};

  VALID_DISTRICTS.forEach(district => {
    const districtPolls = db.publicPolls.filter(p => p.district === district);
    const pollTallies = {};
    districtPolls.forEach(p => {
      pollTallies[p.selectedOption] = (pollTallies[p.selectedOption] || 0) + 1;
    });

    const districtSchemes = db.schemeTracker.filter(s => s.district === district);
    const reachedCount = districtSchemes.filter(s => s.status === "Benefited / Reached").length;
    const notReachedCount = districtSchemes.filter(s => s.status === "Not Reached").length;
    const totalSchemeResponses = reachedCount + notReachedCount;
    const reachPercentage = totalSchemeResponses > 0
      ? Number(((reachedCount / totalSchemeResponses) * 100).toFixed(1))
      : 0;

    const districtPins = db.geoPinboardQueue.filter(pin => pin.district === district);
    const pendingPins = districtPins.filter(pin => pin.is_approved === false).length;
    const approvedPins = districtPins.filter(pin => pin.is_approved === true).length;

    const districtSpeakFreeMessages = db.isolatedSpeakFreeLedger
      .filter(item => item.district === district)
      .map(item => item.message);
    const topWordTrends = extractTopDistrictKeywords(districtSpeakFreeMessages, 5);

    districtBreakdown[district] = {
      totalPollVotes: districtPolls.length,
      pollOptionBreakdown: pollTallies,
      schemeReachMetrics: {
        benefitedCount: reachedCount,
        notReachedCount,
        reachRatioPercent: reachPercentage
      },
      geoPinboardQueue: {
        pendingModerationCount: pendingPins,
        approvedLiveCount: approvedPins
      },
      youthRegistrationsCount: db.youthRegistry.filter(y => y.district === district).length,
      speakFreeWordTrends: topWordTrends
    };
  });

  return res.status(200).json({
    reportTitle: "Arunachal Peoples Opinion - 2-Page Executive Admin Print Digest",
    generatedAt: new Date().toISOString(),
    dpdpComplianceStatus: "100% SHA-256 Anonymized Ledger",
    statewideTotals: {
      uniqueAnonymizedCitizens: db.authenticatedSessions.size,
      totalVotesCast: db.publicPolls.length,
      pendingGeoPinsForReview: db.geoPinboardQueue.filter(p => !p.is_approved).length,
      totalSchemeAudits: db.schemeTracker.length,
      totalYouthProfiles: db.youthRegistry.length,
      totalIsolatedSpeakFreeEntries: db.isolatedSpeakFreeLedger.length
    },
    districtExecutiveMatrix: districtBreakdown
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Arunachal Peoples Opinion Server listening on port ${PORT}`);
});