
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, AlertCircle } from 'lucide-react';
import { ref, onValue, off, update } from 'firebase/database';
import { database } from '../firebase';
import { useApp } from '../App';
import { Order, OrderStatus } from '../types';
import { sendCancellationToTelegram } from '../services/telegramService';

export const MyOrdersPage = () => {
  const { user, t } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<Order | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if(!user) return;
    const oRef = ref(database, 'orders');
    const unsub = onValue(oRef, (s) => {
      const data = s.val();
      if(data) {
        const filtered = Object.values(data).filter((o: any) => o.userId === user.uid) as Order[];
        setOrders(filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } else setOrders([]);
      setLoading(false);
    });
    return () => off(oRef);
  }, [user]);

  const handleCancel = async () => {
    if(!cancelling || !reason.trim()) return;
    try {
      await update(ref(database, `orders/${cancelling.id}`), { 
        status: OrderStatus.CANCELLED, 
        cancelReason: reason 
      });
      await sendCancellationToTelegram(cancelling, reason);
      setCancelling(null); 
      setReason('');
    } catch (e) { alert("Cancellation failed."); }
  };

  if(!user) return <Navigate to="/" />;

  return (
    <div className="pt-40 pb-20 px-6 max-w-5xl mx-auto min-h-screen">
      <h2 className="text-7xl font-black uppercase italic mb-20 tracking-tighter leading-none">YOUR <span className="text-blue-600">INTEL.</span></h2>
      
      {loading ? (
        <div className="space-y-6">
           {[1,2,3].map(i => <div key={i} className="h-40 bg-zinc-900/40 rounded-[3rem] animate-pulse" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-40 bg-zinc-900/20 rounded-[4rem] border border-white/5 space-y-6">
           <AlertCircle size={60} className="mx-auto text-zinc-800" />
           <p className="text-zinc-800 font-black uppercase tracking-widest text-sm">No Missions Logged In Your History</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(o => (
            <div key={o.id} className="bg-zinc-900/50 border border-white/5 p-10 rounded-[3rem] flex flex-col md:flex-row justify-between items-center gap-8 group transition-all hover:border-blue-500/20">
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">{new Date(o.createdAt).toLocaleString()}</p>
                <h4 className="text-3xl font-black uppercase italic leading-tight">{o.designTypes.join(' + ')}</h4>
                <div className="flex items-center gap-3">
                   <div className="bg-blue-600/10 text-blue-500 text-[10px] font-black px-4 py-1.5 rounded-xl border border-blue-500/20">{o.game}</div>
                   <span className="text-[9px] font-black uppercase text-zinc-700 tracking-widest">ORDER ${o.id}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-4">
                <p className="text-blue-500 font-black text-4xl italic tracking-tighter">{o.totalPrice.toLocaleString()} UZS</p>
                <div className="flex items-center gap-4">
                  <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase border tracking-widest ${o.status === OrderStatus.CHECKING ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : o.status === OrderStatus.CANCELLED ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>{o.status}</span>
                  {o.status === OrderStatus.CHECKING && (
                    <button onClick={() => setCancelling(o)} className="p-3 bg-zinc-800 rounded-2xl text-zinc-600 hover:text-rose-500 transition-colors shadow-lg active:scale-90"><XCircle size={22}/></button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {cancelling && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCancelling(null)} className="absolute inset-0 bg-black/95 backdrop-blur-3xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-xl bg-zinc-900 border border-white/5 rounded-[4rem] p-12 space-y-8 shadow-2xl">
              <h3 className="text-4xl font-black uppercase italic tracking-tighter">MISSION ABORT</h3>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Specify the exact reason for order termination:</p>
              <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Tafsilotlar..." className="w-full h-48 bg-black border border-white/5 p-8 rounded-[2.5rem] outline-none resize-none font-medium text-white focus:border-rose-500/30 transition-all" />
              <div className="flex gap-4">
                <button onClick={() => setCancelling(null)} className="flex-1 py-5 bg-zinc-800 rounded-3xl font-black uppercase text-[10px] tracking-widest">Stay Active</button>
                <button 
                  onClick={handleCancel} 
                  disabled={!reason.trim()} 
                  className="flex-1 py-5 bg-rose-600 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-rose-600/10 disabled:opacity-20 active:scale-95 transition-all"
                >
                  Terminate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
