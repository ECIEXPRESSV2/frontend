import React, { useState, useCallback } from 'react';
import SignInForm from '../components/ui/SignInForm';
import SignUpForm from '../components/ui/SignUpForm';
import LandingPage from './landing/LandingPage';

type PageType = 'landing' | 'signin' | 'signup';

const MainPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('landing');

  const handleLoginClick = useCallback(() => {
    setCurrentPage('signin');
  }, []);

  const handleSignUpClick = useCallback(() => {
    setCurrentPage('signup');
  }, []);

  const handleBackClick = useCallback(() => {
    setCurrentPage('landing');
  }, []);

  switch (currentPage) {
    case 'signin':
      return (
        <div className="w-full">
          <button
            onClick={handleBackClick}
            className="fixed top-6 left-6 z-50 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold transition"
          >
            ← Volver
          </button>
          <SignInForm onSignUpClick={handleSignUpClick} />
        </div>
      );
    case 'signup':
      return (
        <div className="w-full">
          <button
            onClick={handleBackClick}
            className="fixed top-6 left-6 z-50 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold transition"
          >
            ← Volver
          </button>
          <SignUpForm onSignInClick={handleLoginClick} />
        </div>
      );
    case 'landing':
    default:
      return (
        <LandingPage
          onNavigateToLogin={handleLoginClick}
          onNavigateToSignUp={handleSignUpClick}
        />
      );
  }
};

export default MainPage;

