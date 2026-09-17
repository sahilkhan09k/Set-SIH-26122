/**
 * Demo DPR Excel v3 — Engineered for clear 3-way demo split
 *
 * AUTO_LINK (>=78%): Exact discipline + location + engineering tag/code
 * NEEDS_REVIEW (58-77%): Right discipline but generic desc, no matching tags
 * UNMATCHED (<58%): Wrong discipline for activity, ambiguous or off-location
 */
const xlsx = require("xlsx");
const path = require("path");

const todayStr = new Date().toISOString().slice(0, 10); // e.g. 2026-09-17 or 2026-09-18

const rows = [
  // ============================================================
  // GROUP 1: AUTO_LINK (3 rows — near-perfect match signals)
  // ✓ Exact discipline  ✓ Exact location  ✓ Matching activity code/tag
  // ============================================================
  {
    "Date": todayStr,
    "Discipline": "Piping",
    "Activity Description": "Erection of 8IN process spool on Line 24-XX at Rack R24",
    "Location": "Rack R24",
    "Quantity": 42,
    "Unit": "inch-dia",
    "Start Time": "08:30",
    "End Time": "17:00",
    "Reported By": "Rajan Sharma",
    "Remarks": "Spool P24-17 installed on Line 24-XX. 8 inch process line erection complete. NDT pending.",
  },
  {
    "Date": todayStr,
    "Discipline": "Civil",
    "Activity Description": "Reinforced concrete Foundation F-204 pouring completed",
    "Location": "Foundation F-204",
    "Quantity": 45,
    "Unit": "m3",
    "Start Time": "09:00",
    "End Time": "15:30",
    "Reported By": "Suresh Nair",
    "Remarks": "Concrete pouring at Foundation F-204. Grade M30. CIV-1102 scope complete.",
  },
  {
    "Date": todayStr,
    "Discipline": "Electrical",
    "Activity Description": "Install perforated cable tray 300mm at Substation S2",
    "Location": "Substation S2",
    "Quantity": 35,
    "Unit": "metres",
    "Start Time": "08:00",
    "End Time": "16:00",
    "Reported By": "Ahmed Khan",
    "Remarks": "ELE-3011 cable tray 300mm installed at Substation S2. Tray per IFC drawing E-201.",
  },

  // ============================================================
  // GROUP 2: NEEDS_REVIEW (3 rows — right discipline, no matching tags/loc)
  // ✓ Correct discipline  ✗ No engineering tag match  ✗ Generic/partial location
  // ============================================================
  {
    "Date": todayStr,
    "Discipline": "Piping",
    "Activity Description": "Field welding work on spool joints at process piping rack",
    "Location": "Rack Area North",
    "Quantity": 3,
    "Unit": "joints",
    "Start Time": "09:00",
    "End Time": "14:00",
    "Reported By": "Rajan Sharma",
    "Remarks": "Butt welding of spool joints on process line. PWHT scheduled. Not all spools completed.",
  },
  {
    "Date": todayStr,
    "Discipline": "Mechanical",
    "Activity Description": "Pump alignment and coupling check in pump bay",
    "Location": "Pump Bay",
    "Quantity": 1,
    "Unit": "nos",
    "Start Time": "08:00",
    "End Time": "12:00",
    "Reported By": "Deepak Verma",
    "Remarks": "Pump alignment within tolerance. Coupling checked. Final QC sign-off pending.",
  },
  {
    "Date": todayStr,
    "Discipline": "Instrumentation",
    "Activity Description": "Differential pressure transmitter installation and loop check",
    "Location": "Unit 3 Process Area",
    "Quantity": 2,
    "Unit": "nos",
    "Start Time": "09:00",
    "End Time": "15:00",
    "Reported By": "Vikram Pillai",
    "Remarks": "DPT transmitters mounted and signal loop verified. INS work in progress.",
  },

  // ============================================================
  // GROUP 3: UNMATCHED (3 rows — discipline conflict or out-of-scope)
  // ✗ Wrong location entirely  OR  ✗ Discipline conflicts with activity
  // ============================================================
  {
    "Date": todayStr,
    "Discipline": "Civil",
    "Activity Description": "Temporary road patching and site levelling near storage yard",
    "Location": "Storage Yard B",
    "Quantity": 120,
    "Unit": "m2",
    "Start Time": "08:00",
    "End Time": "17:00",
    "Reported By": "Suresh Nair",
    "Remarks": "Temporary access road for equipment delivery. Not in project baseline.",
  },
  {
    "Date": todayStr,
    "Discipline": "HSE",
    "Activity Description": "Emergency evacuation drill and fire safety inspection",
    "Location": "Muster Point A",
    "Quantity": 120,
    "Unit": "persons",
    "Start Time": "07:30",
    "End Time": "08:15",
    "Reported By": "Mohit Agarwal",
    "Remarks": "Full site evacuation drill completed. Near-miss reporting session conducted.",
  },
  {
    "Date": todayStr,
    "Discipline": "Piping",
    "Activity Description": "Offsite contractor diesel fuel line repair at boundary valve pit",
    "Location": "Remote Gate 4 Valve Pit",
    "Quantity": 15,
    "Unit": "metres",
    "Start Time": "10:00",
    "End Time": "14:00",
    "Reported By": "Rajan Sharma",
    "Remarks": "Emergency diesel fuel line repair by external boundary vendor. Non-EPC scope outside project baseline.",
  },
];

const wb = xlsx.utils.book_new();
const ws = xlsx.utils.json_to_sheet(rows);

// Auto-size columns
const colWidths = Object.keys(rows[0]).map(key => ({
  wch: Math.max(key.length + 2, Math.max(...rows.map(r => String(r[key] ?? "").length)) + 2),
}));
ws["!cols"] = colWidths;

xlsx.utils.book_append_sheet(wb, ws, "DPR_Today");

const filenames = [
  "Supervisor_DPR_Today.xlsx",
  "Supervisor_DPR_18Sep2026.xlsx",
  "Supervisor_DPR_21Sep2026.xlsx"
];

const targetDirs = [
  path.resolve(__dirname, "../../frontend/public/demo_files"),
  path.resolve(__dirname, "../../demo_files")
];

for (const dir of targetDirs) {
  for (const fn of filenames) {
    const p = path.join(dir, fn);
    xlsx.writeFile(wb, p);
    console.log("Created:", p);
  }
}
