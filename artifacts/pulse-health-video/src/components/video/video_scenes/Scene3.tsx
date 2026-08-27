import { motion } from 'framer-motion';
import { MapPin, Search, Filter, Home, User } from 'lucide-react';

export function Scene3() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.8 }}
      className="absolute inset-0 flex items-center justify-center z-10 w-full h-full"
    >
      <div className="flex w-[80vw] max-w-[1200px] gap-12 items-center">
        
        {/* Left Side: Copy */}
        <div className="flex-1 flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/50 text-blue-200 w-fit"
          >
            <MapPin size={16} />
            <span className="text-sm font-semibold tracking-wider uppercase">Patient Discovery</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, type: "spring", stiffness: 100 }}
            className="text-6xl font-display font-bold text-white leading-tight"
          >
            Find exactly the care you need.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, type: "spring", stiffness: 100 }}
            className="text-2xl text-blue-100/80 font-sans max-w-lg leading-relaxed"
          >
            Explore an interactive map to discover top-rated specialists and institutes near you.
          </motion.p>
        </div>

        {/* Right Side: Map UI Mockup */}
        <div className="flex-1 relative h-[600px] flex flex-col items-center justify-center">
          
          {/* Top Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="absolute top-10 w-full max-w-md bg-white rounded-full px-6 py-4 flex items-center gap-4 shadow-2xl z-20"
          >
            <Search size={20} className="text-slate-400" />
            <div className="flex-1">
              <span className="text-slate-800 font-semibold text-lg">Cardiology</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
              <Filter size={18} className="text-slate-600" />
            </div>
          </motion.div>

          {/* Map Pins */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.8, type: "spring", bounce: 0.5 }}
            className="absolute top-1/3 left-1/4"
          >
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center relative">
              <div className="absolute inset-0 border border-accent/50 rounded-full animate-ping" />
              <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center shadow-lg">
                <Home size={20} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 2.2, type: "spring", bounce: 0.5 }}
            className="absolute bottom-1/3 right-1/4"
          >
            <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center relative">
              <div className="absolute inset-0 border border-secondary/50 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
              <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center shadow-lg">
                <User size={20} />
              </div>
            </div>
          </motion.div>
          
        </div>
      </div>
    </motion.div>
  );
}
