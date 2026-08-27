import { motion } from 'framer-motion';
import { PhoneFrame } from './PhoneFrame';

const ease = [0.16, 1, 0.3, 1] as const;

export function Scene3() {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -50, filter: 'blur(10px)' }}
      transition={{ duration: 1, ease }}
    >
      {/* Background Typography */}
      <motion.div 
        className="absolute right-16 top-1/2 -translate-y-1/2 max-w-sm hidden lg:block text-right"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, ease }}
      >
        <h2 className="text-4xl font-display font-bold text-white mb-4">
          Book in <span className="text-[#D97706]">Seconds</span>
        </h2>
        <p className="text-lg text-slate-300">
          Choose your service type and confirm. Submit your payment securely.
        </p>
      </motion.div>

      <PhoneFrame
        initial={{ scale: 1 }}
        animate={{ scale: 0.95 }}
        transition={{ duration: 11, ease: "linear" }}
      >
        <motion.div
          className="w-full h-full bg-[#F4F7FB] flex flex-col relative"
          initial={{ x: 0 }}
          animate={{ x: 0 }}
        >
          {/* Header */}
          <div className="bg-[#202937] pt-14 pb-5 px-5 flex items-center gap-4 shadow-sm z-10">
            <div className="w-8 h-8 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </div>
            <div className="text-white text-lg font-bold">Book Consultation</div>
          </div>

          <div className="flex-1 overflow-hidden px-5 py-6 space-y-6">
            
            {/* Consultation Type */}
            <div>
              <div className="text-sm font-bold text-[#202937] mb-3">Consultation Type</div>
              <div className="flex gap-2">
                <div className="flex-1 bg-white border-2 border-[#315d93] rounded-xl p-2 flex flex-col items-center gap-1">
                  <svg className="w-5 h-5 text-[#315d93]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <div className="text-[10px] font-bold text-[#315d93] text-center">Video Consultation</div>
                </div>
                <div className="flex-1 bg-white border border-slate-200 rounded-xl p-2 flex flex-col items-center gap-1 opacity-60">
                  <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <div className="text-[10px] font-medium text-slate-600 text-center">Phone / Audio</div>
                </div>
                <div className="flex-1 bg-white border border-slate-200 rounded-xl p-2 flex flex-col items-center gap-1 opacity-60">
                  <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <div className="text-[10px] font-medium text-slate-600 text-center">Home Care</div>
                </div>
              </div>
            </div>

            {/* Date Time */}
            <div>
              <div className="text-sm font-bold text-[#202937] mb-3">Date & Time</div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#315d93]/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#315d93]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#202937]">Today</div>
                    <div className="text-xs text-slate-500">10:00 AM</div>
                  </div>
                </div>
                <div className="text-[#315d93] text-sm font-bold">Edit</div>
              </div>
            </div>

            {/* Payment */}
            <div>
              <div className="text-sm font-bold text-[#202937] mb-3">Payment</div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-sm text-slate-600">Booking Summary</div>
                  <div className="text-xs text-[#315d93] font-bold">Select Payment Method</div>
                </div>
                
                {/* Method mock */}
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200 mb-3">
                  <div className="text-xs font-bold text-[#202937]">Telebirr</div>
                  <div className="w-3 h-3 rounded-full border-2 border-[#059669] bg-[#059669] flex items-center justify-center">
                    <div className="w-1 h-1 bg-white rounded-full" />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                  <div className="text-sm font-bold text-[#202937]">Total Amount</div>
                  <div className="text-lg font-bold text-[#059669]">ETB 1,500</div>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom CTA */}
          <div className="absolute bottom-0 inset-x-0 p-5 bg-white border-t border-slate-100">
            <motion.div 
              className="w-full bg-[#315d93] h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              animate={{ scale: [1, 0.95, 1] }}
              transition={{ delay: 3.8, duration: 0.3 }}
            >
              Submit Payment Proof
            </motion.div>
          </div>
          
          {/* Success Overlay (Pending Approval) */}
          <motion.div 
            className="absolute inset-0 bg-white z-20 flex flex-col items-center justify-center p-8 text-center"
            initial={{ y: "100%" }}
            animate={{ y: ["100%", "0%", "0%"] }}
            transition={{ times: [0, 0.1, 1], duration: 6, delay: 4.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="w-16 h-16 bg-[#059669]/10 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-[#202937] mb-2">Payment Submitted Successfully</h3>
            <p className="text-sm text-slate-600 mb-2">
              Your payment proof has been sent for verification. Your appointment is currently Pending Approval.
            </p>
            <p className="text-xs text-slate-500 mb-6 italic">
              You will be notified once admin confirms payment.
            </p>
            
            <div className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
              <div className="flex justify-between items-center mb-1">
                <div className="text-sm font-bold text-[#202937]">Video Consultation</div>
                <div className="text-[10px] font-bold text-[#D97706] bg-[#D97706]/10 px-2 py-0.5 rounded uppercase">Pending Verification</div>
              </div>
              <div className="text-xs text-slate-500 text-left">Today • 10:00 AM</div>
            </div>
            
            <div className="w-full border-2 border-[#315d93] text-[#315d93] h-12 rounded-xl flex items-center justify-center font-bold">
              View Appointments
            </div>
          </motion.div>
        </motion.div>

        {/* Cursors */}
        <motion.div
          className="absolute z-50 pointer-events-none"
          initial={{ x: 180, y: 750, opacity: 0 }}
          animate={{ y: [750, 680, 680, 750], opacity: [0, 1, 1, 0] }}
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
