require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Analytics Endpoint
app.get('/api/analytics', (req, res) => {
  try {
    const totalServed = db.prepare(`SELECT COUNT(*) as count FROM patients WHERE status = 'completed'`).get().count;
    const totalSkipped = db.prepare(`SELECT COUNT(*) as count FROM patients WHERE status = 'skipped'`).get().count;
    const totalWaiting = db.prepare(`SELECT COUNT(*) as count FROM patients WHERE status = 'waiting'`).get().count;
    
    const avgConsultationRow = db.prepare(`SELECT AVG(durationMinutes) as avg FROM consultations`).get();
    const avgConsultationTime = avgConsultationRow.avg ? parseFloat(avgConsultationRow.avg).toFixed(1) : 0;
    
    const patients = db.prepare(`SELECT addedAt FROM patients`).all();
    const hourCounts = new Array(24).fill(0);
    patients.forEach(p => {
      const hour = new Date(p.addedAt).getHours();
      hourCounts[hour]++;
    });
    
    const chartData = [];
    for (let i = 8; i <= 20; i++) {
       chartData.push({
         hour: i === 12 ? '12 PM' : i > 12 ? `${i - 12} PM` : `${i} AM`,
         patients: hourCounts[i]
       });
    }

    res.json({
      totalServed,
      totalSkipped,
      totalWaiting,
      avgConsultationTime,
      peakHours: chartData
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- State Management with SQLite ---
const dbPath = process.env.DB_PATH || 'clinic.db';
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const ipRateLimits = new Map();

// Setup DB schema (Multi-Doctor)
db.exec(`
  CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    room TEXT
  );

  CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    doctorId INTEGER,
    tokenNumber INTEGER,
    name TEXT,
    phone TEXT,
    appointmentType TEXT,
    estimatedDuration REAL,
    status TEXT DEFAULT 'waiting', -- 'waiting', 'current', 'completed', 'skipped'
    addedAt INTEGER,
    FOREIGN KEY(doctorId) REFERENCES doctors(id)
  );

  CREATE INDEX IF NOT EXISTS idx_status ON patients(status);
  CREATE INDEX IF NOT EXISTS idx_doctor ON patients(doctorId);

  CREATE TABLE IF NOT EXISTS settings (
    doctorId INTEGER,
    key TEXT,
    value TEXT,
    PRIMARY KEY (doctorId, key),
    FOREIGN KEY(doctorId) REFERENCES doctors(id)
  );
  
  CREATE TABLE IF NOT EXISTS consultations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctorId INTEGER,
    durationMinutes REAL,
    FOREIGN KEY(doctorId) REFERENCES doctors(id)
  );
`);

// Seed doctors if none exist
const doctorCount = db.prepare('SELECT COUNT(*) as count FROM doctors').get().count;
if (doctorCount === 0) {
  db.prepare(`INSERT INTO doctors (name, room) VALUES ('Dr. Sharma', 'Room 1')`).run();
  db.prepare(`INSERT INTO doctors (name, room) VALUES ('Dr. Patel', 'Room 2')`).run();
}

const getDoctors = () => {
  return db.prepare('SELECT * FROM doctors').all();
};

// State variables per doctor
const getLastCallTime = (doctorId) => {
  const row = db.prepare(`SELECT value FROM settings WHERE key = 'lastCallTime' AND doctorId = ?`).get(doctorId);
  return row ? parseInt(row.value) : null;
};
const setLastCallTime = (doctorId, val) => {
  if (val === null) {
    db.prepare(`DELETE FROM settings WHERE key = 'lastCallTime' AND doctorId = ?`).run(doctorId);
  } else {
    db.prepare(`INSERT OR REPLACE INTO settings (doctorId, key, value) VALUES (?, 'lastCallTime', ?)`).run(doctorId, val.toString());
  }
};

const getNextToken = (doctorId) => {
  const row = db.prepare(`SELECT MAX(tokenNumber) as maxToken FROM patients WHERE status IN ('waiting', 'current') AND doctorId = ?`).get(doctorId);
  return (row.maxToken || 0) + 1;
};

// Compute Rolling Average ETA per doctor
const getRollingAverageETA = (doctorId) => {
  const rows = db.prepare(`SELECT durationMinutes FROM consultations WHERE doctorId = ? ORDER BY id DESC LIMIT 5`).all(doctorId);
  if (rows.length === 0) {
    const row = db.prepare(`SELECT value FROM settings WHERE key = 'baselineETA' AND doctorId = ?`).get(doctorId);
    return row ? parseFloat(row.value) : 10;
  }
  const sum = rows.reduce((acc, r) => acc + r.durationMinutes, 0);
  return sum / rows.length;
};

const getQueue = (doctorId) => {
  return db.prepare(`SELECT * FROM patients WHERE status = 'waiting' AND doctorId = ? ORDER BY addedAt ASC`).all(doctorId);
};

const getCurrentPatient = (doctorId) => {
  return db.prepare(`SELECT * FROM patients WHERE status = 'current' AND doctorId = ? ORDER BY addedAt DESC LIMIT 1`).get(doctorId) || null;
};

// WhatsApp Mock
const sendWhatsAppMessage = (phone, message) => {
  if (!phone) return;
  const mode = process.env.WHATSAPP_MODE || 'mock';
  if (mode === 'mock') {
    console.log(`\n[WhatsApp Mock] Sent to ${phone}:\n${message}\n`);
  }
};

// Broadcast unified state
const broadcastState = (client = io) => {
  const doctors = getDoctors();
  const doctorsState = doctors.map(doc => {
    const queue = getQueue(doc.id);
    const currentPatient = getCurrentPatient(doc.id);
    const baselineRow = db.prepare(`SELECT value FROM settings WHERE key = 'baselineETA' AND doctorId = ?`).get(doc.id);
    const baselineETA = baselineRow ? parseFloat(baselineRow.value) : 10;
    
    const pausedRow = db.prepare(`SELECT value FROM settings WHERE key = 'isPaused' AND doctorId = ?`).get(doc.id);
    const isPaused = pausedRow ? (pausedRow.value === 'true') : false;

    return {
      id: doc.id,
      name: doc.name,
      room: doc.room,
      queue,
      currentPatient,
      etaPerPatient: getRollingAverageETA(doc.id),
      baselineETA,
      isPaused
    };
  });

  client.emit('queue_updated', { doctors: doctorsState });
};

io.use((socket, next) => {
  const CLINIC_PASSCODE = process.env.CLINIC_PASSCODE || '123456';
  const passcode = socket.handshake.auth?.passcode;
  socket.data.isReceptionist = (passcode === CLINIC_PASSCODE);
  next();
});

io.on('connection', (socket) => {
  console.log('A client connected:', socket.id, '| Receptionist:', socket.data.isReceptionist);

  broadcastState(socket);

  socket.on('request_sync', () => {
    broadcastState(socket);
  });

  socket.on('update_baseline', ({ doctorId, newBaseline }) => {
    if (!socket.data.isReceptionist || !doctorId) return;
    const val = parseFloat(newBaseline);
    if (!isNaN(val)) {
      db.prepare(`INSERT OR REPLACE INTO settings (doctorId, key, value) VALUES (?, 'baselineETA', ?)`).run(doctorId, val.toString());
      broadcastState();
    }
  });

  socket.on('add_patient', ({ doctorId, name, phone, appointmentType }, callback) => {
    if (!doctorId) {
       if (typeof callback === 'function') callback({ status: 'error', message: 'Doctor ID missing.' });
       return;
    }

    if (!socket.data.isReceptionist) {
      const ip = socket.handshake.address;
      const lastAdded = ipRateLimits.get(ip);
      if (lastAdded && Date.now() - lastAdded < 5 * 60 * 1000) {
        if (typeof callback === 'function') callback({ status: 'error', message: 'Rate limit exceeded. Please wait 5 minutes before checking in again.' });
        return;
      }
      ipRateLimits.set(ip, Date.now());
    }

    let duration = 15;
    if (appointmentType === 'quick') duration = 5;
    else if (appointmentType === 'extended') duration = 30;

    const newId = Math.random().toString(36).substr(2, 9);
    const tkn = getNextToken(doctorId);
    db.prepare(`
      INSERT INTO patients (id, doctorId, tokenNumber, name, phone, appointmentType, estimatedDuration, status, addedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'waiting', ?)
    `).run(newId, doctorId, tkn, name || 'Guest', phone || '', appointmentType || 'regular', duration, Date.now());

    const estWait = Math.round(getRollingAverageETA(doctorId) * (getQueue(doctorId).length - 1));
    sendWhatsAppMessage(phone, `Hello ${name}, your Token is #${tkn}. Est. wait: ${estWait} mins. Track live here: http://clinic.com/patient`);

    broadcastState();
    if (typeof callback === 'function') callback({ status: 'success', tokenNumber: tkn, patientName: name });
  });

  socket.on('call_next', ({ doctorId }, callback) => {
    if (!socket.data.isReceptionist || !doctorId) {
      if (typeof callback === 'function') callback({ status: 'error', message: 'Unauthorized or missing doctor' });
      return;
    }

    const now = Date.now();
    const MINIMUM_CONSULTATION_MS = 2000;
    const lastCallTime = getLastCallTime(doctorId);
    
    if (lastCallTime && now - lastCallTime < MINIMUM_CONSULTATION_MS) {
      if (typeof callback === 'function') {
        return callback({ status: 'error', message: 'Action too fast. Please wait 2 seconds.' });
      }
      return; 
    }

    const currentPatient = getCurrentPatient(doctorId);

    if (currentPatient && lastCallTime) {
      const timeSpentMinutes = (now - lastCallTime) / 60000;
      if (timeSpentMinutes > 0 && timeSpentMinutes < 120) {
        db.prepare(`INSERT INTO consultations (doctorId, durationMinutes) VALUES (?, ?)`).run(doctorId, timeSpentMinutes);
      }
      db.prepare(`UPDATE patients SET status = 'completed' WHERE id = ?`).run(currentPatient.id);
    }

    const queue = getQueue(doctorId);
    if (queue.length > 0) {
      const nextPatient = queue[0];
      db.prepare(`UPDATE patients SET status = 'current' WHERE id = ?`).run(nextPatient.id);
      setLastCallTime(doctorId, now);
      
      const newQueue = getQueue(doctorId);
      if (newQueue.length > 0) {
        sendWhatsAppMessage(newQueue[0].phone, `Your turn is almost here! You are next in line. Please head to the waiting area.`);
      }
    } else {
      if (currentPatient) {
         db.prepare(`UPDATE patients SET status = 'completed' WHERE id = ?`).run(currentPatient.id);
      }
      setLastCallTime(doctorId, null);
    }
    
    broadcastState();
    
    if (typeof callback === 'function') {
      callback({ status: 'success' });
    }
  });

  socket.on('skip_patient', ({ doctorId, id }) => {
    if (!socket.data.isReceptionist || !doctorId) return;
    
    if (id) {
      db.prepare(`UPDATE patients SET status = 'skipped' WHERE id = ? AND doctorId = ?`).run(id, doctorId);
    } else {
      const currentPatient = getCurrentPatient(doctorId);
      if (currentPatient) {
         db.prepare(`UPDATE patients SET status = 'skipped' WHERE id = ?`).run(currentPatient.id);
         const queue = getQueue(doctorId);
         if (queue.length > 0) {
            const nextPatient = queue[0];
            db.prepare(`UPDATE patients SET status = 'current' WHERE id = ?`).run(nextPatient.id);
            setLastCallTime(doctorId, Date.now()); 
            
            const newQueue = getQueue(doctorId);
            if (newQueue.length > 0) {
              sendWhatsAppMessage(newQueue[0].phone, `Your turn is almost here! You are next in line. Please head to the waiting area.`);
            }
         } else {
            setLastCallTime(doctorId, null);
         }
      }
    }
    broadcastState();
  });

  socket.on('reset_queue', ({ doctorId }) => {
    if (!socket.data.isReceptionist || !doctorId) return;
    db.prepare(`DELETE FROM patients WHERE doctorId = ?`).run(doctorId);
    db.prepare(`DELETE FROM consultations WHERE doctorId = ?`).run(doctorId);
    setLastCallTime(doctorId, null);
    db.prepare(`INSERT OR REPLACE INTO settings (doctorId, key, value) VALUES (?, 'isPaused', 'false')`).run(doctorId);
    db.prepare(`DELETE FROM settings WHERE key = 'pauseStartTime' AND doctorId = ?`).run(doctorId);
    broadcastState();
  });

  socket.on('toggle_pause', ({ doctorId }) => {
    if (!socket.data.isReceptionist || !doctorId) return;
    const pausedRow = db.prepare(`SELECT value FROM settings WHERE key = 'isPaused' AND doctorId = ?`).get(doctorId);
    const isPaused = pausedRow ? (pausedRow.value === 'true') : false;
    const now = Date.now();

    if (isPaused) {
      const pauseStartRow = db.prepare(`SELECT value FROM settings WHERE key = 'pauseStartTime' AND doctorId = ?`).get(doctorId);
      if (pauseStartRow) {
        const pauseStartTime = parseInt(pauseStartRow.value);
        const breakDuration = now - pauseStartTime;
        const lastCall = getLastCallTime(doctorId);
        if (lastCall) {
          setLastCallTime(doctorId, lastCall + breakDuration);
        }
      }
      db.prepare(`INSERT OR REPLACE INTO settings (doctorId, key, value) VALUES (?, 'isPaused', 'false')`).run(doctorId);
    } else {
      db.prepare(`INSERT OR REPLACE INTO settings (doctorId, key, value) VALUES (?, 'pauseStartTime', ?)`).run(doctorId, now.toString());
      db.prepare(`INSERT OR REPLACE INTO settings (doctorId, key, value) VALUES (?, 'isPaused', 'true')`).run(doctorId);
    }
    broadcastState();
  });

  socket.on('disconnect', () => {
    console.log('A client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`ClinicQueue Multi-Doctor server running on port ${PORT}`);
});
