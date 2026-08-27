import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

export function Scene8() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
    >
      {/* Background glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 0.15, scale: 1 }}
        transition={{ duration: 3, ease: "easeOut" }}
        className="absolute w-[800px] h-[800px] bg-primary rounded-full blur-[120px] pointer-events-none"
      />

      <div className="flex flex-col items-center gap-8 relative z-10">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 1.5, type: "spring", bounce: 0.4 }}
          className="w-32 h-32 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-2xl shadow-primary/40 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 blur-xl transform -skew-x-12 translate-x-full animate-[shimmer_3s_infinite]" />
          <Activity size={64} className="text-white relative z-10" strokeWidth={1.5} />
        </motion.div>
        
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="text-7xl font-display font-bold text-white tracking-tight"
        >
          Pulse Health
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="text-2xl text-slate-300 font-sans tracking-wide text-center"
        >
          A connected network driving better health outcomes. <br/>
          <span className="text-primary font-semibold">The future of care is here.</span>
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 2.5 }}
        className="absolute bottom-20 flex gap-4"
      >
        <div className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-white font-semibold flex items-center gap-2">
          Download on the App Store
        </div>
        <div className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-white font-semibold flex items-center gap-2">
          Get it on Google Play
        </div>
      </motion.div>
    </motion.div>
  );
}
