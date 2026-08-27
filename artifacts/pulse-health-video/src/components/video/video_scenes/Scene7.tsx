import { motion } from 'framer-motion';
import { Home, Users, Activity, Layers, Settings2 } from 'lucide-react';

export function Scene7() {
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
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 border border-accent/50 text-orange-200 w-fit"
            >
              <Home size={16} />
              <span className="text-sm font-semibold tracking-wider uppercase">For Institutes</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, type: "spring" }}
              className="text-5xl font-display font-bold text-white leading-tight"
            >
              Manage complex operations with <span className="text-accent">complete clarity.</span>
            </motion.h2>
          </div>
        </div>

        {/* Dashboard Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 100, rotateX: 20 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ delay: 1, duration: 1.2, type: "spring", stiffness: 60 }}
          className="w-full bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-slate-700 p-8 shadow-2xl flex gap-8"
          style={{ perspective: 1200 }}
        >
          {/* Sidebar */}
          <div className="w-64 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-white mb-6">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <Home size={18} />
              </div>
              <span className="font-bold text-lg tracking-wide">PulseInstitute</span>
            </div>
            
            {[
              { icon: Activity, label: 'Live Capacity', active: true },
              { icon: Layers, label: 'Manage Services', active: false },
              { icon: Users, label: 'Staff Roster', active: false },
              { icon: Settings2, label: 'Facility Settings', active: false },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2 + (i * 0.1) }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                  item.active ? 'bg-accent/20 text-accent font-semibold' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </motion.div>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col gap-6">
            <div className="flex gap-6">
              {/* Stat Cards */}
              {[
                { label: "Available Beds", value: "42", trend: "High Availability", color: "text-secondary", bg: "bg-secondary/10", border: "border-secondary/20" },
                { label: "Emergency Status", value: "Accepting", trend: "Normal", color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
                { label: "Active Staff", value: "128", trend: "Fully Staffed", color: "text-accent", bg: "bg-accent/10", border: "border-accent/20" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.6 + (i * 0.15) }}
                  className={`flex-1 p-6 rounded-2xl border ${stat.border} ${stat.bg} backdrop-blur-md`}
                >
                  <p className="text-slate-400 text-sm font-medium mb-2">{stat.label}</p>
                  <div className="flex items-end justify-between">
                    <h3 className="text-3xl font-display font-bold text-white">{stat.value}</h3>
                    <span className={`text-xs font-bold ${stat.color} px-2 py-1 bg-black/20 rounded-full`}>{stat.trend}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* List / Graph Area */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 2.2 }}
              className="flex-1 rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6 flex flex-col gap-4"
            >
              <h4 className="font-bold text-white mb-2">Live Department Status</h4>
              <div className="flex-1 flex flex-col gap-3">
                {[
                  { dept: "Cardiology", status: "Available", load: "45%" },
                  { dept: "Neurology", status: "Busy", load: "85%" },
                  { dept: "Pediatrics", status: "Available", load: "30%" }
                ].map((row, i) => (
                  <motion.div
                    key={row.dept}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 2.4 + (i * 0.1) }}
                    className="h-16 w-full bg-slate-700/30 rounded-xl border border-slate-600/30 flex items-center px-6"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-600 mr-4 flex items-center justify-center">
                      <Activity size={20} className="text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-white text-sm">{row.dept}</p>
                      <p className="text-xs text-slate-400">Current load: {row.load}</p>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      row.status === 'Available' ? 'bg-secondary/20 text-secondary' : 'bg-orange-500/20 text-orange-500'
                    }`}>
                      {row.status}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
