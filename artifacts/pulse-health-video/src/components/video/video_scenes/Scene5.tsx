import { motion } from 'framer-motion';
import { Lock, Video, Mic, PhoneOff, Settings, User } from 'lucide-react';

export function Scene5() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.8 }}
      className="absolute inset-0 flex items-center justify-center z-10 w-full h-full"
    >
      <div className="flex w-[80vw] max-w-[1200px] gap-16 items-center">
        
        {/* Left Side: Video Call Mockup */}
        <div className="flex-1 relative aspect-[3/4] max-h-[80vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 80 }}
            className="w-full h-full bg-slate-900 rounded-[40px] shadow-2xl overflow-hidden relative border border-slate-700/50"
            style={{ perspective: 1000 }}
          >
            {/* Main Video Area (Doctor) */}
            <div className="absolute inset-0 bg-slate-800">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                transition={{ delay: 1 }}
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/doctor.jpg)` }}
              />
            </div>

            {/* Self View (Patient) */}
            <motion.div
              initial={{ opacity: 0, x: 20, y: -20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 1.5, type: "spring" }}
              className="absolute top-6 right-6 w-32 aspect-[3/4] bg-slate-700 rounded-2xl border-2 border-slate-600 overflow-hidden shadow-xl"
            >
              <div 
                className="w-full h-full bg-cover bg-center opacity-80" 
                style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/patient.jpg)` }}
              />
            </motion.div>

            {/* Top Bar (Encrypted, Timer) */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none"
            >
              <div className="flex flex-col gap-2">
                <div className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md flex items-center gap-2 w-fit border border-white/10">
                  <Lock size={12} className="text-secondary" />
                  <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">End-to-End Encrypted</span>
                </div>
                <div className="px-3 py-1.5 rounded-full bg-red-500/20 backdrop-blur-md flex items-center gap-2 w-fit border border-red-500/30">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[12px] font-bold text-white tracking-widest">12:45</span>
                </div>
              </div>
            </motion.div>

            {/* Waiting Room Overlay Concept (Fades out) */}
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 0, scale: 1.1 }}
              transition={{ delay: 2.5, duration: 1 }}
              className="absolute inset-0 bg-slate-900 z-10 flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                <User size={32} className="text-primary animate-pulse" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Waiting for Dr. Jenkins...</h3>
              <p className="text-slate-400">Your secure connection is ready. The doctor will join shortly.</p>
            </motion.div>

            {/* Bottom Controls */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 p-4 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 z-0"
            >
              <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-white/80">
                <Settings size={20} />
              </div>
              <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-white">
                <Video size={20} />
              </div>
              <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-white">
                <Mic size={20} />
              </div>
              <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30">
                <PhoneOff size={24} />
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Right Side: Copy */}
        <div className="flex-1 flex flex-col gap-6">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, type: "spring", stiffness: 100 }}
            className="text-6xl font-display font-bold text-white leading-tight"
          >
            Consult <span className="text-secondary">instantly.</span><br/>
            Securely.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, type: "spring", stiffness: 100 }}
            className="text-2xl text-blue-100/80 font-sans max-w-lg leading-relaxed"
          >
            Experience high-definition, encrypted video care. Wait comfortably, connect instantly.
          </motion.p>
        </div>

      </div>
    </motion.div>
  );
}
