import React, { useState } from 'react';
import { X, Mail, Lock, User, Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSound } from '../../context/SoundContext';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authMode,
    openAuthModal,
    closeAuthModal,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
  } = useAuth();
  const { language } = useLanguage();
  const { playClick, playSuccess } = useSound();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const isSignUp = authMode === 'signup';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!fullName.trim()) {
          setErrorMsg(
            language === 'en' ? 'Please enter your full name' : 'Silakan masukkan nama lengkap'
          );
          setIsLoading(false);
          return;
        }

        const { error } = await signUpWithEmail(email.trim(), password, fullName.trim());
        if (error) {
          setErrorMsg(error.message);
        } else {
          playSuccess();
          setSuccessMsg(
            language === 'en'
              ? 'Account created! Please check your email for confirmation if required.'
              : 'Akun berhasil dibuat! Silakan cek email Anda jika verifikasi diperlukan.'
          );
          setTimeout(() => {
            closeAuthModal();
          }, 2000);
        }
      } else {
        const { error } = await signInWithEmail(email.trim(), password);
        if (error) {
          setErrorMsg(
            error.message.includes('Invalid login')
              ? language === 'en'
                ? 'Invalid email or password'
                : 'Email atau password salah'
              : error.message
          );
        } else {
          playSuccess();
          closeAuthModal();
        }
      }
    } catch {
      setErrorMsg(
        language === 'en'
          ? 'An unexpected error occurred. Please try again.'
          : 'Terjadi kesalahan. Silakan coba lagi.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    playClick();
    setIsLoading(true);
    setErrorMsg(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setErrorMsg(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        onClick={closeAuthModal}
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md bg-[#18181c] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden z-10 animate-scale-up">
        {/* Top Accent Glowing Bar */}
        <div className="h-1 bg-gradient-to-r from-red-600 via-amber-500 to-rose-600" />

        {/* Close Button */}
        <button
          onClick={() => {
            playClick();
            closeAuthModal();
          }}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header Title */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-red-600/15 border border-red-500/30 text-[11px] font-bold tracking-wider uppercase text-red-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cinestream Cloud Sync</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-display text-white tracking-wide uppercase">
              {isSignUp
                ? language === 'en'
                  ? 'Create Account'
                  : 'Buat Akun'
                : language === 'en'
                ? 'Welcome Back'
                : 'Selamat Datang'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto">
              {isSignUp
                ? language === 'en'
                  ? 'Sync your watchlist and watch history across all your devices.'
                  : 'Sinkronkan daftar tontonan dan riwayat Anda di semua perangkat.'
                : language === 'en'
                ? 'Sign in to continue watching where you left off.'
                : 'Masuk untuk melanjutkan tontonan dari perangkat manapun.'}
            </p>
          </div>

          {/* Error & Success Alerts */}
          {errorMsg && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs leading-relaxed animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs leading-relaxed animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Google 1-Click Login */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>
              {language === 'en' ? 'Continue with Google' : 'Lanjutkan dengan Google'}
            </span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-[1px] bg-white/[0.08]" />
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
              {language === 'en' ? 'or' : 'atau'}
            </span>
            <div className="flex-1 h-[1px] bg-white/[0.08]" />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {language === 'en' ? 'Full Name' : 'Nama Lengkap'}
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={language === 'en' ? 'John Doe' : 'Budi Pratama'}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm text-white placeholder:text-slate-500 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm text-white placeholder:text-slate-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm text-white placeholder:text-slate-500 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#E50914] hover:bg-[#ff0f1b] text-white font-bold text-sm tracking-wide shadow-lg shadow-red-950/50 hover:shadow-red-900/60 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{language === 'en' ? 'Processing...' : 'Memproses...'}</span>
                </>
              ) : (
                <span>
                  {isSignUp
                    ? language === 'en'
                      ? 'Create Account'
                      : 'Daftar Sekarang'
                    : language === 'en'
                    ? 'Sign In'
                    : 'Masuk'}
                </span>
              )}
            </button>
          </form>

          {/* Toggle Sign in vs Sign up */}
          <div className="text-center pt-2">
            <p className="text-xs text-slate-400">
              {isSignUp
                ? language === 'en'
                  ? 'Already have an account?'
                  : 'Sudah punya akun?'
                : language === 'en'
                ? "Don't have an account yet?"
                : 'Belum punya akun?'}
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setErrorMsg(null);
                  setSuccessMsg(null);
                  openAuthModal(isSignUp ? 'signin' : 'signup');
                }}
                className="ml-1.5 text-red-400 hover:text-red-300 font-bold underline underline-offset-2 cursor-pointer transition-colors"
              >
                {isSignUp
                  ? language === 'en'
                    ? 'Sign In'
                    : 'Masuk di sini'
                  : language === 'en'
                  ? 'Create one'
                  : 'Daftar gratis'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
