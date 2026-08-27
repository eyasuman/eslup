import { motion } from 'framer-motion';
import { PhoneFrame } from './PhoneFrame';

const ease = [0.16, 1, 0.3, 1] as const;

export function Scene6() {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5, ease }}
    >
      <PhoneFrame
        initial={{ x: 0, opacity: 0 }}
        animate={{ opacity: [1, 1, 0], scale: [1, 1, 1.1] }}
        transition={{ duration: 5, times: [0, 0.8, 1], ease: "easeInOut" }}
      >
        <div className="w-full h-full bg-[#F4F7FB] flex flex-col relative">
          {/* Header */}
          <div className="bg-[#202937] pt-14 pb-5 px-5 shadow-sm z-10">
            <div className="text-white text-xl font-bold">My Appointments</div>
          </div>
          
          {/* Tabs */}
          <div className="bg-white flex shadow-sm border-b border-slate-100 overflow-x-hidden">
            <div className="px-4 py-3 border-b-2 border-[#315d93] text-[#315d93] font-bold text-xs whitespace-nowrap">All</div>
            <div className="px-4 py-3 text-slate-500 font-medium text-xs whitespace-nowrap">Pending</div>
            <div className="px-4 py-3 text-slate-500 font-medium text-xs whitespace-nowrap">Confirmed</div>
            <div className="px-4 py-3 text-slate-500 font-medium text-xs whitespace-nowrap">Completed</div>
            <div className="px-4 py-3 text-slate-500 font-medium text-xs whitespace-nowrap">Cancelled</div>
          </div>

          <div className="p-5 flex-1 space-y-4">
            {/* Confirmed Appointment Card */}
            <motion.div 
              className="bg-white rounded-2xl shadow-sm border border-[#059669]/20 overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease }}
            >
              <div className="bg-[#ecfdf5] px-4 py-2 flex justify-between items-center border-b border-[#059669]/10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
                  <span className="text-[#059669] font-bold text-xs uppercase tracking-wider">Confirmed</span>
                </div>
                <span className="text-[#059669] font-bold text-xs">Today, 10:00 AM</span>
              </div>
              
              <div className="p-4">
                <div className="flex gap-4 items-center mb-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200">
                    <img src={`${import.meta.env.BASE_URL}images/dr-chen.jpg`} alt="Dr. Chen" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="text-[#202937] font-bold text-base">Dr. Michael Chen</div>
                    <div className="text-slate-500 text-sm">Video Consultation</div>
                  </div>
                </div>

                <div className="w-full bg-[#315d93] text-white py-3 rounded-xl text-center font-bold">
                  Join Video Call
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </PhoneFrame>

      {/* Global burst effect and Final Logo */}
      <motion.div
        className="absolute inset-0 bg-[#315d93] flex flex-col items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut", delay: 3.0 }}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 3.5 }}
          className="flex flex-col items-center"
        >
          {/* Logo Mark */}
          <div className="w-24 h-24 bg-white rounded-3xl shadow-2xl flex items-center justify-center mb-8">
            <svg className="w-12 h-12 text-[#315d93]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
            </svg>
          </div>
          
          <h1 className="text-6xl font-display font-bold text-white tracking-tight mb-4">
            Pulse Health
          </h1>
          <p className="text-2xl text-blue-200 font-sans">
            The future of care is here.
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
