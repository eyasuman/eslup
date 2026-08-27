import { motion } from 'framer-motion';
import { PhoneFrame } from './PhoneFrame';

const ease = [0.16, 1, 0.3, 1] as const;

export function Scene2() {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: "-50%", filter: 'blur(10px)' }}
      transition={{ duration: 1, ease }}
    >
      <PhoneFrame
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "linear" }}
      >
        <motion.div
          className="w-[200%] h-full flex"
          initial={{ x: "0%" }}
          animate={{ x: "-50%" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 3 }}
        >
          {/* View 1: Specialist List */}
          <div className="w-1/2 h-full bg-[#F4F7FB] flex flex-col">
            {/* Header */}
            <div className="bg-[#202937] pt-14 pb-5 px-5 flex items-center gap-4">
              <div className="w-8 h-8 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </div>
              <div className="text-white text-lg font-bold">Doctors</div>
            </div>

            {/* Sort Row */}
            <div className="px-5 py-3 flex gap-2 overflow-hidden">
              <div className="bg-white border border-[#315d93] px-4 py-1.5 rounded-full text-[#315d93] text-sm font-medium">Experience</div>
              <div className="bg-white border border-slate-200 px-4 py-1.5 rounded-full text-slate-600 text-sm font-medium">Price</div>
              <div className="bg-white border border-slate-200 px-4 py-1.5 rounded-full text-slate-600 text-sm font-medium">Distance</div>
            </div>

            {/* List */}
            <div className="flex-1 px-5 pt-2 space-y-4">
              {/* Doctor Card */}
              <motion.div 
                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4 relative overflow-hidden"
                whileHover={{ scale: 0.98 }}
              >
                <motion.div 
                  className="absolute inset-0 bg-slate-100/50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ delay: 3.8, duration: 0.3 }}
                />
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-200 relative">
                  <img src={`${import.meta.env.BASE_URL}images/dr-chen.jpg`} alt="Dr. Chen" className="w-full h-full object-cover" />
                  <div className="absolute top-1 right-1 w-3 h-3 bg-[#059669] border-2 border-white rounded-full" />
                </div>
                <div className="flex-1">
                  <div className="text-[#202937] font-bold text-base">Dr. Michael Chen</div>
                  <div className="text-[#315d93] text-sm font-medium mb-1">Cardiologist</div>
                  <div className="text-xs text-slate-500 mb-2">Addis Ababa • 15 years exp</div>
                  <div className="flex justify-between items-end">
                    <div className="flex gap-1">
                      <span className="px-2 py-0.5 bg-blue-50 text-[#315d93] rounded text-[10px] font-bold">Video</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-[#315d93] rounded text-[10px] font-bold">In-Person</span>
                    </div>
                    <div className="text-sm font-bold text-[#059669]">ETB 1,500</div>
                  </div>
                </div>
              </motion.div>
              
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4 opacity-50">
                <div className="w-20 h-20 rounded-xl bg-slate-200" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-1/4 mt-4" />
                </div>
              </div>
            </div>
          </div>

          {/* View 2: Provider Detail */}
          <div className="w-1/2 h-full bg-white flex flex-col relative">
            <div className="h-64 relative bg-slate-200">
              <img src={`${import.meta.env.BASE_URL}images/dr-chen.jpg`} alt="Dr. Chen" className="w-full h-full object-cover" />
              <div className="absolute top-14 left-5 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </div>
            </div>

            <div className="px-5 pt-6 pb-4">
              <div className="text-2xl font-bold text-[#202937] mb-1">Dr. Michael Chen</div>
              <div className="text-[#315d93] font-medium mb-4">Cardiologist • City General</div>
              
              {/* Tabs */}
              <div className="flex border-b border-slate-200 mb-5">
                <div className="pb-2 border-b-2 border-[#315d93] flex-1 text-center text-[#315d93] font-bold text-sm">Profile</div>
                <div className="pb-2 border-b-2 border-transparent flex-1 text-center text-slate-500 font-medium text-sm">Services</div>
                <div className="pb-2 border-b-2 border-transparent flex-1 text-center text-slate-500 font-medium text-sm">Reviews</div>
              </div>

              <div className="text-sm text-slate-600 leading-relaxed">
                Expert in general cardiology with over 15 years of experience treating cardiovascular conditions and providing preventive care.
              </div>

              <div className="mt-6 flex gap-4">
                <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                  <div className="text-lg font-bold text-[#202937]">15+</div>
                  <div className="text-xs text-slate-500">Years Exp</div>
                </div>
                <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                  <div className="text-lg font-bold text-[#202937]">2</div>
                  <div className="text-xs text-slate-500">Languages</div>
                </div>
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="absolute bottom-0 inset-x-0 p-5 bg-white border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between items-center mb-4">
                <div className="text-slate-500 text-sm">Consultation Fee</div>
                <div className="text-xl font-bold text-[#059669]">ETB 1,500</div>
              </div>
              <motion.div 
                className="w-full bg-[#315d93] h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                animate={{ scale: [1, 0.95, 1] }}
                transition={{ delay: 8.8, duration: 0.3 }}
              >
                Book Now
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Cursors */}
        <motion.div
          className="absolute z-50 pointer-events-none"
          initial={{ x: 100, y: 500, opacity: 0 }}
          animate={{ 
            x: [100, 160, 160, 160, 180, 180], 
            y: [500, 320, 320, 320, 680, 680], 
            opacity: [0, 1, 1, 0, 0, 1, 1, 0] 
          }}
          transition={{ 
            duration: 7, 
            times: [0, 0.2, 0.35, 0.4, 0.45, 0.8, 0.95, 1],
            ease: "easeInOut",
            delay: 0.5 
          }}
        >
          <div className="w-12 h-12 rounded-full bg-white/20 shadow-2xl flex items-center justify-center backdrop-blur-sm border border-white/50">
            <div className="w-4 h-4 bg-white rounded-full shadow-inner" />
          </div>
        </motion.div>

      </PhoneFrame>
    </motion.div>
  );
}
