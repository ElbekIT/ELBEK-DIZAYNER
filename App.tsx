import React, { useState, useEffect, useMemo, useRef, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, User, ShoppingBag, Images, CheckCircle2, ChevronRight, LogOut, LogIn,
  ShieldCheck, CreditCard, Check, Menu, X, Phone, Send, ArrowRight,
  Bell, Trash2, ShieldAlert, Clock, ExternalLink, Image as ImageIcon,
  Users, Layers, Megaphone, Upload, FileImage, Search, Gamepad2, Info, CreditCard as CardIcon,
  Globe
} from 'lucide-react';
import { LoadingScreen } from './components/LoadingScreen';
import { ProtectedImage } from './components/ProtectedImage';
import { auth, signInWithGoogle, logout, database } from './firebase';
import { ref, push, onValue, set, get, remove } from 'firebase/database';
import { UserProfile, Order, OrderStatus, PortfolioItem, Notification, BlockStatus, AppUserMetadata } from './types';
import { GAMES, DESIGN_PRICES, PROMO_CODE, PROMO_DISCOUNT, OWNER_EMAIL } from './constants';
import { sendOrderToTelegram } from './services/telegramService';
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl px-6">
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

// --- Navbar ---

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const langs: { id: Language; label: string }[] = [
    { id: 'uz-Latn', label: "O'zbek (Lot)" },
    { id: 'uz-Cyrl', label: "Ўзбек (Кир)" },
    { id: 'ru', label: "Русский" },
  ];

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-[10px] font-black uppercase tracking-widest"
      >
        <Globe size={14} className="text-blue-500" />
        {langs.find(l => l.id === language)?.label}
      </button>
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[49]" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full mt-2 right-0 w-32 bg-zinc-900 border border-white/5 rounded-xl overflow-hidden shadow-2xl z-50"
            >
              {langs.map(l => (
                <button
                  key={l.id}
                  onClick={() => { setLanguage(l.id); setIsOpen(false); }}
                  className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase transition-colors ${language === l.id ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:bg-white/5'}`}
                >
                  {l.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const Navbar: React.FC<{ 
  user: UserProfile | null, 
  unreadCount: number, 
  onToggleNotifications: () => void 
}> = ({ user, unreadCount, onToggleNotifications }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();

  const navLinks = [
    { name: t.nav.home, path: '/', icon: Plus },
    { name: t.nav.order, path: '/order', icon: ShoppingBag },
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
            <img src="/img/EDDIZAYN.jpg" alt="Elbek Design" className="w-8 h-8 ml-2" />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(link => (
            <Link key={link.path} to={link.path} className={`text-sm font-medium transition-colors hover:text-blue-500 ${location.pathname === link.path ? 'text-blue-500' : 'text-zinc-400'}`}>{link.name}</Link>
          ))}
          
          <div className="flex items-center gap-4 pl-4 border-l border-white/10">
            <LanguageSwitcher />
            {user && (
              <button onClick={onToggleNotifications} className="relative p-2 text-zinc-400 hover:text-white transition-colors">
                <Bell size={20} />
                <NotificationBadge count={unreadCount} />
              </button>
            )}
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold">{user.displayName}</span>
                  {user.isOwner && <span className="text-[10px] uppercase text-blue-500 font-black">Owner</span>}
                </div>
                <img src={user.photoURL} alt="profile" className="w-9 h-9 rounded-full ring-2 ring-blue-600" />
                <button onClick={logout} className="p-2 text-zinc-500 hover:text-red-500 transition-colors"><LogOut size={18} /></button>
              </div>
            ) : (
              <button onClick={signInWithGoogle} className="px-6 py-2.5 bg-white text-black text-sm font-bold rounded-full hover:bg-zinc-200 transition-colors flex items-center gap-2"><LogIn size={16} /> {t.nav.signIn}</button>
            )}
          </div>
        </div>

        <div className="md:hidden flex items-center gap-4">
          <LanguageSwitcher />
          <button onClick={() => setIsOpen(!isOpen)}>{isOpen ? <X /> : <Menu />}</button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="md:hidden bg-zinc-950 border-b border-white/5 overflow-hidden">
            <div className="px-6 py-8 flex flex-col gap-6">
              {navLinks.map(link => (
                <Link key={link.path} to={link.path} onClick={() => setIsOpen(false)} className="text-lg font-bold flex items-center gap-4"><link.icon className="text-blue-500" size={20} />{link.name}</Link>
              ))}
              {!user && <button onClick={() => { signInWithGoogle(); setIsOpen(false); }} className="w-full py-4 bg-blue-600 rounded-xl font-bold">{t.nav.signIn}</button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// --- Order Form Components ---

const formatPhoneNumber = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(3); // Remove non-digits and skip 998
  let formatted = '+998 ';
  if (digits.length > 0) formatted += digits.slice(0, 2);
  if (digits.length > 2) formatted += ' ' + digits.slice(2, 5);
  if (digits.length > 5) formatted += ' ' + digits.slice(5, 7);
  if (digits.length > 7) formatted += ' ' + digits.slice(7, 9);
  return formatted;
};

const OrderForm: React.FC<{ user: UserProfile }> = ({ user }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [showIntro, setShowIntro] = useState(true);
  const [noPromo, setNoPromo] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: 'Male' as 'Male' | 'Female',
    phone: '+998 ',
    telegram: '@',
    designTypes: [] as string[],
    game: '',
    message: '',
    promoCode: '',
    paymentConfirmed: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  const basePrice = useMemo(() => {
    let total = 0;
    if (formData.designTypes.includes('Banner')) total += DESIGN_PRICES.BANNER;
    if (formData.designTypes.includes('Avatar')) total += DESIGN_PRICES.AVATAR;
    if (formData.designTypes.includes('Preview')) total += DESIGN_PRICES.PREVIEW;
    return total;
  }, [formData.designTypes]);

  const hasDiscount = !noPromo && formData.promoCode === PROMO_CODE;
  const totalPrice = hasDiscount ? basePrice * (1 - PROMO_DISCOUNT) : basePrice;

  const handleSubmit = async () => {
    if (!formData.paymentConfirmed || submitting) return;
    
    try {
      setSubmitting(true);
      const orderId = Math.random().toString(36).substring(7).toUpperCase();
      
      // Build order object carefully to avoid undefined fields
      const newOrder: Order = {
        id: orderId,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        firstName: formData.firstName,
        lastName: formData.lastName || '',
        gender: formData.gender,
        phoneNumber: formData.phone,
        telegramUsername: formData.telegram,
        designTypes: formData.designTypes,
        game: formData.game,
        message: formData.message || '',
        totalPrice,
        status: OrderStatus.CHECKING,
        createdAt: new Date().toISOString()
      };

      // Add promo code only if valid and noPromo is not checked
      if (!noPromo && formData.promoCode) {
        newOrder.promoCode = formData.promoCode;
      }

      // Save to Database
      await set(ref(database, `orders/${orderId}`), newOrder);
      
      // Dispatch Telegram Notification (Fire-and-forget)
      sendOrderToTelegram(newOrder).catch(err => console.error("Telegram Error:", err));
      
      setDone(true);
      setTimeout(() => navigate('/my-orders'), 2000);
    } catch (error) {
      console.error("Critical submission error:", error);
      alert("Submission failed. Check your internet connection or try again later.");
    } finally {
      // If not successful, allow another attempt
      if (!done) setSubmitting(false);
    }
  };

  if (showIntro) {
    return (
      <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center overflow-hidden">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center px-6">
          <motion.h2 
            initial={{ y: 20 }} animate={{ y: 0 }}
            className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none"
          >
            {t.order.introTitle.split(' ').slice(0, -1).join(' ')} <br /> <span className="text-blue-600">{t.order.introTitle.split(' ').pop()}</span>
          </motion.h2>
          <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 2 }} className="h-1 bg-blue-600 mt-8 mx-auto" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 px-6 max-w-2xl mx-auto min-h-screen">
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20">
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(34,197,94,0.3)]">
              <Check size={48} className="text-white" />
            </div>
            <h2 className="text-4xl font-black uppercase italic italic">{t.order.successTitle}</h2>
            <p className="text-zinc-500 mt-4 uppercase tracking-widest text-xs font-bold">{t.order.redirecting}</p>
          </motion.div>
        ) : (
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
            <div className="flex items-center justify-between mb-12">
               {[1,2,3,4,5].map(i => (
                 <div key={i} className={`h-1.5 flex-1 mx-1 rounded-full ${step >= i ? 'bg-blue-600' : 'bg-zinc-900'}`} />
               ))}
            </div>

            {step === 1 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-black uppercase italic italic">{t.order.personalTitle}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder={t.order.firstName} value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="bg-zinc-900 border border-white/10 p-4 rounded-xl outline-none" />
                  <input type="text" placeholder={t.order.lastName} value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="bg-zinc-900 border border-white/10 p-4 rounded-xl outline-none" />
                </div>
                <div className="flex gap-4">
                   <button onClick={() => setFormData({...formData, gender: 'Male'})} className={`flex-1 py-4 rounded-xl font-black uppercase text-xs border ${formData.gender === 'Male' ? 'bg-blue-600 border-blue-600' : 'bg-zinc-900 border-white/10 text-zinc-500'}`}>{t.order.genderMale}</button>
                   <button onClick={() => setFormData({...formData, gender: 'Female'})} className={`flex-1 py-4 rounded-xl font-black uppercase text-xs border ${formData.gender === 'Female' ? 'bg-pink-600 border-pink-600' : 'bg-zinc-900 border-white/10 text-zinc-500'}`}>{t.order.genderFemale}</button>
                </div>
                <input 
                  type="text" placeholder="+998" value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: formatPhoneNumber(e.target.value)})}
                  className="w-full bg-zinc-900 border border-white/10 p-4 rounded-xl outline-none text-lg" 
                />
                <input type="text" placeholder={t.order.telegram} value={formData.telegram} onChange={e => setFormData({...formData, telegram: e.target.value.startsWith('@') ? e.target.value : '@' + e.target.value})} className="w-full bg-zinc-900 border border-white/10 p-4 rounded-xl outline-none" />
                <button disabled={!formData.firstName || formData.phone.length < 17} onClick={() => setStep(2)} className="w-full py-5 bg-white text-black font-black rounded-xl disabled:opacity-30 uppercase tracking-widest text-xs">{t.order.continue}</button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-black uppercase italic italic">{t.order.designTitle}</h3>
                {[
                  { id: 'Banner', price: 50000, label: t.order.banner },
                  { id: 'Avatar', price: 25000, label: t.order.avatar },
                  { id: 'Preview', price: 100000, label: t.order.preview },
                ].map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => setFormData({...formData, designTypes: formData.designTypes.includes(item.id) ? formData.designTypes.filter(t => t !== item.id) : [...formData.designTypes, item.id]})}
                    className={`w-full p-6 rounded-2xl border text-left flex justify-between items-center transition-all ${formData.designTypes.includes(item.id) ? 'bg-blue-600 border-blue-600' : 'bg-zinc-900 border-white/10'}`}
                  >
                    <div>
                      <p className="font-black uppercase tracking-tighter">{item.label}</p>
                      <p className={`text-xs ${formData.designTypes.includes(item.id) ? 'text-blue-200' : 'text-zinc-500'}`}>{item.price.toLocaleString()} {t.common.uzs}</p>
                    </div>
                    {formData.designTypes.includes(item.id) && <CheckCircle2 size={24} />}
                  </button>
                ))}
                <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="flex-1 py-5 bg-zinc-900 text-white font-black rounded-xl border border-white/10 uppercase tracking-widest text-xs">{t.order.back}</button>
                  <button disabled={formData.designTypes.length === 0} onClick={() => setStep(3)} className="flex-1 py-5 bg-white text-black font-black rounded-xl disabled:opacity-30 uppercase tracking-widest text-xs">{t.order.continue}</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-black uppercase italic italic">{t.order.gameTitle}</h3>
                <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2 no-scrollbar">
                  {GAMES.map(game => (
                    <button 
                      key={game} 
                      onClick={() => setFormData({...formData, game})}
                      className={`p-4 rounded-xl text-left border text-[10px] font-bold uppercase transition-all ${formData.game === game ? 'bg-blue-600 border-blue-600' : 'bg-zinc-900 border-white/10'}`}
                    >
                      {game}
                    </button>
                  ))}
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setStep(2)} className="flex-1 py-5 bg-zinc-900 text-white font-black rounded-xl border border-white/10 uppercase tracking-widest text-xs">{t.order.back}</button>
                  <button disabled={!formData.game} onClick={() => setStep(4)} className="flex-1 py-5 bg-white text-black font-black rounded-xl disabled:opacity-30 uppercase tracking-widest text-xs">{t.order.continue}</button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-black uppercase italic italic">{t.order.detailsTitle}</h3>
                <textarea 
                  placeholder={t.order.visionPlaceholder} 
                  value={formData.message} 
                  maxLength={1000}
                  onChange={e => setFormData({...formData, message: e.target.value})}
                  className="w-full h-48 bg-zinc-900 border border-white/10 p-6 rounded-2xl outline-none resize-none"
                />
                <p className="text-right text-[10px] text-zinc-600 font-bold uppercase">{formData.message.length} / 1000</p>
                <div className="flex gap-4">
                  <button onClick={() => setStep(3)} className="flex-1 py-5 bg-zinc-900 text-white font-black rounded-xl border border-white/10 uppercase tracking-widest text-xs">{t.order.back}</button>
                  <button onClick={() => setStep(5)} className="flex-1 py-5 bg-white text-black font-black rounded-xl uppercase tracking-widest text-xs">{t.order.continue}</button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-8">
                <div className="bg-zinc-900 border border-white/5 p-8 rounded-[2rem] space-y-6">
                  <h3 className="text-2xl font-black uppercase italic italic text-center">{t.order.checkoutTitle}</h3>
                  <div className="space-y-3">
                     <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{t.order.selectedServices}</p>
                     {formData.designTypes.map(t_id => {
                       const price = t_id === 'Banner' ? 50000 : t_id === 'Avatar' ? 25000 : 100000;
                       const label = t_id === 'Banner' ? t.order.banner : t_id === 'Avatar' ? t.order.avatar : t_id === 'Preview' ? t.order.preview : t_id;
                       return (
                         <div key={t_id} className="flex justify-between items-center py-2 border-b border-white/5">
                           <span className="font-bold text-sm">{label}</span>
                           <span className="text-zinc-500 text-sm">{price.toLocaleString()} {t.common.uzs}</span>
                         </div>
                       );
                     })}
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{t.order.paymentTarget}</p>
                    <div className="bg-black/40 p-4 rounded-xl border border-white/10 flex items-center justify-between">
                      <span className="font-mono text-xl tracking-tighter">4073 4200 8456 9577</span>
                      <CardIcon size={20} className="text-blue-500" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{t.order.promoCode}</p>
                    
                    <AnimatePresence mode="wait">
                      {!noPromo ? (
                        <motion.div
                          key="promo-input"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <input 
                            type="text" 
                            placeholder={t.order.enterCode} 
                            value={formData.promoCode} 
                            onChange={e => {
                              const val = e.target.value;
                              setFormData(prev => ({ ...prev, promoCode: val }));
                              // Typing in a code automatically ensures noPromo is false
                              if (val.length > 0) setNoPromo(false);
                            }}
                            className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none mb-2" 
                          />
                        </motion.div>
                      ) : null}
                    </AnimatePresence>

                    {formData.promoCode.length === 0 && (
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${noPromo ? 'bg-blue-600 border-blue-600' : 'border-zinc-700'}`}>
                          {noPromo && <Check size={14} className="text-white" />}
                        </div>
                        <input 
                          type="checkbox" 
                          checked={noPromo} 
                          onChange={e => {
                            const checked = e.target.checked;
                            setNoPromo(checked);
                            // If user checks 'No Promo', we strictly clear any code
                            if (checked) setFormData(prev => ({ ...prev, promoCode: '' }));
                          }} 
                          className="hidden" 
                        />
                        <span className="text-[10px] font-black uppercase text-zinc-500 group-hover:text-zinc-300 transition-colors">{t.order.noPromo}</span>
                      </label>
                    )}

                    {hasDiscount && (
                      <p className="text-green-500 text-[10px] font-black uppercase">{t.order.discountApplied}</p>
                    )}
                  </div>

                  <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                    <span className="text-xs font-black uppercase text-zinc-500">{t.order.totalPrice}</span>
                    <span className="text-3xl font-black text-blue-500 italic">{totalPrice.toLocaleString()} {t.common.uzs}</span>
                  </div>
                </div>

                <label className="flex items-center gap-4 cursor-pointer p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                  <input type="checkbox" checked={formData.paymentConfirmed} onChange={e => setFormData({...formData, paymentConfirmed: e.target.checked})} className="w-5 h-5 rounded border-zinc-700 bg-black" />
                  <span className="text-xs font-bold uppercase leading-tight text-zinc-400">{t.order.confirmPayment}</span>
                </label>

                <div className="flex gap-4">
                  <button onClick={() => setStep(4)} className="flex-1 py-5 bg-zinc-900 text-white font-black rounded-xl border border-white/10 uppercase tracking-widest text-xs">{t.order.back}</button>
                  <button disabled={!formData.paymentConfirmed || submitting} onClick={handleSubmit} className="flex-1 py-5 bg-blue-600 text-white font-black rounded-xl disabled:opacity-30 uppercase tracking-widest text-xs">
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
    return onValue(ref(database, 'portfolio'), (snapshot) => {
      setItems(Object.values(snapshot.val() || {}) as PortfolioItem[]);
      setLoading(false);
    });
  }, []);

  return (
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-black mb-4 uppercase tracking-tighter italic">{t.portfolio.title}</h2>
        <p className="text-zinc-500 max-w-2xl mx-auto uppercase tracking-widest text-[10px] font-black">{t.portfolio.subtitle}</p>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-video bg-zinc-900 animate-pulse rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <motion.div key={item.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <ProtectedImage src={item.imageUrl} alt={item.title} className="aspect-video rounded-3xl border border-white/5" />
              <p className="mt-4 text-[10px] font-black tracking-widest text-zinc-500 uppercase italic text-center">{item.title}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Admin Panel ---

const AdminDashboard: React.FC<{ user: UserProfile | null }> = ({ user }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'orders' | 'portfolio' | 'users' | 'broadcast'>('orders');
  const [users, setUsers] = useState<AppUserMetadata[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!user?.isOwner) return;
    onValue(ref(database, 'users'), s => setUsers(Object.values(s.val() || {}) as AppUserMetadata[]));
    onValue(ref(database, 'orders'), s => setOrders((Object.values(s.val() || {}) as Order[]).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())));
  }, [user]);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    await set(ref(database, `orders/${orderId}/status`), status);
  };

  if (!user?.isOwner) return <div className="pt-40 text-center uppercase font-black text-zinc-800">{t.admin.unauthorized}</div>;

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
        <div>
          <h2 className="text-5xl font-black uppercase tracking-tighter italic">{t.admin.title}</h2>
          <p className="text-zinc-600 uppercase tracking-widest text-[10px] font-black mt-2">{t.admin.subtitle}</p>
        </div>
        <div className="flex bg-zinc-900 p-2 rounded-2xl border border-white/5 gap-1">
          {['orders', 'portfolio', 'users', 'broadcast'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-4 rounded-xl text-xs font-black uppercase transition-all ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white'}`}>{t.admin.tabs[tab as keyof typeof t.admin.tabs]}</button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab}>
          {activeTab === 'orders' && (
            <div className="grid grid-cols-1 gap-4">
              {orders.map(order => (
                <div key={order.id} className="bg-zinc-900/50 border border-white/5 p-8 rounded-[2rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                       <span className="text-[10px] font-black uppercase text-zinc-500">ID: {order.id}</span>
                       <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${order.status === OrderStatus.CHECKING ? 'bg-orange-600' : order.status === OrderStatus.CHECKED ? 'bg-zinc-600' : 'bg-blue-600'}`}>{order.status}</span>
                    </div>
                    <h4 className="text-xl font-black uppercase italic">{order.firstName} {order.lastName}</h4>
                    <p className="text-[10px] text-zinc-500 font-bold mt-1 uppercase tracking-widest">{order.designTypes.join(' + ')} — {order.game}</p>
                    <p className="text-[9px] text-zinc-600 mt-1 uppercase font-black">{new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-8 justify-between md:justify-end w-full md:w-auto">
                     <div className="text-left md:text-right">
                       <p className="text-blue-500 font-black text-2xl italic">{order.totalPrice.toLocaleString()} {t.common.uzs}</p>
                       <span className="text-[9px] text-zinc-600 uppercase font-black">{t.admin.orderPrice}</span>
                     </div>
                     <div className="flex items-center gap-4">
                        <select 
                          value={order.status} 
                          onChange={e => updateStatus(order.id, e.target.value as OrderStatus)}
                          className="bg-black border border-white/10 p-3 rounded-lg text-xs font-black uppercase text-zinc-400 outline-none"
                        >
                          <option value={OrderStatus.CHECKING}>{t.common.checking}</option>
                          <option value={OrderStatus.CHECKED}>{t.common.checked}</option>
                          <option value={OrderStatus.APPROVED}>{t.common.approved}</option>
                        </select>
                        <a href={`https://t.me/${order.telegramUsername.replace('@', '')}`} target="_blank" className="p-3 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"><Send size={18} /></a>
                     </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'portfolio' && <PortfolioManagerAdmin />}
          {activeTab === 'users' && <UserModerationAdmin />}
          {activeTab === 'broadcast' && <BroadcasterAdmin users={users} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const PortfolioManagerAdmin = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [title, setTitle] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => onValue(ref(database, 'portfolio'), s => setItems(Object.values(s.val() || {}))), []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAdd = async () => {
    if (!title || !preview) return;
    const id = Math.random().toString(36).substring(7);
    await set(ref(database, `portfolio/${id}`), { id, title, imageUrl: preview, createdAt: new Date().toISOString() });
    setTitle(''); setPreview(null);
  };

  return (
    <div className="space-y-8">
      <div className="bg-zinc-900 p-8 rounded-3xl space-y-4">
        <input type="text" placeholder={t.admin.designTitle} value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-black p-4 rounded-xl outline-none" />
        <label className="block w-full h-48 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:bg-zinc-800 transition-all flex items-center justify-center overflow-hidden">
          {preview ? <img src={preview} className="w-full h-full object-cover" /> : <Upload className="text-zinc-600" />}
          <input type="file" className="hidden" accept="image/*" onChange={handleFile} />
        </label>
        <button onClick={handleAdd} className="w-full py-4 bg-blue-600 font-black uppercase rounded-xl">{t.admin.portfolioAdd}</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map(item => (
          <div key={item.id} className="relative group rounded-xl overflow-hidden aspect-video">
             <img src={item.imageUrl} className="w-full h-full object-cover" />
             <button onClick={() => remove(ref(database, `portfolio/${item.id}`))} className="absolute top-2 right-2 p-2 bg-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

const UserModerationAdmin = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<AppUserMetadata[]>([]);
  useEffect(() => onValue(ref(database, 'users'), s => setUsers(Object.values(s.val() || {}))), []);

  const toggleBlock = async (uid: string, current: boolean) => {
    await set(ref(database, `users/${uid}/blockStatus`), { isBlocked: !current, blockedUntil: !current ? -1 : 0 });
  };

  return (
    <div className="space-y-3">
      {users.map(u => (
        <div key={u.uid} className="bg-zinc-900 p-4 rounded-2xl flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src={u.photoURL} className="w-10 h-10 rounded-full" />
            <div>
              <p className="font-bold">{u.displayName}</p>
              <p className="text-[10px] text-zinc-500 uppercase">{u.email}</p>
            </div>
          </div>
          <button onClick={() => toggleBlock(u.uid, !!u.blockStatus?.isBlocked)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase ${u.blockStatus?.isBlocked ? t.admin.userUnblock : t.admin.userBlock} `}>
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
  const [preview, setPreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800 * 1024) {
        alert("Attached image is too large. Please use an image under 800KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const send = async () => {
    if (!title || !msg) return;
    setIsSending(true);
    const id = Math.random().toString(36).substring(7);
    
    const notification: Notification = {
      id,
      title,
      message: msg,
      imageUrl: preview || undefined,
      createdAt: new Date().toISOString(),
      type: target === 'global' ? 'global' : 'private',
      targetUid: target === 'global' ? undefined : target
    };

    const path = target === 'global' ? `notifications/global/${id}` : `notifications/private/${target}/${id}`;
    
    await set(ref(database, path), notification);
    
    setTitle('');
    setMsg('');
    setPreview(null);
    setIsSending(false);
    alert(t.admin.successBroadcast);
  };

  return (
    <div className="bg-zinc-900 p-8 rounded-[2rem] space-y-4 border border-white/5">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <p className="text-[10px] text-zinc-600 font-black uppercase mb-2 ml-1">{t.admin.transmissionTarget}</p>
          <select value={target} onChange={e => setTarget(e.target.value)} className="w-full bg-black p-4 rounded-xl outline-none text-zinc-400 font-black uppercase text-xs border border-white/5">
            <option value="global">{t.admin.broadcastAll}</option>
            {users.map(u => <option key={u.uid} value={u.uid}>{u.displayName}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <p className="text-[10px] text-zinc-600 font-black uppercase mb-2 ml-1">{t.admin.headline}</p>
          <input type="text" placeholder={t.admin.headline} value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-black p-4 rounded-xl outline-none border border-white/5" />
        </div>
      </div>
      
      <div>
        <p className="text-[10px] text-zinc-600 font-black uppercase mb-2 ml-1">{t.admin.messageContent}</p>
        <textarea placeholder={t.admin.messageContent} value={msg} onChange={e => setMsg(e.target.value)} className="w-full h-32 bg-black p-4 rounded-xl outline-none resize-none border border-white/5" />
      </div>

      <div className="space-y-2">
        <p className="text-[10px] text-zinc-600 font-black uppercase mb-2 ml-1">{t.admin.attachedMedia}</p>
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <label className="flex flex-col items-center justify-center w-40 h-28 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:bg-zinc-800 transition-all group relative overflow-hidden">
            {preview ? (
              <img src={preview} className="w-full h-full object-cover" />
            ) : (
              <>
                <ImageIcon className="text-zinc-600 group-hover:text-blue-500 mb-1" size={20} />
                <span className="text-[9px] font-black uppercase text-zinc-600">{t.admin.pickImage}</span>
              </>
            )}
            <input type="file" className="hidden" accept="image/*" onChange={handleFile} />
          </label>
          {preview && (
            <button onClick={() => setPreview(null)} className="text-[9px] font-black uppercase text-red-500 hover:text-red-400 transition-colors">{t.admin.discardImage}</button>
          )}
        </div>
      </div>

      <button onClick={send} disabled={isSending || !title || !msg} className="w-full py-5 bg-blue-600 font-black uppercase rounded-2xl shadow-[0_15px_30px_rgba(37,99,235,0.2)] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-30">
        {isSending ? t.admin.transmitting : t.admin.dispatch}
      </button>
    </div>
  );
};

// --- Main App Logic ---

export default function App() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('lang') as Language) || 'uz-Latn');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [blockStatus, setBlockStatus] = useState<BlockStatus | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    localStorage.setItem('lang', language);
  }, [language]);

  const t = useMemo(() => translations[language], [language]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (fireUser) => {
      if (fireUser) {
        const profile: UserProfile = {
          uid: fireUser.uid,
          email: fireUser.email || '',
          displayName: fireUser.displayName || 'User',
          photoURL: fireUser.photoURL || `https://ui-avatars.com/api/?name=${fireUser.displayName}&background=random`,
          isOwner: fireUser.email === OWNER_EMAIL
        };
        setUser(profile);

        const snap = await get(ref(database, `users/${fireUser.uid}`));
        const data = snap.val() as AppUserMetadata | null;
        if (data?.blockStatus?.isBlocked) setBlockStatus(data.blockStatus);
        if (data?.readNotifications) setReadIds(data.readNotifications);

        await set(ref(database, `users/${fireUser.uid}`), {
          ...profile, lastLogin: new Date().toISOString(),
          blockStatus: data?.blockStatus || null,
          readNotifications: data?.readNotifications || []
        });

        onValue(ref(database, 'notifications/global'), s1 => {
          const gn = Object.values(s1.val() || {}) as Notification[];
          onValue(ref(database, `notifications/private/${fireUser.uid}`), s2 => {
            const pn = Object.values(s2.val() || {}) as Notification[];
            setNotifications([...gn, ...pn].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
          });
        });
      } else {
        setUser(null); setBlockStatus(null); setNotifications([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const unreadCount = useMemo(() => notifications.filter(n => !readIds.includes(n.id)).length, [notifications, readIds]);

  const markRead = async (id: string) => {
    if (!user || readIds.includes(id)) return;
    const newReadIds = [...readIds, id];
    setReadIds(newReadIds);
    await set(ref(database, `users/${user.uid}/readNotifications`), newReadIds);
  };

  if (loading) return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <LoadingScreen onComplete={() => setLoading(false)} />
    </LanguageContext.Provider>
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <Router>
        <div className="min-h-screen bg-[#050505]">
          {blockStatus?.isBlocked && <BlockedOverlay status={blockStatus} />}
          <Navbar user={user} unreadCount={unreadCount} onToggleNotifications={() => setShowNotifications(true)} />
          
          <Routes>
            <Route path="/" element={
              <div className="relative">
                <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-20 overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-blue-600/5 blur-[160px] rounded-full pointer-events-none" />
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center z-10">
                    <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-blue-500 font-black uppercase tracking-[0.4em] text-xs mb-6">{t.hero.greeting}</motion.h2>
                    <h1 className="text-7xl md:text-[10rem] font-black tracking-tighter mb-8 leading-[0.8] italic uppercase">
                      {t.hero.brand.split(' ')[0]} <br /> <span className="text-blue-600">{t.hero.brand.split(' ')[1]}</span>
                    </h1>
                    <p className="text-zinc-600 max-w-2xl mx-auto text-xs md:text-sm mb-12 uppercase tracking-widest font-bold leading-relaxed">
                      {t.hero.welcome}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                      <Link to="/order" className="group px-12 py-6 bg-white text-black font-black rounded-3xl hover:bg-blue-600 hover:text-white transition-all duration-500 flex items-center gap-3 shadow-[0_20px_40px_rgba(255,255,255,0.05)]">{t.hero.ctaOrder} <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" /></Link>
                      <Link to="/portfolio" className="px-12 py-6 bg-zinc-950 text-white font-black rounded-3xl border border-white/5 hover:border-white/20 transition-all uppercase tracking-widest text-[10px]">{t.hero.ctaGallery}</Link>
                    </div>
                  </motion.div>
                </section>
              </div>
            } />
            
            <Route path="/order" element={user ? <OrderForm user={user} /> : (
              <div className="pt-40 px-6 text-center space-y-6">
                <h2 className="text-3xl font-black uppercase italic italic">{t.order.loginPrompt}</h2>
                <button onClick={signInWithGoogle} className="px-10 py-5 bg-blue-600 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 mx-auto shadow-[0_20px_40px_rgba(37,99,235,0.2)]">Sign in with Google <ChevronRight size={18}/></button>
              </div>
            )} />

            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/my-orders" element={user ? <MyOrdersPage user={user} /> : <div className="pt-40 text-center font-black uppercase text-zinc-800">Please Sign In</div>} />
            <Route path="/admin" element={<AdminDashboard user={user} />} />
          </Routes>

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
                    {notifications.length === 0 ? <p className="text-zinc-800 uppercase font-black text-center mt-20 text-[10px]">{t.notifications.noNotifications}</p> : notifications.map(n => (
                      <div key={n.id} onMouseEnter={() => markRead(n.id)} className={`p-8 bg-zinc-900/50 border ${readIds.includes(n.id) ? 'border-white/5' : 'border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]'} rounded-[2.5rem] space-y-4`}>
                        <h4 className="font-black text-xl italic uppercase leading-none">{n.title}</h4>
                        <p className="text-zinc-500 text-sm leading-relaxed">{n.message}</p>
                        {n.imageUrl && (
                          <div className="mt-4 rounded-3xl overflow-hidden border border-white/5 aspect-video">
                            <img src={n.imageUrl} className="w-full h-full object-cover" alt="Notification attachment" />
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                          <span className="text-[8px] text-zinc-700 font-black uppercase">{new Date(n.createdAt).toLocaleString()}</span>
                          {n.link && <a href={n.link} target="_blank" className="text-[9px] font-black uppercase text-blue-500 hover:underline">{t.notifications.openLink}</a>}
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
const MyOrdersPage: React.FC<{ user: UserProfile }> = ({ user }) => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onValue(ref(database, 'orders'), (snapshot) => {
      const all = Object.values(snapshot.val() || {}) as Order[];
      setOrders(all.filter(o => o.userId === user.uid).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    });
  }, [user]);

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.CHECKING: return t.common.checking;
      case OrderStatus.CHECKED: return t.common.checked;
      case OrderStatus.APPROVED: return t.common.approved;
      default: return status;
    }
  };

  return (
    <div className="pt-32 pb-20 px-6 max-w-4xl mx-auto min-h-screen">
      <h2 className="text-4xl font-black uppercase italic italic mb-12">{t.myOrders.title}</h2>
      {loading ? <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-zinc-900 animate-pulse rounded-2xl" />)}</div> : orders.length === 0 ? (
        <div className="text-center py-20 text-zinc-700 font-black uppercase text-xs">{t.myOrders.noOrders}</div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-zinc-900 border border-white/5 p-8 rounded-[2rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-600 font-black uppercase">{new Date(order.createdAt).toLocaleDateString()} - {new Date(order.createdAt).toLocaleTimeString()}</p>
                <h4 className="text-xl font-black uppercase italic italic">{order.designTypes.map(dt => {
                   if(dt === 'Banner') return t.order.banner;
                   if(dt === 'Avatar') return t.order.avatar;
                   if(dt === 'Preview') return t.order.preview;
                   return dt;
                }).join(' + ')}</h4>
                <p className="text-xs text-zinc-500 font-bold tracking-widest">{order.game}</p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-blue-500 font-black text-2xl italic mb-1">{order.totalPrice.toLocaleString()} {t.common.uzs}</p>
                <span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full ${order.status === OrderStatus.CHECKING ? 'bg-orange-600/20 text-orange-500 border border-orange-500/20' : order.status === OrderStatus.CHECKED ? 'bg-zinc-600/20 text-zinc-400 border border-white/10' : 'bg-blue-600/20 text-blue-500 border border-blue-500/20'}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
