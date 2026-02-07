
import React, { useState, useEffect, useMemo, createContext, useContext, useRef } from 'react';
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
import { ref, onValue, set, get, remove, off, update } from 'firebase/database';
import { ref as sRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { UserProfile, Order, OrderStatus, PortfolioItem, Notification, BlockStatus, AppUserMetadata, WorkingHours } from './types';
import { GAMES, DESIGN_PRICES, PROMO_CODE, PROMO_DISCOUNT, OWNER_EMAIL } from './constants';
import { Language, translations } from './translations';
import { sendOrderToTelegram, sendCancellationToTelegram } from './services/telegramService';

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
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full text-center bg-zinc-900 border border-red-500/20 p-12 rounded-[3rem] shadow-[0_0_50px_rgba(239,68,68,0.1)]">
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

// --- Phone Masking Logic (Strict +998 90 123 45 67) ---

const formatPhoneNumber = (value: string) => {
  const digits = value.replace(/\D/g, '').startsWith('998') ? value.replace(/\D/g, '').slice(3) : value.replace(/\D/g, '');
  const limited = digits.slice(0, 9);
  
  let result = '+998';
  if (limited.length > 0) result += ' ' + limited.slice(0, 2);
  if (limited.length > 2) result += ' ' + limited.slice(2, 5);
  if (limited.length > 5) result += ' ' + limited.slice(5, 7);
  if (limited.length > 7) result += ' ' + limited.slice(7, 9);
  
  return result;
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
    <nav className="fixed top-0 left-0 right-0 z-40 bg-black/60 backdrop-blur-2xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.05 }} className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl italic shadow-[0_0_20px_rgba(37,99,235,0.3)]">ED</motion.div>
          <span className="text-xl font-bold tracking-tight">Elbek<span className="text-blue-500">Design</span></span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(link => (
            link.disabled ? (
              <span key={link.path} className="text-[10px] font-black uppercase text-zinc-700 cursor-not-allowed flex items-center gap-2 opacity-50">
                {link.name} <Clock size={12} />
              </span>
            ) : (
              <Link key={link.path} to={link.path} className={`text-[10px] font-black uppercase tracking-widest transition-all hover:text-blue-500 ${location.pathname === link.path ? 'text-blue-500 scale-105 underline decoration-2 underline-offset-8' : 'text-zinc-400'}`}>{link.name}</Link>
            )
          ))}
          
          <div className="flex items-center gap-6 pl-6 border-l border-white/10">
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-transparent text-[10px] font-black uppercase text-zinc-500 outline-none border-none cursor-pointer hover:text-white transition-colors"
            >
              <option value="uz-Latn">UZ</option>
              <option value="uz-Cyrl">ЎЗ</option>
              <option value="ru">RU</option>
            </select>
            {user && (
              <button onClick={onToggleNotifications} className="relative p-2 text-zinc-400 hover:text-white transition-all">
                <Bell size={18} />
                <NotificationBadge count={unreadCount} />
              </button>
            )}
            {user ? (
              <div className="flex items-center gap-4">
                <img src={user.photoURL} alt="profile" className="w-9 h-9 rounded-xl ring-1 ring-blue-600 object-cover shadow-lg" />
                <button onClick={logout} className="p-2 text-zinc-500 hover:text-red-500 transition-colors"><LogOut size={16} /></button>
              </div>
            ) : (
              <button onClick={signInWithGoogle} className="px-6 py-2.5 bg-white text-black text-[10px] font-black uppercase rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 shadow-xl">{t.nav.signIn}</button>
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
              {!user && <button onClick={() => { signInWithGoogle(); setIsOpen(false); }} className="w-full py-4 bg-blue-600 rounded-2xl font-black uppercase text-xs">{t.nav.signIn}</button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// --- Order Form Component ---

const OrderForm: React.FC<{ user: UserProfile, isWorking: boolean }> = ({ user, isWorking }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [noPromo, setNoPromo] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', gender: 'Male' as 'Male' | 'Female',
    phone: '+998', telegram: '@', designTypes: [] as string[],
    game: '', message: '', promoCode: '', paymentConfirmed: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({...formData, phone: formatted});
  };

  const basePrice = useMemo(() => {
    let base = 0;
    if (formData.designTypes.includes('Banner')) base += DESIGN_PRICES.BANNER;
    if (formData.designTypes.includes('Avatar')) base += DESIGN_PRICES.AVATAR;
    if (formData.designTypes.includes('Preview')) base += DESIGN_PRICES.PREVIEW;
    return base;
  }, [formData.designTypes]);

  const totalPrice = useMemo(() => {
    return (!noPromo && formData.promoCode === PROMO_CODE) ? basePrice * (1 - PROMO_DISCOUNT) : basePrice;
  }, [basePrice, formData.promoCode, noPromo]);

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
      if (!noPromo && formData.promoCode) newOrder.promoCode = formData.promoCode;

      await set(ref(database, `orders/${orderId}`), newOrder);
      await sendOrderToTelegram(newOrder);

      setDone(true);
      setTimeout(() => navigate('/my-orders'), 2000);
    } catch (error) {
      console.error("Submission error:", error);
      alert("Submission failed. Please check connection.");
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-32 pb-20 px-6 max-w-2xl mx-auto min-h-screen">
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20">
            <div className="w-32 h-32 bg-green-500 rounded-[3rem] flex items-center justify-center mx-auto mb-10 shadow-[0_0_60px_rgba(34,197,94,0.3)]">
              <Check size={64} className="text-white" />
            </div>
            <h2 className="text-5xl font-black uppercase italic">{t.order.successTitle}</h2>
            <p className="text-zinc-500 mt-6 uppercase tracking-[0.3em] text-xs font-bold">{t.order.redirecting}</p>
          </motion.div>
        ) : (
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
            <div className="flex items-center justify-between gap-2 px-1">
               {[1,2,3,4].map(i => (
                 <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${step >= i ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-zinc-900'}`} />
               ))}
            </div>

            {step === 1 && (
              <div className="space-y-8">
                <div className="space-y-2">
                  <h3 className="text-3xl font-black uppercase italic">{t.order.personalTitle}</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Enter your identity details</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-600 ml-1">{t.order.firstName}</label>
                    <input type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-zinc-900/50 border border-white/5 p-5 rounded-2xl outline-none focus:border-blue-500/50 transition-all font-bold" placeholder="ISh" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-600 ml-1">{t.order.lastName}</label>
                    <input type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full bg-zinc-900/50 border border-white/5 p-5 rounded-2xl outline-none focus:border-blue-500/50 transition-all font-bold" placeholder="FAMILYA" />
                  </div>
                </div>
                <div className="flex gap-4">
                   <button onClick={() => setFormData({...formData, gender: 'Male'})} className={`flex-1 py-5 rounded-2xl font-black uppercase text-xs border transition-all ${formData.gender === 'Male' ? 'bg-green-600 border-green-600 shadow-xl' : 'bg-zinc-900/50 border-white/5 text-zinc-600 hover:text-white'}`}>{t.order.genderMale}</button>
                   <button onClick={() => setFormData({...formData, gender: 'Female'})} className={`flex-1 py-5 rounded-2xl font-black uppercase text-xs border transition-all ${formData.gender === 'Female' ? 'bg-red-600 border-red-600 shadow-xl' : 'bg-zinc-900/50 border-white/5 text-zinc-600 hover:text-white'}`}>{t.order.genderFemale}</button>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-600 ml-1">{t.order.phone}</label>
                  <input type="tel" value={formData.phone} onChange={handlePhoneChange} className="w-full bg-zinc-900/50 border border-white/5 p-5 rounded-2xl outline-none focus:border-blue-500/50 transition-all font-mono text-xl tracking-widest font-black" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-600 ml-1">{t.order.telegram}</label>
                  <input type="text" value={formData.telegram} onChange={e => setFormData({...formData, telegram: e.target.value})} className="w-full bg-zinc-900/50 border border-white/5 p-5 rounded-2xl outline-none focus:border-blue-500/50 transition-all font-bold" placeholder="@elbek_designer" />
                </div>
                <button disabled={!formData.firstName || formData.phone.length < 17} onClick={() => setStep(2)} className="w-full py-6 bg-white text-black font-black rounded-2xl uppercase tracking-[0.2em] text-[10px] disabled:opacity-20 hover:scale-[1.02] transition-all shadow-2xl active:scale-95">{t.order.continue}</button>
              </div>
            )}
            
            {step === 2 && (
              <div className="space-y-8">
                <div className="space-y-2">
                  <h3 className="text-3xl font-black uppercase italic">{t.order.designTitle}</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Select one or more services</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { id: 'Banner', label: t.order.banner, price: DESIGN_PRICES.BANNER, icon: Layers },
                    { id: 'Avatar', label: t.order.avatar, price: DESIGN_PRICES.AVATAR, icon: User },
                    { id: 'Preview', label: t.order.preview, price: DESIGN_PRICES.PREVIEW, icon: ImageIcon },
                  ].map(item => (
                    <button 
                      key={item.id} 
                      onClick={() => setFormData({...formData, designTypes: formData.designTypes.includes(item.id) ? formData.designTypes.filter(t => t !== item.id) : [...formData.designTypes, item.id]})}
                      className={`group w-full p-8 rounded-[2rem] border text-left flex justify-between items-center transition-all ${formData.designTypes.includes(item.id) ? 'bg-blue-600 border-blue-600 shadow-xl' : 'bg-zinc-900/50 border-white/5 hover:border-white/10'}`}
                    >
                      <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${formData.designTypes.includes(item.id) ? 'bg-white/20' : 'bg-zinc-800 text-zinc-500 group-hover:text-white'}`}>
                          <item.icon size={24} />
                        </div>
                        <div>
                          <span className="font-black uppercase block text-lg italic">{item.label}</span>
                          <span className="text-[10px] text-zinc-400 font-black tracking-widest uppercase">{(item.price).toLocaleString()} {t.common.uzs}</span>
                        </div>
                      </div>
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${formData.designTypes.includes(item.id) ? 'bg-white border-white text-blue-600' : 'border-white/10'}`}>
                        {formData.designTypes.includes(item.id) && <Check size={18} strokeWidth={4} />}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="flex-1 py-6 bg-zinc-950 text-white font-black rounded-2xl border border-white/5 uppercase text-[10px] tracking-widest hover:bg-zinc-900 transition-all">{t.order.back}</button>
                  <button disabled={formData.designTypes.length === 0} onClick={() => setStep(3)} className="flex-1 py-6 bg-white text-black font-black rounded-2xl uppercase text-[10px] tracking-widest disabled:opacity-20 hover:scale-[1.02] transition-all shadow-2xl active:scale-95">{t.order.continue}</button>
                </div>
              </div>
            )}
            
            {step === 3 && (
              <div className="space-y-8">
                <div className="space-y-2">
                  <h3 className="text-3xl font-black uppercase italic">{t.order.gameTitle}</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Select the theme of your graphics</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[32rem] overflow-y-auto pr-2 no-scrollbar border border-white/5 p-4 rounded-[2.5rem] bg-zinc-900/30">
                  {GAMES.map(g => (
                    <button 
                      key={g} 
                      onClick={() => setFormData({...formData, game: g})} 
                      className={`p-4 rounded-xl border text-[10px] font-black uppercase text-left truncate transition-all ${formData.game === g ? 'bg-blue-600 border-blue-600 shadow-lg text-white' : 'bg-zinc-900/50 border-white/5 text-zinc-600 hover:text-zinc-400 hover:border-white/10'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setStep(2)} className="flex-1 py-6 bg-zinc-950 text-white font-black rounded-2xl border border-white/5 uppercase text-[10px] tracking-widest">{t.order.back}</button>
                  <button disabled={!formData.game} onClick={() => setStep(4)} className="flex-1 py-6 bg-white text-black font-black rounded-2xl uppercase text-[10px] tracking-widest disabled:opacity-20 hover:scale-[1.02] transition-all shadow-2xl">{t.order.continue}</button>
                </div>
              </div>
            )}
            
            {step === 4 && (
              <div className="space-y-10">
                <div className="space-y-2">
                  <h3 className="text-3xl font-black uppercase italic">{t.order.checkoutTitle}</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Verify and confirm your purchase</p>
                </div>

                <div className="bg-zinc-900/50 border border-white/5 p-10 rounded-[3rem] space-y-10 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <ShoppingBag size={120} />
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em]">{t.order.selectedServices}</p>
                    <div className="space-y-3">
                      {formData.designTypes.map(d => (
                        <div key={d} className="flex justify-between items-center text-sm font-black uppercase italic">
                          <span className="text-zinc-300">{d}</span>
                          <span className="text-zinc-500">{(DESIGN_PRICES as any)[d.toUpperCase()].toLocaleString()} {t.common.uzs}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em]">{t.order.promoCode}</p>
                    <div className="flex flex-col gap-4">
                      {!noPromo && (
                        <input 
                          type="text" 
                          placeholder={t.order.enterCode} 
                          value={formData.promoCode} 
                          onChange={e => {
                            setFormData({...formData, promoCode: e.target.value});
                            if (e.target.value) setNoPromo(false);
                          }} 
                          className="w-full bg-black border border-white/5 p-5 rounded-2xl outline-none font-black text-xs uppercase tracking-widest text-blue-500 focus:border-blue-500/50" 
                        />
                      )}
                      
                      {!formData.promoCode && (
                        <button 
                          onClick={() => setNoPromo(!noPromo)} 
                          className={`text-left text-[10px] font-black uppercase transition-colors ${noPromo ? 'text-blue-500' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                          {noPromo ? 'Promokodni kiritish' : t.order.noPromo}
                        </button>
                      )}
                      
                      {!noPromo && formData.promoCode === PROMO_CODE && (
                        <div className="flex items-center gap-2 text-green-500 font-black text-[10px] uppercase bg-green-500/10 p-3 rounded-xl border border-green-500/20">
                          <CheckCircle2 size={14}/> {t.order.discountApplied}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-white/5 flex justify-between items-end">
                    <div>
                      <span className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em]">{t.order.totalPrice}</span>
                      <p className="text-blue-500 font-black text-4xl italic mt-1">{totalPrice.toLocaleString()} {t.common.uzs}</p>
                    </div>
                    <div className="bg-blue-600/10 px-4 py-2 rounded-xl border border-blue-500/20">
                      <CreditCard size={20} className="text-blue-500" />
                    </div>
                  </div>

                  <div className="p-6 bg-black/60 rounded-3xl border border-white/5 text-center space-y-3">
                    <p className="text-[9px] font-black uppercase text-zinc-600 tracking-widest">{t.order.paymentTarget}</p>
                    <div className="font-mono text-xl tracking-[0.2em] text-white font-black select-all cursor-pointer hover:text-blue-500 transition-colors">4073 4200 8456 9577</div>
                  </div>
                </div>

                <div className="space-y-6">
                  <label className="flex items-center gap-5 cursor-pointer p-6 rounded-[2rem] bg-zinc-900/50 border border-white/5 group hover:border-blue-500/30 transition-all">
                    <div className="relative w-6 h-6 flex items-center justify-center">
                      <input type="checkbox" checked={formData.paymentConfirmed} onChange={e => setFormData({...formData, paymentConfirmed: e.target.checked})} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <div className={`w-6 h-6 rounded-lg border-2 transition-all ${formData.paymentConfirmed ? 'bg-blue-600 border-blue-600' : 'border-white/10 group-hover:border-white/20'}`}>
                        {formData.paymentConfirmed && <Check size={16} className="text-white" strokeWidth={4} />}
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-zinc-500 uppercase leading-tight tracking-widest group-hover:text-zinc-300 transition-colors">{t.order.confirmPayment}</span>
                  </label>

                  <div className="flex gap-4">
                    <button onClick={() => setStep(3)} className="flex-1 py-6 bg-zinc-950 text-white font-black rounded-2xl border border-white/5 uppercase text-[10px] tracking-widest">{t.order.back}</button>
                    <button disabled={!formData.paymentConfirmed || submitting} onClick={handleSubmit} className="flex-1 py-6 bg-blue-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest disabled:opacity-20 shadow-[0_15px_40px_rgba(37,99,235,0.3)] hover:scale-[1.02] active:scale-95 transition-all">
                      {submitting ? 'YUBORILMOQDA...' : t.order.submit}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Portfolio Page Logic ---

const Portfolio: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pRef = ref(database, 'portfolio');
    const unsub = onValue(pRef, snapshot => {
      const data = snapshot.val();
      if (data) {
        const itemsArray = Object.keys(data).map(key => ({
          ...data[key],
          id: key
        })) as PortfolioItem[];
        itemsArray.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setItems(itemsArray);
      } else {
        setItems([]);
      }
      setLoading(false);
    });
    return () => off(pRef, 'value', unsub);
  }, []);

  return (
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-screen">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-24">
        <h2 className="text-6xl md:text-8xl font-black uppercase italic mb-6 leading-none tracking-tighter">BIZNING <span className="text-blue-600">ISHLAR.</span></h2>
        <p className="text-zinc-500 font-black uppercase tracking-[0.5em] text-[10px]">{t.portfolio.subtitle}</p>
      </motion.div>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-video bg-zinc-900 animate-pulse rounded-[3rem] border border-white/5" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-40 border-2 border-dashed border-white/5 rounded-[4rem]">
           <ImageIcon size={60} className="mx-auto text-zinc-800 mb-6" />
           <p className="text-zinc-800 font-black uppercase tracking-widest text-sm">Portfolio bo'sh</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {items.map(item => (
            <motion.div key={item.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="group">
              <div className="relative aspect-video rounded-[3rem] overflow-hidden shadow-2xl border border-white/5 transition-all duration-700 group-hover:scale-[1.03]">
                <ProtectedImage src={item.imageUrl} alt={item.title} className="w-full h-full" />
                <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/90 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                   <p className="font-black uppercase italic text-lg tracking-tight">{item.title}</p>
                   <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1">Professional Grade Graphic</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Admin Dashboard (Fixed Portfolio & Messaging) ---

const AdminDashboard: React.FC<{ user: UserProfile | null }> = ({ user }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'orders' | 'portfolio' | 'users' | 'broadcast' | 'schedule'>('orders');
  const [users, setUsers] = useState<AppUserMetadata[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!user?.isOwner) return;
    const usersRef = ref(database, 'users');
    const ordersRef = ref(database, 'orders');
    onValue(usersRef, s => setUsers(Object.values(s.val() || {}) as AppUserMetadata[]));
    onValue(ordersRef, s => {
      const data = s.val();
      setOrders(data ? Object.keys(data).map(k => ({...data[k], id: k})).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as Order[] : []);
    });
  }, [user]);

  if (!user?.isOwner) return <Navigate to="/" />;

  return (
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10 mb-20">
        <div>
          <h2 className="text-7xl font-black uppercase italic mb-3 tracking-tighter">ADMIN <span className="text-blue-600">PANELI.</span></h2>
          <p className="text-zinc-600 font-black uppercase tracking-[0.5em] text-[10px]">{t.admin.subtitle}</p>
        </div>
        <div className="flex bg-zinc-900/50 p-2 rounded-[2rem] border border-white/5 overflow-x-auto no-scrollbar max-w-full backdrop-blur-md">
          {['orders', 'portfolio', 'users', 'broadcast', 'schedule'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-xl' : 'text-zinc-500 hover:text-white'}`}>
              {t.admin.tabs[tab as keyof typeof t.admin.tabs]}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
          {activeTab === 'orders' && (
            <div className="grid grid-cols-1 gap-6">
              {orders.map(o => (
                <div key={o.id} className="bg-zinc-900/30 border border-white/5 p-10 rounded-[3rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-8 hover:bg-zinc-900/50 transition-colors">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-4">
                       <span className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">ORDER ${o.id}</span>
                       <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg ${o.status === OrderStatus.CHECKING ? 'bg-orange-600/20 text-orange-500' : o.status === OrderStatus.CHECKED ? 'bg-blue-600/20 text-blue-500' : o.status === OrderStatus.APPROVED ? 'bg-green-600/20 text-green-500' : 'bg-red-600/20 text-red-500'}`}>{o.status}</span>
                    </div>
                    <div>
                      <h4 className="text-3xl font-black uppercase italic tracking-tight">{o.firstName} {o.lastName}</h4>
                      <p className="text-xs text-zinc-500 font-black mt-1 uppercase tracking-widest">{o.designTypes.join(' • ')} — {o.game}</p>
                    </div>
                    {o.status === OrderStatus.CANCELLED && o.cancelReason && (
                      <div className="bg-red-600/10 border border-red-500/20 p-5 rounded-2xl">
                         <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mb-1">CANCELLATION REASON:</p>
                         <p className="text-sm font-medium text-zinc-300 italic">"{o.cancelReason}"</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-6 w-full md:w-auto">
                    <p className="text-blue-500 font-black text-3xl italic tracking-tighter">{o.totalPrice.toLocaleString()} UZS</p>
                    <div className="flex gap-4">
                      <a href={`tel:${o.phoneNumber}`} className="p-3 bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all"><Smartphone size={20}/></a>
                      <select 
                        value={o.status} 
                        onChange={async (e) => await update(ref(database, `orders/${o.id}`), { status: e.target.value })}
                        className="bg-black border border-white/5 p-3 rounded-xl text-[10px] font-black uppercase text-zinc-400 outline-none"
                      >
                        <option value={OrderStatus.CHECKING}>{t.common.checking}</option>
                        <option value={OrderStatus.CHECKED}>{t.common.checked}</option>
                        <option value={OrderStatus.APPROVED}>{t.common.approved}</option>
                        <option value={OrderStatus.CANCELLED}>{t.common.cancelled}</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'portfolio' && <PortfolioManagerAdmin />}
          {activeTab === 'users' && <UserModerationAdmin />}
          {activeTab === 'broadcast' && <BroadcasterAdmin users={users} />}
          {activeTab === 'schedule' && <ScheduleAdmin />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const PortfolioManagerAdmin = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    onValue(ref(database, 'portfolio'), s => setItems(s.val() ? Object.keys(s.val()).map(k => ({...s.val()[k], id: k})) : []));
  }, []);

  const handleAdd = async () => {
    if (!title || !file) return;
    setUploading(true);
    const id = Math.random().toString(36).substring(7);
    try {
      const storageRef = sRef(storage, `portfolio/${id}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await set(ref(database, `portfolio/${id}`), { id, title, imageUrl: url, createdAt: new Date().toISOString() });
      setTitle(''); setFile(null); setPreview(null);
    } catch (e) { alert("Xatolik yuz berdi"); }
    finally { setUploading(true); setUploading(false); }
  };

  const handleDelete = async (item: PortfolioItem) => {
    if(!confirm("Haqiqatan ham o'chirmoqchimisiz?")) return;
    try {
      await remove(ref(database, `portfolio/${item.id}`));
      try { await deleteObject(sRef(storage, `portfolio/${item.id}`)); } catch(e) {}
    } catch(e) { alert("Xatolik"); }
  };

  return (
    <div className="space-y-20">
      <div className="bg-zinc-900/50 p-16 rounded-[4rem] space-y-10 max-w-2xl mx-auto border border-white/5 shadow-2xl">
        <h3 className="text-4xl font-black uppercase italic tracking-tighter text-center">GALLEREYAGA QO'SHISH</h3>
        <input type="text" placeholder="Dizayn nomi" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-black border border-white/5 p-6 rounded-[1.5rem] outline-none font-black text-xs uppercase" />
        <label className="block w-full aspect-video border-2 border-dashed border-white/10 rounded-[2.5rem] cursor-pointer hover:bg-zinc-800 transition-all overflow-hidden flex items-center justify-center bg-black/40">
           {preview ? <img src={preview} className="w-full h-full object-cover" /> : <div className="text-center opacity-30"><ImageIcon size={60} className="mx-auto mb-4"/><span className="text-[10px] font-black uppercase">Rasmni tanlang</span></div>}
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
        <button disabled={uploading || !title || !file} onClick={handleAdd} className="w-full py-6 bg-blue-600 font-black uppercase rounded-[1.5rem] disabled:opacity-30 flex items-center justify-center gap-3">
          {uploading ? <Loader2 className="animate-spin" /> : 'QO\'SHISH'}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {items.map(i => (
          <div key={i.id} className="relative group rounded-[2.5rem] overflow-hidden aspect-video border border-white/5 shadow-xl">
            <img src={i.imageUrl} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-6 text-center">
               <p className="font-black uppercase italic mb-6 text-xs">{i.title}</p>
               <button onClick={() => handleDelete(i)} className="p-4 bg-red-600 rounded-2xl shadow-xl hover:scale-110 active:scale-90 transition-all"><Trash2 size={24}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const UserModerationAdmin = () => {
  const [users, setUsers] = useState<AppUserMetadata[]>([]);
  useEffect(() => { onValue(ref(database, 'users'), s => setUsers(Object.values(s.val() || {}) as AppUserMetadata[])); }, []);
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {users.map(u => (
        <div key={u.uid} className="bg-zinc-900/40 border border-white/5 p-8 rounded-[2.5rem] flex justify-between items-center">
          <div className="flex items-center gap-6">
            <img src={u.photoURL} className="w-16 h-16 rounded-2xl ring-2 ring-white/5 object-cover" />
            <div><p className="font-black text-xl italic tracking-tight">{u.displayName}</p><p className="text-[10px] text-zinc-500 font-black uppercase">{u.email}</p></div>
          </div>
          <button onClick={async () => await update(ref(database, `users/${u.uid}`), { blockStatus: { isBlocked: !u.blockStatus?.isBlocked, blockedUntil: -1 } })} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${u.blockStatus?.isBlocked ? 'bg-green-600/10 text-green-500' : 'bg-red-600/10 text-red-500'}`}>
            {u.blockStatus?.isBlocked ? 'Tiklash' : 'Ban Qilish'}
          </button>
        </div>
      ))}
    </div>
  );
};

const BroadcasterAdmin: React.FC<{ users: AppUserMetadata[] }> = ({ users }) => {
  const [title, setTitle] = useState('');
  const [msg, setMsg] = useState('');
  const [target, setTarget] = useState('global');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if(!title || !msg) return;
    setSending(true);
    const id = Math.random().toString(36).substring(7);
    let url = undefined;
    if(file) {
      const sr = sRef(storage, `broadcast/${id}`);
      await uploadBytes(sr, file);
      url = await getDownloadURL(sr);
    }
    const path = target === 'global' ? `notifications/global/${id}` : `notifications/private/${target}/${id}`;
    await set(ref(database, path), { id, title, message: msg, createdAt: new Date().toISOString(), type: target === 'global' ? 'global' : 'private', targetUid: target === 'global' ? undefined : target, attachmentUrl: url });
    setTitle(''); setMsg(''); setFile(null); setPreview(null); setSending(false);
    alert("Xabar yuborildi");
  };

  return (
    <div className="bg-zinc-900/50 p-16 rounded-[4rem] space-y-10 max-w-2xl mx-auto border border-white/5">
      <h3 className="text-4xl font-black uppercase italic tracking-tighter text-center">FOYDALANUVCHILARGA XABAR</h3>
      <select value={target} onChange={e => setTarget(e.target.value)} className="w-full bg-black border border-white/5 p-5 rounded-2xl outline-none text-[10px] font-black uppercase tracking-widest text-zinc-400">
        <option value="global">HAMMAGA</option>
        {users.map(u => <option key={u.uid} value={u.uid}>{u.displayName}</option>)}
      </select>
      <input type="text" placeholder="Sarlavha" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-black border border-white/5 p-5 rounded-2xl outline-none font-black text-xs uppercase" />
      <textarea placeholder="Xabar matni..." value={msg} onChange={e => setMsg(e.target.value)} className="w-full h-48 bg-black border border-white/5 p-6 rounded-3xl outline-none resize-none font-medium text-sm text-zinc-300" />
      <div className="space-y-4">
        <label className="block w-full bg-black border border-white/5 p-6 rounded-2xl cursor-pointer text-center group">
          <span className="text-[10px] font-black uppercase text-zinc-500 group-hover:text-white transition-colors">{preview ? 'FAYL TAYYOR' : 'RASM BIRIKTIRISH'}</span>
          <input type="file" className="hidden" onChange={e => {
            const f = e.target.files?.[0];
            if(f){
              setFile(f);
              const r = new FileReader();
              r.onload = (re) => setPreview(re.target?.result as string);
              r.readAsDataURL(f);
            }
          }} />
        </label>
        {preview && <img src={preview} className="w-32 h-32 object-cover rounded-2xl shadow-xl" />}
      </div>
      <button disabled={sending || !title || !msg} onClick={handleSend} className="w-full py-6 bg-blue-600 font-black uppercase rounded-2xl shadow-xl text-[10px] tracking-widest flex items-center justify-center gap-3">
        {sending ? <Loader2 className="animate-spin" /> : 'YUBORISH'}
      </button>
    </div>
  );
};

const ScheduleAdmin = () => {
  const [schedule, setSchedule] = useState<WorkingHours>({ start: "10:00", end: "19:00" });
  useEffect(() => { onValue(ref(database, 'config/workingHours'), s => s.val() && setSchedule(s.val())); }, []);
  return (
    <div className="bg-zinc-900/50 p-16 rounded-[4rem] max-w-2xl mx-auto space-y-12 border border-white/5 shadow-2xl text-center">
      <h3 className="text-4xl font-black uppercase italic tracking-tighter">ISH VAQTINI SOZLASH</h3>
      <div className="grid grid-cols-2 gap-10">
        <div><label className="text-[10px] uppercase font-black text-zinc-500">START</label><input type="time" value={schedule.start} onChange={e => setSchedule({...schedule, start: e.target.value})} className="w-full bg-black border border-white/5 p-6 rounded-[1.5rem] outline-none text-white font-black text-2xl mt-4" /></div>
        <div><label className="text-[10px] uppercase font-black text-zinc-500">END</label><input type="time" value={schedule.end} onChange={e => setSchedule({...schedule, end: e.target.value})} className="w-full bg-black border border-white/5 p-6 rounded-[1.5rem] outline-none text-white font-black text-2xl mt-4" /></div>
      </div>
      <button onClick={async () => await set(ref(database, 'config/workingHours'), schedule)} className="w-full py-6 bg-blue-600 font-black uppercase rounded-[1.5rem] shadow-xl text-[10px] tracking-widest">SAQLASH</button>
    </div>
  );
};

// --- My Orders Sub-page ---

const MyOrdersPage: React.FC<{ user: UserProfile | null }> = ({ user }) => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if(!user) return;
    onValue(ref(database, 'orders'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const all = Object.keys(data).map(key => ({...data[key], id: key})) as Order[];
        setOrders(all.filter(o => o.userId === user.uid).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } else setOrders([]);
      setLoading(false);
    });
  }, [user]);

  const handleCancel = async () => {
    if(!cancellingOrder || !cancelReason.trim()) return;
    try {
      await update(ref(database, `orders/${cancellingOrder.id}`), { status: OrderStatus.CANCELLED, cancelReason: cancelReason });
      await sendCancellationToTelegram(cancellingOrder, cancelReason);
      setCancellingOrder(null); setCancelReason('');
    } catch (e) { alert("Xatolik"); }
  };

  if (!user) return <div className="pt-40 text-center uppercase font-black text-zinc-800 tracking-[0.5em]">KIRISH KERAK</div>;

  return (
    <div className="pt-32 pb-20 px-6 max-w-5xl mx-auto min-h-screen">
      <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-6xl font-black uppercase italic mb-16 tracking-tighter">SIZNING <span className="text-blue-600">BUYURTMALAR.</span></motion.h2>
      {loading ? <div className="space-y-6">{[1,2,3].map(i => <div key={i} className="h-40 bg-zinc-900/50 animate-pulse rounded-[3rem]" />)}</div> : orders.length === 0 ? <div className="text-center py-40 bg-zinc-900/20 rounded-[4rem] border border-white/5"><p className="text-zinc-800 font-black uppercase tracking-widest text-sm">Buyurtmalar mavjud emas</p></div> : (
        <div className="space-y-6">
          {orders.map(order => (
            <div key={order.id} className="bg-zinc-900/50 border border-white/5 p-10 rounded-[3rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden group hover:border-blue-500/20 transition-all">
              <div className="space-y-3 relative z-10">
                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">{new Date(order.createdAt).toLocaleString()}</p>
                <h4 className="text-3xl font-black uppercase italic tracking-tight">{order.designTypes.join(' + ')}</h4>
                <div className="bg-blue-600/10 text-blue-500 text-[10px] font-black uppercase px-4 py-1.5 rounded-xl border border-blue-500/20 inline-block">{order.game}</div>
              </div>
              <div className="text-left md:text-right flex flex-col gap-4 relative z-10 w-full md:w-auto">
                <p className="text-blue-500 font-black text-4xl italic tracking-tighter">{order.totalPrice.toLocaleString()} UZS</p>
                <div className="flex items-center gap-4 justify-end">
                  <span className={`text-[10px] font-black uppercase px-6 py-2.5 rounded-2xl border shadow-lg ${order.status === OrderStatus.CHECKING ? 'bg-orange-600/20 text-orange-500 border-orange-500/20' : order.status === OrderStatus.CHECKED ? 'bg-blue-600/20 text-blue-500 border-blue-500/20' : order.status === OrderStatus.APPROVED ? 'bg-green-600/20 text-green-500 border-green-500/20' : 'bg-red-600/20 text-red-500 border-red-500/20'}`}>{order.status}</span>
                  {order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.APPROVED && (
                    <button onClick={() => setCancellingOrder(order)} className="p-3 bg-zinc-800/50 rounded-2xl text-zinc-600 hover:text-red-500 transition-all"><XCircle size={22}/></button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <AnimatePresence>
        {cancellingOrder && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCancellingOrder(null)} className="absolute inset-0 bg-black/95 backdrop-blur-xl" />
             <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-xl bg-zinc-900 border border-white/10 rounded-[4rem] p-12 space-y-8 shadow-2xl">
                <div className="space-y-2"><h3 className="text-4xl font-black uppercase italic tracking-tighter">BEKOR QILISH</h3><p className="text-zinc-500 text-sm font-bold">Iltimos, bekor qilish sababini batafsil yozing:</p></div>
                <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Tafsilotlar..." className="w-full h-48 bg-black border border-white/5 p-8 rounded-[2.5rem] outline-none resize-none text-white font-medium" />
                <div className="flex gap-4">
                  <button onClick={() => setCancellingOrder(null)} className="flex-1 py-5 bg-zinc-800 rounded-3xl font-black uppercase text-[10px] tracking-widest">Abort</button>
                  <button onClick={handleCancel} disabled={!cancelReason.trim()} className="flex-1 py-5 bg-red-600 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl disabled:opacity-20 hover:scale-[1.02] active:scale-95 transition-all">TASDIQLASH</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main App Entry ---

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
    const authUnsub = onAuthStateChanged(auth, async (fireUser) => {
      if (fireUser) {
        const profile: UserProfile = { uid: fireUser.uid, email: fireUser.email || '', displayName: fireUser.displayName || 'User', photoURL: fireUser.photoURL || `https://ui-avatars.com/api/?name=${fireUser.displayName}&background=random`, isOwner: fireUser.email === OWNER_EMAIL };
        setUser(profile);
        const userRef = ref(database, `users/${fireUser.uid}`);
        onValue(userRef, s => {
           const meta = s.val() as AppUserMetadata | null;
           if (meta?.blockStatus) setBlockStatus(meta.blockStatus);
           if (meta?.readNotifications) setReadIds(meta.readNotifications);
        });
        await update(userRef, { uid: profile.uid, email: profile.email, displayName: profile.displayName, photoURL: profile.photoURL, lastLogin: new Date().toISOString() });
        onValue(ref(database, 'notifications/global'), s => {
           const globalNotifs = Object.values(s.val() || {}) as Notification[];
           onValue(ref(database, `notifications/private/${fireUser.uid}`), ps => {
             const privateNotifs = Object.values(ps.val() || {}) as Notification[];
             setNotifications([...globalNotifs, ...privateNotifs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
           });
        });
      } else { setUser(null); setNotifications([]); setBlockStatus(null); }
      setIsAppReady(true);
    });
    return () => authUnsub();
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <Router>
        <LoadingScreen onComplete={() => {}} />
        <div className={`min-h-screen bg-[#050505] transition-opacity duration-1000 ${isAppReady ? 'opacity-100' : 'opacity-0'}`}>
          {blockStatus?.isBlocked && <BlockedOverlay status={blockStatus} />}
          <Navbar user={user} unreadCount={notifications.filter(n => !readIds.includes(n.id)).length} onToggleNotifications={() => setShowNotifications(true)} isWorking={isWorking} />
          
          <Routes>
            <Route path="/" element={
              <div className="relative">
                <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-20 overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-blue-600/5 blur-[180px] rounded-full pointer-events-none" />
                  <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="z-10 mb-10 bg-zinc-900/40 backdrop-blur-xl border border-white/5 px-8 py-4 rounded-full flex items-center gap-8 shadow-2xl">
                    <div className="flex items-center gap-3"><Clock size={16} className="text-blue-500" /><span className="text-[11px] font-black uppercase tracking-[0.2em]">{tashkentTime}</span></div>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-3"><div className={`w-2 h-2 rounded-full ${isWorking ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} /><span className="text-[11px] font-black uppercase tracking-[0.2em]">{isWorking ? 'OCHIQ' : 'YOPIQ'}</span></div>
                    <div className="h-4 w-px bg-white/10" /><div className="flex items-center gap-3"><Calendar size={16} className="text-zinc-600" /><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">{schedule.start} - {schedule.end}</span></div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center z-10">
                    <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-blue-500 font-black uppercase tracking-[0.6em] text-xs mb-8 leading-none">ASSALAMU ALAYKUM</motion.h2>
                    <h1 className="text-8xl md:text-[12rem] font-black tracking-tighter mb-12 leading-[0.75] italic uppercase text-white">ELBEK <br /> <span className="text-blue-600">DESIGNER.</span></h1>
                    <p className="text-zinc-500 max-w-3xl mx-auto text-xs md:text-sm mb-16 uppercase tracking-[0.3em] font-bold leading-[2]">{t.hero.welcome}</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                      {isWorking ? (
                        <Link to="/order" className="group px-14 py-7 bg-white text-black font-black rounded-[2rem] hover:bg-blue-600 hover:text-white transition-all duration-700 flex items-center gap-4 shadow-2xl text-[11px] tracking-[0.2em]">
                          BUYURTMA BERISH <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform" />
                        </Link>
                      ) : <div className="px-14 py-7 bg-zinc-900 text-zinc-600 font-black rounded-[2rem] flex items-center gap-4 cursor-not-allowed border border-white/5 text-[11px] tracking-[0.2em]">HOZIR YOPIQ <Clock size={22} /></div>}
                      <Link to="/portfolio" className="px-14 py-7 bg-transparent text-white font-black rounded-[2rem] border border-white/10 hover:border-white/30 transition-all uppercase tracking-[0.2em] text-[11px] hover:bg-white/5">GALLEREYA</Link>
                    </div>
                  </motion.div>
                </section>
                <section className="py-40 px-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                   <div className="p-14 bg-zinc-900/30 rounded-[4rem] border border-white/5 space-y-6 group transition-all">
                      <div className="w-16 h-16 bg-blue-600/10 text-blue-500 rounded-[1.5rem] flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform mx-auto"><Images size={32}/></div>
                      <h4 className="text-2xl font-black uppercase italic tracking-tight">Professional Graphics</h4>
                      <p className="text-zinc-500 text-sm font-medium uppercase tracking-wider">High-end banners, avatars and previews crafted specifically for content creators.</p>
                   </div>
                   <div className="p-14 bg-zinc-900/30 rounded-[4rem] border border-white/5 space-y-6 group transition-all">
                      <div className="w-16 h-16 bg-blue-600/10 text-blue-500 rounded-[1.5rem] flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform mx-auto"><Clock size={32}/></div>
                      <h4 className="text-2xl font-black uppercase italic tracking-tight">Fast Turnaround</h4>
                      <p className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Efficient workflow ensures your designs are delivered within the promised timeframe.</p>
                   </div>
                   <div className="p-14 bg-zinc-900/30 rounded-[4rem] border border-white/5 space-y-6 group transition-all">
                      <div className="w-16 h-16 bg-blue-600/10 text-blue-500 rounded-[1.5rem] flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform mx-auto"><Smartphone size={32}/></div>
                      <h4 className="text-2xl font-black uppercase italic tracking-tight">Direct Access</h4>
                      <p className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Track your orders and communicate directly via Telegram for the best results.</p>
                   </div>
                </section>
              </div>
            } />
            <Route path="/order" element={user ? <OrderForm user={user} isWorking={isWorking} /> : <div className="pt-40 px-6 text-center space-y-12"><h2 className="text-5xl font-black uppercase italic tracking-tighter">KIRISH KERAK</h2><button onClick={signInWithGoogle} className="px-14 py-7 bg-white text-black rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl hover:bg-blue-600 hover:text-white transition-all active:scale-95">Kirish</button></div>} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/my-orders" element={<MyOrdersPage user={user} />} />
            <Route path="/admin" element={<AdminDashboard user={user} />} />
          </Routes>
          <AnimatePresence>
            {showNotifications && (
              <div className="fixed inset-0 z-[60] flex justify-end">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNotifications(false)} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
                <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full max-w-lg bg-zinc-950 h-full border-l border-white/5 flex flex-col shadow-2xl p-12 overflow-y-auto no-scrollbar">
                  <div className="flex items-center justify-between mb-12"><h3 className="text-4xl font-black uppercase tracking-tighter italic">XABARLAR</h3><button onClick={() => setShowNotifications(false)} className="p-4 hover:bg-zinc-900 rounded-3xl transition-all"><X size={28} /></button></div>
                  <div className="space-y-8">
                    {notifications.map(n => (
                      <div key={n.id} onClick={async () => { if(!readIds.includes(n.id)) { const nid = [...readIds, n.id]; setReadIds(nid); await update(ref(database, `users/${user?.uid}`), { readNotifications: nid }); } }} className={`p-10 bg-zinc-900/40 border ${readIds.includes(n.id) ? 'border-white/5 opacity-60' : 'border-blue-500/20 shadow-xl'} rounded-[3.5rem] space-y-6 group transition-all`}>
                        <h4 className="font-black text-2xl italic uppercase text-white">{n.title}</h4><p className="text-zinc-400 text-sm leading-[1.8]">{n.message}</p>
                        {n.attachmentUrl && <div className="mt-6 rounded-[2rem] overflow-hidden border border-white/10 p-6 bg-black/60"><img src={n.attachmentUrl} className="w-full rounded-2xl mb-4" /><a href={n.attachmentUrl} download className="block text-center py-4 bg-zinc-800 rounded-2xl text-[10px] font-black uppercase">Faylni yuklab olish</a></div>}
                        <div className="flex items-center justify-between pt-6 border-t border-white/5"><span className="text-[9px] text-zinc-700 font-black uppercase">{new Date(n.createdAt).toLocaleString()}</span></div>
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
