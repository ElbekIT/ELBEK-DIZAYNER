
import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, User, ShoppingBag, Images, CheckCircle2, ChevronRight, LogOut, LogIn,
  ShieldCheck, Check, Menu, X, Send, ArrowRight,
  Bell, Trash2, ShieldAlert, Clock, Image as ImageIcon,
  Upload, CardIcon, Globe, Calendar
} from 'lucide-react';
import { LoadingScreen } from './components/LoadingScreen';
import { ProtectedImage } from './components/ProtectedImage';
import { auth, signInWithGoogle, logout, database } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, set, get, remove, off } from 'firebase/database';
import { UserProfile, Order, OrderStatus, PortfolioItem, Notification, BlockStatus, AppUserMetadata, WorkingHours } from './types';
import { GAMES, DESIGN_PRICES, PROMO_CODE, PROMO_DISCOUNT, OWNER_EMAIL } from './constants';
import { Language, translations } from './translations';

// --- Localization Context ---

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations['uz-Latn'];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useTranslation must be used within LanguageProvider");
  return context;
};

// --- Shared Components ---

const NotificationBadge: React.FC<{ count: number }> = ({ count }) => {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-black">
      {count > 9 ? '9+' : count}
    </span>
  );
};

const BlockedOverlay: React.FC<{ status: BlockStatus }> = ({ status }) => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md px-6">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full text-center bg-zinc-900 border border-red-500/20 p-12 rounded-[3rem]">
        <div className="w-20 h-20 bg-red-600/20 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <ShieldAlert size={40} />
        </div>
        <h2 className="text-3xl font-black mb-4 uppercase text-red-500">Access Restricted</h2>
        <p className="text-zinc-400 mb-8 leading-relaxed">Your account has been restricted by the administrator.</p>
        <button onClick={() => auth.signOut()} className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-bold transition-all">{t.nav.signOut}</button>
      </motion.div>
    </div>
  );
};

// --- Working Hours Logic ---

const useWorkingHoursLogic = () => {
  const [schedule, setSchedule] = useState<WorkingHours>({ start: "10:00", end: "19:00" });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const scheduleRef = ref(database, 'config/workingHours');
    const callback = onValue(scheduleRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setSchedule(data);
    });

    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => {
      off(scheduleRef, 'value', callback);
      clearInterval(timer);
    };
  }, []);

  const tashkentTime = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tashkent',
      hour: '2-digit', minute: '2-digit',
      hour12: false
    }).format(currentTime);
  }, [currentTime]);

  const isWorking = useMemo(() => {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const now = toMin(tashkentTime);
    const start = toMin(schedule.start);
    const end = toMin(schedule.end);

    if (start <= end) return now >= start && now <= end;
    return now >= start || now <= end; // Handles overnight e.g. 22:00 - 02:00
  }, [tashkentTime, schedule]);

  return { schedule, isWorking, tashkentTime };
};

// --- Navbar ---

const Navbar: React.FC<{ 
  user: UserProfile | null, 
  unreadCount: number, 
  onToggleNotifications: () => void,
  isWorking: boolean
}> = ({ user, unreadCount, onToggleNotifications, isWorking }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { t, language, setLanguage } = useTranslation();

  const navLinks = [
    { name: t.nav.home, path: '/', icon: Plus },
    { name: t.nav.order, path: '/order', icon: ShoppingBag, disabled: !isWorking },
    { name: t.nav.portfolio, path: '/portfolio', icon: Images },
    { name: t.nav.myOrders, path: '/my-orders', icon: User },
  ];

  if (user?.isOwner) navLinks.push({ name: t.nav.admin, path: '/admin', icon: ShieldCheck });

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-black/60 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-black text-xl italic">ED</div>
          <span className="text-xl font-bold tracking-tight">Elbek<span className="text-blue-500">Design</span></span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(link => (
            link.disabled ? (
              <span key={link.path} className="text-xs font-black uppercase text-zinc-700 cursor-not-allowed flex items-center gap-2 opacity-50">
                {link.name} <Clock size={12} />
              </span>
            ) : (
              <Link key={link.path} to={link.path} className={`text-xs font-black uppercase transition-colors hover:text-blue-500 ${location.pathname === link.path ? 'text-blue-500' : 'text-zinc-400'}`}>{link.name}</Link>
            )
          ))}
          
          <div className="flex items-center gap-4 pl-4 border-l border-white/10">
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-transparent text-[10px] font-black uppercase text-zinc-400 outline-none border-none cursor-pointer hover:text-white"
            >
              <option value="uz-Latn">UZ (LOT)</option>
              <option value="uz-Cyrl">ЎЗ (КИР)</option>
              <option value="ru">RU</option>
            </select>
            {user && (
              <button onClick={onToggleNotifications} className="relative p-2 text-zinc-400 hover:text-white transition-colors">
                <Bell size={18} />
                <NotificationBadge count={unreadCount} />
              </button>
            )}
            {user ? (
              <div className="flex items-center gap-3">
                <img src={user.photoURL} alt="profile" className="w-8 h-8 rounded-full ring-1 ring-blue-600" />
                <button onClick={logout} className="p-2 text-zinc-500 hover:text-red-500 transition-colors"><LogOut size={16} /></button>
              </div>
            ) : (
              <button onClick={signInWithGoogle} className="px-5 py-2 bg-white text-black text-[10px] font-black uppercase rounded-lg hover:bg-zinc-200 transition-colors flex items-center gap-2"> {t.nav.signIn}</button>
            )}
          </div>
        </div>

        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2 text-white">{isOpen ? <X /> : <Menu />}</button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="md:hidden bg-zinc-950 border-b border-white/5 overflow-hidden">
            <div className="px-6 py-8 flex flex-col gap-6">
              {navLinks.map(link => (
                link.disabled ? (
                  <div key={link.path} className="text-lg font-bold flex items-center gap-4 opacity-20 grayscale cursor-not-allowed">
                    <link.icon size={20} /> <span>{link.name} ({t.hero.statusClosed})</span>
                  </div>
                ) : (
                  <Link key={link.path} to={link.path} onClick={() => setIsOpen(false)} className="text-lg font-bold flex items-center gap-4">
                    <link.icon className="text-blue-500" size={20} /> {link.name}
                  </Link>
                )
              ))}
              {!user && <button onClick={() => { signInWithGoogle(); setIsOpen(false); }} className="w-full py-4 bg-blue-600 rounded-xl font-bold uppercase text-xs">{t.nav.signIn}</button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// --- Order Form ---

const OrderForm: React.FC<{ user: UserProfile, isWorking: boolean }> = ({ user, isWorking }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', gender: 'Male' as 'Male' | 'Female',
    phone: '+998 ', telegram: '@', designTypes: [] as string[],
    game: '', message: '', promoCode: '', paymentConfirmed: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const totalPrice = useMemo(() => {
    let base = 0;
    if (formData.designTypes.includes('Banner')) base += DESIGN_PRICES.BANNER;
    if (formData.designTypes.includes('Avatar')) base += DESIGN_PRICES.AVATAR;
    if (formData.designTypes.includes('Preview')) base += DESIGN_PRICES.PREVIEW;
    return formData.promoCode === PROMO_CODE ? base * (1 - PROMO_DISCOUNT) : base;
  }, [formData.designTypes, formData.promoCode]);

  const handleSubmit = async () => {
    if (!formData.paymentConfirmed || submitting || !isWorking) return;
    try {
      setSubmitting(true);
      const orderId = Math.random().toString(36).substring(7).toUpperCase();
      const newOrder: Order = {
        id: orderId, userId: user.uid, userEmail: user.email, userName: user.displayName,
        firstName: formData.firstName, lastName: formData.lastName, gender: formData.gender,
        phoneNumber: formData.phone, telegramUsername: formData.telegram,
        designTypes: formData.designTypes, game: formData.game, message: formData.message,
        totalPrice, status: OrderStatus.CHECKING, createdAt: new Date().toISOString()
      };
      if (formData.promoCode) newOrder.promoCode = formData.promoCode;

      await set(ref(database, `orders/${orderId}`), newOrder);
      setDone(true);
      setTimeout(() => navigate('/my-orders'), 2000);
    } catch (error) {
      alert("Submission failed. Please check connection.");
      setSubmitting(false);
    }
  };

  if (!isWorking) return (
    <div className="pt-40 px-6 text-center max-w-2xl mx-auto">
      <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto mb-8 text-zinc-600"><Clock size={40} /></div>
      <h2 className="text-3xl font-black uppercase italic mb-4">{t.hero.statusClosed}</h2>
      <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-black">{t.order.closedWarning}</p>
      <Link to="/" className="inline-block mt-8 px-8 py-4 bg-zinc-900 rounded-xl text-xs font-black uppercase tracking-widest">{t.nav.home}</Link>
    </div>
  );

  return (
    <div className="pt-32 pb-20 px-6 max-w-2xl mx-auto min-h-screen">
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl"><Check size={40} className="text-white" /></div>
            <h2 className="text-3xl font-black uppercase italic">{t.order.successTitle}</h2>
          </motion.div>
        ) : (
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
            {step === 1 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-black uppercase italic">{t.order.personalTitle}</h3>
                <input type="text" placeholder={t.order.firstName} value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-zinc-900 border border-white/10 p-4 rounded-xl outline-none" />
                <input type="text" placeholder={t.order.phone} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-zinc-900 border border-white/10 p-4 rounded-xl outline-none" />
                <input type="text" placeholder={t.order.telegram} value={formData.telegram} onChange={e => setFormData({...formData, telegram: e.target.value})} className="w-full bg-zinc-900 border border-white/10 p-4 rounded-xl outline-none" />
                <button disabled={!formData.firstName || formData.phone.length < 9} onClick={() => setStep(2)} className="w-full py-5 bg-white text-black font-black rounded-xl uppercase tracking-widest text-xs disabled:opacity-20">{t.order.continue}</button>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-black uppercase italic">{t.order.designTitle}</h3>
                {['Banner', 'Avatar', 'Preview'].map(id => (
                  <button 
                    key={id} 
                    onClick={() => setFormData({...formData, designTypes: formData.designTypes.includes(id) ? formData.designTypes.filter(t => t !== id) : [...formData.designTypes, id]})}
                    className={`w-full p-6 rounded-2xl border text-left flex justify-between items-center transition-all ${formData.designTypes.includes(id) ? 'bg-blue-600 border-blue-600' : 'bg-zinc-900 border-white/10'}`}
                  >
                    <span className="font-black uppercase">{id}</span>
                    {formData.designTypes.includes(id) && <CheckCircle2 size={24} />}
                  </button>
                ))}
                <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="flex-1 py-5 bg-zinc-900 text-white font-black rounded-xl border border-white/10 uppercase text-xs">{t.order.back}</button>
                  <button disabled={formData.designTypes.length === 0} onClick={() => setStep(3)} className="flex-1 py-5 bg-white text-black font-black rounded-xl uppercase text-xs disabled:opacity-20">{t.order.continue}</button>
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-black uppercase italic">{t.order.gameTitle}</h3>
                <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto no-scrollbar">
                  {GAMES.map(g => (
                    <button key={g} onClick={() => setFormData({...formData, game: g})} className={`p-4 rounded-xl border text-[10px] font-bold uppercase ${formData.game === g ? 'bg-blue-600 border-blue-600' : 'bg-zinc-900 border-white/10'}`}>{g}</button>
                  ))}
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setStep(2)} className="flex-1 py-5 bg-zinc-900 text-white font-black rounded-xl border border-white/10 uppercase text-xs">{t.order.back}</button>
                  <button disabled={!formData.game} onClick={() => setStep(4)} className="flex-1 py-5 bg-white text-black font-black rounded-xl uppercase text-xs disabled:opacity-20">{t.order.continue}</button>
                </div>
              </div>
            )}
            {step === 4 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-black uppercase italic">{t.order.checkoutTitle}</h3>
                <div className="bg-zinc-900 p-8 rounded-[2rem] space-y-4">
                  <p className="text-blue-500 font-black text-3xl italic">{totalPrice.toLocaleString()} {t.common.uzs}</p>
                  <div className="p-4 bg-black/50 rounded-xl border border-white/5 font-mono text-center">4073 4200 8456 9577</div>
                </div>
                <label className="flex items-center gap-4 cursor-pointer p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                  <input type="checkbox" checked={formData.paymentConfirmed} onChange={e => setFormData({...formData, paymentConfirmed: e.target.checked})} className="w-5 h-5 rounded" />
                  <span className="text-xs font-bold text-zinc-400 uppercase">{t.order.confirmPayment}</span>
                </label>
                <div className="flex gap-4">
                  <button onClick={() => setStep(3)} className="flex-1 py-5 bg-zinc-900 text-white font-black rounded-xl border border-white/10 uppercase text-xs">{t.order.back}</button>
                  <button disabled={!formData.paymentConfirmed || submitting} onClick={handleSubmit} className="flex-1 py-5 bg-blue-600 text-white font-black rounded-xl uppercase text-xs disabled:opacity-20">{submitting ? '...' : t.order.submit}</button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Portfolio & Admin Dashboard (Simplified for App Flow) ---
const Portfolio: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  useEffect(() => {
    const pRef = ref(database, 'portfolio');
    const unsub = onValue(pRef, s => setItems(Object.values(s.val() || {})));
    return () => off(pRef, 'value', unsub);
  }, []);
  return (
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
      <h2 className="text-4xl font-black uppercase italic mb-12 text-center">{t.portfolio.title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(item => <ProtectedImage key={item.id} src={item.imageUrl} alt={item.title} className="aspect-video rounded-3xl" />)}
      </div>
    </div>
  );
};

// --- Main App Logic ---

export default function App() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('lang') as Language) || 'uz-Latn');
  const [isAppReady, setIsAppReady] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const { schedule, isWorking, tashkentTime } = useWorkingHoursLogic();

  useEffect(() => { localStorage.setItem('lang', language); }, [language]);
  const t = useMemo(() => translations[language], [language]);

  useEffect(() => {
    let gUnsub: (() => void) | undefined;
    let pUnsub: (() => void) | undefined;

    const authUnsub = onAuthStateChanged(auth, async (fireUser) => {
      if (fireUser) {
        const profile: UserProfile = {
          uid: fireUser.uid, email: fireUser.email || '', 
          displayName: fireUser.displayName || 'User',
          photoURL: fireUser.photoURL || `https://ui-avatars.com/api/?name=${fireUser.displayName}`,
          isOwner: fireUser.email === OWNER_EMAIL
        };
        setUser(profile);
        const userRef = ref(database, `users/${fireUser.uid}`);
        const snapshot = await get(userRef);
        const meta = snapshot.val() as AppUserMetadata | null;
        if (meta?.readNotifications) setReadIds(meta.readNotifications);

        const gRef = ref(database, 'notifications/global');
        const pRef = ref(database, `notifications/private/${fireUser.uid}`);

        let gNotifs: Notification[] = [];
        let pNotifs: Notification[] = [];

        const updateNotifs = () => setNotifications([...gNotifs, ...pNotifs].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

        const gCallback = onValue(gRef, s => { gNotifs = Object.values(s.val() || {}); updateNotifs(); });
        const pCallback = onValue(pRef, s => { pNotifs = Object.values(s.val() || {}); updateNotifs(); });
        
        gUnsub = () => off(gRef, 'value', gCallback);
        pUnsub = () => off(pRef, 'value', pCallback);
      } else {
        setUser(null); setNotifications([]);
        if (gUnsub) gUnsub(); if (pUnsub) pUnsub();
      }
      setIsAppReady(true);
    });

    return () => {
      authUnsub(); if (gUnsub) gUnsub(); if (pUnsub) pUnsub();
    };
  }, []);

  const unreadCount = useMemo(() => notifications.filter(n => !readIds.includes(n.id)).length, [notifications, readIds]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <Router>
        <LoadingScreen onComplete={() => {}} />
        <div className={`min-h-screen bg-[#050505] transition-opacity duration-1000 ${isAppReady ? 'opacity-100' : 'opacity-0'}`}>
          <Navbar user={user} unreadCount={unreadCount} onToggleNotifications={() => setShowNotifications(true)} isWorking={isWorking} />
          
          <Routes>
            <Route path="/" element={
              <div className="relative">
                <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-20">
                  <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="z-10 mb-8 bg-zinc-900/50 backdrop-blur-md border border-white/5 px-6 py-3 rounded-full flex items-center gap-6">
                    <div className="flex items-center gap-2">
                       <Clock size={14} className="text-blue-500" />
                       <span className="text-[10px] font-black uppercase tracking-widest">{tashkentTime}</span>
                    </div>
                    <div className={`w-1.5 h-1.5 rounded-full ${isWorking ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{schedule.start} - {schedule.end}</span>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center z-10">
                    <h1 className="text-6xl md:text-[8rem] font-black tracking-tighter mb-8 leading-[0.8] italic uppercase">
                      ELBEK <br /> <span className="text-blue-600">DESIGNER</span>
                    </h1>
                    <p className="text-zinc-600 max-w-xl mx-auto text-xs md:text-sm mb-12 uppercase tracking-widest font-bold leading-relaxed">{t.hero.welcome}</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                      {isWorking ? (
                        <Link to="/order" className="px-12 py-6 bg-white text-black font-black rounded-3xl hover:bg-blue-600 hover:text-white transition-all duration-500 flex items-center gap-3">{t.hero.ctaOrder} <ArrowRight size={22} /></Link>
                      ) : (
                        <div className="px-12 py-6 bg-zinc-900 text-zinc-600 font-black rounded-3xl flex items-center gap-3 cursor-not-allowed">{t.hero.ctaClosed} <Clock size={20} /></div>
                      )}
                      <Link to="/portfolio" className="px-12 py-6 bg-zinc-950 text-white font-black rounded-3xl border border-white/5 uppercase tracking-widest text-[10px]">{t.hero.ctaGallery}</Link>
                    </div>
                  </motion.div>
                </section>
              </div>
            } />
            <Route path="/order" element={user ? <OrderForm user={user} isWorking={isWorking} /> : <div className="pt-40 text-center"><h2 className="text-2xl font-black uppercase italic mb-8">{t.order.loginPrompt}</h2><button onClick={signInWithGoogle} className="px-10 py-5 bg-blue-600 rounded-2xl font-black uppercase tracking-widest text-xs">Sign in with Google</button></div>} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/my-orders" element={<div className="pt-40 text-center font-black uppercase text-zinc-800">Order tracking is active</div>} />
          </Routes>
        </div>
      </Router>
    </LanguageContext.Provider>
  );
}
