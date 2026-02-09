
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, CheckCircle2, CreditCard, Layers, User, ImageIcon } from 'lucide-react';
import { useApp } from '../App';
import { DESIGN_PRICES, PROMO_CODE, PROMO_DISCOUNT, GAMES } from '../constants';
import { Order, OrderStatus } from '../types';
import { ref, set } from 'firebase/database';
import { database } from '../firebase';
import { sendOrderToTelegram } from '../services/telegramService';

export const OrderPage = () => {
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
    const digitsOnly = val.replace(/\D/g, '').slice(3, 12); // Only take 9 digits after 998
    
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
        ...formData, 
        id, 
        userId: user!.uid, 
        userEmail: user!.email, 
        userName: user!.displayName,
        totalPrice: currentPrice, 
        status: OrderStatus.CHECKING, 
        createdAt: new Date().toISOString()
      };
      await set(ref(database, `orders/${id}`), payload);
      await sendOrderToTelegram(payload);
      nav('/my-orders');
    } catch (e) { 
      alert("Submission Error. Check connection."); 
    } finally { 
      setSubmitting(false); 
    }
  };

  if (!isWorking && !user?.isOwner) return <div className="pt-40 text-center font-black uppercase text-rose-500">Service is currently closed.</div>;

  return (
    <div className="pt-40 pb-20 px-6 max-w-2xl mx-auto min-h-screen">
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-12">
          {/* Progress Bar */}
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${step >= i ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-zinc-900'}`} />)}
          </div>

          {step === 1 && (
            <div className="space-y-8">
              <div className="space-y-2">
                <h3 className="text-4xl font-black uppercase italic tracking-tighter">{t.order.personalTitle}</h3>
                <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Identify yourself for the record</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <input type="text" placeholder={t.order.firstName} value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold" />
                <input type="text" placeholder={t.order.lastName} value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold" />
              </div>
              <div className="flex gap-4">
                <button onClick={() => setFormData({...formData, gender: 'Male'})} className={`flex-1 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest border transition-all ${formData.gender === 'Male' ? 'bg-emerald-600 border-emerald-600 shadow-xl' : 'bg-zinc-900/50 border-white/5 text-zinc-600'}`}>Male</button>
                <button onClick={() => setFormData({...formData, gender: 'Female'})} className={`flex-1 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest border transition-all ${formData.gender === 'Female' ? 'bg-rose-600 border-rose-600 shadow-xl' : 'bg-zinc-900/50 border-white/5 text-zinc-600'}`}>Female</button>
              </div>
              <input type="tel" value={formData.phone} onChange={handlePhone} className="w-full bg-zinc-900/50 border border-white/5 p-6 rounded-2xl outline-none font-black text-2xl tracking-widest text-white font-mono" />
              <input type="text" placeholder={t.order.telegram} value={formData.telegram} onChange={e => setFormData({...formData, telegram: e.target.value})} className="w-full bg-zinc-900/50 border border-white/5 p-6 rounded-2xl outline-none font-bold" />
              <button disabled={!formData.firstName || formData.phone.length < 17} onClick={() => setStep(2)} className="w-full py-6 bg-white text-black font-black uppercase rounded-2xl tracking-widest disabled:opacity-20 active:scale-95 transition-all">Continue to Design</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div className="space-y-2">
                <h3 className="text-4xl font-black uppercase italic tracking-tighter">SELECT SERVICES</h3>
                <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Choose the graphics you require</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { id: 'Banner', name: t.order.banner, price: DESIGN_PRICES.BANNER, icon: Layers },
                  { id: 'Avatar', name: t.order.avatar, price: DESIGN_PRICES.AVATAR, icon: User },
                  { id: 'Preview', name: t.order.preview, price: DESIGN_PRICES.PREVIEW, icon: ImageIcon },
                ].map(d => (
                  <button 
                    key={d.id} 
                    onClick={() => setFormData({...formData, designTypes: formData.designTypes.includes(d.id) ? formData.designTypes.filter(t => t !== d.id) : [...formData.designTypes, d.id]})}
                    className={`w-full p-8 rounded-[2.5rem] border text-left flex justify-between items-center transition-all ${formData.designTypes.includes(d.id) ? 'bg-blue-600 border-blue-600 shadow-xl' : 'bg-zinc-900/50 border-white/5 hover:bg-zinc-900'}`}
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.designTypes.includes(d.id) ? 'bg-white/20' : 'bg-zinc-800 text-zinc-600'}`}>
                        <d.icon size={24} />
                      </div>
                      <div>
                        <span className="text-lg font-black uppercase italic block">{d.name}</span>
                        <span className="text-[10px] font-black uppercase text-zinc-500">{d.price.toLocaleString()} UZS</span>
                      </div>
                    </div>
                    {formData.designTypes.includes(d.id) && <CheckCircle2 size={24} />}
                  </button>
                ))}
              </div>
              <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="flex-1 py-6 bg-transparent text-white font-black uppercase rounded-3xl border border-white/5 text-[10px] tracking-widest">Back</button>
                <button disabled={formData.designTypes.length === 0} onClick={() => setStep(3)} className="flex-[2] py-6 bg-white text-black font-black uppercase rounded-3xl shadow-xl disabled:opacity-20 active:scale-95 transition-all">Next</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <div className="space-y-2">
                <h3 className="text-4xl font-black uppercase italic tracking-tighter">GAME THEME</h3>
                <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Pick your aesthetic battleground</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[30rem] overflow-y-auto no-scrollbar p-4 bg-zinc-900/50 rounded-[3rem] border border-white/5">
                {GAMES.map(g => (
                  <button key={g} onClick={() => setFormData({...formData, game: g})} className={`p-4 rounded-xl border text-[10px] font-black uppercase text-left truncate transition-all ${formData.game === g ? 'bg-blue-600 border-blue-600 shadow-lg text-white' : 'bg-black border-white/5 text-zinc-600 hover:text-white'}`}>{g}</button>
                ))}
              </div>
              <div className="flex gap-4">
                <button onClick={() => setStep(2)} className="flex-1 py-6 bg-transparent text-white font-black uppercase rounded-3xl border border-white/5 text-[10px] tracking-widest">Back</button>
                <button disabled={!formData.game} onClick={() => setStep(4)} className="flex-[2] py-6 bg-white text-black font-black uppercase rounded-3xl shadow-xl active:scale-95 transition-all">Next</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-10">
              <h3 className="text-4xl font-black uppercase italic tracking-tighter">{t.order.checkoutTitle}</h3>
              <div className="bg-zinc-900/50 p-10 rounded-[3rem] border border-white/5 space-y-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5"><CreditCard size={120}/></div>
                <div className="space-y-4 relative z-10">
                  <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Selected services</p>
                  {formData.designTypes.map(d => (
                    <div key={d} className="flex justify-between items-center text-sm font-black italic">
                      <span>{d}</span>
                      <span className="text-zinc-500">{(DESIGN_PRICES as any)[d.toUpperCase()].toLocaleString()} UZS</span>
                    </div>
                  ))}
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex flex-col gap-4 relative z-10">
                  {!noPromo && (
                    <input 
                      type="text" placeholder="Promo Code" value={formData.promoCode} 
                      onChange={e => setFormData({...formData, promoCode: e.target.value})}
                      className="w-full bg-black border border-white/5 p-5 rounded-2xl outline-none text-blue-500 font-black uppercase tracking-widest text-xs"
                    />
                  )}
                  <button onClick={() => setNoPromo(!noPromo)} className="text-[10px] font-black uppercase text-zinc-600 text-left hover:text-white transition-colors underline underline-offset-4">{noPromo ? 'Reveal Promo Input' : 'I don\'t have a code'}</button>
                  {formData.promoCode === PROMO_CODE && !noPromo && <p className="text-[10px] font-black uppercase text-emerald-500 flex items-center gap-2"><Check size={14} /> {t.order.discountApplied}</p>}
                </div>
                <div className="pt-4 flex justify-between items-end relative z-10">
                  <div className="space-y-1"><p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Total Valuation</p><p className="text-5xl font-black italic text-blue-600">{currentPrice.toLocaleString()} UZS</p></div>
                </div>
                <div className="p-6 bg-black rounded-3xl border border-white/5 text-center relative z-10">
                  <p className="text-[9px] font-black uppercase text-zinc-700 tracking-[0.3em] mb-2">TARGET HUMO CARD</p>
                  <p className="font-mono text-xl tracking-widest font-black select-all cursor-pointer hover:text-blue-500 transition-colors">4073 4200 8456 9577</p>
                </div>
              </div>
              
              <label className="flex items-center gap-6 p-8 bg-zinc-900/50 rounded-[2.5rem] border border-white/5 cursor-pointer hover:bg-zinc-900 transition-colors group">
                <div className="relative w-7 h-7 flex items-center justify-center">
                  <input type="checkbox" checked={formData.paymentConfirmed} onChange={e => setFormData({...formData, paymentConfirmed: e.target.checked})} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <div className={`w-7 h-7 rounded-xl border-2 transition-all ${formData.paymentConfirmed ? 'bg-blue-600 border-blue-600' : 'border-white/10 group-hover:border-white/30'}`}>
                    {formData.paymentConfirmed && <Check size={18} strokeWidth={4} className="text-white" />}
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase text-zinc-400 leading-relaxed tracking-widest group-hover:text-zinc-200">{t.order.confirmPayment}</span>
              </label>

              <div className="flex gap-4">
                <button onClick={() => setStep(3)} className="flex-1 py-6 bg-transparent text-white font-black uppercase rounded-3xl border border-white/5 text-[10px] tracking-widest">Back</button>
                <button 
                  disabled={!formData.paymentConfirmed || submitting} 
                  onClick={submitOrder} 
                  className="flex-[2] py-6 bg-blue-600 text-white font-black uppercase rounded-3xl shadow-[0_20px_40px_rgba(37,99,235,0.2)] active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  {submitting ? 'PROCESSING...' : 'CONFIRM SUBMISSION'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
