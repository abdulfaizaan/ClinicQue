import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Users, Clock, ArrowLeft, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AnalyticsData {
  totalServed: number;
  totalSkipped: number;
  totalWaiting: number;
  avgConsultationTime: string;
  peakHours: { hour: string; patients: number }[];
}

export default function AnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3001/api/analytics')
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-mute">Loading analytics...</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="min-h-screen p-6 max-w-7xl mx-auto flex flex-col gap-8 relative pb-20"
    >
      <div className="flex items-center gap-4 border-b border-hairline pb-4">
        <Link to="/receptionist" className="p-2 hover:bg-canvas-soft rounded-full transition-colors text-mute hover:text-ink">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-display-md font-semibold text-ink flex items-center gap-2">
            <BarChart2 size={24} className="text-primary" /> Clinic Analytics
          </h1>
          <p className="text-body text-body-sm mt-1">Real-time insights and daily performance.</p>
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card border border-hairline shadow-level-1">
              <div className="text-caption text-mute font-mono uppercase mb-2 flex items-center gap-2">
                <Users size={14} /> Total Served Today
              </div>
              <div className="text-display-lg font-bold text-ink">{data.totalServed}</div>
            </div>
            
            <div className="card border border-hairline shadow-level-1">
              <div className="text-caption text-mute font-mono uppercase mb-2 flex items-center gap-2">
                <Clock size={14} /> Avg Consultation Time
              </div>
              <div className="text-display-lg font-bold text-primary flex items-baseline gap-1">
                {data.avgConsultationTime} <span className="text-body-md text-mute font-medium">min</span>
              </div>
            </div>

            <div className="card border border-hairline shadow-level-1">
              <div className="text-caption text-mute font-mono uppercase mb-2 flex items-center gap-2">
                <Users size={14} /> Currently Waiting
              </div>
              <div className="text-display-lg font-bold text-ink">{data.totalWaiting}</div>
            </div>

            <div className="card border border-hairline shadow-level-1 bg-error-soft/30 border-error/20">
              <div className="text-caption text-error font-mono uppercase mb-2 flex items-center gap-2">
                <Users size={14} /> No-Shows / Skipped
              </div>
              <div className="text-display-lg font-bold text-error">{data.totalSkipped}</div>
            </div>
          </div>

          <div className="card border border-hairline shadow-level-1 mt-4">
            <h3 className="text-body-lg font-semibold mb-6">Patient Flow Throughout the Day</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.peakHours} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--hairline)" />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: 'var(--mute)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--mute)' }} dx={-10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--canvas)', borderColor: 'var(--hairline)', borderRadius: '8px', boxShadow: 'var(--shadow-level-2)' }}
                    itemStyle={{ color: 'var(--ink)' }}
                  />
                  <Area type="monotone" dataKey="patients" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorPatients)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
