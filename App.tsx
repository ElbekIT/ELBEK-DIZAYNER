
import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, User, ShoppingBag, Images, CheckCircle2, ChevronRight, LogOut, LogIn,
  ShieldCheck, Check, Menu, X, Send, ArrowRight,
  Bell, Trash2, ShieldAlert, Clock, Image as ImageIcon,
  Upload, CreditCard, Globe, Calendar, Layers, Users, Megaphone, Info,
  Smartphone, ExternalLink, XCircle, FileText, Download, AlertCircle, Loader2
} from 'lucide-react';

import { LoadingScreen } from './components/LoadingScreen';
import { ProtectedImage } from './components/ProtectedImage';
import { auth, signInWithGoogle, logout, database, storage } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, set, remove, off, update } from 'firebase/database';
import { ref as sRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { UserProfile, Order, OrderStatus, PortfolioItem, Notification, BlockStatus, AppUserMetadata, WorkingHours } from './types';
import { GAMES, DESIGN_PRICES, PROMO_CODE, PROMO_DISCOUNT, OWNER_EMAIL } from './constants';
import { Language, translations } from './translations';
import { sendOrderToTelegram, sendCancellationToTelegram } from './services/telegramService';

// --- Contexts ---
interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations['uz-Latn'];
  user: UserProfile | null;
  isWorking: boolean;
  schedule: WorkingHours;
  tashkentTime: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};

// --- Components ---

const StatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const colors = {
    [OrderStatus.CHECKING]: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    [OrderStatus.CHECKED]: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    [OrderStatus.APPROVED]: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    [OrderStatus.CANCELLED]: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  };
  return (
    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border tracking-widest ${colors[status]}`}>
      {status}
    </span>
  );
};

const PremiumButton: React.FC<{ 
  onClick?: () => void; 
  children: React.ReactNode; 
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  disabled?: boolean;
  className?: string;
  loading?: boolean;
}> = ({ onClick, children, variant = 'primary', disabled, className, loading }) => {
  const base = "px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-30 disabled:pointer-events-none";
  const variants = {
    primary: "bg-white text-black hover:bg-blue-600 hover:text-white shadow-xl hover:shadow-blue-600/20",
    secondary: "bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-600/10",
    danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-xl shadow-rose-600/10",
    outline: "bg-transparent border border-white/10 text-white hover:border-white/30 hover:bg-white/5",
  };

  return (
    <button onClick={onClick} disabled={disabled || loading} className={`${base} ${variants[variant]} ${className}`}>
      {loading ? <Loader2 size={16} className="animate-spin" /> : children}
    </button>
  );
};

// --- Sections / Pages ---

const HeroSection = () => {
  const { t, tashkentTime, isWorking, schedule } = useApp();
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-20 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1400px] h-[1400px] bg-blue-600/5 blur-[200px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="z-10 mb-12 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 px-8 py-4 rounded-full flex items-center gap-8 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <Clock size={16} className="text-blue-500" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em]">{tashkentTime}</span>
        </div>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isWorking ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]' : 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)]'}`} />
          <span className="text-[11px] font-black uppercase tracking-[0.2em]">{isWorking ? t.hero.statusOpen : t.hero.statusClosed}</span>
        </div>
        <div className="h-4 w-px bg-white/10" />
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">{schedule.start} — {schedule.end}</span>
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center z-10 max-w-5xl">
        <h2 className="text-blue-500 font-black uppercase tracking-[0.6em] text-[10px] mb-8">{t.hero.greeting}</h2>
        <h1 className="text-[clamp(3.5rem,12vw,11rem)] font-black tracking-tighter mb-12 leading-[0.75] italic uppercase text-white drop-shadow-2xl">
          ELBEK <br /> <span className="text-blue-600">DESIGNER.</span>
        </h1>
        <p className="text-zinc-500 max-w-2xl mx-auto text-xs md:text-sm mb-16 uppercase tracking-[0.3em] font-bold leading-[2] px-4">
          {t.hero.welcome}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
          {isWorking ? (
            <Link to="/order">
              <PremiumButton className="px-14 py-8 text-[12px]">
                {t.hero.ctaOrder} <ArrowRight size={20} className="ml-2" />
              </PremiumButton>
            </Link>
          ) : (
            <div className="px-14 py-8 bg-zinc-900/50 text-zinc-600 font-black rounded-3xl flex items-center gap-4 cursor-not-allowed border border-white/5 text-[11px] tracking-[0.2em]">
              {t.hero.ctaClosed} <Clock size={20} />
            </div>
          )}
          <Link to="/portfolio">
            <PremiumButton variant="outline" className="px-14 py-8 text-[12px]">
              {t.hero.ctaGallery}
            </PremiumButton>
          </Link>
        </div>
      </motion.div>
    </section>
  );
};

// --- Modularized App Component ---

export default function App() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('lang') as Language) || 'uz-Latn');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [blockStatus, setBlockStatus] = useState<BlockStatus | null>(null);
  const [isAppReady, setIsAppReady] = useState(false);
  const [schedule, setSchedule] = useState<WorkingHours>({ start: "10:00", end: "19:00" });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => { localStorage.setItem('lang', language); }, [language]);
  const t = useMemo(() => translations[language], [language]);

  // Global Working Hours Logic
  useEffect(() => {
    const sRef = ref(database, 'config/workingHours');
    const unsub = onValue(sRef, (snap) => snap.val() && setSchedule(snap.val()));
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => { off(sRef); clearInterval(timer); };
  }, []);

  const tashkentTime = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tashkent',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    }).format(currentTime);
  }, [currentTime]);

  const isWorking = useMemo(() => {
    const toMin = (str: string) => {
      const [h, m] = str.split(':').map(Number);
      return h * 60 + m;
    };
    const now = toMin(tashkentTime.split(':').slice(0, 2).join(':'));
    const start = toMin(schedule.start);
    const end = toMin(schedule.end);
    return start <= end ? (now >= start && now <= end) : (now >= start || now <= end);
  }, [tashkentTime, schedule]);

  // Auth & Notifications Logic
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (fireUser) => {
      if (fireUser) {
        const profile = {
          uid: fireUser.uid, 
          email: fireUser.email || '', 
          displayName: fireUser.displayName || 'User', 
          photoURL: fireUser.photoURL || `https://ui-avatars.com/api/?name=${fireUser.displayName}`,
          isOwner: fireUser.email === OWNER_EMAIL
        };
        setUser(profile);
        const userRef = ref(database, `users/${fireUser.uid}`);
        await update(userRef, { ...profile, lastLogin: new Date().toISOString() });
        onValue(userRef, (s) => {
          const meta = s.val() as AppUserMetadata | null;
          if (meta?.blockStatus) setBlockStatus(meta.blockStatus);
        });
      } else {
        setUser(null);
        setBlockStatus(null);
      }
      setIsAppReady(true);
    });
    return () => unsubAuth();
  }, []);

  if (!isAppReady) return <LoadingScreen onComplete={() => {}} />;

  return (
    <AppContext.Provider value={{ language, setLanguage, t, user, isWorking, schedule, tashkentTime }}>
      <Router>
        <div className="min-h-screen bg-[#050505] selection:bg-blue-600 selection:text-white">
          {blockStatus?.isBlocked && <BlockedOverlay status={blockStatus} />}
          <Navbar />
          
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/order" element={user ? <OrderPage /> : <LoginPrompt />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/my-orders" element={<MyOrdersPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>

          <NotificationDrawer />
        </div>
      </Router>
    </AppContext.Provider>
  );
}

// --- Specific Pages & Components ---

const Navbar = () => {
  const { user, t, language, setLanguage, isWorking } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handle);
    return () => window.removeEventListener('scroll', handle);
  }, []);

  const links = [
    { name: t.nav.home, path: '/' },
    { name: t.nav.order, path: '/order', disabled: !isWorking },
    { name: t.nav.portfolio, path: '/portfolio' },
    { name: t.nav.myOrders, path: '/my-orders' },
  ];
  if (user?.isOwner) links.push({ name: t.nav.admin, path: '/admin' });

  return (
    <nav className={`fixed top-0 inset-x-0 z-[60] transition-all duration-500 ${scrolled ? 'bg-black/80 backdrop-blur-2xl border-b border-white/5 h-20' : 'h-24'}`}>
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center font-black italic shadow-2xl group-hover:scale-110 transition-transform">ED</div>
          <span className="text-xl font-bold tracking-tight">Elbek<span className="text-blue-500">Design</span></span>
        </Link>

        <div className="hidden lg:flex items-center gap-10">
          {links.map(l => (
            l.disabled ? (
              <span key={l.path} className="text-[10px] font-black uppercase text-zinc-700 opacity-30 cursor-not-allowed">{l.name}</span>
            ) : (
              <Link key={l.path} to={l.path} className={`text-[10px] font-black uppercase tracking-widest transition-colors hover:text-blue-500 ${loc.pathname === l.path ? 'text-blue-500' : 'text-zinc-500'}`}>
                {l.name}
              </Link>
            )
          ))}
          
          <div className="w-px h-6 bg-white/10 mx-2" />
          
          <div className="flex items-center gap-6">
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-transparent text-[10px] font-black uppercase text-zinc-500 outline-none cursor-pointer hover:text-white"
            >
              <option value="uz-Latn">UZ</option>
              <option value="uz-Cyrl">ЎЗ</option>
              <option value="ru">RU</option>
            </select>
            {user ? (
              <div className="flex items-center gap-4">
                <img src={user.photoURL} className="w-9 h-9 rounded-2xl ring-1 ring-blue-600 object-cover" />
                <button onClick={logout} className="p-2 text-zinc-600 hover:text-rose-500 transition-colors"><LogOut size={16} /></button>
              </div>
            ) : (
              <PremiumButton onClick={signInWithGoogle} className="px-6 py-3 rounded-xl">{t.nav.signIn}</PremiumButton>
            )}
          </div>
        </div>

        <button onClick={() => setMobileMenu(!mobileMenu)} className="lg:hidden p-2 text-white"><Menu /></button>
      </div>
    </nav>
  );
};

const PortfolioPage = () => {
  const { t } = useApp();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pRef = ref(database, 'portfolio');
    const unsub = onValue(pRef, (s) => {
      const data = s.val();
      if (data) {
        setItems(Object.keys(data).map(k => ({ ...data[k], id: k })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } else setItems([]);
      setLoading(false);
    });
    return () => off(pRef);
  }, []);

  return (
    <div className="pt-40 pb-20 px-6 max-w-7xl mx-auto min-h-screen">
      <div className="text-center mb-24">
        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-7xl md:text-9xl font-black uppercase italic mb-6 tracking-tighter">OUR <span className="text-blue-600">WORK.</span></motion.h2>
        <p className="text-zinc-500 font-black uppercase tracking-[0.5em] text-[10px]">{t.portfolio.subtitle}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-video bg-zinc-900 animate-pulse rounded-[3rem]" />)}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ staggerChildren: 0.1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {items.map(item => (
            <motion.div key={item.id} layout className="group relative aspect-video rounded-[3rem] overflow-hidden border border-white/5 hover:border-blue-500/30 transition-all duration-700 hover:scale-[1.03]">
              <ProtectedImage src={item.imageUrl} alt={item.title} className="w-full h-full" />
              <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/90 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                <p className="font-black uppercase italic text-xl">{item.title}</p>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1">Premium YouTube Graphics</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

const OrderPage = () => {
  const { user, t, isWorking } = useApp();
  const [step, setStep] = useState(1);
  const [noPromo, setNoPromo] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', gender: 'Male' as 'Male' | 'Female',
    phone: '+998', telegram: '@', designTypes: [] as string[],
    game: '', message: '', promoCode: '', paymentConfirmed: false
  });
  const [submitting, setSubmitting] = useState(false);
  const nav = useNavigate();

  const handlePhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (!val.startsWith('+998')) val = '+998';
    const cleaned = val.replace(/[^\d+]/g, '');
    const digitsOnly = cleaned.slice(4, 13);
    
    let formatted = '+998';
    if (digitsOnly.length > 0) formatted += ' ' + digitsOnly.slice(0, 2);
    if (digitsOnly.length > 2) formatted += ' ' + digitsOnly.slice(2, 5);
    if (digitsOnly.length > 5) formatted += ' ' + digitsOnly.slice(5, 7);
    if (digitsOnly.length > 7) formatted += ' ' + digitsOnly.slice(7, 9);
    
    setFormData({ ...formData, phone: formatted });
  };

  const currentPrice = useMemo(() => {
    const base = formData.designTypes.reduce((acc, d) => acc + (DESIGN_PRICES as any)[d.toUpperCase()], 0);
    return (!noPromo && formData.promoCode === PROMO_CODE) ? base * (1 - PROMO_DISCOUNT) : base;
  }, [formData.designTypes, formData.promoCode, noPromo]);

  const submitOrder = async () => {
    if (!formData.paymentConfirmed || submitting) return;
    setSubmitting(true);
    try {
      const id = Math.random().toString(36).substring(7).toUpperCase();
      const payload: Order = {
        ...formData, id, userId: user!.uid, userEmail: user!.email, userName: user!.displayName,
        totalPrice: currentPrice, status: OrderStatus.CHECKING, createdAt: new Date().toISOString()
      };
      await set(ref(database, `orders/${id}`), payload);
      await sendOrderToTelegram(payload);
      nav('/my-orders');
    } catch (e) { alert("Error!"); }
    finally { setSubmitting(false); }
  };

  if (!isWorking) return <Navigate to="/" />;

  return (
    <div className="pt-40 pb-20 px-6 max-w-2xl mx-auto min-h-screen">
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-12">
          <div className="flex gap-2">
            {[1,2,3,4].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${step >= i ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-zinc-900'}`} />)}
          </div>

          {step === 1 && (
            <div className="space-y-8">
              <h3 className="text-4xl font-black uppercase italic tracking-tighter">{t.order.personalTitle}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <input type="text" placeholder={t.order.firstName} value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold" />
                <input type="text" placeholder={t.order.lastName} value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold" />
              </div>
              <div className="flex gap-4">
                <button onClick={() => setFormData({...formData, gender: 'Male'})} className={`flex-1 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest border transition-all ${formData.gender === 'Male' ? 'bg-emerald-600 border-emerald-600 shadow-xl' : 'bg-zinc-900/50 border-white/5 text-zinc-600'}`}>Erkak</button>
                <button onClick={() => setFormData({...formData, gender: 'Female'})} className={`flex-1 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest border transition-all ${formData.gender === 'Female' ? 'bg-rose-600 border-rose-600 shadow-xl' : 'bg-zinc-900/50 border-white/5 text-zinc-600'}`}>Ayol</button>
              </div>
              <input type="tel" value={formData.phone} onChange={handlePhone} className="w-full bg-zinc-900/50 border border-white/5 p-6 rounded-2xl outline-none font-black text-2xl tracking-widest" />
              <input type="text" placeholder={t.order.telegram} value={formData.telegram} onChange={e => setFormData({...formData, telegram: e.target.value})} className="w-full bg-zinc-900/50 border border-white/5 p-6 rounded-2xl outline-none font-bold" />
              <PremiumButton disabled={!formData.firstName || formData.phone.length < 17} onClick={() => setStep(2)} className="w-full py-6">Keyingi bosqich</PremiumButton>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-10">
              <h3 className="text-4xl font-black uppercase italic tracking-tighter">{t.order.checkoutTitle}</h3>
              <div className="bg-zinc-900/50 p-10 rounded-[3rem] border border-white/5 space-y-8 shadow-2xl">
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Selected services</p>
                  {formData.designTypes.map(d => (
                    <div key={d} className="flex justify-between items-center text-sm font-black italic">
                      <span>{d}</span>
                      <span className="text-zinc-500">{(DESIGN_PRICES as any)[d.toUpperCase()].toLocaleString()} UZS</span>
                    </div>
                  ))}
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex flex-col gap-4">
                  {!noPromo && (
                    <input 
                      type="text" placeholder="Promokodni kiriting" value={formData.promoCode} 
                      onChange={e => setFormData({...formData, promoCode: e.target.value})}
                      className="w-full bg-black border border-white/5 p-5 rounded-2xl outline-none text-blue-500 font-black uppercase tracking-widest text-xs"
                    />
                  )}
                  <button onClick={() => setNoPromo(!noPromo)} className="text-[10px] font-black uppercase text-zinc-600 text-left hover:text-white transition-colors">{noPromo ? 'Promokod kiritish' : 'Promokod yo\'q'}</button>
                  {formData.promoCode === PROMO_CODE && !noPromo && <p className="text-[10px] font-black uppercase text-emerald-500 flex items-center gap-2"><Check size={14} /> {t.order.discountApplied}</p>}
                </div>
                <div className="pt-4 flex justify-between items-end">
                  <div className="space-y-1"><p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Total Price</p><p className="text-5xl font-black italic text-blue-600">{currentPrice.toLocaleString()} UZS</p></div>
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-blue-600"><CreditCard size={24} /></div>
                </div>
              </div>
              
              <label className="flex items-center gap-6 p-8 bg-zinc-900/50 rounded-[2.5rem] border border-white/5 cursor-pointer hover:bg-zinc-900 transition-colors">
                <div className="relative w-7 h-7 flex items-center justify-center">
                  <input type="checkbox" checked={formData.paymentConfirmed} onChange={e => setFormData({...formData, paymentConfirmed: e.target.checked})} className="absolute inset-0 opacity-0" />
                  <div className={`w-7 h-7 rounded-xl border-2 transition-all ${formData.paymentConfirmed ? 'bg-blue-600 border-blue-600' : 'border-white/10'}`}>
                    {formData.paymentConfirmed && <Check size={18} strokeWidth={4} className="text-white" />}
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase text-zinc-400 leading-relaxed tracking-widest">{t.order.confirmPayment}</span>
              </label>

              <div className="flex gap-4">
                <button onClick={() => setStep(3)} className="flex-1 py-6 bg-transparent text-white font-black uppercase rounded-3xl border border-white/5 text-[10px] tracking-widest">Orqaga</button>
                <PremiumButton loading={submitting} disabled={!formData.paymentConfirmed} onClick={submitOrder} className="flex-[2] py-6 shadow-[0_20px_40px_rgba(37,99,235,0.2)]">Buyurtmani yakunlash</PremiumButton>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <h3 className="text-4xl font-black uppercase italic tracking-tighter">DIZAYN TURI</h3>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { id: 'Banner', name: t.order.banner, price: DESIGN_PRICES.BANNER },
                  { id: 'Avatar', name: t.order.avatar, price: DESIGN_PRICES.AVATAR },
                  { id: 'Preview', name: t.order.preview, price: DESIGN_PRICES.PREVIEW },
                ].map(d => (
                  <button 
                    key={d.id} 
                    onClick={() => setFormData({...formData, designTypes: formData.designTypes.includes(d.id) ? formData.designTypes.filter(t => t !== d.id) : [...formData.designTypes, d.id]})}
                    className={`w-full p-8 rounded-[2.5rem] border text-left flex justify-between items-center transition-all ${formData.designTypes.includes(d.id) ? 'bg-blue-600 border-blue-600 shadow-xl' : 'bg-zinc-900/50 border-white/5'}`}
                  >
                    <div><span className="text-lg font-black uppercase italic block">{d.name}</span><span className="text-[10px] font-black uppercase text-zinc-500">{d.price.toLocaleString()} UZS</span></div>
                    {formData.designTypes.includes(d.id) && <CheckCircle2 size={24} />}
                  </button>
                ))}
              </div>
              <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="flex-1 py-6 bg-transparent text-white font-black uppercase rounded-3xl border border-white/5 text-[10px] tracking-widest">Orqaga</button>
                <PremiumButton disabled={formData.designTypes.length === 0} onClick={() => setStep(3)} className="flex-[2] py-6">Davom etish</PremiumButton>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <h3 className="text-4xl font-black uppercase italic tracking-tighter">O'YIN MAVZUSI</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[30rem] overflow-y-auto no-scrollbar p-4 bg-zinc-900/50 rounded-[3rem] border border-white/5">
                {GAMES.map(g => (
                  <button key={g} onClick={() => setFormData({...formData, game: g})} className={`p-4 rounded-xl border text-[10px] font-black uppercase text-left truncate transition-all ${formData.game === g ? 'bg-blue-600 border-blue-600 shadow-lg' : 'bg-black border-white/5 text-zinc-600 hover:text-white'}`}>{g}</button>
                ))}
              </div>
              <div className="flex gap-4">
                <button onClick={() => setStep(2)} className="flex-1 py-6 bg-transparent text-white font-black uppercase rounded-3xl border border-white/5 text-[10px] tracking-widest">Orqaga</button>
                <PremiumButton disabled={!formData.game} onClick={() => setStep(4)} className="flex-[2] py-6">Davom etish</PremiumButton>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const AdminDashboard = () => {
  const { user, t } = useApp();
  const [tab, setTab] = useState<'orders' | 'portfolio' | 'broadcast' | 'schedule'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<AppUserMetadata[]>([]);

  useEffect(() => {
    if (!user?.isOwner) return;
    const oRef = ref(database, 'orders');
    const uRef = ref(database, 'users');
    onValue(oRef, (s) => setOrders(s.val() ? Object.values(s.val()) : []));
    onValue(uRef, (s) => setUsers(s.val() ? Object.values(s.val()) : []));
    return () => { off(oRef); off(uRef); };
  }, [user]);

  if (!user?.isOwner) return <Navigate to="/" />;

  return (
    <div className="pt-40 pb-20 px-6 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 mb-20">
        <div><h2 className="text-7xl font-black uppercase italic tracking-tighter leading-none">ADMIN <span className="text-blue-600">COMMAND.</span></h2><p className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.5em] mt-4">Authorized operations only</p></div>
        <div className="flex bg-zinc-900/50 p-2 rounded-[2rem] border border-white/5 backdrop-blur-3xl">
          {['orders', 'portfolio', 'broadcast', 'schedule'].map((t: any) => (
            <button key={t} onClick={() => setTab(t)} className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === t ? 'bg-blue-600 text-white shadow-xl' : 'text-zinc-500 hover:text-white'}`}>{t}</button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
          {tab === 'orders' && <div className="grid grid-cols-1 gap-6">
            {orders.map(o => (
              <div key={o.id} className="bg-zinc-900/30 border border-white/5 p-10 rounded-[3rem] flex justify-between items-center group hover:bg-zinc-900/50 transition-colors">
                <div className="space-y-2">
                  <div className="flex gap-4 items-center"><span className="text-[10px] font-black uppercase text-zinc-600">ID: {o.id}</span><StatusBadge status={o.status} /></div>
                  <h4 className="text-3xl font-black uppercase italic">{o.firstName} {o.lastName}</h4>
                  <p className="text-xs text-zinc-500 font-black uppercase">{o.designTypes.join(' + ')} • {o.game}</p>
                  {o.status === OrderStatus.CANCELLED && <p className="text-rose-500 text-[10px] font-black uppercase">Reason: {o.cancelReason}</p>}
                </div>
                <div className="text-right space-y-4">
                  <p className="text-3xl font-black italic text-blue-500">{o.totalPrice.toLocaleString()} UZS</p>
                  <select 
                    value={o.status} 
                    onChange={async (e) => await update(ref(database, `orders/${o.id}`), { status: e.target.value })}
                    className="bg-black border border-white/10 p-3 rounded-xl text-[10px] font-black uppercase text-zinc-500"
                  >
                    <option value={OrderStatus.CHECKING}>Checking</option>
                    <option value={OrderStatus.CHECKED}>Checked</option>
                    <option value={OrderStatus.APPROVED}>Approved</option>
                    <option value={OrderStatus.CANCELLED}>Cancelled</option>
                  </select>
                </div>
              </div>
            ))}
          </div>}
          {tab === 'portfolio' && <PortfolioAdmin />}
          {tab === 'broadcast' && <BroadcastAdmin users={users} />}
          {tab === 'schedule' && <ScheduleAdmin />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const PortfolioAdmin = () => {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    const pRef = ref(database, 'portfolio');
    onValue(pRef, s => setItems(s.val() ? Object.keys(s.val()).map(k => ({ ...s.val()[k], id: k })) : []));
    return () => off(pRef);
  }, []);

  const handleUpload = async () => {
    if (!title || !file) return;
    setLoading(true);
    try {
      const id = Math.random().toString(36).substring(7);
      const storageRef = sRef(storage, `portfolio/${id}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await set(ref(database, `portfolio/${id}`), { title, imageUrl: url, createdAt: new Date().toISOString() });
      setTitle(''); setFile(null); setPreview(null);
    } catch(e) { alert("Xatolik!"); }
    finally { setLoading(false); }
  };

  const handleDelete = async (item: PortfolioItem) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
    try {
      await remove(ref(database, `portfolio/${item.id}`));
      await deleteObject(sRef(storage, `portfolio/${item.id}`));
    } catch(e) {}
  };

  return (
    <div className="space-y-20">
      <div className="max-w-xl mx-auto bg-zinc-900/50 p-12 rounded-[4rem] border border-white/5 shadow-2xl space-y-8">
        <h3 className="text-4xl font-black uppercase italic tracking-tighter text-center">YANGI ISH QO'SHISH</h3>
        <input type="text" placeholder="Design Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-black border border-white/5 p-6 rounded-3xl outline-none font-black text-xs uppercase" />
        <label className="block w-full aspect-video border-2 border-dashed border-white/5 rounded-[3rem] cursor-pointer hover:bg-white/5 transition-all overflow-hidden flex items-center justify-center relative">
          {preview ? <img src={preview} className="w-full h-full object-cover" /> : <div className="text-center opacity-30"><ImageIcon size={48} className="mx-auto mb-4" /><span className="text-[10px] font-black uppercase">Choose Image</span></div>}
          <input type="file" className="hidden" accept="image/*" onChange={e => {
            const f = e.target.files?.[0];
            if (f) {
              setFile(f);
              const r = new FileReader();
              r.onload = (re) => setPreview(re.target?.result as string);
              r.readAsDataURL(f);
            }
          }} />
        </label>
        <PremiumButton loading={loading} disabled={!title || !file} onClick={handleUpload} className="w-full py-6">Publish Work</PremiumButton>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {items.map(i => (
          <div key={i.id} className="group relative aspect-video rounded-[2.5rem] overflow-hidden border border-white/5">
            <img src={i.imageUrl} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-6 text-center">
              <p className="font-black uppercase italic mb-6 text-xs">{i.title}</p>
              <button onClick={() => handleDelete(i)} className="p-4 bg-rose-600 rounded-2xl shadow-xl hover:scale-110 active:scale-90 transition-all"><Trash2 size={24}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BroadcastAdmin = ({ users }: { users: AppUserMetadata[] }) => {
  const [title, setTitle] = useState('');
  const [msg, setMsg] = useState('');
  const [target, setTarget] = useState('global');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if(!title || !msg) return;
    setLoading(true);
    try {
      const id = Math.random().toString(36).substring(7);
      let attachmentUrl = undefined;
      if (file) {
        const sr = sRef(storage, `broadcast/${id}`);
        await uploadBytes(sr, file);
        attachmentUrl = await getDownloadURL(sr);
      }
      const path = target === 'global' ? `notifications/global/${id}` : `notifications/private/${target}/${id}`;
      await set(ref(database, path), { id, title, message: msg, attachmentUrl, type: target === 'global' ? 'global' : 'private', targetUid: target === 'global' ? null : target, createdAt: new Date().toISOString() });
      setTitle(''); setMsg(''); setFile(null);
    } catch(e) {}
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto bg-zinc-900/50 p-16 rounded-[4rem] border border-white/5 space-y-10">
      <h3 className="text-4xl font-black uppercase italic tracking-tighter text-center">MESSAGE DISPATCH</h3>
      <select value={target} onChange={e => setTarget(e.target.value)} className="w-full bg-black border border-white/5 p-5 rounded-2xl outline-none text-[10px] font-black uppercase tracking-widest text-zinc-400">
        <option value="global">ALL USERS (GLOBAL)</option>
        {users.map(u => <option key={u.uid} value={u.uid}>{u.displayName}</option>)}
      </select>
      <input type="text" placeholder="Headline" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-black border border-white/5 p-5 rounded-2xl outline-none font-black text-xs uppercase" />
      <textarea placeholder="Message body..." value={msg} onChange={e => setMsg(e.target.value)} className="w-full h-48 bg-black border border-white/5 p-6 rounded-3xl outline-none resize-none font-medium text-sm text-zinc-300" />
      <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full bg-black border border-white/5 p-4 rounded-2xl outline-none text-[10px] text-zinc-500" />
      <PremiumButton loading={loading} onClick={handleSend} className="w-full py-6">Transmit Intel</PremiumButton>
    </div>
  );
};

const ScheduleAdmin = () => {
  const { schedule, t } = useApp();
  const [hours, setHours] = useState(schedule);
  return (
    <div className="max-w-xl mx-auto bg-zinc-900/50 p-16 rounded-[4rem] border border-white/5 space-y-12 text-center">
      <h3 className="text-4xl font-black uppercase italic tracking-tighter">WORKING HOURS</h3>
      <div className="grid grid-cols-2 gap-10">
        <div><label className="text-[10px] font-black text-zinc-500 uppercase">Start</label><input type="time" value={hours.start} onChange={e => setHours({...hours, start: e.target.value})} className="w-full bg-black border border-white/5 p-6 rounded-[1.5rem] mt-4 font-black text-2xl" /></div>
        <div><label className="text-[10px] font-black text-zinc-500 uppercase">End</label><input type="time" value={hours.end} onChange={e => setHours({...hours, end: e.target.value})} className="w-full bg-black border border-white/5 p-6 rounded-[1.5rem] mt-4 font-black text-2xl" /></div>
      </div>
      <PremiumButton onClick={() => set(ref(database, 'config/workingHours'), hours)} className="w-full py-6">Update Schedule</PremiumButton>
    </div>
  );
};

// --- Other Logic & Wrappers ---

const Home = () => {
  const { t } = useApp();
  return (
    <div className="overflow-hidden">
      <HeroSection />
      <section className="py-40 px-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
        <FeatureCard icon={<Images size={32}/>} title="High-End Production" desc="Professional graphics designed in high resolution for peak visual performance." />
        <FeatureCard icon={<Clock size={32}/>} title="Fast Delivery" desc="Optimized workflows mean your designs are ready in record time." />
        <FeatureCard icon={<ShieldCheck size={32}/>} title="Direct Support" desc="One-on-one communication with the designer via encrypted channels." />
      </section>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }: any) => (
  <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="p-14 bg-zinc-900/30 rounded-[4rem] border border-white/5 hover:bg-zinc-900/50 transition-colors group">
    <div className="w-16 h-16 bg-blue-600/10 text-blue-500 rounded-[1.5rem] flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform mb-8">{icon}</div>
    <h4 className="text-2xl font-black uppercase italic mb-4">{title}</h4>
    <p className="text-zinc-500 text-sm font-medium uppercase tracking-wider leading-[1.8]">{desc}</p>
  </motion.div>
);

const MyOrdersPage = () => {
  const { user, t } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [cancelling, setCancelling] = useState<Order | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if(!user) return;
    const oRef = ref(database, 'orders');
    const unsub = onValue(oRef, (s) => {
      const data = s.val();
      if(data) {
        setOrders(Object.values(data).filter((o: any) => o.userId === user.uid).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as Order[]);
      } else setOrders([]);
    });
    return () => off(oRef);
  }, [user]);

  const handleCancel = async () => {
    if(!cancelling || !reason.trim()) return;
    await update(ref(database, `orders/${cancelling.id}`), { status: OrderStatus.CANCELLED, cancelReason: reason });
    await sendCancellationToTelegram(cancelling, reason);
    setCancelling(null); setReason('');
  };

  if(!user) return <Navigate to="/" />;

  return (
    <div className="pt-40 pb-20 px-6 max-w-5xl mx-auto min-h-screen">
      <h2 className="text-7xl font-black uppercase italic mb-20 tracking-tighter leading-none">YOUR <span className="text-blue-600">INTEL.</span></h2>
      <div className="space-y-6">
        {orders.map(o => (
          <div key={o.id} className="bg-zinc-900/50 border border-white/5 p-10 rounded-[3rem] flex flex-col md:flex-row justify-between items-center gap-8 group transition-all">
            <div className="space-y-2">
              <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">{new Date(o.createdAt).toLocaleString()}</p>
              <h4 className="text-3xl font-black uppercase italic leading-tight">{o.designTypes.join(' + ')}</h4>
              <div className="bg-blue-600/10 text-blue-500 text-[10px] font-black px-4 py-1.5 rounded-xl inline-block border border-blue-500/20">{o.game}</div>
            </div>
            <div className="flex flex-col items-end gap-4">
              <p className="text-blue-500 font-black text-4xl italic tracking-tighter">{o.totalPrice.toLocaleString()} UZS</p>
              <div className="flex items-center gap-4">
                <StatusBadge status={o.status} />
                {o.status === OrderStatus.CHECKING && <button onClick={() => setCancelling(o)} className="p-3 bg-zinc-800 rounded-2xl text-zinc-600 hover:text-rose-500 transition-colors"><XCircle size={22}/></button>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {cancelling && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCancelling(null)} className="absolute inset-0 bg-black/90 backdrop-blur-3xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-xl bg-zinc-900 border border-white/5 rounded-[4rem] p-12 space-y-8 shadow-2xl">
              <h3 className="text-4xl font-black uppercase italic tracking-tighter">CANCELLATION</h3>
              <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Please explain reason for cancellation..." className="w-full h-48 bg-black border border-white/5 p-8 rounded-[2.5rem] outline-none resize-none" />
              <div className="flex gap-4">
                <button onClick={() => setCancelling(null)} className="flex-1 py-5 bg-zinc-800 rounded-3xl font-black uppercase text-[10px]">Abort</button>
                <PremiumButton variant="danger" onClick={handleCancel} disabled={!reason.trim()} className="flex-1 py-5">Confirm Cancel</PremiumButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const NotificationDrawer = () => {
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);

  useEffect(() => {
    if(!user) return;
    const gRef = ref(database, 'notifications/global');
    const pRef = ref(database, `notifications/private/${user.uid}`);
    onValue(gRef, (s) => {
      const gData = s.val() ? Object.values(s.val()) : [];
      onValue(pRef, (ps) => {
        const pData = ps.val() ? Object.values(ps.val()) : [];
        setNotifs([...gData, ...pData].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as Notification[]);
      });
    });
  }, [user]);

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed bottom-10 right-10 z-[50] w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-[0_20px_40px_rgba(37,99,235,0.4)] hover:scale-110 active:scale-90 transition-all">
        <Bell size={28} />
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full max-w-lg bg-zinc-950 h-full border-l border-white/5 p-12 overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between mb-12"><h3 className="text-4xl font-black uppercase italic tracking-tighter">ALERTS</h3><button onClick={() => setOpen(false)} className="p-4 hover:bg-white/5 rounded-3xl transition-all"><X size={28} /></button></div>
              <div className="space-y-8">
                {notifs.map(n => (
                  <div key={n.id} className="p-10 bg-zinc-900/40 border border-white/5 rounded-[3.5rem] space-y-6 shadow-xl">
                    <h4 className="font-black text-2xl italic uppercase text-white leading-tight">{n.title}</h4>
                    <p className="text-zinc-400 text-sm font-medium leading-relaxed">{n.message}</p>
                    {n.attachmentUrl && (
                      <div className="rounded-3xl overflow-hidden border border-white/10 p-4 bg-black/40">
                        <img src={n.attachmentUrl} className="w-full rounded-2xl mb-4" />
                        <a href={n.attachmentUrl} download className="block text-center py-4 bg-zinc-800 rounded-2xl text-[10px] font-black uppercase">Download Intel</a>
                      </div>
                    )}
                    <span className="text-[10px] font-black text-zinc-700 block text-right">{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

const LoginPrompt = () => (
  <div className="pt-40 flex flex-col items-center justify-center px-6 text-center space-y-10">
    <div className="w-24 h-24 bg-zinc-900/50 rounded-[2.5rem] flex items-center justify-center border border-white/5 shadow-2xl"><User size={48} className="text-blue-600" /></div>
    <h2 className="text-6xl font-black uppercase italic tracking-tighter">AUTH REQUIRED</h2>
    <PremiumButton onClick={signInWithGoogle} className="px-14 py-8">Sign in with Google</PremiumButton>
  </div>
);

const BlockedOverlay = ({ status }: { status: BlockStatus }) => (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-6">
    <div className="max-w-md w-full text-center bg-zinc-900 border border-rose-500/20 p-16 rounded-[4rem] shadow-2xl">
      <ShieldAlert size={60} className="mx-auto mb-8 text-rose-500" />
      <h3 className="text-4xl font-black uppercase italic tracking-tighter mb-4 text-white">ACCESS DENIED</h3>
      <p className="text-zinc-500 font-bold leading-relaxed mb-10">Your neural connection has been severed by the administrator.</p>
      <PremiumButton onClick={logout} className="w-full">Sign Out</PremiumButton>
    </div>
  </div>
);
