import React, { useState, useCallback } from 'react';
import SignInForm from '../components/ui/SignInForm';
import SignUpForm from '../components/ui/SignUpForm';
import LandingPage from './landing/LandingPage';

type PageType = 'landing' | 'signin' | 'signup';

const MainPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('landing');
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);

  const handleLoginClick = useCallback(() => {
    setCurrentPage('signin');
  }, []);

  const handleSignUpClick = useCallback(() => {
    setCurrentPage('signup');
  }, []);

  const handleBackClick = useCallback(() => {
    setCurrentPage('landing');
  }, []);

  const handleSignInToSignUp = useCallback(() => {
    setSlideDirection('left');
    setTimeout(() => {
      setCurrentPage('signup');
      setTimeout(() => {
        setSlideDirection(null);
      }, 500);
    }, 50);
  }, []);

  const handleSignUpToSignIn = useCallback(() => {
    setSlideDirection('right');
    setTimeout(() => {
      setCurrentPage('signin');
      setTimeout(() => {
        setSlideDirection(null);
      }, 500);
    }, 50);
  }, []);

  const getPageContent = (page: PageType) => {
    switch (page) {
      case 'signin':
        return (
          <div className="w-full">
            <button
              onClick={handleBackClick}
              className="fixed top-6 left-6 z-50 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold transition"
            >
              ← Volver
            </button>
            <SignInForm onSignUpClick={handleSignInToSignUp} />
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
            <SignUpForm onSignInClick={handleSignUpToSignIn} />
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

  const getTransitionClasses = (page: PageType) => {
    const isCurrent = page === currentPage;
    const isPrevious = page === (slideDirection === 'left' ? 'signin' : slideDirection === 'right' ? 'signup' : null);
    
    // Slide transition between signin and signup
    if (slideDirection) {
      if (isCurrent) {
        return 'translate-x-0 opacity-100';
      }
      if (isPrevious) {
        return slideDirection === 'left' 
          ? '-translate-x-full opacity-0' 
          : 'translate-x-full opacity-0';
      }
      return 'opacity-0 pointer-events-none';
    }

    return isCurrent ? 'opacity-100' : 'opacity-0 pointer-events-none';
  };

  const isTransitioning = slideDirection !== null;

  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      {currentPage === 'landing' ? (
        <div className="relative">
          {getPageContent('landing')}
        </div>
      ) : null}
      {isTransitioning || currentPage === 'signin' ? (
        <div
          className={`${isTransitioning ? 'absolute inset-0' : 'relative'} transition-all duration-500 ease-in-out ${getTransitionClasses('signin')}`}
        >
          {getPageContent('signin')}
        </div>
      ) : null}
      {isTransitioning || currentPage === 'signup' ? (
        <div
          className={`${isTransitioning ? 'absolute inset-0' : 'relative'} transition-all duration-500 ease-in-out ${getTransitionClasses('signup')}`}
        >
          {getPageContent('signup')}
        </div>
      ) : null}
    </div>
  );
};

export default MainPage;

