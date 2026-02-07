
import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, User, ShoppingBag, Images, CheckCircle2, ChevronRight, LogOut, LogIn,
  ShieldCheck, Check, Menu, X, Send, ArrowRight,
  Bell, Trash2, ShieldAlert, Clock, Image as ImageIcon,
  Upload, CreditCard, Globe, Calendar, Layers, Users, Megaphone, Info,
  Smartphone, ExternalLink
} from 'lucide-react';
import { LoadingScreen } from './components/LoadingScreen';
import { ProtectedImage } from './components/ProtectedImage';
import { auth, signInWithGoogle, logout, database } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, set, get, remove, off, update } from 'firebase/database';
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
    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white ring-2 ring-black">
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
    return now >= start || now <= end; 
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
              <span key={link.path} className="text-[10px] font-black uppercase text-zinc-700 cursor-not-allowed flex items-center gap-2 opacity-50">
                {link.name} <Clock size={12} />
              </span>
            ) : (
              <Link key={link.path} to={link.path} className={`text-[10px] font-black uppercase transition-colors hover:text-blue-500 ${location.pathname === link.path ? 'text-blue-500' : 'text-zinc-400'}`}>{link.name}</Link>
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
              <button onClick={signInWithGoogle} className="px-5 py-2 bg-white text-black text-[10px] font-black uppercase rounded-lg hover:bg-zinc-200 transition-colors flex items-center gap-2">{t.nav.signIn}</button>
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

  const basePrice = useMemo(() => {
    let base = 0;
    if (formData.designTypes.includes('Banner')) base += DESIGN_PRICES.BANNER;
    if (formData.designTypes.includes('Avatar')) base += DESIGN_PRICES.AVATAR;
    if (formData.designTypes.includes('Preview')) base += DESIGN_PRICES.PREVIEW;
    return base;
  }, [formData.designTypes]);

  const totalPrice = useMemo(() => {
    return formData.promoCode === PROMO_CODE ? basePrice * (1 - PROMO_DISCOUNT) : basePrice;
  }, [basePrice, formData.promoCode]);

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
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(34,197,94,0.3)]">
              <Check size={48} className="text-white" />
            </div>
            <h2 className="text-4xl font-black uppercase italic">{t.order.successTitle}</h2>
            <p className="text-zinc-500 mt-4 uppercase tracking-widest text-xs font-bold">{t.order.redirecting}</p>
          </motion.div>
        ) : (
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
            <div className="flex items-center justify-between mb-8">
               {[1,2,3,4].map(i => (
                 <div key={i} className={`h-1.5 flex-1 mx-1 rounded-full ${step >= i ? 'bg-blue-600' : 'bg-zinc-900'}`} />
               ))}
            </div>

            {step === 1 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-black uppercase italic">{t.order.personalTitle}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input type="text" placeholder={t.order.firstName} value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="bg-zinc-900 border border-white/10 p-4 rounded-xl outline-none" />
                  <input type="text" placeholder={t.order.lastName} value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="bg-zinc-900 border border-white/10 p-4 rounded-xl outline-none" />
                </div>
                <div className="flex gap-4">
                   <button onClick={() => setFormData({...formData, gender: 'Male'})} className={`flex-1 py-4 rounded-xl font-black uppercase text-xs border ${formData.gender === 'Male' ? 'bg-blue-600 border-blue-600' : 'bg-zinc-900 border-white/10 text-zinc-500'}`}>{t.order.genderMale}</button>
                   <button onClick={() => setFormData({...formData, gender: 'Female'})} className={`flex-1 py-4 rounded-xl font-black uppercase text-xs border ${formData.gender === 'Female' ? 'bg-blue-600 border-blue-600' : 'bg-zinc-900 border-white/10 text-zinc-500'}`}>{t.order.genderFemale}</button>
                </div>
                <input type="text" placeholder={t.order.phone} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-zinc-900 border border-white/10 p-4 rounded-xl outline-none" />
                <input type="text" placeholder={t.order.telegram} value={formData.telegram} onChange={e => setFormData({...formData, telegram: e.target.value})} className="w-full bg-zinc-900 border border-white/10 p-4 rounded-xl outline-none" />
                <button disabled={!formData.firstName || formData.phone.length < 9} onClick={() => setStep(2)} className="w-full py-5 bg-white text-black font-black rounded-xl uppercase tracking-widest text-xs disabled:opacity-20">{t.order.continue}</button>
              </div>
            )}
            
            {step === 2 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-black uppercase italic">{t.order.designTitle}</h3>
                {[
                  { id: 'Banner', label: t.order.banner, price: DESIGN_PRICES.BANNER },
                  { id: 'Avatar', label: t.order.avatar, price: DESIGN_PRICES.AVATAR },
                  { id: 'Preview', label: t.order.preview, price: DESIGN_PRICES.PREVIEW },
                ].map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => setFormData({...formData, designTypes: formData.designTypes.includes(item.id) ? formData.designTypes.filter(t => t !== item.id) : [...formData.designTypes, item.id]})}
                    className={`w-full p-6 rounded-2xl border text-left flex justify-between items-center transition-all ${formData.designTypes.includes(item.id) ? 'bg-blue-600 border-blue-600' : 'bg-zinc-900 border-white/10'}`}
                  >
                    <div>
                      <span className="font-black uppercase block">{item.label}</span>
                      <span className="text-[10px] text-zinc-400 font-bold">{item.price.toLocaleString()} {t.common.uzs}</span>
                    </div>
                    {formData.designTypes.includes(item.id) && <CheckCircle2 size={24} />}
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
                <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto no-scrollbar border border-white/5 p-2 rounded-2xl bg-black/20">
                  {GAMES.map(g => (
                    <button key={g} onClick={() => setFormData({...formData, game: g})} className={`p-4 rounded-xl border text-[10px] font-bold uppercase text-left truncate ${formData.game === g ? 'bg-blue-600 border-blue-600' : 'bg-zinc-900 border-white/10 text-zinc-500'}`}>{g}</button>
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
                <div className="bg-zinc-900 p-8 rounded-[2rem] space-y-6 border border-white/5">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-zinc-500">{t.order.selectedServices}</p>
                    {formData.designTypes.map(d => (
                      <div key={d} className="flex justify-between items-center text-sm font-bold">
                        <span>{d}</span>
                        <span className="text-zinc-500">{(DESIGN_PRICES as any)[d.toUpperCase()].toLocaleString()} {t.common.uzs}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-zinc-500">{t.order.promoCode}</p>
                    <div className="flex gap-2">
                      <input type="text" placeholder={t.order.enterCode} value={formData.promoCode} onChange={e => setFormData({...formData, promoCode: e.target.value})} className="flex-1 bg-black p-4 rounded-xl outline-none text-xs border border-white/5" />
                      {formData.promoCode === PROMO_CODE && <div className="flex items-center gap-1 text-green-500 font-bold text-[10px] uppercase"><Check size={12}/> {t.order.discountApplied}</div>}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-zinc-500">{t.order.totalPrice}</span>
                    <p className="text-blue-500 font-black text-3xl italic">{totalPrice.toLocaleString()} {t.common.uzs}</p>
                  </div>

                  <div className="p-4 bg-black/50 rounded-xl border border-white/10 text-center space-y-2">
                    <p className="text-[9px] font-black uppercase text-zinc-600">{t.order.paymentTarget}</p>
                    <div className="font-mono text-xl tracking-widest text-white">4073 4200 8456 9577</div>
                  </div>
                </div>

                <label className="flex items-center gap-4 cursor-pointer p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                  <input type="checkbox" checked={formData.paymentConfirmed} onChange={e => setFormData({...formData, paymentConfirmed: e.target.checked})} className="w-5 h-5 rounded accent-blue-600" />
                  <span className="text-xs font-bold text-zinc-400 uppercase leading-tight">{t.order.confirmPayment}</span>
                </label>

                <div className="flex gap-4">
                  <button onClick={() => setStep(3)} className="flex-1 py-5 bg-zinc-900 text-white font-black rounded-xl border border-white/10 uppercase text-xs">{t.order.back}</button>
                  <button disabled={!formData.paymentConfirmed || submitting} onClick={handleSubmit} className="flex-1 py-5 bg-blue-600 text-white font-black rounded-xl uppercase text-xs disabled:opacity-20 shadow-[0_10px_30px_rgba(37,99,235,0.2)]">
                    {submitting ? t.order.processing : t.order.submit}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Portfolio View ---
const Portfolio: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pRef = ref(database, 'portfolio');
    const unsub = onValue(pRef, s => {
      setItems(Object.values(s.val() || {}).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as PortfolioItem[]);
      setLoading(false);
    });
    return () => off(pRef, 'value', unsub);
  }, []);

  return (
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-screen">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
        <h2 className="text-5xl font-black uppercase italic mb-4">{t.portfolio.title}</h2>
        <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px]">{t.portfolio.subtitle}</p>
      </motion.div>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-video bg-zinc-900 animate-pulse rounded-[2.5rem]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map(item => (
            <motion.div key={item.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <ProtectedImage src={item.imageUrl} alt={item.title} className="aspect-video rounded-[2.5rem] shadow-2xl border border-white/5" />
              <p className="mt-4 text-center font-black uppercase italic text-xs text-zinc-500">{item.title}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Admin Panel Sub-components ---

const AdminDashboard: React.FC<{ user: UserProfile | null }> = ({ user }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'orders' | 'portfolio' | 'users' | 'broadcast' | 'schedule'>('orders');
  const [users, setUsers] = useState<AppUserMetadata[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!user?.isOwner) return;
    const usersRef = ref(database, 'users');
    const ordersRef = ref(database, 'orders');
    const unsubUsers = onValue(usersRef, s => setUsers(Object.values(s.val() || {}) as AppUserMetadata[]));
    const unsubOrders = onValue(ordersRef, s => {
      const allOrders = Object.values(s.val() || {}) as Order[];
      setOrders(allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    return () => { off(usersRef); off(ordersRef); };
  }, [user]);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    await update(ref(database, `orders/${orderId}`), { status });
  };

  if (!user?.isOwner) return <Navigate to="/" />;

  return (
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-16">
        <div>
          <h2 className="text-5xl font-black uppercase italic mb-2">{t.admin.title}</h2>
          <p className="text-zinc-600 font-bold uppercase tracking-widest text-[10px]">{t.admin.subtitle}</p>
        </div>
        <div className="flex bg-zinc-900 p-1.5 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar max-w-full">
          {['orders', 'portfolio', 'users', 'broadcast', 'schedule'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>
              {t.admin.tabs[tab as keyof typeof t.admin.tabs]}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          {activeTab === 'orders' && (
            <div className="grid grid-cols-1 gap-4">
              {orders.length === 0 ? <p className="text-center py-20 text-zinc-800 font-black uppercase">{t.myOrders.noOrders}</p> : orders.map(o => (
                <div key={o.id} className="bg-zinc-900/50 border border-white/5 p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                       <span className="text-[10px] font-black uppercase text-zinc-600">ID: {o.id}</span>
                       <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${o.status === OrderStatus.CHECKING ? 'bg-orange-600/20 text-orange-500 border border-orange-500/20' : o.status === OrderStatus.CHECKED ? 'bg-blue-600/20 text-blue-500 border border-blue-500/20' : 'bg-green-600/20 text-green-500 border border-green-500/20'}`}>{o.status}</span>
                    </div>
                    <h4 className="text-xl font-black uppercase italic">{o.firstName} {o.lastName}</h4>
                    <p className="text-[10px] text-zinc-500 font-bold mt-1 uppercase tracking-widest">{o.designTypes.join(' + ')} — {o.game}</p>
                    <div className="mt-4 flex items-center gap-4">
                       <a href={`tel:${o.phoneNumber}`} className="p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"><Smartphone size={16}/></a>
                       <a href={`https://t.me/${o.telegramUsername.replace('@', '')}`} target="_blank" className="p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"><Send size={16}/></a>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-4 w-full md:w-auto">
                    <div className="text-right">
                       <p className="text-blue-500 font-black text-2xl italic">{o.totalPrice.toLocaleString()} {t.common.uzs}</p>
                       <span className="text-[9px] text-zinc-600 uppercase font-black">{t.admin.orderPrice}</span>
                    </div>
                    <select 
                      value={o.status} 
                      onChange={e => updateStatus(o.id, e.target.value as OrderStatus)}
                      className="w-full md:w-auto bg-black border border-white/10 p-3 rounded-xl text-[10px] font-black uppercase text-zinc-400 outline-none"
                    >
                      <option value={OrderStatus.CHECKING}>{t.common.checking}</option>
                      <option value={OrderStatus.CHECKED}>{t.common.checked}</option>
                      <option value={OrderStatus.APPROVED}>{t.common.approved}</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'schedule' && <ScheduleAdmin />}
          {activeTab === 'portfolio' && <PortfolioManagerAdmin />}
          {activeTab === 'users' && <UserModerationAdmin />}
          {activeTab === 'broadcast' && <BroadcasterAdmin users={users} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const ScheduleAdmin = () => {
  const { t } = useTranslation();
  const [schedule, setSchedule] = useState<WorkingHours>({ start: "10:00", end: "19:00" });
  useEffect(() => {
    const sRef = ref(database, 'config/workingHours');
    const unsub = onValue(sRef, s => { if(s.val()) setSchedule(s.val()); });
    return () => off(sRef, 'value', unsub);
  }, []);
  const save = async () => {
    await set(ref(database, 'config/workingHours'), schedule);
    alert(t.admin.schedule.success);
  };
  return (
    <div className="bg-zinc-900/50 p-10 rounded-[3rem] max-w-lg mx-auto space-y-8 border border-white/5">
      <h3 className="text-2xl font-black uppercase italic text-center">{t.admin.schedule.title}</h3>
      <div className="grid grid-cols-2 gap-8">
        <div>
          <label className="text-[10px] uppercase font-black text-zinc-600 ml-1">{t.admin.schedule.start}</label>
          <input type="time" value={schedule.start} onChange={e => setSchedule({...schedule, start: e.target.value})} className="w-full bg-black border border-white/5 p-5 rounded-2xl outline-none mt-2 text-white font-black" />
        </div>
        <div>
          <label className="text-[10px] uppercase font-black text-zinc-600 ml-1">{t.admin.schedule.end}</label>
          <input type="time" value={schedule.end} onChange={e => setSchedule({...schedule, end: e.target.value})} className="w-full bg-black border border-white/5 p-5 rounded-2xl outline-none mt-2 text-white font-black" />
        </div>
      </div>
      <button onClick={save} className="w-full py-5 bg-blue-600 font-black uppercase rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]">{t.admin.schedule.save}</button>
    </div>
  );
};

const PortfolioManagerAdmin = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [title, setTitle] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const pRef = ref(database, 'portfolio');
    const unsub = onValue(pRef, s => setItems(Object.values(s.val() || {}) as PortfolioItem[]));
    return () => off(pRef, 'value', unsub);
  }, []);

  const handleAdd = async () => {
    if (!title || !preview) return;
    setUploading(true);
    const id = Math.random().toString(36).substring(7);
    await set(ref(database, `portfolio/${id}`), { id, title, imageUrl: preview, createdAt: new Date().toISOString() });
    setTitle(''); setPreview(null); setUploading(false);
  };

  return (
    <div className="space-y-12">
      <div className="bg-zinc-900/50 p-10 rounded-[3rem] space-y-6 max-w-xl mx-auto border border-white/5">
        <h3 className="text-2xl font-black uppercase italic text-center">{t.admin.portfolioAdd}</h3>
        <input type="text" placeholder={t.admin.designTitle} value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-black border border-white/10 p-5 rounded-2xl outline-none font-bold" />
        <label className="block w-full aspect-video border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:bg-zinc-800 transition-all overflow-hidden flex items-center justify-center bg-black/40">
           {preview ? <img src={preview} className="w-full h-full object-cover" /> : <div className="text-center"><ImageIcon size={40} className="mx-auto mb-2 text-zinc-700"/><span className="text-[10px] font-black uppercase text-zinc-600">{t.admin.pickImage}</span></div>}
           <input type="file" className="hidden" accept="image/*" onChange={e => {
             const reader = new FileReader();
             reader.onload = (re) => setPreview(re.target?.result as string);
             if(e.target.files?.[0]) reader.readAsDataURL(e.target.files[0]);
           }} />
        </label>
        <button disabled={uploading || !title || !preview} onClick={handleAdd} className="w-full py-5 bg-blue-600 font-black uppercase rounded-2xl disabled:opacity-30">{uploading ? '...' : t.admin.portfolioAdd}</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {items.map(i => (
          <div key={i.id} className="relative group rounded-[2rem] overflow-hidden aspect-video border border-white/5">
            <img src={i.imageUrl} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <button onClick={() => remove(ref(database, `portfolio/${i.id}`))} className="p-4 bg-red-600 rounded-2xl shadow-xl hover:scale-110 transition-transform"><Trash2 size={24}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const UserModerationAdmin = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<AppUserMetadata[]>([]);
  useEffect(() => {
    const uRef = ref(database, 'users');
    const unsub = onValue(uRef, s => setUsers(Object.values(s.val() || {}) as AppUserMetadata[]));
    return () => off(uRef, 'value', unsub);
  }, []);
  const toggleBlock = async (uid: string, cur: boolean) => {
    await update(ref(database, `users/${uid}`), { 
      blockStatus: { isBlocked: !cur, blockedUntil: !cur ? -1 : 0 } 
    });
  };
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {users.length === 0 ? <p className="text-center text-zinc-800 font-black uppercase">{t.notifications.noNotifications}</p> : users.map(u => (
        <div key={u.uid} className="bg-zinc-900/50 border border-white/5 p-6 rounded-[2rem] flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src={u.photoURL} className="w-12 h-12 rounded-2xl ring-2 ring-white/5" />
            <div>
              <p className="font-black text-sm">{u.displayName}</p>
              <p className="text-[10px] text-zinc-500 font-bold uppercase">{u.email}</p>
            </div>
          </div>
          <button onClick={() => toggleBlock(u.uid, !!u.blockStatus?.isBlocked)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${u.blockStatus?.isBlocked ? 'bg-green-600/20 text-green-500 border border-green-500/20' : 'bg-red-600/20 text-red-500 border border-red-500/20'}`}>
            {u.blockStatus?.isBlocked ? t.admin.userUnblock : t.admin.userBlock}
          </button>
        </div>
      ))}
    </div>
  );
};

const BroadcasterAdmin: React.FC<{ users: AppUserMetadata[] }> = ({ users }) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [msg, setMsg] = useState('');
  const [target, setTarget] = useState('global');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if(!title || !msg) return;
    setSending(true);
    const id = Math.random().toString(36).substring(7);
    const path = target === 'global' ? `notifications/global/${id}` : `notifications/private/${target}/${id}`;
    await set(ref(database, path), { 
      id, title, message: msg, createdAt: new Date().toISOString(), 
      type: target === 'global' ? 'global' : 'private',
      targetUid: target === 'global' ? null : target
    });
    setTitle(''); setMsg(''); setSending(false);
    alert(t.admin.successBroadcast);
  };

  return (
    <div className="bg-zinc-900/50 p-10 rounded-[3rem] space-y-6 max-w-xl mx-auto border border-white/5">
      <h3 className="text-2xl font-black uppercase italic text-center">{t.admin.tabs.broadcast}</h3>
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase text-zinc-600 ml-1">{t.admin.transmissionTarget}</label>
        <select value={target} onChange={e => setTarget(e.target.value)} className="w-full bg-black border border-white/10 p-5 rounded-2xl outline-none text-xs font-black uppercase text-zinc-400">
          <option value="global">{t.admin.broadcastAll}</option>
          {users.map(u => <option key={u.uid} value={u.uid}>{u.displayName}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase text-zinc-600 ml-1">{t.admin.headline}</label>
        <input type="text" placeholder={t.admin.headline} value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-black border border-white/10 p-5 rounded-2xl outline-none font-bold" />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase text-zinc-600 ml-1">{t.admin.messageContent}</label>
        <textarea placeholder={t.admin.messageContent} value={msg} onChange={e => setMsg(e.target.value)} className="w-full h-40 bg-black border border-white/10 p-5 rounded-2xl outline-none resize-none font-medium" />
      </div>
      <button disabled={sending || !title || !msg} onClick={send} className="w-full py-5 bg-blue-600 font-black uppercase rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]">{sending ? '...' : t.admin.dispatch}</button>
    </div>
  );
};

// --- Main App Logic ---

export default function App() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('lang') as Language) || 'uz-Latn');
  const [isAppReady, setIsAppReady] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [blockStatus, setBlockStatus] = useState<BlockStatus | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const { schedule, isWorking, tashkentTime } = useWorkingHoursLogic();

  useEffect(() => { localStorage.setItem('lang', language); }, [language]);
  const t = useMemo(() => translations[language], [language]);

  useEffect(() => {
    let gUnsub: (() => void) | undefined;
    let pUnsub: (() => void) | undefined;
    let mUnsub: (() => void) | undefined;

    const authUnsub = onAuthStateChanged(auth, async (fireUser) => {
      if (fireUser) {
        const profile: UserProfile = {
          uid: fireUser.uid, email: fireUser.email || '', 
          displayName: fireUser.displayName || 'User',
          photoURL: fireUser.photoURL || `https://ui-avatars.com/api/?name=${fireUser.displayName}&background=random`,
          isOwner: fireUser.email === OWNER_EMAIL
        };
        setUser(profile);
        
        const userRef = ref(database, `users/${fireUser.uid}`);
        
        mUnsub = onValue(userRef, s => {
           const meta = s.val() as AppUserMetadata | null;
           if (meta?.blockStatus) setBlockStatus(meta.blockStatus);
           if (meta?.readNotifications) setReadIds(meta.readNotifications);
        });

        // Initialize user metadata
        const snapshot = await get(userRef);
        const currentMeta = snapshot.val();
        await set(userRef, {
          ...currentMeta,
          uid: profile.uid, 
          email: profile.email, 
          displayName: profile.displayName, 
          photoURL: profile.photoURL,
          lastLogin: new Date().toISOString()
        });

        const gRef = ref(database, 'notifications/global');
        const pRef = ref(database, `notifications/private/${fireUser.uid}`);

        let gNotifs: Notification[] = [];
        let pNotifs: Notification[] = [];

        const updateNotifs = () => setNotifications([...gNotifs, ...pNotifs].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as Notification[]);

        const gCallback = onValue(gRef, s => { gNotifs = Object.values(s.val() || {}) as Notification[]; updateNotifs(); });
        const pCallback = onValue(pRef, s => { pNotifs = Object.values(s.val() || {}) as Notification[]; updateNotifs(); });
        
        gUnsub = () => off(gRef, 'value', gCallback);
        pUnsub = () => off(pRef, 'value', pCallback);
      } else {
        setUser(null); setNotifications([]); setBlockStatus(null);
        if (gUnsub) gUnsub(); if (pUnsub) pUnsub(); if (mUnsub) mUnsub();
      }
      setIsAppReady(true);
    });

    return () => {
      authUnsub(); if (gUnsub) gUnsub(); if (pUnsub) pUnsub(); if (mUnsub) mUnsub();
    };
  }, []);

  const unreadCount = useMemo(() => notifications.filter(n => !readIds.includes(n.id)).length, [notifications, readIds]);

  const markRead = async (id: string) => {
    if (!user || readIds.includes(id)) return;
    const newReadIds = [...readIds, id];
    setReadIds(newReadIds);
    await update(ref(database, `users/${user.uid}`), { readNotifications: newReadIds });
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <Router>
        <LoadingScreen onComplete={() => {}} />
        <div className={`min-h-screen bg-[#050505] transition-opacity duration-1000 ${isAppReady ? 'opacity-100' : 'opacity-0'}`}>
          {blockStatus?.isBlocked && <BlockedOverlay status={blockStatus} />}
          <Navbar user={user} unreadCount={unreadCount} onToggleNotifications={() => setShowNotifications(true)} isWorking={isWorking} />
          
          <Routes>
            <Route path="/" element={
              <div className="relative">
                <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-20 overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-blue-600/5 blur-[160px] rounded-full pointer-events-none" />
                  
                  <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="z-10 mb-8 bg-zinc-900/50 backdrop-blur-md border border-white/5 px-6 py-3 rounded-full flex items-center gap-6">
                    <div className="flex items-center gap-2">
                       <Clock size={14} className="text-blue-500" />
                       <span className="text-[10px] font-black uppercase tracking-widest">{tashkentTime}</span>
                    </div>
                    <div className="h-3 w-px bg-white/10" />
                    <div className="flex items-center gap-2">
                       <div className={`w-1.5 h-1.5 rounded-full ${isWorking ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                       <span className="text-[10px] font-black uppercase tracking-widest">{isWorking ? t.hero.statusOpen : t.hero.statusClosed}</span>
                    </div>
                    <div className="h-3 w-px bg-white/10" />
                    <div className="flex items-center gap-2">
                       <Calendar size={14} className="text-zinc-500" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{schedule.start} - {schedule.end}</span>
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center z-10">
                    <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-blue-500 font-black uppercase tracking-[0.4em] text-xs mb-6 leading-none">{t.hero.greeting}</motion.h2>
                    <h1 className="text-7xl md:text-[10rem] font-black tracking-tighter mb-8 leading-[0.8] italic uppercase">
                      ELBEK <br /> <span className="text-blue-600">DESIGNER.</span>
                    </h1>
                    <p className="text-zinc-600 max-w-2xl mx-auto text-[10px] md:text-sm mb-12 uppercase tracking-[0.2em] font-bold leading-relaxed">{t.hero.welcome}</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                      {isWorking ? (
                        <Link to="/order" className="group px-12 py-6 bg-white text-black font-black rounded-3xl hover:bg-blue-600 hover:text-white transition-all duration-500 flex items-center gap-3 shadow-[0_20px_40px_rgba(255,255,255,0.05)]">
                          {t.hero.ctaOrder} <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                      ) : (
                        <div className="px-12 py-6 bg-zinc-900 text-zinc-600 font-black rounded-3xl flex items-center gap-3 cursor-not-allowed">
                          {t.hero.ctaClosed} <Clock size={20} />
                        </div>
                      )}
                      <Link to="/portfolio" className="px-12 py-6 bg-zinc-950 text-white font-black rounded-3xl border border-white/5 hover:border-white/20 transition-all uppercase tracking-widest text-[10px]">{t.hero.ctaGallery}</Link>
                    </div>
                  </motion.div>
                </section>
                
                {/* Additional Info Section */}
                <section className="py-32 px-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
                   <div className="p-10 bg-zinc-900/40 rounded-[3rem] border border-white/5 space-y-4">
                      <div className="w-12 h-12 bg-blue-600/20 text-blue-500 rounded-2xl flex items-center justify-center"><Images size={24}/></div>
                      <h4 className="text-xl font-black uppercase italic">Professional Graphics</h4>
                      <p className="text-zinc-500 text-sm leading-relaxed">High-end banners, avatars and previews crafted specifically for content creators.</p>
                   </div>
                   <div className="p-10 bg-zinc-900/40 rounded-[3rem] border border-white/5 space-y-4">
                      <div className="w-12 h-12 bg-blue-600/20 text-blue-500 rounded-2xl flex items-center justify-center"><Clock size={24}/></div>
                      <h4 className="text-xl font-black uppercase italic">Fast Turnaround</h4>
                      <p className="text-zinc-500 text-sm leading-relaxed">Efficient workflow ensures your designs are delivered within the promised timeframe.</p>
                   </div>
                   <div className="p-10 bg-zinc-900/40 rounded-[3rem] border border-white/5 space-y-4">
                      <div className="w-12 h-12 bg-blue-600/20 text-blue-500 rounded-2xl flex items-center justify-center"><Smartphone size={24}/></div>
                      <h4 className="text-xl font-black uppercase italic">Easy Communication</h4>
                      <p className="text-zinc-500 text-sm leading-relaxed">Track your orders and communicate directly via Telegram for the best results.</p>
                   </div>
                </section>
              </div>
            } />
            <Route path="/order" element={user ? <OrderForm user={user} isWorking={isWorking} /> : <div className="pt-40 px-6 text-center space-y-8"><h2 className="text-4xl font-black uppercase italic">{t.order.loginPrompt}</h2><button onClick={signInWithGoogle} className="px-12 py-6 bg-blue-600 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl">Sign in with Google</button></div>} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/my-orders" element={<MyOrdersPage user={user} />} />
            <Route path="/admin" element={<AdminDashboard user={user} />} />
          </Routes>

          {/* Notifications Drawer */}
          <AnimatePresence>
            {showNotifications && (
              <div className="fixed inset-0 z-[60] flex justify-end">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNotifications(false)} className="absolute inset-0 bg-black/95 backdrop-blur-md" />
                <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full max-w-lg bg-zinc-950 h-full border-l border-white/5 flex flex-col shadow-2xl">
                  <div className="p-10 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-3xl font-black uppercase tracking-tighter italic">{t.notifications.title}</h3>
                    <button onClick={() => setShowNotifications(false)} className="p-4 hover:bg-zinc-900 rounded-2xl transition-all"><X size={24} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
                    {notifications.length === 0 ? <div className="text-center py-20"><Info size={40} className="mx-auto mb-4 text-zinc-800"/><p className="text-zinc-800 uppercase font-black text-[10px]">{t.notifications.noNotifications}</p></div> : notifications.map(n => (
                      <div key={n.id} onMouseEnter={() => markRead(n.id)} className={`p-8 bg-zinc-900/50 border ${readIds.includes(n.id) ? 'border-white/5' : 'border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]'} rounded-[2.5rem] space-y-4`}>
                        <h4 className="font-black text-xl italic uppercase leading-none">{n.title}</h4>
                        <p className="text-zinc-400 text-sm leading-relaxed">{n.message}</p>
                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                          <span className="text-[8px] text-zinc-700 font-black uppercase">{new Date(n.createdAt).toLocaleString()}</span>
                          {n.link && <a href={n.link} target="_blank" className="text-[9px] font-black uppercase text-blue-500 hover:underline flex items-center gap-1">{t.notifications.openLink} <ExternalLink size={10}/></a>}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </Router>
    </LanguageContext.Provider>
  );
}

// --- My Orders Page ---
const MyOrdersPage: React.FC<{ user: UserProfile | null }> = ({ user }) => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if(!user) return;
    const oRef = ref(database, 'orders');
    const unsub = onValue(oRef, (snapshot) => {
      const all = Object.values(snapshot.val() || {}) as Order[];
      setOrders(all.filter(o => o.userId === user.uid).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    });
    return () => off(oRef, 'value', unsub);
  }, [user]);

  if (!user) return <div className="pt-40 text-center uppercase font-black text-zinc-800">Please Sign In</div>;

  return (
    <div className="pt-32 pb-20 px-6 max-w-4xl mx-auto min-h-screen">
      <h2 className="text-5xl font-black uppercase italic mb-12">{t.myOrders.title}</h2>
      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-zinc-900 animate-pulse rounded-[2.5rem]" />)}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20">
          <Info size={40} className="mx-auto mb-4 text-zinc-800" />
          <p className="text-zinc-800 font-black uppercase text-xs">{t.myOrders.noOrders}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => (
            <div key={order.id} className="bg-zinc-900/50 border border-white/5 p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-600 font-black uppercase">{new Date(order.createdAt).toLocaleString()}</p>
                <h4 className="text-2xl font-black uppercase italic">{order.designTypes.join(' + ')}</h4>
                <p className="text-xs text-zinc-500 font-bold tracking-widest uppercase">{order.game}</p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-blue-500 font-black text-3xl italic mb-2">{order.totalPrice.toLocaleString()} {t.common.uzs}</p>
                <span className={`text-[10px] font-black uppercase px-6 py-2 rounded-full border ${order.status === OrderStatus.CHECKING ? 'bg-orange-600/20 text-orange-500 border-orange-500/20' : order.status === OrderStatus.CHECKED ? 'bg-blue-600/20 text-blue-500 border-blue-500/20' : 'bg-green-600/20 text-green-500 border-green-500/20'}`}>{order.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
