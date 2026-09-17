const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

async function uploadXlsx() {
  const boundary = crypto.randomBytes(16).toString("hex");
  const filePath = path.resolve(__dirname, "../../frontend/public/demo_files/Supervisor_DPR_21Sep2026.xlsx");
  const fileData = fs.readFileSync(filePath);
  const filename = "Supervisor_DPR_21Sep2026.xlsx";
  
  const ctype = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const header = Buffer.from([
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"`,
    `Content-Type: ${ctype}`,
    "",
    ""
  ].join("\r\n"));
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([header, fileData, footer]);

  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: "localhost",
      port: 5000,
      path: "/api/reports/upload",
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length,
      },
    }, res => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve(JSON.parse(data)));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function processDoc(docId) {
  const body = JSON.stringify({ document_id: docId, reportDate: "2026-09-21" });
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: "localhost",
      port: 5000,
      path: "/api/reports/process",
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    }, res => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve(JSON.parse(data)));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  try {
    console.log("Step 1: Uploading XLSX...");
    const uploadResult = await uploadXlsx();
    console.log("Upload result:", JSON.stringify(uploadResult, null, 2));
    
    if (!uploadResult.document_id) {
      console.error("No document_id in response!");
      return;
    }
    
    console.log("\nStep 2: Processing document...");
    const processResult = await processDoc(uploadResult.document_id);
    console.log("Process result:", JSON.stringify({
      success: processResult.success,
      extractedCount: processResult.extractedCount,
      autoMatched: processResult.autoMatched,
      needsReview: processResult.needsReview,
      error: processResult.error,
    }, null, 2));
  } catch(e) {
    console.error("Error:", e.message);
  }
})();
