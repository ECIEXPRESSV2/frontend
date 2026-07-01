import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/landing/Navbar';
import HeroSection from '../../components/landing/HeroSection';
import SocialProofSection from '../../components/landing/SocialProofSection';
import FeaturesSection from '../../components/landing/FeaturesSection';
import HowItWorksSection from '../../components/landing/HowItWorksSection';
import WalletShowcaseSection from '../../components/landing/WalletShowcaseSection';
import UniversityContextSection from '../../components/landing/UniversityContextSection';
import ModulesSection from '../../components/landing/ModulesSection';
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
    console.log('Get started clicked');
    // Scroll to signup section or redirect
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

        {/* Social Proof Section */}
        <SocialProofSection />

        {/* Features Section */}
        <FeaturesSection />

        {/* How It Works */}
        <HowItWorksSection />

        {/* Wallet Showcase */}
        <WalletShowcaseSection />

        {/* University Context */}
        <UniversityContextSection />

        {/* Modules */}
        <ModulesSection />

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

