import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/landing/Navbar';
import HeroSection from '../../components/landing/HeroSection';
import SocialProofSection from '../../components/landing/SocialProofSection';
import FeaturesSection from '../../components/landing/FeaturesSection';
import FoodShowcaseSection from '../../components/landing/FoodShowcaseSection';
import HowItWorksSection from '../../components/landing/HowItWorksSection';
import WalletShowcaseSection from '../../components/landing/WalletShowcaseSection';
import CampusMapSection from '../../components/landing/CampusMapSection';
import FAQSection from '../../components/landing/FAQSection';
import { CTAFinal, Footer } from '../../components/landing/CTASection';

interface LandingPageProps {
  onNavigateToLogin?: () => void;
  onNavigateToSignUp?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToLogin, onNavigateToSignUp }) => {
  const navigate = useNavigate();

  const handleLoginClick = useCallback(() => {
    onNavigateToLogin?.() ?? navigate('/signin');
  }, [navigate, onNavigateToLogin]);

  const handleSignUpClick = useCallback(() => {
    onNavigateToSignUp?.() ?? navigate('/signup');
  }, [navigate, onNavigateToSignUp]);

  const handleGetStartedClick = useCallback(() => {
    handleSignUpClick();
  }, [handleSignUpClick]);

  return (
    <div className="w-full min-h-screen bg-white">
      {/* Navigation */}
      <Navbar onLoginClick={handleLoginClick} onSignUpClick={handleSignUpClick} />

      {/* Main Content */}
      <main className="w-full">
        {/* Hero Section */}
        <HeroSection
          onGetStartedClick={handleGetStartedClick}
          onSignInClick={handleLoginClick}
        />

        {/* How It Works */}
        <HowItWorksSection />

        {/* Social Proof Section */}
        <SocialProofSection />

        {/* Features Section */}
        <FeaturesSection />

        {/* Food Showcase - decorative carousel */}
        <FoodShowcaseSection />

        {/* Wallet Showcase */}
        <WalletShowcaseSection />

        {/* Campus 3D Map */}
        <CampusMapSection />

        {/* FAQ Section */}
        <FAQSection />

        {/* Final CTA */}
        <CTAFinal onSignUpClick={handleSignUpClick} />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage;

