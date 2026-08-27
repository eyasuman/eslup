import { motion } from 'framer-motion';
import { Star, ArrowRight, Video, Navigation } from 'lucide-react';

export function Scene4() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.8, ease: "circOut" }}
      className="absolute inset-0 flex items-center justify-center z-10 w-full h-full"
    >
      <div className="w-[80vw] max-w-[1200px] flex items-center gap-16">
        
        {/* Left Side: Mockup Card expanding from previous scene's concept */}
        <div className="flex-1 relative flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 80 }}
            className="w-full max-w-[420px] bg-white rounded-[32px] p-8 shadow-2xl flex flex-col gap-6"
          >
            <div className="flex items-center gap-6">
              <div 
                className="w-24 h-24 rounded-full bg-slate-200 bg-cover bg-center shadow-inner"
                style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/doctor.jpg)` }}
              />
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-slate-900">Dr. Sarah Jenkins</h3>
                <p className="text-primary font-medium text-lg">Cardiology</p>
                <div className="flex items-center gap-1 mt-1 text-slate-500">
                  <Star size={16} className="text-accent fill-accent" />
                  <span className="font-semibold text-slate-700">4.9</span>
                  <span>(128 reviews)</span>
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-slate-100" />

            <div>
              <p className="text-slate-500 font-medium mb-3">Available Times - Today</p>
              <div className="flex gap-3">
                <div className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold border border-slate-200">10:00 AM</div>
                <div className="px-4 py-2 rounded-xl bg-primary/10 text-primary font-bold border border-primary/30 ring-2 ring-primary/20">11:30 AM</div>
                <div className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold border border-slate-200">2:15 PM</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-4">
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-lg flex items-center justify-center gap-3 shadow-lg shadow-primary/30"
              >
                <Video size={20} />
                Book Video Consult
              </motion.button>
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
                className="w-full py-4 rounded-2xl bg-slate-100 text-slate-700 font-bold text-lg flex items-center justify-center gap-3"
              >
                <Navigation size={20} />
                Book In-Person
              </motion.button>
            </div>
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
            Book with <span className="text-primary">confidence.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, type: "spring", stiffness: 100 }}
            className="text-2xl text-blue-100/80 font-sans max-w-lg leading-relaxed"
          >
            View detailed profiles, verify credentials, check real-time availability, and seamlessly book your appointment.
          </motion.p>
        </div>

      </div>
    </motion.div>
  );
}
