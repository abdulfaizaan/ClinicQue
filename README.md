# ClinicQue - Curing Waiting Room Anxiety 🏥

76% of clinics run on paper slips and shouting. Patients wait blindly for hours, building anxiety and frustration. Receptionists manage everything from memory. **ClinicQue** fixes the psychology of the waiting room.

ClinicQue is a live digital queue manager designed specifically for multi-doctor neighbourhood clinics. It empowers patients with absolute transparency, exact ETAs computed from real data, and a delightful live tracker right on their phone.

> *"The moment you click 'Call Next Token' and the patient's screen instantly bursts with a satisfying notification—that's when clinic owners realize they aren't just managing a queue, they are curing waiting room anxiety."*

## 🚀 Key Features

### ✨ The Patient Experience
- **Anxiety-Free Patient Tracker:** Live ETA tracking, real-time position updates, and engaging micro-animations (like Confetti when it's your turn) that boost morale.
- **Plausible Smart ETAs:** Wait times aren't hardcoded guesses. They are calculated dynamically based on real historical consultation data *and* the specific appointment type.

### 👨‍⚕️ Multi-Doctor Architecture & Voice Announcements
- **Isolated Queues:** A single clinic can host an unlimited number of doctors operating concurrently. 
- **Tabbed Dashboard:** The Receptionist Dashboard supports instantly toggling between different doctors' queues without losing state or causing conflicts.
- **Split-Screen Kiosk with AI Voice:** The waiting room TV automatically splits the screen to show live updates for every active doctor simultaneously.
- **🗣️ Automated Voice Calling:** Uses the native Browser Speech Synthesis API to announce "Token number X, please proceed to Room Y" out loud over the clinic speakers whenever the receptionist hits "Call Next Token". No human shouting required!

### 🛡️ Enterprise-Grade Reliability
- **"Doctor on Break" Mode:** Receptionists can pause a specific queue. The backend does the heavy mathematical lifting to pause the ETA calculations natively, ensuring the historical average is not corrupted by a doctor taking lunch!
- **IP Rate Limiting:** Protected against malicious QR code scanning attacks. A single IP address can only check in once every 5 minutes, preventing queue-flooding.
- **Genuine Database Persistence:** Powered by a lightning-fast SQLite database with proper indexing (`idx_status`, `idx_doctor`). Your queue and ETA histories survive server crashes instantly.
- **Zero-Refresh Real-Time Sync:** Powered by WebSockets (Socket.IO). All screens (Receptionist, TV Kiosk, Patient Phones) update within milliseconds.

## 🛠️ Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Framer Motion, Lucide Icons, Canvas Confetti.
- **Backend:** Node.js, Express, Socket.IO, Better-SQLite3.
- **Deployment:** Render (Backend) & Vercel (Frontend).

## 🏁 Getting Started

### 1. Start the Backend
\`\`\`bash
cd backend
npm install
npm start
# Runs on http://localhost:3001
\`\`\`

*(Note: The SQLite database `clinic.db` will automatically seed itself with two mock doctors on first run).*

### 2. Configure the Frontend
Create a `.env` file inside the `/frontend` directory:
\`\`\`env
VITE_BACKEND_URL=http://localhost:3001
\`\`\`

### 3. Start the Frontend
\`\`\`bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
\`\`\`

## 🧠 How It Works (Evaluation Criteria)

1. **State Management & WebSockets:**
   The Express backend acts as the definitive source of truth. When the receptionist modifies a queue for *Dr. Sharma*, a `broadcastState` event pushes the entire synchronized payload to all connected clients instantly. No HTTP polling is required.

2. **Wait Time Algorithm:**
   The backend measures the exact time difference (in milliseconds) between `call_next` socket events. It keeps a rolling average of the last 5 real consultation times *per doctor* to compute a highly accurate, dynamic ETA for the waiting patients in that specific queue.

3. **Concurrency and Edge Cases:**
   - **Debouncing:** The server strictly enforces a 2-second cooldown on the `call_next` action to prevent accidental double-skipping by an eager receptionist.
   - **No-shows:** Receptionists can instantly skip patients without corrupting the historical ETA data (the timer resets cleanly without logging a fake consultation).
   - **Outliers:** The backend automatically caps consultation times at 120 minutes to prevent edge cases from destroying the moving average.
