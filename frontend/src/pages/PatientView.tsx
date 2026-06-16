import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Activity, Search, WifiOff, Sparkles, Pause } from 'lucide-react';
import { useClinicQueueSocket } from '../hooks/useClinicQueueSocket';
import confetti from 'canvas-confetti';

export default function PatientView() {
  const { isConnected, queueData, error } = useClinicQueueSocket();
  const { doctors } = queueData;

  const [myTokenStr, setMyTokenStr] = useState<string>('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  
  // Track specific token
  const myTokenNum = parseInt(myTokenStr);
  
  // Confetti ref
  const hasTriggeredConfetti = useRef(false);

  useEffect(() => {
    // Load doctor preference from localStorage (set by JoinView)
    const storedDoc = localStorage.getItem('my-doctor-id');
    if (storedDoc) {
      setSelectedDoctorId(parseInt(storedDoc));
    } else if (doctors.length > 0 && selectedDoctorId === null) {
      setSelectedDoctorId(doctors[0].id);
    }
  }, [doctors, selectedDoctorId]);

  const activeDoctor = doctors.find(d => d.id === selectedDoctorId) || null;
  const queue = activeDoctor?.queue || [];
  const currentPatient = activeDoctor?.currentPatient || null;
  const etaPerPatient = activeDoctor?.etaPerPatient || 10;
  const baselineETA = activeDoctor?.baselineETA || 10;
  const isPaused = activeDoctor?.isPaused || false;

  // Find where the user is in the queue
  let position = -1;
  if (!isNaN(myTokenNum)) {
    position = queue.findIndex(p => p.tokenNumber === myTokenNum);
  }

  const isNext = position === 0;
  const isCurrent = currentPatient?.tokenNumber === myTokenNum;

  // Calculate specific ETA
  let myETA = 0;
  if (position !== -1) {
    const scalingFactor = baselineETA > 0 ? (etaPerPatient / baselineETA) : 1;
    for (let i = 0; i <= position; i++) {
      myETA += (queue[i].estimatedDuration * scalingFactor);
    }
  }

  // Trigger confetti when it's their turn
  useEffect(() => {
    if (isCurrent && !hasTriggeredConfetti.current) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#000000', '#666666', '#cccccc'] // Monochromatic confetti
      });
      hasTriggeredConfetti.current = true;
    }
    
    // Reset if they check another token
    if (!isCurrent) {
      hasTriggeredConfetti.current = false;
    }
  }, [isCurrent]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="min-h-screen p-4 md:p-8 max-w-md mx-auto flex flex-col items-center justify-center relative z-10"
    >
      {/* Offline/Paused Banners */}
      <AnimatePresence>
        {!isConnected && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 bg-warning text-ink py-2 px-4 flex items-center justify-center gap-2 shadow-md z-50 text-body-sm font-medium"
          >
            <WifiOff size={16} />
            {error || 'Offline. Waiting for network...'}
          </motion.div>
        )}
        {isConnected && isPaused && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 bg-warning text-ink py-2 px-4 flex items-center justify-center gap-2 shadow-md z-50 text-body-sm font-medium"
          >
            <Pause size={16} />
            {activeDoctor?.name} is on break. Queue is paused.
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full text-center mb-8 mt-6">
        <h1 className="text-display-md font-semibold text-ink tracking-tight">Live Queue</h1>
        <div className={`flex items-center justify-center gap-2 mt-2 ${isConnected ? 'text-success' : 'text-error'}`}>
          <Activity size={16} className={isConnected ? 'animate-pulse' : ''} />
          <span className="text-caption font-mono uppercase tracking-widest">
            {isConnected ? 'Live Sync Active' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Doctor Selector */}
      {doctors.length > 0 && (
        <div className="w-full mb-6">
          <label className="block text-caption font-mono uppercase text-body mb-2 text-center">
            Viewing Queue For
          </label>
          <select
            value={selectedDoctorId || ''}
            onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
            className="input-base w-full bg-white text-center font-semibold"
          >
            {doctors.map(doc => (
              <option key={doc.id} value={doc.id}>
                {doc.name} ({doc.room})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Main Status Card */}
      <motion.div 
        layout
        className="w-full card border border-hairline shadow-level-2 mb-6"
      >
        <div className="text-center py-4">
          <p className="text-body-sm text-mute font-mono uppercase tracking-widest mb-2">Now Serving</p>
          <div className="text-display-xl font-bold text-ink mb-1 tracking-tight">
            {currentPatient ? currentPatient.tokenNumber : '--'}
          </div>
          {currentPatient && (
            <p className="text-body font-medium">{currentPatient.name}</p>
          )}
        </div>

        <div className="border-t border-hairline my-4"></div>

        {/* Token Tracker Input */}
        <div className="py-2">
          <label className="block text-caption font-mono uppercase text-body mb-2">
            Track your token
          </label>
          <div className="relative">
            <input 
              type="number" 
              value={myTokenStr}
              onChange={(e) => setMyTokenStr(e.target.value)}
              placeholder="Enter token number..."
              className="input-base w-full pl-10 bg-canvas"
            />
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          </div>
        </div>
      </motion.div>

      {/* Dynamic Results Card */}
      <AnimatePresence mode="popLayout">
        {!isNaN(myTokenNum) && myTokenStr !== '' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className={`w-full card border border-hairline overflow-hidden relative ${
              isCurrent ? 'bg-ink text-canvas' : 
              isNext ? 'bg-primary text-on-primary border-primary' : ''
            }`}
          >
            {isCurrent ? (
              <div className="text-center py-6">
                <Sparkles size={32} className="mx-auto mb-4 text-canvas" />
                <h2 className="text-display-sm font-bold mb-2">It's Your Turn!</h2>
                <p className="text-canvas/80">Please proceed to {activeDoctor?.room}.</p>
              </div>
            ) : position !== -1 ? (
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className={`text-caption font-mono uppercase ${isNext ? 'text-on-primary/70' : 'text-body'}`}>Your Token</p>
                    <p className="text-display-sm font-bold">#{myTokenNum}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-caption font-mono uppercase ${isNext ? 'text-on-primary/70' : 'text-body'}`}>Ahead of You</p>
                    <p className="text-display-sm font-bold">{position}</p>
                  </div>
                </div>
                
                <div className={`p-4 rounded-lg flex items-center justify-between ${
                  isNext ? 'bg-white/10' : 'bg-canvas-soft border border-hairline'
                }`}>
                  <div className="flex items-center gap-3">
                    <Clock size={20} className={isNext ? 'text-on-primary' : 'text-primary'} />
                    <span className={`font-semibold ${isNext ? 'text-on-primary' : 'text-ink'}`}>Est. Wait Time</span>
                  </div>
                  <span className={`text-xl font-bold ${isNext ? 'text-on-primary' : 'text-ink'}`}>
                    ~{Math.round(myETA)} min
                  </span>
                </div>
                {isNext && (
                  <p className="text-center text-sm font-medium text-on-primary/90 mt-[-8px]">
                    You are next! Please head to the waiting area.
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-body font-medium text-ink mb-1">Token Not Found</p>
                <p className="text-sm text-mute">Check the number or see the receptionist.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
