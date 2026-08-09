import React, { useState, useEffect } from 'react';
import { Heart, Sparkles, ChevronLeft, ChevronRight, ShieldCheck, Lock, ArrowRight, UserCheck } from 'lucide-react';

interface LandingPageProps {
  appName?: string;
  siteLogo?: string;
  onGetStarted: () => void;
  onAdminLogin?: () => void;
  currentUser?: any;
  onGoToDashboard?: () => void;
}

const WEDDING_SLIDES = [
  {
    url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1920&q=85',
    title: 'Where Two Souls Become One',
    subtitle: 'Begin your magical journey towards a lifetime of love, trust, and togetherness.',
    tag: 'Traditional & Modern Matrimony'
  },
  {
    url: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=1920&q=85',
    title: 'Find Your Perfect Match',
    subtitle: 'Thousands of verified profiles waiting to connect with their genuine soulmate.',
    tag: '100% Verified Members'
  },
  {
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1920&q=85',
    title: 'Celebration of Eternal Bonds',
    subtitle: 'Empowering families and individuals to build lifelong, happy relationships.',
    tag: 'Blessed New Beginnings'
  },
  {
    url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1920&q=85',
    title: 'Build Your Beautiful Tomorrow',
    subtitle: 'Complete privacy, dignity, and true compatibility matched with utmost care.',
    tag: 'Royal Matrimony Experience'
  },
  {
    url: 'https://images.unsplash.com/photo-1545232979-fbf34f5ce947?auto=format&fit=crop&w=1920&q=85',
    title: 'Sacred Unity & Happy Families',
    subtitle: 'Connecting hearts with trust, authenticity, and cultural harmony.',
    tag: 'True Love Connect'
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({
  appName = 'True Love Connect',
  siteLogo,
  onGetStarted,
  onAdminLogin,
  currentUser,
  onGoToDashboard,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-play background slide show every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % WEDDING_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % WEDDING_SLIDES.length);
  };

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + WEDDING_SLIDES.length) % WEDDING_SLIDES.length);
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-white font-sans overflow-hidden flex flex-col justify-between selection:bg-rose-600 selection:text-white">
      
      {/* 1. DYNAMIC BACKGROUND SLIDER (FULL SCREEN ELEGANT WEDDING PHOTOS) */}
      <div className="absolute inset-0 z-0 overflow-hidden select-none">
        {WEDDING_SLIDES.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? 'opacity-100 scale-105' : 'opacity-0 scale-100'
            } transition-transform duration-[9000ms] ease-out`}
          >
            <img
              src={slide.url}
              alt={slide.title}
              className="w-full h-full object-cover object-center filter brightness-90 contrast-105"
            />
          </div>
        ))}

        {/* VIBRANT DEEP RED & GOLDEN GRADIENT OVERLAY (NO HEAVY CARDS, JUST SMOOTH ATMOSPHERIC LIGHT) */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-rose-950/50 to-slate-950/90 pointer-events-none" />
        <div className="absolute inset-0 bg-radial-vignette opacity-70 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35rem] h-[35rem] bg-rose-600/20 rounded-full blur-[150px] pointer-events-none" />
      </div>

      {/* 2. PROMINENT HEADER WITH WEBSITE NAME 'True Love Connect' (MINIMALIST, NO NAVIGATION MENU) */}
      <header className="relative z-20 w-full pt-5 pb-3 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Prominent Website Name / Brand Logo */}
          <div className="flex items-center space-x-3.5 mx-auto sm:mx-0">
            {siteLogo ? (
              <img
                src={siteLogo}
                alt={appName}
                className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl object-cover border-2 border-amber-400/80 shadow-2xl shadow-rose-950/60 transform hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-tr from-rose-700 via-rose-600 to-amber-500 p-0.5 shadow-2xl shadow-rose-900/60 flex items-center justify-center transform hover:scale-105 transition-transform border border-amber-300/60">
                <div className="w-full h-full bg-slate-950/90 rounded-[14px] flex items-center justify-center">
                  <Heart className="w-6 h-6 sm:w-7 sm:h-7 text-amber-300 fill-amber-400/40 animate-pulse" />
                </div>
              </div>
            )}

            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight font-serif bg-gradient-to-r from-amber-200 via-amber-400 to-rose-300 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(245,158,11,0.4)]">
                {appName}
              </h1>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.22em] text-amber-300/90 flex items-center justify-center sm:justify-start gap-1">
                <span>✦</span> Royal Matrimonial Portal <span>✦</span>
              </p>
            </div>
          </div>

          {/* Unobtrusive Admin / Portal Quick Switch for Desktop */}
          <div className="hidden sm:flex items-center space-x-3">
            {currentUser ? (
              <button
                onClick={onGoToDashboard}
                className="px-5 py-2.5 rounded-full bg-rose-950/80 hover:bg-rose-900/90 text-amber-200 font-bold text-xs border border-amber-400/50 backdrop-blur-md shadow-xl transition flex items-center gap-2 cursor-pointer"
              >
                <span>Enter Dashboard</span>
                <ArrowRight className="w-4 h-4 text-amber-300" />
              </button>
            ) : (
              onAdminLogin && (
                <button
                  onClick={onAdminLogin}
                  className="px-4 py-2 rounded-full bg-slate-950/60 hover:bg-slate-900/90 text-slate-300 hover:text-amber-300 text-xs font-semibold border border-amber-500/30 backdrop-blur-md transition flex items-center gap-1.5 cursor-pointer shadow-lg"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Decorative Golden Accent Divider Line */}
        <div className="mt-3 max-w-4xl mx-auto h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
      </header>

      {/* 3. MINIMALIST HERO SECTION DIRECTLY ON PAGE (NO BOXED CARD OVERLAYS) */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 py-6 sm:py-12 text-center my-auto flex flex-col items-center justify-center space-y-6 sm:space-y-8">
        
        {/* Dynamic Tagline Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-950/70 border border-amber-400/50 text-amber-300 text-xs sm:text-sm font-bold tracking-wider shadow-2xl backdrop-blur-md animate-fade-in">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin-slow" />
          <span>{WEDDING_SLIDES[currentSlide].tag}</span>
        </div>

        {/* Dynamic Headline & Subtitle */}
        <div className="space-y-3 sm:space-y-4 max-w-3xl px-2">
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black font-serif text-white leading-tight tracking-tight drop-shadow-[0_4px_25px_rgba(159,18,57,0.9)]">
            "{WEDDING_SLIDES[currentSlide].title}"
          </h2>

          <p className="text-sm sm:text-lg text-rose-100/95 max-w-2xl mx-auto font-sans font-medium leading-relaxed drop-shadow-md">
            {WEDDING_SLIDES[currentSlide].subtitle}
          </p>
        </div>

        {/* 4. PULSING CALL-TO-ACTION BUTTON WITH VIBRANT DEEP REDS & GOLDEN ACCENTS */}
        <div className="pt-2 sm:pt-4 flex flex-col items-center space-y-4">
          <div className="relative inline-block group">
            {/* Outer Glowing Pulsing Rings */}
            <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-amber-400 via-rose-600 to-amber-300 opacity-80 blur-xl animate-pulse group-hover:opacity-100 transition duration-1000"></div>
            <div className="absolute -inset-5 rounded-full border-2 border-amber-400/50 animate-ping opacity-30 pointer-events-none"></div>

            <button
              onClick={onGetStarted}
              className="relative px-9 py-4 sm:px-14 sm:py-5 rounded-full bg-gradient-to-r from-rose-800 via-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-500 text-white font-black text-base sm:text-xl tracking-wider uppercase shadow-[0_12px_40px_rgba(159,18,57,0.7)] transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3.5 border-2 border-amber-300 cursor-pointer"
            >
              <Heart className="w-6 h-6 sm:w-7 sm:h-7 text-amber-300 fill-amber-300 animate-bounce" />
              <span>Find Your Soulmate</span>
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
            </button>
          </div>

          <p className="text-xs sm:text-sm text-amber-200/90 font-semibold flex items-center gap-1.5 pt-1 drop-shadow">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>100% Verified Matrimonial Profiles • Safe & Secure</span>
          </p>
        </div>

        {/* 5. SLIDER NAVIGATION CONTROLS (DOTS & ARROWS) */}
        <div className="pt-4 flex items-center justify-center space-x-5">
          <button
            onClick={handlePrev}
            className="p-2.5 rounded-full bg-slate-950/70 hover:bg-rose-950 text-amber-300 border border-amber-500/30 backdrop-blur-md transition hover:scale-110 cursor-pointer shadow-lg"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Dots Indicator */}
          <div className="flex items-center space-x-2">
            {WEDDING_SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`transition-all duration-300 cursor-pointer rounded-full ${
                  idx === currentSlide
                    ? 'w-8 h-2.5 bg-gradient-to-r from-amber-400 to-rose-400 shadow-lg'
                    : 'w-2.5 h-2.5 bg-slate-700/80 hover:bg-rose-400/60'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="p-2.5 rounded-full bg-slate-950/70 hover:bg-rose-950 text-amber-300 border border-amber-500/30 backdrop-blur-md transition hover:scale-110 cursor-pointer shadow-lg"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </main>

      {/* 6. MINIMALIST RESPONSIVE FOOTER */}
      <footer className="relative z-20 w-full py-4 px-4 border-t border-rose-950/80 bg-slate-950/80 backdrop-blur-md text-center">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-rose-200/80">
          <p>© {new Date().getFullYear()} {appName}. All Rights Reserved.</p>
          <div className="flex items-center space-x-3 text-amber-300/90 font-medium">
            <span className="flex items-center gap-1"><UserCheck className="w-3.5 h-3.5 text-amber-400" /> Matrimony Verified</span>
            <span>•</span>
            <span>Privacy Guaranteed</span>
            {onAdminLogin && (
              <>
                <span>•</span>
                <button onClick={onAdminLogin} className="hover:text-amber-200 underline cursor-pointer">
                  Admin Login
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
