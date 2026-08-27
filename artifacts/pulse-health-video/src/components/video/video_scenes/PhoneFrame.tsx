import { motion, HTMLMotionProps } from 'framer-motion';

interface PhoneFrameProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
}

export function PhoneFrame({ children, className = "", ...props }: PhoneFrameProps) {
  return (
    <motion.div
      className={`relative w-[360px] h-[780px] bg-white rounded-[3rem] border-[12px] border-[#0f172a] shadow-2xl overflow-hidden flex flex-col ${className}`}
      {...props}
    >
      {/* Dynamic Island / Notch */}
      <div className="absolute top-0 inset-x-0 h-7 flex justify-center z-50 pointer-events-none">
        <div className="w-28 h-7 bg-[#0f172a] rounded-b-2xl" />
      </div>
      
      {/* Screen Content */}
      <div className="flex-1 relative overflow-hidden bg-[#F8FAFC]">
        {children}
      </div>

      {/* Home Indicator */}
      <div className="absolute bottom-2 inset-x-0 flex justify-center z-50 pointer-events-none">
        <div className="w-32 h-1 bg-black/20 rounded-full" />
      </div>
    </motion.div>
  );
}
