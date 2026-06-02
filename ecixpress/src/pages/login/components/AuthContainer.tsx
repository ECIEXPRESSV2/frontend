import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMediaQuery } from "react-responsive";

interface AuthContainerProps {
  children: ReactNode;
  isLogin: boolean;
}

const AuthContainer = ({ children, isLogin }: AuthContainerProps) => {
  const isMobile = useMediaQuery({ maxWidth: 770 });

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-gray-50 to-white overflow-hidden">
      {/* Background Image Desktop */}
      <div className="absolute inset-0 hidden md:block">
        <img
          src="/SignInBackground.png"
          alt="Background"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Mobile Header Banner */}
      {isMobile && (
        <AnimatePresence mode="wait">
          <motion.div
            key={isLogin ? "login-banner" : "signup-banner"}
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative w-full h-[15vh] overflow-hidden"
          >
            <img
              src={isLogin ? "/LoginSignInBanner.png" : "/LoginSingUpBanner.png"}
              alt={isLogin ? "Login Banner" : "Sign Up Banner"}
              className="w-full h-full object-cover object-top"
            />
          </motion.div>
        </AnimatePresence>
      )}

      <div className="relative z-10 w-full h-screen md:h-auto flex flex-col md:grid md:grid-cols-2">
        {/* Left Panel - Desktop Only */}
        {!isMobile && (
          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? "login-panel" : "signup-panel"}
              initial={{
                x: isLogin ? -100 : 100,
                opacity: 0,
              }}
              animate={{
                x: 0,
                opacity: 1,
              }}
              exit={{
                x: isLogin ? 100 : -100,
                opacity: 0,
              }}
              transition={{
                duration: 0.5,
                ease: "easeInOut",
              }}
              className="relative overflow-hidden hidden md:flex items-center justify-center md:h-screen"
            >
              <img
                src={isLogin ? "/LoginSignInBanner.png" : "/LoginSingUpBanner.png"}
                alt={isLogin ? "Login Banner" : "Sign Up Banner"}
                className="w-full h-full object-cover"
              />
            </motion.div>
          </AnimatePresence>
        )}

        {/* Right Panel - Form */}
        <motion.div
          className={`w-full flex-1 md:flex-none flex items-center justify-center px-4 py-8 md:py-0 md:h-screen ${
            !isLogin ? "md:order-1" : "md:order-2"
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <AnimatePresence mode="wait">{children}</AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthContainer;

