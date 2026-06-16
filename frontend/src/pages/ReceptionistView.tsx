import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, SkipForward, Settings, UserPlus, WifiOff, Database, Pause, Play, MessageCircle } from 'lucide-react';
import { useClinicQueueSocket } from '../hooks/useClinicQueueSocket';
import { toast } from 'sonner';

export default function ReceptionistView() {
  const { socket, isConnected, queueData, error } = useClinicQueueSocket();
  const { doctors } = queueData;
  
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  
  // Set default selected doctor if none selected
  useEffect(() => {
    if (doctors.length > 0 && selectedDoctorId === null) {
      setSelectedDoctorId(doctors[0].id);
    }
  }, [doctors, selectedDoctorId]);

  const activeDoctor = doctors.find(d => d.id === selectedDoctorId) || null;
  const queue = activeDoctor?.queue || [];
  const currentPatient = activeDoctor?.currentPatient || null;
  const etaPerPatient = activeDoctor?.etaPerPatient || 10;
  const baselineETA = activeDoctor?.baselineETA || 10;
  const isPaused = activeDoctor?.isPaused || false;

  const [localBaselineETA, setLocalBaselineETA] = useState<number>(10);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [appointmentType, setAppointmentType] = useState('regular');
  const [isCalling, setIsCalling] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Sync local baseline state
  useEffect(() => {
    setLocalBaselineETA(baselineETA);
  }, [baselineETA]);

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !socket || !isConnected || !activeDoctor) return;
    
    socket.emit('add_patient', { doctorId: activeDoctor.id, name: nameInput, phone: phoneInput, appointmentType }, (res: any) => {
      if (res?.status === 'error') {
        toast.error(res.message);
      } else {
        setNameInput('');
        setPhoneInput('');
        setAppointmentType('regular');
        toast.success(`Token generated for ${activeDoctor.name}`);
        nameInputRef.current?.focus();
      }
    });
  };

  const seedDemoData = () => {
    if (!socket || !isConnected || !activeDoctor) return;
    const mockNames = ['Alex Chen', 'Sarah Miller', 'James Wilson', 'Priya Patel', 'Marcus Johnson'];
    mockNames.forEach((name, i) => {
      setTimeout(() => {
        socket.emit('add_patient', { doctorId: activeDoctor.id, name, phone: '555-010' + i });
      }, i * 200);
    });
    toast.success(`Demo data injected for ${activeDoctor.name}`, { icon: '🚀' });
  };

  const handleCallNext = () => {
    if (isCalling || !socket || !isConnected || !activeDoctor) return;
    setIsCalling(true);
    
    socket.emit('call_next', { doctorId: activeDoctor.id }, (response: any) => {
      if (response?.status === 'error') {
        toast.error('Action too fast. Please wait.');
      } else {
        toast('Token Called', {
          description: queue.length > 0 ? `Next up: ${queue[0].name}` : 'No patients left.',
        });
      }
      setIsCalling(false);
    });
    
    setTimeout(() => setIsCalling(false), 2500); 
  };

  const handleSkipCurrent = () => {
    if (socket && isConnected && activeDoctor) {
      socket.emit('skip_patient', { doctorId: activeDoctor.id, id: null });
      toast.info('Patient marked as no-show');
    }
  };

  const handleSkipSpecific = (id: string) => {
    if (socket && isConnected && activeDoctor) {
      socket.emit('skip_patient', { doctorId: activeDoctor.id, id });
      toast.info('Patient removed from queue');
    }
  };

  const updateBaseline = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && activeDoctor && socket) {
      setLocalBaselineETA(val);
      socket.emit('update_baseline', { doctorId: activeDoctor.id, newBaseline: val });
    }
  };

  const getCumulativeETA = (targetIndex: number) => {
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
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="min-h-screen p-6 max-w-7xl mx-auto flex flex-col relative"
    >
      
      {/* Offline Banner */}
      <AnimatePresence>
        {!isConnected && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 bg-warning text-ink py-2 px-4 flex items-center justify-center gap-2 shadow-md z-50 text-body-sm font-medium rounded-md mx-6 mt-2"
          >
            <WifiOff size={16} />
            {error || 'Offline. Waiting for network...'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Doctor Selection */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-display-md font-bold text-ink tracking-tight">Dashboard</h1>
          <p className="text-body text-mute">Manage queues across all clinic rooms</p>
        </div>
        
        <div className="flex gap-2 bg-canvas-soft p-1 rounded-lg border border-hairline">
          {doctors.map(doc => (
            <button
              key={doc.id}
              onClick={() => setSelectedDoctorId(doc.id)}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                selectedDoctorId === doc.id 
                  ? 'bg-white shadow-sm border border-hairline text-ink' 
                  : 'text-mute hover:text-ink hover:bg-white/50 border border-transparent'
              }`}
            >
              {doc.name}
              <span className="ml-2 text-xs opacity-60">({doc.room})</span>
              {doc.queue.length > 0 && (
                <span className="ml-2 bg-primary text-on-primary text-[10px] px-1.5 py-0.5 rounded-full">
                  {doc.queue.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Column: Controls */}
        <div className={`w-full md:w-1/3 flex flex-col gap-6 ${(!isConnected || !activeDoctor) ? 'opacity-60 pointer-events-none' : ''}`}>
          
          {/* Call Next Button */}
          <motion.div 
            className="card bg-primary text-on-primary flex flex-col items-center justify-center py-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-body-sm text-on-primary/70 font-mono uppercase tracking-widest mb-4">
              Current Token
            </div>
            <div className="text-display-xl font-bold mb-8">
              {currentPatient ? currentPatient.tokenNumber : '--'}
            </div>
            <div className="text-body-md mb-8 h-6">
              {currentPatient ? currentPatient.name : 'No active patient'}
            </div>
            
            <button 
              onClick={handleCallNext}
              disabled={isCalling || queue.length === 0 || !isConnected}
              className="w-full bg-on-primary text-primary font-medium rounded-md py-3 text-lg hover:bg-canvas-soft transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary shadow-level-1"
            >
              <Bell size={20} />
              {isCalling ? 'Calling...' : 'Call Next Token'}
            </button>
            
            {currentPatient && (
              <div className="flex items-center justify-center gap-6 mt-4">
                <button 
                  onClick={handleSkipCurrent}
                  disabled={!isConnected}
                  className="text-body-sm text-on-primary/60 hover:text-on-primary underline decoration-on-primary/30 flex items-center gap-1 disabled:opacity-50"
                >
                  <SkipForward size={14} /> Skip (No Show)
                </button>
                {currentPatient.phone && (
                  <a 
                    href={`https://wa.me/${currentPatient.phone}?text=${encodeURIComponent(`Hi ${currentPatient.name}, it is your turn to see ${activeDoctor?.name}. Please proceed to ${activeDoctor?.room} now.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-body-sm text-green-300 hover:text-green-100 flex items-center gap-1 transition-colors"
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </a>
                )}
              </div>
            )}
          </motion.div>

          {/* Add Patient Module */}
          <div className="card relative">
            <div className="flex items-center justify-between mb-4 border-b border-hairline pb-3">
              <div className="flex items-center gap-2 text-ink font-semibold">
                <UserPlus size={18} />
                <h2>Add to {activeDoctor?.name}</h2>
              </div>
            </div>
            
            <form onSubmit={handleAddPatient} className="flex flex-col gap-4">
              <div>
                <label className="block text-caption font-mono uppercase text-body mb-1">Patient Name *</label>
                <input 
                  ref={nameInputRef}
                  type="text" 
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  required
                  disabled={!isConnected}
                  className="input-base w-full disabled:bg-canvas-soft disabled:text-mute"
                  placeholder="e.g. Rahul Kumar"
                />
              </div>
              <div>
                <label className="block text-caption font-mono uppercase text-body mb-1">Phone Number (Optional)</label>
                <input 
                  type="text" 
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  disabled={!isConnected}
                  className="input-base w-full disabled:bg-canvas-soft disabled:text-mute"
                  placeholder="10-digit number"
                />
              </div>
              <div>
                <label className="block text-caption font-mono uppercase text-body mb-1">Appointment Type</label>
                <select 
                  value={appointmentType}
                  onChange={(e) => setAppointmentType(e.target.value)}
                  disabled={!isConnected}
                  className="input-base w-full disabled:bg-canvas-soft disabled:text-mute appearance-none bg-white"
                >
                  <option value="quick">Quick Checkup (~5 mins)</option>
                  <option value="regular">Regular Consultation (~15 mins)</option>
                  <option value="extended">Full Physical / Procedure (~30 mins)</option>
                </select>
              </div>
              <button type="submit" disabled={!isConnected} className="btn-primary w-full mt-2 disabled:opacity-50 relative overflow-hidden">
                 Generate Token ↵
              </button>
            </form>
          </div>

          {/* Settings Module */}
          <div className="card bg-canvas-soft border-hairline border shadow-none">
            <div className="flex items-center justify-between mb-4 border-b border-hairline pb-3">
              <div className="flex items-center gap-2 text-body font-semibold">
                <Settings size={16} />
                <h2 className="text-body-sm">Tools: {activeDoctor?.name}</h2>
              </div>
            </div>
            <div className="mb-4">
               <label className="block text-caption font-mono uppercase text-body mb-1">Default Base ETA (mins)</label>
               <input 
                  type="number" 
                  value={localBaselineETA}
                  onChange={updateBaseline}
                  disabled={!isConnected}
                  className="input-base w-full bg-canvas disabled:bg-canvas-soft disabled:text-mute"
                  min="1"
                />
                <p className="text-caption text-mute mt-2 leading-relaxed">
                  Running average: <strong className="text-ink">{etaPerPatient.toFixed(1)} mins</strong> / patient
                </p>
            </div>
            
            <div className="border-t border-hairline pt-4 flex flex-col gap-2">
              <button
                onClick={() => {
                  socket?.emit('toggle_pause', { doctorId: activeDoctor?.id });
                }}
                disabled={!isConnected}
                className={`w-full flex items-center justify-center gap-2 text-sm font-medium border px-3 py-2 rounded-md transition-colors disabled:opacity-50 ${
                  isPaused 
                    ? 'border-success/20 bg-success/10 hover:bg-success/20 text-success' 
                    : 'border-warning/20 bg-warning/10 hover:bg-warning/20 text-warning'
                }`}
              >
                {isPaused ? (
                  <><Play size={14} /> Resume Queue</>
                ) : (
                  <><Pause size={14} /> Doctor on Break</>
                )}
              </button>
              <button
                onClick={seedDemoData}
                disabled={!isConnected}
                className="w-full flex items-center justify-center gap-2 text-sm font-medium border border-hairline bg-canvas hover:bg-canvas-soft-2 px-3 py-2 rounded-md transition-colors text-ink disabled:opacity-50 mt-2"
              >
                <Database size={14} />
                Populate Demo Data
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to reset the queue for ${activeDoctor?.name}?`)) {
                    socket?.emit('reset_queue', { doctorId: activeDoctor?.id });
                  }
                }}
                disabled={!isConnected}
                className="w-full flex items-center justify-center gap-2 text-sm font-medium border border-error/20 bg-error-soft hover:bg-error-soft-2 px-3 py-2 rounded-md transition-colors text-error disabled:opacity-50 mt-2"
              >
                End of Day Reset
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Queue Display */}
        <div className={`w-full md:w-2/3 ${(!isConnected || !activeDoctor) ? 'opacity-80 pointer-events-none' : ''}`}>
          <div className="card h-full min-h-[600px] flex flex-col">
            <div className="flex justify-between items-end mb-6 border-b border-hairline pb-4">
              <div>
                <h2 className="text-display-md font-semibold text-ink">Upcoming Queue</h2>
                <p className="text-body text-body-sm mt-1">Waiting for {activeDoctor?.name}: {queue.length}</p>
              </div>
              <div className="text-right">
                <p className="text-body text-caption font-mono uppercase">Est. Wait</p>
                <p className="text-ink font-semibold">~{Math.round(queue.length > 0 ? getCumulativeETA(queue.length - 1) : 0)} mins</p>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto pr-2">
              <AnimatePresence>
                {queue.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-48 text-mute text-body-sm"
                  >
                    No patients in the queue for {activeDoctor?.name}.
                  </motion.div>
                ) : (
                  queue.map((patient, index) => (
                    <motion.div 
                      key={patient.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center justify-between p-4 mb-3 rounded-lg border border-hairline bg-canvas-soft hover:border-hairline-strong transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-md bg-canvas border border-hairline flex items-center justify-center font-semibold text-ink shadow-sm">
                          {patient.tokenNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-ink">{patient.name}</p>
                            {patient.appointmentType && (
                              <span className="text-[10px] bg-primary/5 text-primary px-1.5 py-0.5 rounded uppercase font-mono tracking-wider">
                                {patient.appointmentType}
                              </span>
                            )}
                          </div>
                          <p className="text-caption text-mute">Added {new Date(patient.addedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <p className="text-caption font-mono uppercase text-body">ETA</p>
                          <p className="font-medium text-ink">
                            {Math.round(getCumulativeETA(index))}m
                          </p>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                          {patient.phone && (
                            <a 
                              href={`https://wa.me/${patient.phone}?text=${encodeURIComponent(`Hi ${patient.name}, your token number is ${patient.tokenNumber} for ${activeDoctor?.name}. Your estimated wait time is currently ${Math.round(getCumulativeETA(index))} minutes.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-500 bg-green-50 p-2 rounded-full transition-colors"
                              title="Send WhatsApp Update"
                            >
                              <MessageCircle size={16} />
                            </a>
                          )}
                          <button 
                            onClick={() => handleSkipSpecific(patient.id)}
                            disabled={!isConnected}
                            className="text-error bg-error-soft hover:bg-error/20 p-2 rounded-full transition-colors disabled:opacity-50"
                            title="Remove patient"
                          >
                            <SkipForward size={16} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        
      </div>
    </motion.div>
  );
}
