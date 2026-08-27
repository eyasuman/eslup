import { motion } from 'framer-motion';

export function Scene1() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
    >
      <div className="flex flex-col items-center gap-6">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.5, type: "spring", stiffness: 100 }}
          className="w-24 h-24 rounded-2xl bg-white shadow-2xl flex items-center justify-center"
        >
          <div className="w-12 h-12 bg-primary rounded-full relative">
            <div className="absolute inset-0 border-4 border-white rounded-full scale-150 mix-blend-overlay"></div>
          </div>
        </motion.div>
        
        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.8, type: "spring", stiffness: 100 }}
          className="text-white text-7xl font-display font-bold tracking-tight text-center"
        >
          Pulse Health
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 1.2, type: "spring", stiffness: 100 }}
          className="text-blue-100 text-3xl font-sans tracking-wide text-center max-w-3xl leading-relaxed mt-4"
        >
          Healthcare Unified.
          <br/>
          <span className="opacity-70 text-2xl">Patients, Providers, and Institutes.</span>
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, delay: 2.5, ease: "easeOut" }}
        className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-4"
      >
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" style={{ animationDelay: '0.2s' }} />
        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" style={{ animationDelay: '0.4s' }} />
      </motion.div>
    </motion.div>
  );
}
