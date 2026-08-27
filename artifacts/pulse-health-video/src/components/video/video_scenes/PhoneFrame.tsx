import { motion, HTMLMotionProps } from 'framer-motion';

interface PhoneFrameProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
}

export function PhoneFrame({ children, className = "", ...props }: PhoneFrameProps) {
  return (
    <motion.div
      className={`absolute inset-0 bg-white overflow-hidden flex flex-col ${className}`}
      {...props}
    >
      {/* Subtle Notch for realism */}
      <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-50 pointer-events-none">
        <div className="w-24 h-6 bg-black rounded-b-2xl shadow-sm" />
      </div>
      
      {/* Screen Content */}
      <div className="flex-1 relative overflow-hidden bg-[#F8FAFC]">
        {children}
      </div>

      {/* Home Indicator */}
      <div className="absolute bottom-1 inset-x-0 flex justify-center z-50 pointer-events-none">
        <div className="w-32 h-1 bg-black/30 rounded-full" />
      </div>
      
      {/* Subtle edge overlay to sell the device feel without thick borders */}
      <div className="absolute inset-0 pointer-events-none border-[3px] border-black/10 rounded-[2.5rem] mix-blend-overlay z-50" />
    </motion.div>
  );
}
