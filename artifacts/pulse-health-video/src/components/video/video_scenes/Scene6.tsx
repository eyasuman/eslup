import { motion } from 'framer-motion';
import { ActivitySquare, CheckCircle2, LayoutDashboard, Calendar, Video, FileText } from 'lucide-react';

export function Scene6() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.8 }}
      className="absolute inset-0 flex flex-col items-center justify-center z-10 w-full h-full"
    >
      <div className="w-[90vw] max-w-[1400px] flex flex-col gap-12">
        
        {/* Header Copy */}
        <div className="flex justify-between items-end">
          <div className="flex flex-col gap-4 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/20 border border-secondary/50 text-green-200 w-fit"
            >
              <ActivitySquare size={16} />
              <span className="text-sm font-semibold tracking-wider uppercase">For Providers</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, type: "spring" }}
              className="text-5xl font-display font-bold text-white leading-tight"
            >
              Frictionless <span className="text-secondary">onboarding.</span><br/>
              Powerful management.
            </motion.h2>
          </div>
        </div>

        <div className="flex gap-8 items-stretch h-[500px]">
          
          {/* Onboarding Flow Mockup */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1, type: "spring" }}
            className="w-80 bg-white rounded-3xl p-6 shadow-2xl flex flex-col"
          >
            <h3 className="text-xl font-bold text-slate-900 mb-6">Verification</h3>
            
            <div className="flex flex-col gap-4 relative">
              <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-slate-200" />
              
              {[
                { title: 'Identity Verified', status: 'done' },
                { title: 'Medical License Uploaded', status: 'done' },
                { title: 'Board Certification', status: 'active' },
              ].map((step, i) => (
                <div key={step.title} className="flex gap-4 relative z-10">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.5 + (i * 0.3), type: "spring" }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                      step.status === 'done' ? 'bg-secondary text-white' : 
                      step.status === 'active' ? 'bg-primary text-white ring-4 ring-primary/20' : 
                      'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {step.status === 'done' ? <CheckCircle2 size={24} /> : <FileText size={20} />}
                  </motion.div>
                  <div className="pt-2">
                    <p className={`font-bold ${step.status === 'done' ? 'text-slate-900' : 'text-slate-700'}`}>{step.title}</p>
                    <p className="text-sm text-slate-500">{step.status === 'done' ? 'Completed' : 'Processing...'}</p>
                  </div>
                </div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 3 }}
              className="mt-auto bg-green-50 text-green-700 p-4 rounded-2xl border border-green-200 flex gap-3 items-center"
            >
              <CheckCircle2 size={24} className="text-secondary shrink-0" />
              <div>
                <p className="font-bold text-sm">Account Approved!</p>
                <p className="text-xs">You can now see patients.</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Provider Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2, type: "spring" }}
            className="flex-1 bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-slate-700 p-6 shadow-2xl flex flex-col gap-6"
          >
            <div className="flex items-center gap-4 border-b border-slate-700 pb-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                <LayoutDashboard size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Provider Dashboard</h3>
                <p className="text-sm text-slate-400">Welcome back, Dr. Jenkins</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 bg-primary/10 border border-primary/20 rounded-2xl p-5">
                <Calendar size={24} className="text-primary mb-2" />
                <p className="text-3xl font-display font-bold text-white">8</p>
                <p className="text-slate-400 text-sm">Appointments Today</p>
              </div>
              <div className="flex-1 bg-secondary/10 border border-secondary/20 rounded-2xl p-5">
                <Video size={24} className="text-secondary mb-2" />
                <p className="text-3xl font-display font-bold text-white">3</p>
                <p className="text-slate-400 text-sm">Active Waiting Room</p>
              </div>
            </div>

            <div className="flex-1 bg-slate-800/50 rounded-2xl border border-slate-700/50 p-5">
               <h4 className="font-bold text-white mb-4">Upcoming Schedule</h4>
               <div className="flex flex-col gap-3">
                 {[1, 2].map((i) => (
                   <div key={i} className="bg-slate-700/30 rounded-xl p-3 flex justify-between items-center border border-slate-600/30">
                     <div className="flex items-center gap-3">
                       <div className="w-2 h-10 rounded-full bg-primary" />
                       <div>
                         <p className="font-bold text-white text-sm">Video Consult - John D.</p>
                         <p className="text-slate-400 text-xs">10:00 AM • Follow up</p>
                       </div>
                     </div>
                     <button className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg">Join</button>
                   </div>
                 ))}
               </div>
            </div>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
}
