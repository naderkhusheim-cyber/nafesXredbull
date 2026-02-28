// ================================================================
//  FIREBASE CONFIGURATION
//
//  ✅ apiKey, authDomain, projectId, etc. — already filled in.
//
//  ⚠️  Still needed: databaseURL
//      1. Go to https://console.firebase.google.com/
//      2. Open project "redbull-competition"
//      3. Left sidebar → "Realtime Database"
//      4. Click "Create database" → pick a region → "Start in test mode"
//      5. After creation you'll see a URL like:
//            https://redbull-competition-default-rtdb.firebaseio.com
//         Copy it and paste it as the databaseURL value below.
// ================================================================

const firebaseConfig = {
  apiKey:            "AIzaSyBG8Je2HrST8pzA5oFao1k5h5-BQRSObgc",
  authDomain:        "redbull-competition.firebaseapp.com",
  databaseURL:       "https://console.firebase.google.com/u/0/project/redbull-competition/firestore/databases/-default-/data",   // ← only this line needs updating
  projectId:         "redbull-competition",
  storageBucket:     "redbull-competition.firebasestorage.app",
  messagingSenderId: "253641229434",
  appId:             "1:253641229434:web:6424cbc93d6c26e6ad67c3",
  measurementId:     "G-D9MS4JF226"
};

// ── Guard: friendly error if databaseURL is missing or wrong ──
const _badUrl =
  !firebaseConfig.databaseURL ||
  firebaseConfig.databaseURL === "PASTE_YOUR_DATABASE_URL_HERE" ||
  firebaseConfig.databaseURL.includes("console.firebase.google.com"); // ← browser URL, not the DB endpoint

if (_badUrl) {
  document.body.innerHTML = `
    <div style="
      min-height:100vh; display:flex; align-items:center; justify-content:center;
      background:#1B1464; font-family:Inter,sans-serif; padding:40px; text-align:center;
    ">
      <div style="max-width:520px; color:#F0F0F0;">
        <div style="font-size:56px; margin-bottom:16px;">🔗</div>
        <h1 style="font-size:28px; color:#FFC906; margin-bottom:12px; letter-spacing:2px;">
          ONE MORE STEP
        </h1>
        <p style="color:rgba(255,255,255,0.8); line-height:1.7; margin-bottom:12px;">
          Create a <strong>Realtime Database</strong> in your Firebase project, then
          paste its URL into <code style="background:rgba(255,255,255,.12);padding:2px 6px;border-radius:4px;">
          firebase-config.js</code>.
        </p>
        <p style="font-size:13px; color:rgba(255,255,255,0.45); line-height:1.6;">
          Firebase Console → redbull-competition → Realtime Database → Create database<br/>
          The URL looks like:<br/>
          <code style="color:#FFC906;">https://redbull-competition-default-rtdb.firebaseio.com</code>
        </p>
      </div>
    </div>`;
  throw new Error("databaseURL missing — see firebase-config.js for instructions");
}

// Initialise Firebase
firebase.initializeApp(firebaseConfig);

// Export the Realtime Database reference (used by display.js and admin.js)
const db = firebase.database();
