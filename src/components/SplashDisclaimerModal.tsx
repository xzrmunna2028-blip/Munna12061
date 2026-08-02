import React, { useState, useEffect } from 'react';
import { Heart, ShieldAlert, Globe, Search, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

interface SplashDisclaimerModalProps {
  onAccept: () => void;
}

// Language translations dictionary for the warning message
interface Translation {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  title: string;
  warningTitle: string;
  warningText: string;
  agreeBtn: string;
  footerNotice: string;
}

const LANGUAGES: Translation[] = [
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    flag: '🇧🇩',
    title: 'HeartSync-এ আপনাকে স্বাগতম',
    warningTitle: '⚠️ কঠোর নিয়মাবলী ও সতর্কবার্তা',
    warningText: 'আমাদের প্ল্যাটফর্মে ভুল বা ফেক ছবি, ভুয়া নাম/তথ্য প্রকাশ, প্রতারণা বা অন্য কোনো অসদাচরণ করা কঠোরভাবে নিষিদ্ধ। কোনো ধরনের ফেক প্রোফাইল বা বিভ্রান্তিকর আচরণ সনাক্ত হলে আপনার অ্যাকাউন্ট স্থায়ীভাবে সাময়িকভাবে স্থগিত বা চিরতরে ব্যান করা হবে।',
    agreeBtn: 'আমি নিয়মাবলীতে একমত ও এগিয়ে যান',
    footerNotice: 'আমাদের প্ল্যাটফর্মে আপনি সুরক্ষিত। সত্য ও সৎ তথ্য দিয়ে ভালোবাসার সঙ্গীকে খুঁজে নিন।',
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    title: 'Welcome to HeartSync',
    warningTitle: '⚠️ Strict Rules & Warning Notice',
    warningText: 'Uploading fake photos, submitting fraudulent details, misrepresentation, or engaging in deceptive activities is strictly prohibited on HeartSync. Any detection of fake profiles or misconduct will result in an immediate and permanent account BAN.',
    agreeBtn: 'I Agree & Continue',
    footerNotice: 'Your security is our top priority. Please present genuine information to find true matches.',
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिंदी',
    flag: '🇮🇳',
    title: 'HeartSync में आपका स्वागत है',
    warningTitle: '⚠️ सख्त नियम और चेतावनी',
    warningText: 'हमारे प्लेटफॉर्म पर नकली तस्वीरें, फर्जी जानकारी या धोखाधड़ी सबमिट करना सख्त मना है। यदि कोई फर्जी प्रोफाइल या अनुचित व्यवहार पाया जाता है, तो आपका अकाउंट तुरंत स्थायी रूप से बैन कर दिया जाएगा।',
    agreeBtn: 'मैं सहमत हूँ और आगे बढ़ें',
    footerNotice: 'आपकी सुरक्षा हमारी प्राथमिकता है। कृपया वास्तविक विवरण साझा करें।',
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    title: 'مرحباً بك في HeartSync',
    warningTitle: '⚠️ القواعد الصارمة والتحذير',
    warningText: 'يُحظر تمامًا تحميل صور مزيفة أو معلومات كاذبة أو ممارسة الاحتيال على منصتنا. سيؤدي أي اكتشاف لملفات شخصية مزيفة أو سلوك غير لائق إلى حظر حسابك نهائيًا وفوريًا.',
    agreeBtn: 'أنا أوافق والمتابعة',
    footerNotice: 'أمانك هو أولويتنا. يُرجى تقديم معلومات حقيقية.',
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    title: 'Bienvenido a HeartSync',
    warningTitle: '⚠️ Reglas Estrictas y Advertencia',
    warningText: 'Está estrictamente prohibido subir fotos falsas, proporcionar información fraudulenta o participar en conductas engañosas. Cualquier detección de perfiles falsos resultará en un BLOQUEO permanente e inmediato de la cuenta.',
    agreeBtn: 'Acepto y Continuar',
    footerNotice: 'Tu seguridad es nuestra prioridad. Por favor comparte información genuina.',
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    title: 'Bienvenue sur HeartSync',
    warningTitle: '⚠️ Règles Strictes et Avertissement',
    warningText: 'Il est strictement interdit de publier de fausses photos, de fausses informations ou de se livrer à des activités frauduleuses. Toute détection de faux profil entraînera un BANNISSEMENT immédiat et permanent de votre compte.',
    agreeBtn: 'J\'accepte et Continuer',
    footerNotice: 'Votre sécurité est notre priorité. Veuillez fournir des informations authentiques.',
  },
  {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    flag: '🇵🇰',
    title: 'HeartSync میں خوش آمدید',
    warningTitle: '⚠️ سخت قواعد و ضوابط اور تنبیہ',
    warningText: 'ہمارے پلیٹ فارم پر جعلی تصاویر، غلط معلومات یا دھوکہ دہی کی سختی سے ممانعت ہے۔ کسی بھی جعلی پروفائل یا نامناسب رویے کی صورت میں آپ کا اکاؤنٹ فوری اور مستقل طور پر بین کر دیا جائے گا۔',
    agreeBtn: 'میں متفق ہوں اور آگے بڑھیں',
    footerNotice: 'آپ کی حفاظت ہماری ترجیح ہے۔ براہ کرم سچی معلومات فراہم کریں۔',
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    title: 'Willkommen bei HeartSync',
    warningTitle: '⚠️ Strikte Regeln & Warnhinweis',
    warningText: 'Das Hochladen gefälschter Fotos, falscher Informationen oder betrügerische Aktivitäten sind strengstens untersagt. Bei Erkennung von Fake-Profilen wird Ihr Konto sofort und dauerhaft GESPERRT.',
    agreeBtn: 'Ich stimme zu & Weiter',
    footerNotice: 'Ihre Sicherheit ist uns wichtig. Bitte machen Sie ehrliche Angaben.',
  },
  {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳',
    title: '欢迎来到 HeartSync',
    warningTitle: '⚠️ 严格规则与警告通知',
    warningText: '严禁上传虚假照片、虚假个人信息或从事诈骗活动。一经发现虚假资料或违规行为，您的账号将被立即永久封禁。',
    agreeBtn: '我同意并继续',
    footerNotice: '您的安全是我们的首要任务，请提交真实信息。',
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    title: 'HeartSync へようこそ',
    warningTitle: '⚠️ 厳格な利用規約と警告',
    warningText: '偽の写真や嘘の情報の投稿、詐欺行為は厳重に禁止されています。偽プロフィールの作成や不正行為が発覚した場合、即座に永久アカウントBAN措置が取られます。',
    agreeBtn: '同意して進む',
    footerNotice: '安心・安全な出会いのために本物の情報を入力してください。',
  },
];

export const SplashDisclaimerModal: React.FC<SplashDisclaimerModalProps> = ({ onAccept }) => {
  const [progress, setProgress] = useState(0);
  const [selectedLang, setSelectedLang] = useState<Translation>(LANGUAGES[0]); // Bengali default
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [searchLang, setSearchLang] = useState('');

  // Floating background hearts generator
  const [hearts, setHearts] = useState<Array<{ id: number; left: number; size: number; speed: number; delay: number }>>([]);

  useEffect(() => {
    // Generate floating hearts
    const generatedHearts = Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.floor(Math.random() * 24) + 12,
      speed: Math.random() * 8 + 6,
      delay: Math.random() * 5,
    }));
    setHearts(generatedHearts);

    // Smooth progress counter from 0% to 100%
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.floor(Math.random() * 12) + 5;
      });
    }, 120);

    return () => clearInterval(interval);
  }, []);

  const filteredLanguages = LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(searchLang.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(searchLang.toLowerCase()) ||
      l.code.toLowerCase().includes(searchLang.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 text-white overflow-hidden p-4 sm:p-6">
      
      {/* FLOATING HEARTS ANIMATION BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        {hearts.map((h) => (
          <div
            key={h.id}
            className="absolute text-rose-500/60 animate-bounce"
            style={{
              left: `${h.left}%`,
              bottom: `-50px`,
              animation: `floatUp ${h.speed}s linear infinite`,
              animationDelay: `${h.delay}s`,
            }}
          >
            <Heart style={{ width: `${h.size}px`, height: `${h.size}px` }} className="fill-rose-500/40" />
          </div>
        ))}
      </div>

      {/* Radial Gradient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-pink-600/15 rounded-full blur-[100px] pointer-events-none" />

      {/* LANGUAGE SELECTOR IN TOP CORNER */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50">
        <div className="relative">
          <button
            onClick={() => setIsLangOpen(!isLangOpen)}
            className="px-3.5 py-2 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-xs font-bold text-slate-200 hover:text-white flex items-center space-x-2 shadow-xl backdrop-blur-md transition-all hover:border-rose-500/50"
          >
            <Globe className="w-4 h-4 text-rose-400" />
            <span>{selectedLang.flag} {selectedLang.nativeName}</span>
          </button>

          {isLangOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700/80 rounded-2xl p-3 shadow-2xl backdrop-blur-xl z-50 space-y-2 animate-fade-in">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchLang}
                  onChange={(e) => setSearchLang(e.target.value)}
                  placeholder="Search language..."
                  className="w-full bg-slate-800 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {filteredLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setSelectedLang(lang);
                      setIsLangOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      selectedLang.code === lang.code
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center space-x-2">
                      <span>{lang.flag}</span>
                      <span>{lang.nativeName} ({lang.name})</span>
                    </span>
                    {selectedLang.code === lang.code && <CheckCircle className="w-3.5 h-3.5 text-rose-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="relative w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl text-center space-y-6 z-10 my-auto animate-scale-up">
        
        {/* LOGO & BRAND */}
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-500 p-0.5 shadow-2xl shadow-rose-500/30 flex items-center justify-center animate-pulse">
              <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
                <Heart className="w-10 h-10 text-rose-500 fill-rose-500" />
              </div>
            </div>
            <Sparkles className="w-5 h-5 text-amber-400 absolute -top-1 -right-1 animate-spin" style={{ animationDuration: '6s' }} />
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-rose-200 to-pink-400 bg-clip-text text-transparent mt-2">
            HeartSync
          </h1>
          <p className="text-xs font-semibold text-rose-400 tracking-wider uppercase">
            Real & Trusted Verified Dating Network
          </p>
        </div>

        {/* 100% LOADING PROGRESS BAR */}
        <div className="space-y-1.5 px-2">
          <div className="flex justify-between items-center text-xs font-bold font-mono">
            <span className="text-slate-400 text-[11px]">System Check & Security Scan</span>
            <span className="text-emerald-400">{Math.min(progress, 100)}%</span>
          </div>

          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-rose-500 via-pink-500 to-emerald-400 rounded-full transition-all duration-300 shadow-md"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* WARNING DISCLAIMER BOX (EN + BN + MULTI-LANG) */}
        <div className="bg-slate-950/80 border border-rose-500/30 rounded-2xl p-4 sm:p-5 text-left space-y-3 shadow-inner relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs sm:text-sm">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-500" />
            <span>{selectedLang.warningTitle}</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            {selectedLang.warningText}
          </p>

          <div className="pt-2 border-t border-slate-800/80 flex items-center space-x-2 text-[11px] text-slate-400">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>{selectedLang.footerNotice}</span>
          </div>
        </div>

        {/* AGREE & CONTINUE BUTTON */}
        <div>
          <button
            onClick={onAccept}
            disabled={progress < 100}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs sm:text-sm shadow-xl shadow-rose-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center space-x-2"
          >
            <span>{selectedLang.agreeBtn}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-[10px] text-slate-500 mt-2 font-mono">
            HeartSync © 2026 • Encrypted Real-Time Community Protection
          </p>
        </div>

      </div>

      {/* Floating keyframe animation CSS */}
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          20% {
            opacity: 0.6;
          }
          80% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>

    </div>
  );
};
