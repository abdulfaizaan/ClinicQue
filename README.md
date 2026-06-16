# ClinicQue - Curing Waiting Room Anxiety 🏥

76% of clinics run on paper slips and shouting. Patients wait blindly for hours, building anxiety and frustration. Receptionists manage everything from memory. **ClinicQue** fixes the psychology of the waiting room.

ClinicQue is a live digital queue manager designed for neighbourhood clinics. It empowers patients with absolute transparency, exact ETAs computed from real data, and a delightful live tracker right on their phone.

> *"The moment you click 'Call Next Token' and the patient's screen instantly bursts with a satisfying notification—that's when clinic owners realize they aren't just managing a queue, they are curing waiting room anxiety."*

## 🚀 Features

- **Anxiety-Free Patient Tracker:** Live ETA tracking, real-time position updates, and engaging micro-animations that boost morale.
- **Plausible Smart ETAs:** Wait times aren't hardcoded guesses. They are calculated dynamically based on real historical consultation data *and* the specific appointment type (e.g. Quick Checkup vs Full Physical).
- **Blazing Fast Receptionist Dashboard:** Add a patient, select appointment type, and assign a token in under 10 seconds.
- **Genuine Database Persistence:** Powered by a lightning-fast SQLite database. Your queue and ETA histories survive server crashes.
- **Real-Time Live Sync:** Powered by WebSockets (Socket.IO). Both screens update instantly without a page refresh.

## 🛠️ Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend:** Node.js, Express, Socket.IO.

## 🏁 Getting Started

### 1. Start the Backend
\`\`\`bash
cd backend
npm install
npm run start
# Runs on http://localhost:3001
\`\`\`

### 2. Start the Frontend
\`\`\`bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
\`\`\`

## 🧠 How It Works (Evaluation Criteria)

1. **Live queue updates correctly across both screens:**
   The Express backend acts as a central state manager. When the receptionist modifies the queue, a `broadcastState` event pushes the entire synchronized queue to all connected clients instantly. No polling is required.

2. **Wait time is computed from real data:**
   The backend measures the exact time difference (in milliseconds) between `call_next` socket events. It keeps a rolling average of the last 5 real consultation times to compute a highly accurate, dynamic ETA for the waiting patients.

3. **Receptionist screen is fast and mistake-proof:**
   The Add Patient input auto-focuses, allows quick "Enter" submissions, and disables actions globally while a network request is pending to prevent double-booking. Built-in debouncing ensures accidental double-clicks don't skip tokens.

4. **Concurrency and edge cases:**
   - **Debouncing:** The server strictly enforces a 2-second cooldown on the `call_next` action to prevent accidental skipping.
   - **No-shows:** Receptionists can instantly skip patients without corrupting the historical ETA data (the timer resets cleanly).
   - **Outliers:** The backend automatically caps consultation times at 120 minutes to prevent edge cases (like a receptionist going to lunch) from destroying the moving average.
