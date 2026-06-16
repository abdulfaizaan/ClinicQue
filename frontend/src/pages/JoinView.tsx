import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, ArrowRight, Activity, CheckCircle2 } from 'lucide-react';
import { useClinicQueueSocket } from '../hooks/useClinicQueueSocket';

export default function JoinView() {
  const { socket, isConnected, queueData } = useClinicQueueSocket();
  const { doctors } = queueData;

  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | ''>('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();

  // Set default doctor if there's only one, or when data loads
  useEffect(() => {
    if (doctors.length > 0 && selectedDoctorId === '') {
      setSelectedDoctorId(doctors[0].id);
    }
  }, [doctors, selectedDoctorId]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !socket || !isConnected || !selectedDoctorId) return;
    
    socket.emit('add_patient', { doctorId: selectedDoctorId, name: nameInput, phone: phoneInput, appointmentType: 'regular' }, (res: any) => {
      if (res?.status === 'error') {
        alert(res.message || 'Error joining queue.');
        return;
      }

      const tkn = res?.tokenNumber;
      if (tkn && 'speechSynthesis' in window) {
        const text = `Check-in successful. ${res?.patientName || 'You'} are token number ${tkn}.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
      }

      setIsSubmitted(true);
      
      // Store which doctor they selected so PatientView knows what to show
      localStorage.setItem('my-doctor-id', selectedDoctorId.toString());
      
      // Redirect to patient view after 2 seconds
      setTimeout(() => {
        navigate('/patient');
      }, 2500);
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="min-h-screen p-4 md:p-8 max-w-md mx-auto flex flex-col items-center justify-center relative z-10"
    >
      <div className="w-full text-center mb-8 mt-6">
        <h1 className="text-display-md font-semibold text-ink tracking-tight">Self Check-In</h1>
        <div className={`flex items-center justify-center gap-2 mt-2 ${isConnected ? 'text-success' : 'text-error'}`}>
          <Activity size={16} className={isConnected ? 'animate-pulse' : ''} />
          <span className="text-caption font-mono uppercase tracking-widest">
            {isConnected ? 'System Online' : 'Connecting...'}
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isSubmitted ? (
          <motion.div 
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full card border border-hairline shadow-level-2"
          >
            <form onSubmit={handleJoin} className="flex flex-col gap-6">
              <div>
                <label className="block text-caption font-mono uppercase text-body mb-2">
                  Select Doctor *
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
                  required
                  disabled={!isConnected}
                  className="input-base w-full bg-white disabled:bg-canvas-soft appearance-none py-3"
                >
                  <option value="" disabled>Select a doctor</option>
                  {doctors.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} - {doc.room}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-caption font-mono uppercase text-body mb-2 flex items-center gap-2">
                  <UserPlus size={14} /> Full Name *
                </label>
                <input 
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Rahul Kumar"
                  className="input-base w-full text-lg py-3"
                  autoFocus
                  required
                  disabled={!isConnected}
                />
              </div>
              <div>
                <label className="block text-caption font-mono uppercase text-body mb-2">
                  Phone Number (Optional)
                </label>
                <input 
                  type="text"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="For SMS updates"
                  className="input-base w-full py-3"
                  disabled={!isConnected}
                />
              </div>
              <button 
                type="submit" 
                disabled={!isConnected || !nameInput.trim() || !selectedDoctorId} 
                className="btn-primary w-full flex items-center justify-center gap-2 mt-2 py-4"
              >
                Join Queue <ArrowRight size={16} />
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full card border border-success/30 bg-success/5 text-center py-12 flex flex-col items-center justify-center gap-4"
          >
            <CheckCircle2 size={48} className="text-success" />
            <h2 className="text-display-sm font-semibold text-ink">You're in line!</h2>
            <p className="text-body text-mute">Redirecting you to the live tracker...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
