import React, { useState, useCallback } from 'react';
import SignInForm from '../components/ui/SignInForm';
import SignUpForm from '../components/ui/SignUpForm';
import LandingPage from './landing/LandingPage';
import Home from './home/Home';
import StoreDetail from './store/StoreDetail';
import UserProfile from './user/UserProfile';
import CartPage from './cart/CartPage';
import BackendDemoPage from './demo/BackendDemoPage';

type PageType = 'landing' | 'signin' | 'signup' | 'home' | 'store-detail' | 'profile' | 'cart' | 'backend-demo';

const MainPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('landing');
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [currentStoreId, setCurrentStoreId] = useState<number | null>(null);
  const [demoInitialTab, setDemoInitialTab] = useState<'orders' | 'messages'>('orders');

  const handleLoginClick = useCallback(() => {
    setCurrentPage('signin');
  }, []);

  const handleSignUpClick = useCallback(() => {
    setCurrentPage('signup');
  }, []);

  const handleBackClick = useCallback(() => {
    setCurrentPage('landing');
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setCurrentPage('home');
  }, []);

  const handleSignUpSuccess = useCallback(() => {
    setCurrentPage('home');
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

  const handleStoreClick = useCallback((storeId: number) => {
    setCurrentStoreId(storeId);
    setCurrentPage('store-detail');
  }, []);

  const handleStoreDetailBack = useCallback(() => {
    setCurrentPage('home');
    setCurrentStoreId(null);
  }, []);

  const handleProfileClick = useCallback(() => {
    setCurrentPage('profile');
  }, []);

  const handleProfileBack = useCallback(() => {
    setCurrentPage('home');
  }, []);

  const handleCartClick = useCallback(() => {
    setCurrentPage('cart');
  }, []);

  const handleCartBack = useCallback(() => {
    setCurrentPage('home');
  }, []);

  const handleCartContinue = useCallback(() => {
    // Navigate to payment page (to be implemented)
    console.log('Navigate to payment');
  }, []);

  const handleOpenOrdersDemo = useCallback(() => {
    setDemoInitialTab('orders');
    setCurrentPage('backend-demo');
  }, []);

  const handleOpenMessagesDemo = useCallback(() => {
    setDemoInitialTab('messages');
    setCurrentPage('backend-demo');
  }, []);

  const handleDemoBack = useCallback(() => {
    setCurrentPage('home');
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
            <SignInForm onSignUpClick={handleSignInToSignUp} onLoginSuccess={handleLoginSuccess} />
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
            <SignUpForm onSignInClick={handleSignUpToSignIn} onSignUpSuccess={handleSignUpSuccess} />
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
      case 'home':
        return (
          <Home
            onStoreClick={handleStoreClick}
            onUserClick={handleProfileClick}
            onCartClick={handleCartClick}
            onOrdersClick={handleOpenOrdersDemo}
            onMessagesClick={handleOpenMessagesDemo}
          />
        );
      case 'store-detail':
        return currentStoreId !== null ? (
          <StoreDetail
            storeId={currentStoreId}
            onBack={handleStoreDetailBack}
            onOrdersClick={handleOpenOrdersDemo}
            onMessagesClick={handleOpenMessagesDemo}
          />
        ) : null;
      case 'profile':
        return <UserProfile onBack={handleProfileBack} />;
      case 'cart':
        return (
          <CartPage
            onBack={handleCartBack}
            onContinue={handleCartContinue}
            onOrdersClick={handleOpenOrdersDemo}
            onMessagesClick={handleOpenMessagesDemo}
          />
        );
      case 'backend-demo':
        return <BackendDemoPage onBack={handleDemoBack} initialTab={demoInitialTab} />;
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
      {currentPage === 'home' ? (
        <div className="relative">
          {getPageContent('home')}
        </div>
      ) : null}
      {currentPage === 'store-detail' ? (
        <div className="relative">
          {getPageContent('store-detail')}
        </div>
      ) : null}
      {currentPage === 'profile' ? (
        <div className="relative">
          {getPageContent('profile')}
        </div>
      ) : null}
      {currentPage === 'cart' ? (
        <div className="relative">
          {getPageContent('cart')}
        </div>
      ) : null}
      {currentPage === 'backend-demo' ? (
        <div className="relative">
          {getPageContent('backend-demo')}
        </div>
      ) : null}
    </div>
  );
};

export default MainPage;

