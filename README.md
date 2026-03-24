# 🚀 HRMS - Advanced Employee Management System

A premium, full-stack Human Resource Management System (HRMS) designed for modern workplaces. This project features a robust **Mobile Attendance System** with Geofencing, **Admin Dashboard** for HR oversight, and a secure **Node.js/MongoDB Backend**.

---

## ✨ Key Features

### 📍 Mobile Attendance & Geofencing
- **One-Click Punch:** Seamless attendance logging for employees within the office range.
- **Reverse Geocoding:** Automatically translates GPS coordinates into human-readable addresses (Building, Street, City).
- **Geofence Enforcement:** Prevents accidental or fraudulent punches outside the 300m office radius unless a justification is provided.
- **Single-Shift Policy:** Intelligent logic that locks the "Punch In" button once the workday is completed.
- **Premium UI:** High-end corporate design with dynamic animations, glassmorphism modals, and real-time timestamps.

### 👨‍💼 Admin Portal (Web)
- **Real-Time Monitoring:** Live view of "Who is In/Out" with "Live" status indicators.
- **Audit Logs:** Full visibility into punch addresses, work summaries, and justifications for early departures or out-of-range events.
- **Employee Management:** Complete CRUD operations for employee onboarding and management.

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express, MongoDB (Mongoose)
- **Frontend (Web):** React, Tailwind CSS, Lucide Icons
- **Mobile (App):** React Native (Expo SDK 54), Firebase Auth (SMS/OTP)
- **UI/UX:** Custom design system, Expo Linear Gradient, React Native Svg

---

## 📦 Project Structure

```bash
/hrms
├── /backend     # Express API & MongoDB Models
├── /frontend    # Admin Web Dashboard (React)
└── /mobile      # Employee Mobile Application (Expo/React Native)
```

---

## 🚀 Getting Started

### 1️⃣ Backend Setup
```bash
cd backend
npm install
# Configure your .env (PORT, MONGO_URI, JWT_SECRET)
nodemon server.js
```

### 2️⃣ Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3️⃣ Mobile App Setup
```bash
cd mobile
npm install
# Ensure you have Android SDK and local.properties configured
npx expo prebuild --platform android
npx expo run:android
```

---

## 🛡️ Security & Integrity
- **Server Authority:** The system uses server-side time stamps to prevent "Phone Settings" hacks.
- **Address-Signatures:** Every punch carries a human-readable location signature for indisputable record keeping.
- **Secure Auth:** Integrated Firebase SMS OTP for secure mobile login.

---

## 🎨 Designed for Professionals
This system isn't just a tool; it's a premium experience. Every modal, toast, and transition has been curated to provide a high-end enterprise feel that employees and HR teams will love to use.

---
📅 **Last Updated:** 24 March 2026
👨‍💻 **Project Core:** Geofencing & Advanced Attendance Logic
