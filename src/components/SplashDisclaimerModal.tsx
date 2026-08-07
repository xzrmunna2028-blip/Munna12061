import React, { useState, useEffect } from 'react';
import { Heart, Sparkles, ArrowRight, ChevronLeft, ChevronRight, ShieldCheck, Users } from 'lucide-react';

interface SplashDisclaimerModalProps {
  onAccept: () => void;
}

interface WeddingSlide {
  id: string;
  imageUrl: string;
  bengaliPoetry: string;
  englishPoetry: string;
  tag: string;
}

const WEDDING_SLIDES: WeddingSlide[] = [
  {
    id: 'slide_1',
    imageUrl: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1600&q=80',
    bengaliPoetry: 'Two Hearts, One Journey — Where True Love Finds Home',
    englishPoetry: 'Pure trust and love make life beautiful',
    tag: 'Bangladeshi Marriage'
  },
  {
    id: 'slide_2',
    imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80',
    bengaliPoetry: 'Sacred Bonds & Endless Joy — Eternal Togetherness',
    englishPoetry: 'Celebrate happiness and lifelong connection',
    tag: 'Wedding Celebrations'
  },
  {
    id: 'slide_3',
    imageUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1600&q=80',
    bengaliPoetry: 'Build Your Beautiful Tomorrow with a Trusted Soulmate',
    englishPoetry: 'Find your perfect partner on a trusted platform',
    tag: '100% Verified Members'
  }
];

export const SplashDisclaimerModal: React.FC<SplashDisclaimerModalProps> = ({ onAccept }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Auto slide image background every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % WEDDING_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const currentSlide = WEDDING_SLIDES[currentSlideIndex];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-between bg-slate-950 text-white overflow-hidden select-none">
      
      {/* CRYSTAL CLEAR WEDDING IMAGE SLIDER (NO BLUR ON IMAGES) */}
      {WEDDING_SLIDES.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentSlideIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          } transition-transform duration-[7000ms]`}
        >
          <img
            src={slide.imageUrl}
            alt="Bangladeshi Wedding"
            className="w-full h-full object-cover object-center filter brightness-95 contrast-105"
          />
        </div>
      ))}

      {/* LIGHT GRADIENT OVERLAYS ONLY AT TOP & BOTTOM (KEEPS BACKGROUND CLEAR) */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-transparent to-slate-950/90 pointer-events-none" />

      {/* SUBTLE AMBIENT GLOW IN CENTER */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-rose-600/20 rounded-full blur-[140px] pointer-events-none" />

      {/* TOP HEADER / BRANDING */}
      <header className="relative z-20 max-w-5xl w-full mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center space-x-3 bg-slate-950/70 border border-slate-800/80 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 p-0.5 shadow-lg shadow-rose-500/30 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500 animate-pulse" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-white via-rose-100 to-pink-300 bg-clip-text text-transparent">
              True Love Connect
            </h1>
            <p className="text-[10px] font-bold text-rose-400 tracking-wider uppercase">
              Bangladeshi Matrimony & Dating
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-slate-950/70 border border-emerald-500/40 px-3.5 py-2 rounded-2xl backdrop-blur-md text-xs font-bold text-emerald-400 shadow-xl">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>100% Verified Platform</span>
        </div>
      </header>

      {/* ELEGANT GLASSMORPHISM CARD CONTAINING WEDDING POETRY & GET STARTED */}
      <main className="relative z-20 max-w-2xl w-full mx-auto px-4 my-auto animate-fade-in">
        
        <div className="relative bg-slate-950/80 border border-rose-500/35 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-6 text-center overflow-hidden group">
          
          {/* CARD TOP HIGHLIGHT GLOW */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-80" />
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-rose-500/20 rounded-full blur-2xl" />
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-pink-500/20 rounded-full blur-2xl" />

          {/* BADGE */}
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-extrabold backdrop-blur-md shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
            <span>{currentSlide.tag}</span>
          </div>

          {/* POETRY / RHYME (BENGALI & ENGLISH) */}
          <div className="space-y-3 px-1 sm:px-4">
            <h2 className="text-xl sm:text-3xl font-black text-white leading-relaxed tracking-tight drop-shadow-lg">
              "{currentSlide.bengaliPoetry}"
            </h2>
            <p className="text-xs sm:text-base font-semibold text-pink-200/90 italic tracking-wide">
              {currentSlide.englishPoetry}
            </p>
          </div>

          {/* SLIDER DOT INDICATORS & MANUAL CHEVRON NAV */}
          <div className="flex items-center justify-center space-x-4 pt-1">
            <button
              onClick={() => setCurrentSlideIndex((prev) => (prev - 1 + WEDDING_SLIDES.length) % WEDDING_SLIDES.length)}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-colors shadow"
              title="পূর্ববর্তী ছবি"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2">
              {WEDDING_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    idx === currentSlideIndex ? 'w-8 bg-rose-500 shadow-lg shadow-rose-500/50' : 'w-2 bg-slate-700'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => setCurrentSlideIndex((prev) => (prev + 1) % WEDDING_SLIDES.length)}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-colors shadow"
              title="পরবর্তী ছবি"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* GET STARTED BUTTON */}
          <div className="pt-2 max-w-sm mx-auto">
            <button
              onClick={onAccept}
              className="w-full py-3.5 px-8 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 text-white font-black text-base sm:text-lg shadow-xl shadow-rose-500/40 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-3 group border border-rose-400/40"
            >
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="relative z-20 py-4 text-center text-[11px] text-slate-400/80 border-t border-slate-800/40 bg-slate-950/60 backdrop-blur-md">
        <p>True Love Connect © 2026 • Bangladesh's Trusted Matrimonic & Dating Platform</p>
      </footer>

    </div>
  );
};

