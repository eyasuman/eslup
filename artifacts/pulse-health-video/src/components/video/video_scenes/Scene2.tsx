import { motion } from 'framer-motion';
import { User, ActivitySquare, Home } from 'lucide-react';

export function Scene2() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.8 }}
      className="absolute inset-0 flex flex-col items-center justify-center z-10 w-full h-full"
    >
      <motion.h2
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        className="text-5xl font-display font-bold text-white mb-16 text-center"
      >
        Choose your <span className="text-primary">path.</span>
      </motion.h2>

      <div className="flex gap-8">
        {[
          { icon: User, title: 'Patient', desc: 'Find care instantly', color: 'text-primary', bg: 'bg-primary/20', border: 'border-primary/40', delay: 1.0 },
          { icon: ActivitySquare, title: 'Provider', desc: 'Manage your practice', color: 'text-secondary', bg: 'bg-secondary/20', border: 'border-secondary/40', delay: 1.2 },
          { icon: Home, title: 'Institute', desc: 'Oversee facilities', color: 'text-accent', bg: 'bg-accent/20', border: 'border-accent/40', delay: 1.4 },
        ].map((role, i) => (
          <motion.div
            key={role.title}
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: role.delay, type: "spring", stiffness: 100, bounce: 0.4 }}
            className={`w-64 h-80 rounded-[32px] bg-slate-900/60 backdrop-blur-md border ${role.border} flex flex-col items-center justify-center p-8 text-center relative overflow-hidden`}
          >
            <div className={`absolute inset-0 ${role.bg} opacity-20`} />
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ delay: role.delay + 0.5, duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className={`w-24 h-24 rounded-full ${role.bg} flex items-center justify-center mb-6 border border-white/10 shadow-xl`}
            >
              <role.icon size={40} className={role.color} />
            </motion.div>
            <h3 className="text-2xl font-bold text-white mb-2">{role.title}</h3>
            <p className="text-slate-400 text-sm">{role.desc}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
