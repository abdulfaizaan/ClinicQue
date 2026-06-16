import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { LayoutDashboard, Users, Sparkles } from 'lucide-react';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden bg-[#f3f4f6]"
    >

      {/* Subtle geometric lattice pattern */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.15]"
        style={{
          backgroundImage: `radial-gradient(#9ca3af 1px, transparent 1px), radial-gradient(#9ca3af 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0, 12px 12px'
        }}
      />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-gradient-to-tr from-cyan-100/40 via-transparent to-fuchsia-100/40 rounded-full blur-3xl z-0 pointer-events-none" />

      {/* Header */}
      <motion.div variants={itemVariants} className="text-center max-w-2xl z-10">
        <span className="bg-gradient-to-r from-yellow-100 to-amber-100 border border-yellow-300 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-yellow-800 mb-8 inline-flex items-center gap-2 shadow-[0_0_20px_rgba(251,191,36,0.2)] ring-1 ring-yellow-400/20">
          <Sparkles size={14} className="text-yellow-600" />
          ClinicQue
        </span>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 text-gray-900 drop-shadow-sm leading-tight">
          Cure Waiting Room<br />
        </h1>
        <p className="text-lg md:text-xl text-gray-600 mb-14 leading-relaxed font-medium">
          Patients hate waiting blindly. Empower them with transparent, historically-accurate ETAs and delightful live tracking right on their phones.
        </p>
      </motion.div>

      {/* Role Selection Cards */}
      <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-8 w-full max-w-6xl z-10">
        {/* Left Module - Receptionist */}
        <button
          onClick={() => navigate('/receptionist')}
          className="relative group text-left transition-all duration-300 flex flex-col h-full rounded-2xl p-8 bg-white/70 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(6,182,212,0.12)] hover:-translate-y-1 overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-full bg-cyan-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-300/20 blur-3xl rounded-full pointer-events-none" />

          <div className="relative bg-gradient-to-br from-cyan-50 to-cyan-100/50 border border-cyan-100 text-cyan-600 w-14 h-14 rounded-xl flex items-center justify-center mb-6 shadow-sm shadow-cyan-200/50 group-hover:scale-110 transition-transform duration-300">
            <LayoutDashboard size={28} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-gray-900">Receptionist Dashboard</h2>
          <p className="text-gray-600 mb-8 flex-grow leading-relaxed">
            Instantly populate demo data, manage patients with smart triage, and call the next token with lightning speed.
          </p>
          <div className="bg-black text-white font-semibold rounded-lg px-6 py-3 text-sm inline-flex items-center justify-center transition-all shadow-md group-hover:bg-gray-800 self-start">
            Enter Dashboard →
          </div>
        </button>

        {/* Right Module - Patient */}
        <button
          onClick={() => navigate('/patient')}
          className="relative group text-left transition-all duration-300 flex flex-col h-full rounded-2xl p-8 bg-white/70 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(217,70,239,0.12)] hover:-translate-y-1 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-full h-full bg-fuchsia-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-fuchsia-300/20 blur-3xl rounded-full pointer-events-none" />

          <div className="relative bg-gradient-to-br from-fuchsia-50 to-fuchsia-100/50 border border-fuchsia-100 text-fuchsia-600 w-14 h-14 rounded-xl flex items-center justify-center mb-6 shadow-sm shadow-fuchsia-200/50 group-hover:scale-110 transition-transform duration-300">
            <Users size={28} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-gray-900">Patient Experience</h2>
          <p className="text-gray-600 mb-8 flex-grow leading-relaxed">
            Live synchronization, exact ETAs based on real clinic historical data, and a delightful psychological boost when it's your turn.
          </p>
          <div className="bg-white/60 backdrop-blur-md border border-gray-200/60 text-gray-900 font-semibold rounded-lg px-6 py-3 text-sm inline-flex items-center justify-center transition-all shadow-sm group-hover:bg-white/90 group-hover:border-gray-300/60 self-start">
            View Patient Screen →
          </div>
        </button>

        {/* Third Module - TV Kiosk */}
        <button
          onClick={() => navigate('/kiosk')}
          className="relative group text-left transition-all duration-300 flex flex-col h-full rounded-2xl p-8 bg-white/70 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(16,185,129,0.12)] hover:-translate-y-1 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-full h-full bg-emerald-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-300/20 blur-3xl rounded-full pointer-events-none" />

          <div className="relative bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-100 text-emerald-600 w-14 h-14 rounded-xl flex items-center justify-center mb-6 shadow-sm shadow-emerald-200/50 group-hover:scale-110 transition-transform duration-300">
            <LayoutDashboard size={28} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-gray-900">Waiting Room TV</h2>
          <p className="text-gray-600 mb-8 flex-grow leading-relaxed">
            The split-screen digital signage for the clinic lobby. Displays "Now Serving" and automated AI voice announcements for all doctors.
          </p>
          <div className="bg-white/60 backdrop-blur-md border border-gray-200/60 text-gray-900 font-semibold rounded-lg px-6 py-3 text-sm inline-flex items-center justify-center transition-all shadow-sm group-hover:bg-white/90 group-hover:border-gray-300/60 self-start">
            View Kiosk Screen →
          </div>
        </button>
      </motion.div>

    </motion.div>
  );
}

