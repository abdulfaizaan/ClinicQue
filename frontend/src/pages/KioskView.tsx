import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClinicQueueSocket } from '../hooks/useClinicQueueSocket';
import { Volume2, Activity, Pause } from 'lucide-react';
import QRCode from 'react-qr-code';

export default function KioskView() {
  const { isConnected, queueData } = useClinicQueueSocket();
  const { doctors } = queueData;
  
  // Track previous patients to know when to announce
  const previousPatients = useRef<Record<number, string | undefined>>({});

  useEffect(() => {
    doctors.forEach(doc => {
      const currentPatientId = doc.currentPatient?.id;
      const prevId = previousPatients.current[doc.id];

      if (currentPatientId && currentPatientId !== prevId) {
        announcePatient(doc.currentPatient, doc.room);
        previousPatients.current[doc.id] = currentPatientId;
      } else if (!currentPatientId) {
        previousPatients.current[doc.id] = undefined;
      }
    });
  }, [doctors]);

  const announcePatient = (patient: any, room: string) => {
    if ('speechSynthesis' in window) {
      const text = `Token number ${patient.tokenNumber}, ${patient.name}, please proceed to ${room}.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const getCumulativeETA = (queue: any[], baselineETA: number, etaPerPatient: number, targetIndex: number) => {
    let sum = 0;
    const scalingFactor = baselineETA > 0 ? (etaPerPatient / baselineETA) : 1;
    for (let i = 0; i <= targetIndex; i++) {
      if (queue[i]) {
        sum += (queue[i].estimatedDuration * scalingFactor);
      }
    }
    return sum;
  };

  return (
    <div className="min-h-screen bg-ink text-canvas p-8 flex flex-col font-sans overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-12 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-display-lg font-bold text-white/90 tracking-tight leading-none">ClinicQueue</h1>
          <p className="text-body-lg text-mute mt-2">Live Waiting Room</p>
        </div>
        
        <div className="flex items-center gap-8">
          {/* QR Code Widget */}
          <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/10">
            <div className="bg-white p-1.5 rounded-lg shadow-inner">
              <QRCode 
                value={`${window.location.origin}/join`} 
                size={56}
                level="L"
              />
            </div>
            <div className="text-left hidden md:block">
              <p className="text-body-sm font-bold text-white tracking-wide">Self Check-in</p>
              <p className="text-caption text-mute font-mono mt-0.5">Scan to join queue</p>
            </div>
          </div>

          <div className={`flex items-center gap-3 px-6 py-4 rounded-xl bg-white/5 border ${isConnected ? 'border-success/30 text-success' : 'border-error/30 text-error'}`}>
            <Activity size={20} className={isConnected ? 'animate-pulse' : ''} />
            <span className="text-body-sm font-mono uppercase tracking-widest font-semibold">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Doctors */}
      <div className={`flex-grow grid gap-8 ${doctors.length === 1 ? 'grid-cols-1' : doctors.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {doctors.map(doc => (
          <div key={doc.id} className="flex flex-col h-full bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden">
            
            {/* Doctor Header */}
            <div className="text-center mb-8 pb-8 border-b border-white/10">
              <h2 className="text-display-sm font-bold text-white/90">{doc.name}</h2>
              <p className="text-display-xs text-primary mt-2 font-mono">{doc.room}</p>
            </div>

            {/* Paused State Overlay */}
            <AnimatePresence>
              {doc.isPaused && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-ink/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center border-4 border-warning/50 rounded-3xl"
                >
                  <Pause size={64} className="text-warning mb-6" />
                  <h3 className="text-display-md font-bold text-white mb-2">Doctor on Break</h3>
                  <p className="text-display-xs text-mute font-mono">Queue is temporarily paused</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Now Serving */}
            <div className="flex-1 flex flex-col items-center justify-center mb-12">
              <div className="text-body-lg text-mute font-mono uppercase tracking-widest mb-6 flex items-center gap-3">
                <Volume2 size={24} className="text-primary animate-pulse" />
                Now Serving
              </div>
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={doc.currentPatient?.id || 'empty'}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  transition={{ type: "spring", bounce: 0.4 }}
                  className="text-center"
                >
                  <div className="text-[12rem] leading-none font-bold text-white tracking-tighter tabular-nums drop-shadow-2xl">
                    {doc.currentPatient ? doc.currentPatient.tokenNumber : '--'}
                  </div>
                  {doc.currentPatient && (
                    <div className="text-display-sm text-primary font-medium mt-4">
                      {doc.currentPatient.name}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Up Next List */}
            <div className="bg-black/40 rounded-2xl p-6">
              <h3 className="text-body-lg font-mono uppercase tracking-widest text-mute mb-6 border-b border-white/10 pb-4">Up Next</h3>
              <div className="flex flex-col gap-4">
                <AnimatePresence>
                  {doc.queue.slice(0, 3).map((patient, index) => (
                    <motion.div 
                      key={patient.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-6">
                        <div className="text-display-xs font-bold text-white/90 tabular-nums w-12">
                          #{patient.tokenNumber}
                        </div>
                        <div className="text-display-xs text-mute truncate max-w-[200px]">
                          {patient.name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-display-xs font-bold text-primary tabular-nums">
                          ~{Math.round(getCumulativeETA(doc.queue, doc.baselineETA, doc.etaPerPatient, index))}m
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {doc.queue.length === 0 && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-body-lg text-mute text-center py-4 italic"
                    >
                      No patients waiting
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {doc.queue.length > 3 && (
                <div className="mt-6 pt-4 border-t border-white/10 text-center text-body-md text-mute font-medium">
                  + {doc.queue.length - 3} more waiting
                </div>
              )}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
