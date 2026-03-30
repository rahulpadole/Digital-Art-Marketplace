# Digital Art Marketplace — Task Tracker

## 📄 Project Abstract (Official Mini-Project Report)

> **Title:** Digital Art Website  
> **Type:** Mini Project (Web Application)

### Objectives (from report)
- Develop a web-based platform for displaying digital artwork
- Allow artists to upload and manage their artwork online
- Provide easy browsing of artworks for users
- Create a simple and user-friendly digital gallery
- Promote creativity and digital art sharing

### Key Features (from report)
| Feature | Status |
|---------|--------|
| Artist registration and login system | ✅ Done |
| Upload and manage digital artworks | ✅ Done |
| Art gallery display with categories | ✅ Done |
| User interaction through comments / likes | ✅ Done (comments + ratings) |
| Secure and user-friendly interface | ✅ Done |
| Artist profiles | ✅ Done |
| Feedback / comments on artwork | ✅ Done |
| Browse art categories / explore | ✅ Done |

### Process Flow (from report)
1. User registration and login → ✅
2. Artist uploads digital artwork → ✅
3. Artwork displayed in online gallery → ✅
4. Users browse and explore art categories → ✅
5. View artwork details and artist profiles → ✅
6. Provide feedback or comments → ✅
7. Logout from system → ✅

### Proposed vs Actual Tech Stack
| Layer | Report Specifies | Actual Implementation |
|-------|-----------------|----------------------|
| Frontend | HTML, CSS, JavaScript | React (Vite) + Vanilla CSS |
| Backend | PHP | Firebase (Firestore, Auth, Storage) |
| Database | MySQL | Firestore (NoSQL) |
| Dev Tools | VS Code, XAMPP | VS Code, Vite Dev Server |
| Hosting | Local (XAMPP) | Vercel (Live Deployment) |

> [!NOTE]
> The actual implementation uses React + Firebase which is more modern and feature-rich than the PHP/MySQL stack mentioned in the report. All functional requirements from the report are fully met.

---

## Project Overview
React + Firebase digital art marketplace (`digital-art-website`).
Running locally via `npm run dev`.

---

## ✅ Completed in Previous Conversations

- [x] Project scaffolded with Vite + React
- [x] Firebase configured (`src/firebase/config.js`)
- [x] Authentication (`Login.jsx`, `Register.jsx`) with `AuthContext`
- [x] Role-based access (`artist` / `buyer`)
- [x] `ToastContext` for global notifications
- [x] Home page (`Home.jsx`) with hero section
- [x] Explore page (`Explore.jsx`) for browsing artworks
- [x] Upload Art page (`UploadArt.jsx`)
- [x] Artwork Detail page (`ArtworkDetail.jsx`) — buy flow, UTR submission, comments
- [x] Profile page (`Profile.jsx`) — tabs: My Creations / My Collection / Purchases / Sales
  - [x] Edit display name
  - [x] Reset password
  - [x] Artist: Verify / Reject buyer payments (updates Firestore + notifies buyer)
  - [x] Fixed missing `addDoc` & `serverTimestamp` imports (conv: 2162a2bc)
- [x] Notification bell (`NotificationBell.jsx`) with real-time Firestore listener
- [x] Messaging system (`Messages.jsx`) — artist ↔ buyer chat
- [x] `ArtworkCard.jsx` component + CSS
- [x] `Navbar.jsx` with role-aware navigation
- [x] Global CSS (`index.css`) — dark glassmorphism theme
- [x] Firestore rules (`firestore.rules`)
- [x] CORS configuration (`cors.json`, `set-cors.mjs`)
- [x] Deployed to Vercel (`.vercel/` config present)

---

## 🔄 Current Session Tasks

- [ ] Investigate any outstanding issues in `Profile.jsx` (open file)
- [ ] Verify dev server is running correctly (`npm run dev` active)

---

## 🧾 Known Issues / Notes

- `Profile.jsx` — `addDoc` & `serverTimestamp` imports were fixed in conv `2162a2bc` ✅
- Orders table only shows "Pending Review" or "Completed" — "rejected" status has no distinct label yet
- `status === 'rejected'` badge uses the same style as completed (might need a red badge)

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `src/pages/Profile.jsx` | User profile: artworks, collection, purchases, sales |
| `src/pages/ArtworkDetail.jsx` | Artwork view, buy flow, comments |
| `src/pages/Messages.jsx` | Chat between artist and buyer |
| `src/components/NotificationBell.jsx` | Real-time notifications |
| `src/firebase/config.js` | Firebase app init |
| `firestore.rules` | Firestore security rules |
| `.env` | Firebase credentials (gitignored) |
