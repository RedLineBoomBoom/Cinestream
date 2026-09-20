import React, { useState, useEffect } from 'react';
import { X, Lock, FileText, ExternalLink, Shield } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useSound } from '../../context/SoundContext';

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: 'privacy' | 'terms';
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialTab = 'privacy',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(initialTab);
  const { language, setLanguage } = useLanguage();
  const { playClick } = useSound();

  // Sync initial tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#121214] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 z-10">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-white/[0.08] flex items-center justify-between gap-3 bg-black/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#E50914]/15 border border-[#E50914]/30 flex items-center justify-center shrink-0 shadow-lg shadow-red-950/30">
              {activeTab === 'privacy' ? (
                <Lock className="w-5 h-5 text-[#E50914]" />
              ) : (
                <FileText className="w-5 h-5 text-[#E50914]" />
              )}
            </div>

            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-display font-black text-white uppercase tracking-tight flex items-center gap-2">
                <span>
                  {activeTab === 'privacy'
                    ? language === 'en'
                      ? 'Privacy Policy'
                      : 'Kebijakan Privasi'
                    : language === 'en'
                    ? 'Terms of Service'
                    : 'Ketentuan Layanan'}
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-slate-300">
                  CINESTREAM
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                {language === 'en'
                  ? 'Official Legal & User Protection Document'
                  : 'Dokumen Resmi Hukum & Perlindungan Pengguna'}
              </p>
            </div>
          </div>

          {/* Header Controls: Lang Switcher, Open Standalone, Close */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Language Switcher */}
            <div className="flex items-center bg-white/[0.06] p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setLanguage('id');
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  language === 'id'
                    ? 'bg-[#E50914] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ID
              </button>
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setLanguage('en');
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-[#E50914] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            {/* Open in New Window Link */}
            <a
              href={
                activeTab === 'privacy'
                  ? `/privacy.html?lang=${language}`
                  : `/terms.html?lang=${language}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-all cursor-pointer border border-white/10 flex items-center justify-center"
              title={language === 'en' ? 'Open in new tab' : 'Buka di tab baru'}
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                playClick();
                onClose();
              }}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-all cursor-pointer border border-white/10"
              title={language === 'en' ? 'Close' : 'Tutup'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex border-b border-white/[0.06] bg-black/20 px-4 sm:px-6 gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              playClick();
              setActiveTab('privacy');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer border-b-2 ${
              activeTab === 'privacy'
                ? 'border-[#E50914] text-[#E50914]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Privacy Policy' : 'Kebijakan Privasi'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClick();
              setActiveTab('terms');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer border-b-2 ${
              activeTab === 'terms'
                ? 'border-[#E50914] text-[#E50914]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Terms of Service' : 'Ketentuan Layanan'}</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-8 overflow-y-auto text-xs sm:text-sm leading-relaxed text-slate-300 space-y-6">
          {activeTab === 'privacy' ? (
            /* ══════════ PRIVACY POLICY CONTENT ══════════ */
            language === 'id' ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight mb-1">
                    Kebijakan Privasi Cinestream
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">Terakhir diperbarui: 20 September 2026</p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#E50914] rounded-full" />
                    <span>1. Informasi yang Kami Kumpulkan</span>
                  </h4>
                  <p className="text-slate-300">
                    Ketika Anda menggunakan fitur login Google di Cinestream, kami hanya mengakses informasi profil dasar akun Anda berupa nama, alamat email, dan foto profil yang disediakan oleh Google OAuth. Kami tidak mengakses kontak, file Google Drive, atau data sensitif pribadi lainnya.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#E50914] rounded-full" />
                    <span>2. Penggunaan Informasi</span>
                  </h4>
                  <p className="text-slate-300">Informasi akun Anda hanya digunakan untuk kebutuhan fungsional aplikasi:</p>
                  <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-300">
                    <li>Mengidentifikasi profil pengguna Anda di platform Cinestream.</li>
                    <li>Menyimpan dan menyinkronkan daftar tontonan (Watchlist) serta riwayat tontonan (Watch History) Anda secara pribadi lintas perangkat (HP, tablet, komputer).</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#E50914] rounded-full" />
                    <span>3. Penyimpanan dan Keamanan Data</span>
                  </h4>
                  <p className="text-slate-300">
                    Data Anda disimpan secara terenkripsi menggunakan infrastruktur basis data cloud PostgreSQL dari <strong className="text-white">Supabase</strong> dengan standar keamanan <strong className="text-white">Row Level Security (RLS)</strong>. Setiap pengguna hanya memiliki akses ke datanya masing-masing. Kami tidak membagikan, menyewakan, atau menjual data pribadi Anda kepada pihak ketiga mana pun.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#E50914] rounded-full" />
                    <span>4. Hak Pengguna & Penghapusan Akun</span>
                  </h4>
                  <p className="text-slate-300">
                    Anda memiliki kontrol penuh atas data Anda. Anda dapat memutuskan izin akses aplikasi Cinestream kapan saja melalui pengaturan keamanan Akun Google Anda, atau meminta penghapusan seluruh riwayat data yang tersimpan dengan menghubungi tim dukungan kami.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#E50914] rounded-full" />
                    <span>5. Kontak & Dukungan</span>
                  </h4>
                  <p className="text-slate-300">
                    Jika Anda memiliki pertanyaan mengenai kebijakan privasi ini atau ingin mengajukan permohonan terkait data akun Anda, silakan hubungi tim kami melalui email resmi:{' '}
                    <a href="mailto:support@cinestream.app" className="text-[#E50914] hover:underline font-mono font-bold">
                      support@cinestream.app
                    </a>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight mb-1">
                    Cinestream Privacy Policy
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">Last updated: September 20, 2026</p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#E50914] rounded-full" />
                    <span>1. Information We Collect</span>
                  </h4>
                  <p className="text-slate-300">
                    When you sign in using Google on Cinestream, we only access your basic account profile information, which includes your display name, email address, and profile photo provided via Google OAuth. We never access your contacts, Google Drive files, or any other sensitive personal data.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#E50914] rounded-full" />
                    <span>2. How We Use Your Information</span>
                  </h4>
                  <p className="text-slate-300">Your account information is solely used for core functional application features:</p>
                  <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-300">
                    <li>To identify and manage your user profile across the Cinestream platform.</li>
                    <li>To privately store and securely synchronize your Watchlist and Watch History across all your devices (smartphone, tablet, and PC).</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#E50914] rounded-full" />
                    <span>3. Data Storage & Security</span>
                  </h4>
                  <p className="text-slate-300">
                    Your data is securely stored and encrypted using <strong className="text-white">Supabase</strong> PostgreSQL cloud infrastructure protected by rigorous <strong className="text-white">Row Level Security (RLS)</strong> policies. Each user can strictly access only their own data. We never share, rent, or sell your personal data to any third parties.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#E50914] rounded-full" />
                    <span>4. User Rights & Data Deletion</span>
                  </h4>
                  <p className="text-slate-300">
                    You maintain full ownership and control over your personal data. You may revoke Cinestream's access at any time through your Google Account Security Settings, or request complete deletion of all your stored data by contacting our support team.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#E50914] rounded-full" />
                    <span>5. Contact & Support</span>
                  </h4>
                  <p className="text-slate-300">
                    If you have any questions, inquiries, or requests regarding this Privacy Policy, please reach out to our team at:{' '}
                    <a href="mailto:support@cinestream.app" className="text-[#E50914] hover:underline font-mono font-bold">
                      support@cinestream.app
                    </a>.
                  </p>
                </div>
              </div>
            )
          ) : (
            /* ══════════ TERMS OF SERVICE CONTENT ══════════ */
            language === 'id' ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight mb-1">
                    Ketentuan Layanan Cinestream
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">Terakhir diperbarui: 20 September 2026</p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#E50914] rounded-full" />
                    <span>1. Penerimaan Ketentuan</span>
                  </h4>
                  <p className="text-slate-300">
                    Dengan mengakses, menjelajahi, atau menggunakan platform Cinestream, Anda menyetujui untuk terikat oleh seluruh Ketentuan Layanan ini. Jika Anda tidak menyetujui salah satu poin ketentuan, Anda diharapkan untuk tidak melanjutkan penggunaan platform.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#E50914] rounded-full" />
                    <span>2. Penggunaan Layanan</span>
                  </h4>
                  <p className="text-slate-300">
                    Cinestream disediakan sebagai platform agregasi media dan antarmuka hiburan sinematik berteknologi tinggi. Pengguna bertanggung jawab penuh atas keamanan perangkat dan kerahasiaan akses akun masing-masing.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#E50914] rounded-full" />
                    <span>3. Akun Pengguna & Autentikasi</span>
                  </h4>
                  <p className="text-slate-300">
                    Anda dapat membuat akun menggunakan autentikasi resmi Google OAuth atau Email. Anda setuju untuk memberikan data yang sah dan tidak menyalahgunakan akses sistem atau melakukan upaya pengrusakan infrastruktur layanan.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#E50914] rounded-full" />
                    <span>4. Penolakan Tanggung Jawab (Disclaimer)</span>
                  </h4>
                  <p className="text-slate-300">
                    Seluruh konten dan media yang terindeks melalui antarmuka Cinestream berasal dari penyedia pihak ketiga publik. Cinestream tidak mengunggah, menyimpan, atau memiliki hak cipta atas video atau materi media yang disiarkan.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#E50914] rounded-full" />
                    <span>5. Kontak & Bantuan</span>
                  </h4>
                  <p className="text-slate-300">
                    Pertanyaan, masukan, atau laporan kendala mengenai ketentuan layanan ini dapat dikirimkan ke email resmi:{' '}
                    <a href="mailto:support@cinestream.app" className="text-[#E50914] hover:underline font-mono font-bold">
                      support@cinestream.app
                    </a>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight mb-1">
                    Cinestream Terms of Service
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">Last updated: September 20, 2026</p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#E50914] rounded-full" />
                    <span>1. Acceptance of Terms</span>
                  </h4>
                  <p className="text-slate-300">
                    By accessing, browsing, or using the Cinestream platform, you explicitly agree to be bound by these Terms of Service. If you disagree with any part of these terms, please discontinue use of the service.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#E50914] rounded-full" />
                    <span>2. Service Usage</span>
                  </h4>
                  <p className="text-slate-300">
                    Cinestream is provided as an advanced cinematic media curation and entertainment interface. Users are fully responsible for maintaining their device security and account confidentiality.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#E50914] rounded-full" />
                    <span>3. User Accounts & Authentication</span>
                  </h4>
                  <p className="text-slate-300">
                    You may create an account using authorized Google OAuth or Email authentication. You agree to provide accurate information and refrain from unauthorized system access or activities that compromise service integrity.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#E50914] rounded-full" />
                    <span>4. Legal Disclaimer</span>
                  </h4>
                  <p className="text-slate-300">
                    All indexed video streams and metadata displayed within Cinestream originate from external public third-party services. Cinestream does not host, upload, or own any copyrighted video assets.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#E50914] rounded-full" />
                    <span>5. Contact & Support</span>
                  </h4>
                  <p className="text-slate-300">
                    Any questions, inquiries, or support requests regarding these terms of service can be directed to our team at:{' '}
                    <a href="mailto:support@cinestream.app" className="text-[#E50914] hover:underline font-mono font-bold">
                      support@cinestream.app
                    </a>.
                  </p>
                </div>
              </div>
            )
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-black/40 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#E50914]" />
            <span>&copy; {new Date().getFullYear()} CINESTREAM • All Rights Reserved</span>
          </div>

          <button
            type="button"
            onClick={() => {
              playClick();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white text-xs font-bold transition-all shadow-md shadow-red-950/40 cursor-pointer"
          >
            {language === 'en' ? 'Close' : 'Tutup'}
          </button>
        </div>
      </div>
    </div>
  );
};
