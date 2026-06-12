import { useState } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SignInForm from "../../components/ui/SignInForm";
import SignUpForm from "../../components/ui/SignUpForm";

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
        <SignInForm onSignUpClick={handleSignUpClick} />
      ) : (
        <SignUpForm onSignInClick={handleSignInClick} />
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

