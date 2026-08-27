import { motion } from 'framer-motion';
import { PhoneFrame } from './PhoneFrame';

const ease = [0.16, 1, 0.3, 1] as const;

export function Scene4() {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 1, ease }}
    >
      <PhoneFrame
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease }}
        className="bg-[#202937]"
      >
        <div className="w-full h-full bg-[#111827] flex flex-col">
          {/* Header */}
          <div className="bg-[#202937] pt-14 pb-5 px-5 flex justify-between items-center shadow-md">
            <div>
              <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Provider Dashboard</div>
              <div className="text-white text-xl font-bold">Dr. Chen</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-[#10b981] text-xs font-bold">Online</div>
              <div className="w-10 h-6 bg-[#10b981] rounded-full p-1 flex justify-end items-center">
                <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex gap-2 px-5 py-6">
            <div className="flex-1 bg-[#1f2937] rounded-xl p-2 border border-[#374151] text-center">
              <div className="text-white/60 text-[10px] mb-1">Clients</div>
              <div className="text-sm font-bold text-white">124</div>
            </div>
            <div className="flex-1 bg-[#1f2937] rounded-xl p-2 border border-[#374151] text-center">
              <div className="text-white/60 text-[10px] mb-1">Aug New</div>
              <div className="text-sm font-bold text-[#D97706]">12</div>
            </div>
            <div className="flex-1 bg-[#1f2937] rounded-xl p-2 border border-[#374151] text-center">
              <div className="text-white/60 text-[10px] mb-1">Rating</div>
              <div className="text-sm font-bold text-[#10b981]">4.9</div>
            </div>
            <div className="flex-1 bg-[#1f2937] rounded-xl p-2 border border-[#374151] text-center">
              <div className="text-white/60 text-[10px] mb-1">Earned</div>
              <div className="text-sm font-bold text-[#10b981]">ETB 15K</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-[#1f2937] flex shadow-sm border-b border-[#374151]">
            <div className="flex-1 py-3 text-center border-b-2 border-[#315d93] text-[#315d93] font-bold text-xs">Requests</div>
            <div className="flex-1 py-3 text-center text-slate-400 font-medium text-xs">Services</div>
            <div className="flex-1 py-3 text-center text-slate-400 font-medium text-xs">Schedule</div>
            <div className="flex-1 py-3 text-center text-slate-400 font-medium text-xs">Location</div>
          </div>

          <div className="px-5 flex-1 pt-4">
            
            {/* Pending Request Card */}
            <motion.div 
              className="bg-[#1f2937] rounded-2xl border-l-4 border-l-[#D97706] p-4 border-y border-r border-y-[#374151] border-r-[#374151] shadow-lg relative overflow-hidden"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 2.5, duration: 0.8, ease }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800">
                    <img src={`${import.meta.env.BASE_URL}images/sarah.jpg`} alt="Sarah" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="text-white font-bold">Sarah M.</div>
                    <div className="text-white/60 text-xs">New Patient</div>
                  </div>
                </div>
                <div className="bg-[#D97706]/20 px-2 py-1 rounded text-[10px] font-bold text-[#D97706] uppercase">
                  Pending
                </div>
              </div>

              <div className="bg-[#111827] rounded-lg p-3 mb-4 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-white/80 text-xs">Video Consult</span>
                  <span className="text-white font-bold text-sm">Today, 10:00 AM</span>
                </div>
                <div className="text-[#10b981] font-bold text-sm">ETB 1,500</div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <motion.div 
                  className="flex-1 border border-red-500/30 text-red-400 py-2 rounded-lg text-center font-bold text-sm"
                  animate={{ opacity: [1, 0] }}
                  transition={{ delay: 3.8, duration: 0.3 }}
                >
                  Decline
                </motion.div>
                
                <motion.div 
                  className="flex-1 bg-[#059669] text-white py-2 rounded-lg text-center font-bold text-sm"
                  animate={{ scale: [1, 0.9, 1] }}
                  transition={{ delay: 3.8, duration: 0.3 }}
                >
                  Accept
                </motion.div>
              </div>

              {/* Status Change Overlay (After click) */}
              <motion.div
                className="absolute inset-0 bg-[#059669] flex flex-col items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1] }}
                transition={{ delay: 4.2, duration: 0.3 }}
              >
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-white font-bold">Appointment Confirmed</div>
              </motion.div>
            </motion.div>
            
            {/* Upcoming Appointment */}
            <div className="bg-[#1f2937] rounded-2xl border-l-4 border-l-[#315d93] p-4 border-y border-r border-y-[#374151] border-r-[#374151] shadow mt-4 opacity-50">
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-full bg-[#111827]" />
                  <div>
                    <div className="w-24 h-4 bg-[#374151] rounded mb-1" />
                    <div className="w-16 h-3 bg-[#111827] rounded" />
                  </div>
                </div>
                <div className="w-16 h-4 bg-[#315d93]/20 rounded" />
              </div>
            </div>
          </div>
          
          {/* Bottom Tabs */}
          <div className="h-20 bg-[#202937] border-t border-[#374151] flex items-center justify-between px-8 pb-4">
            <div className="flex flex-col items-center gap-1">
              <div className="w-5 h-5 rounded border-2 border-white opacity-40" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-5 h-5 bg-[#315d93] rounded" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-5 h-5 rounded-full border-2 border-white opacity-40" />
            </div>
          </div>
        </div>

        {/* Cursor */}
        <motion.div
          className="absolute z-50 pointer-events-none"
          initial={{ x: 250, y: 750, opacity: 0 }}
          animate={{ x: [250, 240, 240, 250], y: [750, 520, 520, 750], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2, delay: 3, ease: "easeInOut" }}
        >
          <div className="w-12 h-12 rounded-full bg-white/20 shadow-2xl flex items-center justify-center backdrop-blur-sm border border-white/50">
            <div className="w-4 h-4 bg-white rounded-full shadow-inner" />
          </div>
        </motion.div>
      </PhoneFrame>
    </motion.div>
  );
}
