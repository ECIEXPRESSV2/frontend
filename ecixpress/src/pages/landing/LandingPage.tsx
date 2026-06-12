import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/landing/Navbar';
import HeroSection from '../../components/landing/HeroSection';
import FeaturesSection from '../../components/landing/FeaturesSection';
import HowItWorksSection from '../../components/landing/HowItWorksSection';
import UniversityContextSection from '../../components/landing/UniversityContextSection';
import ModulesSection from '../../components/landing/ModulesSection';
import { CTAFinal, Footer } from '../../components/landing/CTASection';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleLoginClick = useCallback(() => {
    navigate('/signin');
  }, [navigate]);

  const handleSignUpClick = useCallback(() => {
    navigate('/signup');
  }, [navigate]);

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

        {/* Features Section */}
        <FeaturesSection />

        {/* How It Works */}
        <HowItWorksSection />

        {/* University Context */}
        <UniversityContextSection />

        {/* Modules */}
        <ModulesSection />

        {/* Final CTA */}
        <CTAFinal onSignUpClick={handleSignUpClick} />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage;


