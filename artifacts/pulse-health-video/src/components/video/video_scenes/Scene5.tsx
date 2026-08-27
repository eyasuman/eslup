import { motion } from 'framer-motion';
import { PhoneFrame } from './PhoneFrame';

const ease = [0.16, 1, 0.3, 1] as const;

export function Scene5() {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: "-100%", filter: 'blur(10px)' }}
      transition={{ duration: 1, ease }}
    >
      <PhoneFrame
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease }}
        className="bg-slate-50"
      >
        <div className="w-full h-full bg-slate-50 flex flex-col">
          {/* Header */}
          <div className="bg-[#0D9488] pt-14 pb-12 px-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <div className="text-white text-2xl font-bold">City General</div>
                <div className="text-teal-100 text-xs mt-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  Addis Ababa
                </div>
              </div>
              <div className="w-12 h-12 bg-white rounded-xl shadow-lg p-1">
                <img src={`${import.meta.env.BASE_URL}images/hospital.jpg`} alt="Logo" className="w-full h-full rounded-lg object-cover" />
              </div>
            </div>
          </div>

          {/* Overlapping Content */}
          <div className="px-5 -mt-6 flex-1 z-10">
            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-sm p-1 flex mb-4 border border-slate-100">
              <div className="flex-1 text-center py-2 bg-slate-100 rounded-xl text-[#0D9488] font-bold text-xs">Overview</div>
              <div className="flex-1 text-center py-2 text-slate-500 font-medium text-xs">Profile</div>
              <div className="flex-1 text-center py-2 text-slate-500 font-medium text-xs">Services</div>
            </div>

            {/* Status */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 mb-4 flex justify-between items-center">
              <div>
                <div className="text-[#202937] font-bold text-sm">Institute Status</div>
                <div className="text-xs text-slate-500">Currently visible in app</div>
              </div>
              <div className="bg-green-100 px-3 py-1 rounded-full text-green-700 text-xs font-bold flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                Active and Listed
              </div>
            </div>

            {/* Overview Stats */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 bg-white p-3 rounded-xl shadow-sm border border-slate-100 text-center">
                <div className="text-2xl font-bold text-[#202937]">42</div>
                <div className="text-[10px] text-slate-500 font-medium mt-1">Total Doctors</div>
              </div>
              <div className="flex-1 bg-white p-3 rounded-xl shadow-sm border border-slate-100 text-center">
                <div className="text-2xl font-bold text-[#202937]">18</div>
                <div className="text-[10px] text-slate-500 font-medium mt-1">Total Beds</div>
              </div>
              <div className="flex-1 bg-white p-3 rounded-xl shadow-sm border border-slate-100 text-center">
                <div className="text-2xl font-bold text-[#202937]">12</div>
                <div className="text-[10px] text-slate-500 font-medium mt-1">Total Services</div>
              </div>
            </div>

            {/* Quick Information List */}
            <div className="text-[#202937] font-bold text-sm mb-3">Quick Information</div>
            
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 flex items-center border-b border-slate-50 gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#0D9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <div className="text-[#202937] font-bold text-xs">Profile</div>
                  <div className="text-[10px] text-slate-500 font-medium">Basic details & location</div>
                </div>
              </div>
              
              <div className="p-4 flex items-center border-b border-slate-50 gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <div className="text-[#202937] font-bold text-xs">Services</div>
                  <div className="text-[10px] text-slate-500 font-medium">Manage available departments</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cursors */}
        <motion.div
          className="absolute z-50 pointer-events-none"
          initial={{ x: 300, y: 700, opacity: 0 }}
          animate={{ x: [300, 270, 270, 300], y: [700, 520, 520, 700], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.5, delay: 4.5, ease: "easeInOut" }}
        >
          <div className="w-12 h-12 rounded-full bg-black/20 shadow-2xl flex items-center justify-center backdrop-blur-sm border border-white/50">
            <div className="w-4 h-4 bg-white rounded-full shadow-inner" />
          </div>
        </motion.div>
      </PhoneFrame>
    </motion.div>
  );
}
