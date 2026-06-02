import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuthNavigation } from "./hooks/useAuthNavigation";
import { useLogin } from "./hooks/useLogin";
import { useSignUp } from "./hooks/useSignUp";
import AuthContainer from "./components/AuthContainer";
import LoginForm from "./components/LoginForm";
import SignUpForm from "./components/SignUpForm";

const Auth = () => {
  const { isLogin, switchToLogin, switchToSignup } = useAuthNavigation(true);
  const loginProps = useLogin();
  const signupProps = useSignUp();

  return (
    <>
      <AuthContainer isLogin={isLogin}>
        {isLogin ? (
          <LoginForm
            {...loginProps}
            onSwitchToSignup={switchToSignup}
          />
        ) : (
          <SignUpForm
            {...signupProps}
            onSwitchToLogin={switchToLogin}
          />
        )}
      </AuthContainer>

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

