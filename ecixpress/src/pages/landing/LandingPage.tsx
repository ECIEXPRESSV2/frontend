import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/landing/Navbar';
import HeroSection from '../../components/landing/HeroSection';
import FeaturesSection from '../../components/landing/FeaturesSection';
import CampusMapSection from '../../components/landing/CampusMapSection';
import FoodShowcaseSection from '../../components/landing/FoodShowcaseSection';
import HowItWorksSection from '../../components/landing/HowItWorksSection';
import WalletShowcaseSection from '../../components/landing/WalletShowcaseSection';
import SocialProofSection from '../../components/landing/SocialProofSection';
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
        {/* Hero Section — el gancho inicial */}
        <HeroSection
          onGetStartedClick={handleGetStartedClick}
          onSignInClick={handleLoginClick}
        />

        {/* ¿Por qué ECIXPRESS? — la propuesta de valor justo después del hero */}
        <FeaturesSection />

        {/* Campus 3D Map — el elemento más llamativo/interactivo, aprovecha el enganche inicial */}
        <CampusMapSection />

        {/* Food Showcase - carrusel visual de comida, mantiene el atractivo */}
        <FoodShowcaseSection />

        {/* How It Works — ya enganchados, ahora se explica el proceso */}
        <HowItWorksSection />

        {/* Wallet Showcase — profundiza en el feature de pagos */}
        <WalletShowcaseSection />

        {/* Social Proof Section — confianza/testimonios antes de pedir la conversión */}
        <SocialProofSection />

        {/* FAQ Section — resuelve objeciones justo antes del CTA final */}
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

