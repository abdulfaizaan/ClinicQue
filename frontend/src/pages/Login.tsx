import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [passcode, setPasscode] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode) return;
    
    // In a real app, we might verify this against the server first.
    // For this hackathon version, we just store it and let the socket server reject invalid passcodes.
    localStorage.setItem('clinic-auth-passcode', passcode);
    
    // Check if the user was trying to go somewhere specific, otherwise default to receptionist
    const destination = localStorage.getItem('redirect-after-login') || '/receptionist';
    localStorage.removeItem('redirect-after-login');
    
    toast.success('Passcode applied. Connecting...');
    // A small delay to let the toast show up
    setTimeout(() => {
        navigate(destination);
        // Force reload so the socket hook picks up the new localStorage value
        window.location.reload(); 
    }, 500);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="min-h-screen p-4 md:p-8 max-w-md mx-auto flex flex-col items-center justify-center relative z-10"
    >
      <div className="w-full text-center mb-8 mt-6">
        <h1 className="text-display-md font-semibold text-ink tracking-tight">Clinic Access</h1>
        <p className="text-body text-mute mt-2">Enter the clinic passcode to manage the queue.</p>
      </div>

      <div className="w-full card border border-hairline shadow-level-2">
        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          <div>
            <label className="block text-caption font-mono uppercase text-body mb-2 flex items-center gap-2">
              <Lock size={14} /> Passcode
            </label>
            <input 
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter passcode..."
              className="input-base w-full text-center tracking-widest text-lg py-4"
              autoFocus
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
            Unlock Dashboard <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </motion.div>
  );
}
