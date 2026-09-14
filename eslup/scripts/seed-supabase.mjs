/**
 * seed-supabase.mjs
 * Run with:  node scripts/seed-supabase.mjs
 *
 * Seeds institutions (hospitals) and emergency_contacts tables.
 * Uses the service-role key so it bypasses RLS.
 * If the tables don't exist yet, it prints the SQL needed to create them.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── 1. Try to create tables via exec_sql RPC (if enabled on this project) ─────
const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS institutions (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT,
  address     TEXT,
  district    TEXT,
  city        TEXT,
  rating      NUMERIC,
  "distanceKm" NUMERIC,
  "open24h"   BOOLEAN DEFAULT FALSE,
  phone       TEXT,
  lat         NUMERIC,
  lng         NUMERIC,
  categories  TEXT[],
  services    TEXT[],
  color       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  phones      TEXT[],
  description TEXT,
  priority    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
`;

// Try via exec_sql RPC (optional — may not be installed on every project)
const { error: rpcError } = await supabase.rpc("exec_sql", { query: CREATE_SQL }).maybeSingle();
if (rpcError) {
  console.warn("exec_sql RPC not available — tables must already exist or be created manually.");
  console.warn("If you see 'relation does not exist' below, run this SQL in the Supabase SQL editor:");
  console.warn("─────────────────────────────────────────────────────────────────────");
  console.warn(CREATE_SQL);
  console.warn("─────────────────────────────────────────────────────────────────────");
}

// ── 2. Hospital seed data ──────────────────────────────────────────────────────
const hospitals = [
  { id:"h1",name:"Black Lion Hospital (Tikur Anbessa)",type:"Government",address:"Lideta Sub-City, Semen Mazoria",district:"Lideta",city:"Addis Ababa",rating:4.2,distanceKm:1.4,open24h:true,phone:"+251115511211",lat:9.0201,lng:38.7525,categories:["hospital","emergency"],services:["Emergency","Surgery","Oncology","Cardiology","Neurology"],color:"#315d93"},
  { id:"h2",name:"St. Paul's Hospital Millennium Medical College",type:"Government",address:"Gulele Sub-City, Arbegnoch Rd",district:"Gulele",city:"Addis Ababa",rating:4.5,distanceKm:2.1,open24h:true,phone:"+251112750125",lat:9.0292,lng:38.7576,categories:["hospital","emergency"],services:["Emergency","Maternity","Pediatrics","Orthopedics","Internal Medicine"],color:"#059669"},
  { id:"h3",name:"Yekatit 12 Hospital",type:"Government",address:"Arada Sub-City, Ras Desta Damtew St",district:"Arada",city:"Addis Ababa",rating:4.0,distanceKm:0.8,open24h:true,phone:"+251111222200",lat:9.0349,lng:38.7467,categories:["hospital","emergency"],services:["Emergency","Internal Medicine","Gynecology","Dermatology"],color:"#7C3AED"},
  { id:"h4",name:"Hayat Medical Center",type:"Private",address:"Bole Sub-City, Africa Ave (Bole Rd)",district:"Bole",city:"Addis Ababa",rating:4.6,distanceKm:3.5,open24h:true,phone:"+251115574222",lat:9.0052,lng:38.7637,categories:["hospital","clinic"],services:["General Medicine","Cardiology","Radiology","Physiotherapy","Pediatrics"],color:"#D97706"},
  { id:"h5",name:"ALERT Hospital",type:"Government",address:"Nifas Silk-Lafto, Kolfe Keranio Area",district:"Nifas Silk-Lafto",city:"Addis Ababa",rating:4.3,distanceKm:4.8,open24h:true,phone:"+251113711200",lat:9.0287,lng:38.7467,categories:["hospital","emergency"],services:["Emergency","Leprosy Treatment","Rehabilitation","Surgery"],color:"#DC2626"},
  { id:"h6",name:"Korean Hospital (Myungsung Christian Medical Center)",type:"Mission",address:"Bole Sub-City, Gerji Area",district:"Bole",city:"Addis Ababa",rating:4.8,distanceKm:5.2,open24h:false,phone:"+251116298888",lat:9.0189,lng:38.7712,categories:["hospital","clinic"],services:["General Medicine","Pediatrics","Ophthalmology","Oncology","Surgery"],color:"#315d93"},
  { id:"h7",name:"Nordic Medical Center",type:"Private",address:"Bole Sub-City, Kazanchis Area",district:"Bole",city:"Addis Ababa",rating:4.7,distanceKm:2.9,open24h:false,phone:"+251116639833",lat:9.0224,lng:38.7594,categories:["clinic","hospital"],services:["General Practice","Dental","Gynecology","Lab Services","Radiology"],color:"#059669"},
  { id:"h8",name:"Amen Hospital",type:"Private",address:"Kirkos Sub-City, Meskel Square Area",district:"Kirkos",city:"Addis Ababa",rating:4.5,distanceKm:1.2,open24h:true,phone:"+251114672222",lat:9.0179,lng:38.7608,categories:["hospital","emergency"],services:["Emergency","ICU","Internal Medicine","Maternity","Surgery"],color:"#7C3AED"},
  { id:"h9",name:"Menelik II Hospital",type:"Government",address:"Entoto Road, Addis Ketema Sub-City",district:"Addis Ketema",city:"Addis Ababa",rating:4.0,distanceKm:3.1,open24h:true,phone:"+251111126466",lat:9.0338,lng:38.7581,categories:["hospital","emergency"],services:["Emergency","Ophthalmology","ENT","Orthopedics","Internal Medicine"],color:"#D97706"},
  { id:"h10",name:"Bete-Zata Hospital",type:"Private",address:"Bole Sub-City, Sarbet Area",district:"Bole",city:"Addis Ababa",rating:4.4,distanceKm:6.0,open24h:false,phone:"+251116624488",lat:9.0024,lng:38.7520,categories:["hospital","clinic"],services:["Maternity","Gynecology","Pediatrics","General Surgery","Dermatology"],color:"#DC2626"},
];

// ── 3. Emergency contacts seed data ───────────────────────────────────────────
const emergencyContacts = [
  { id:"e1",name:"Ethiopian Red Cross Ambulance",phones:["907","+251115527110"],description:"National emergency ambulance service — 24/7",priority:"critical"},
  { id:"e2",name:"Tebita Ambulance (Private)",phones:["8035","+251911225464","+251911641609","+251116616342"],description:"Private ambulance service, Addis Ababa — 24/7",priority:"critical"},
  { id:"e3",name:"Black Lion Hospital Emergency",phones:["+251115511211"],description:"Major referral hospital emergency room",priority:"high"},
  { id:"e4",name:"St. Paul's Hospital Emergency",phones:["+251112750125"],description:"Government teaching hospital ER — 24/7",priority:"high"},
  { id:"e5",name:"ALERT Hospital Emergency",phones:["+251113711200"],description:"Emergency & trauma center — 24/7",priority:"high"},
  { id:"e6",name:"Police Emergency",phones:["991"],description:"National police emergency",priority:"medium"},
  { id:"e7",name:"Fire Emergency",phones:["939"],description:"National fire emergency service",priority:"medium"},
];

// ── 4. Upsert data ─────────────────────────────────────────────────────────────
console.log("Seeding institutions (hospitals)…");
const { error: hospErr } = await supabase
  .from("institutions")
  .upsert(hospitals, { onConflict: "id" });
if (hospErr) {
  console.error("❌ institutions:", hospErr.message);
} else {
  console.log(`✅ institutions — ${hospitals.length} rows upserted`);
}

console.log("Seeding emergency_contacts…");
const { error: emergErr } = await supabase
  .from("emergency_contacts")
  .upsert(emergencyContacts, { onConflict: "id" });
if (emergErr) {
  console.error("❌ emergency_contacts:", emergErr.message);
} else {
  console.log(`✅ emergency_contacts — ${emergencyContacts.length} rows upserted`);
}

console.log("Done.");
