import { useState } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ModernSignIn from "../../components/ui/ModernSignIn";
import ModernSignUp from "../../components/ui/ModernSignUp";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);

  const handleSignUpClick = () => {
    setIsLogin(false);
  };

  const handleSignInClick = () => {
    setIsLogin(true);
  };

  return (
    <>
      {isLogin ? (
        <ModernSignIn onSignUpClick={handleSignUpClick} />
      ) : (
        <ModernSignUp onSignInClick={handleSignInClick} />
      )}

      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
};

export default Auth;

