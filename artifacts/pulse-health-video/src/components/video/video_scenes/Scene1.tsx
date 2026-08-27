import { motion } from 'framer-motion';
import { PhoneFrame } from './PhoneFrame';

const ease = [0.16, 1, 0.3, 1] as const;

export function Scene1() {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
      transition={{ duration: 1, ease }}
    >
      <PhoneFrame
        initial={{ y: 200, scale: 0.8, rotateX: 20 }}
        animate={{ y: 0, scale: 1, rotateX: 0 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      >
        {/* Header matching real app */}
        <div className="bg-gradient-to-b from-[#202937] to-[#315d93] pt-14 pb-8 px-5">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <div className="text-white text-xl font-display font-bold leading-tight">PULSE</div>
                <div className="text-white/70 text-[10px] uppercase tracking-widest font-bold">Health-Tech Solution</div>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white rounded-md" />
            </div>
          </div>
          
          {/* Search bar */}
          <div className="mt-6 bg-white rounded-xl h-12 flex items-center px-4 shadow-sm">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <div className="ml-3 text-slate-400 text-sm">Search doctors, specialties...</div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 bg-white">
          <div className="flex justify-between items-center mb-4">
            <div className="text-lg font-bold text-[#202937]">Choose a Service</div>
            <div className="text-[#315d93] font-medium text-sm">See all</div>
          </div>

          <div className="flex gap-4">
            {/* Doctors category being tapped */}
            <motion.div 
              className="flex-1 items-center flex flex-col gap-2"
              initial={{ scale: 1 }}
              animate={{ scale: [1, 0.9, 1] }}
              transition={{ delay: 6.8, duration: 0.3 }}
            >
              <div className="w-16 h-16 rounded-full bg-[#315d93]/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-[#315d93]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="text-xs font-medium text-slate-700">Doctors</div>
            </motion.div>
            
            <div className="flex-1 items-center flex flex-col gap-2 opacity-60">
              <div className="w-16 h-16 rounded-full bg-[#059669]/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div className="text-xs font-medium text-slate-700">Nurses</div>
            </div>
            
            <div className="flex-1 items-center flex flex-col gap-2 opacity-60">
              <div className="w-16 h-16 rounded-full bg-[#D97706]/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-[#D97706]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div className="text-xs font-medium text-slate-700">Homecare</div>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <div className="text-lg font-bold text-[#202937]">Health Facilities</div>
              <div className="flex items-center gap-1 text-[#059669]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-bold">Find Nearby</span>
              </div>
            </div>
            <div className="h-32 bg-slate-100 rounded-xl overflow-hidden relative">
               <img src={`${import.meta.env.BASE_URL}images/hospital.jpg`} alt="Hospital" className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
                 <div className="text-white font-bold">City General</div>
                 <div className="text-white/80 text-xs">2.4 miles away</div>
               </div>
            </div>
          </div>
        </div>

        {/* Bottom Tabs */}
        <div className="absolute bottom-0 inset-x-0 h-20 bg-white border-t border-slate-200 flex items-center justify-around px-8 pb-4">
          <div className="flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-[#315d93]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="text-[10px] text-[#315d93] font-medium">Explore</div>
          </div>
          <div className="flex flex-col items-center gap-1 opacity-40">
            <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <div className="text-[10px] font-medium">Provider</div>
          </div>
          <div className="flex flex-col items-center gap-1 opacity-40">
            <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div className="text-[10px] font-medium">You</div>
          </div>
        </div>

        {/* Animated Finger Cursor */}
        <motion.div
          className="absolute z-50 pointer-events-none"
          initial={{ x: 100, y: 500, opacity: 0 }}
          animate={{ x: 30, y: 320, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2, ease: "easeInOut", delay: 5.5 }}
        >
          <div className="w-12 h-12 rounded-full bg-white/20 shadow-2xl flex items-center justify-center backdrop-blur-sm border border-white/50">
            <div className="w-4 h-4 bg-white rounded-full shadow-inner" />
          </div>
        </motion.div>
      </PhoneFrame>

      {/* Hero Typography on the side */}
      <motion.div 
        className="ml-16 max-w-lg hidden lg:block"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 1, ease }}
      >
        <h1 className="text-5xl font-display font-bold text-white leading-tight mb-4">
          Meet <span className="text-[#7FA8D8]">Pulse Health</span>.
        </h1>
        <p className="text-xl text-slate-300">
          A fully connected ecosystem in your pocket.
        </p>
      </motion.div>
    </motion.div>
  );
}
