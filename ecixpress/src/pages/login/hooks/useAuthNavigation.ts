import { useState } from "react";

export const useAuthNavigation = (initialIsLogin: boolean = true) => {
  const [isLogin, setIsLogin] = useState(initialIsLogin);

  const switchToLogin = () => setIsLogin(true);
  const switchToSignup = () => setIsLogin(false);

  return {
    isLogin,
    switchToLogin,
    switchToSignup,
  };
};

