import React from 'react';
import { LandingPage } from './LandingPage';

interface SplashDisclaimerModalProps {
  onAccept: () => void;
}

export const SplashDisclaimerModal: React.FC<SplashDisclaimerModalProps> = ({ onAccept }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 text-white overflow-hidden">
      <LandingPage
        appName="True Love Connect"
        onGetStarted={onAccept}
        onGoToDashboard={onAccept}
      />
    </div>
  );
};
