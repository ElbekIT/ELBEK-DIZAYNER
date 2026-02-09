
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Download } from 'lucide-react';
import { ref, onValue, off, update } from 'firebase/database';
import { database } from '../firebase';
import { useApp } from '../App';
import { Notification } from '../types';

export const NotificationDrawer = () => {
  const { user, t } = useApp();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    if(!user) return;
    
    // Global notifications
    const gRef = ref(database, 'notifications/global');
    // Private notifications
    const pRef = ref(database, `notifications/private/${user.uid}`);
    // Read status from user meta
    const uRef = ref(database, `users/${user.uid}/readNotifications`);

    const unsubG = onValue(gRef, (s) => {
      const gData = s.val() ? Object.values(s.val()) as Notification[] : [];
      onValue(pRef, (ps) => {
        const pData = ps.val() ? Object.values(ps.val()) as Notification[] : [];
        setNotifications([...gData, ...pData].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      });
    });

    const unsubU = onValue(uRef, (s) => {
      setReadIds(s.val() || []);
    });

    return () => { off(gRef); off(pRef); off(uRef); };
  }, [user]);

  const markRead = async (id: string) => {
    if (!user || readIds.includes(id)) return;
    const newReadIds = [...readIds, id];
    await update(ref(database, `users/${user.uid}`), { readNotifications: newReadIds });
  };

  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

  return (
    <>
      <button 
        onClick={() => setOpen(true)} 
        className="fixed bottom-10 right-10 z-[50] w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-[0_20px_40px_rgba(37,99,235,0.4)] hover:scale-110 active:scale-90 transition-all group"
      >
        <Bell size={28} className="group-hover:rotate-12 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-4 ring-[#050505]">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full max-w-lg bg-zinc-950 h-full border-l border-white/5 p-12 overflow-y-auto no-scrollbar flex flex-col">
              <div className="flex items-center justify-between mb-12">
                <h3 className="text-4xl font-black uppercase italic tracking-tighter">ALERTS</h3>
                <button onClick={() => setOpen(false)} className="p-4 hover:bg-white/5 rounded-3xl transition-all"><X size={28} /></button>
              </div>
              
              <div className="space-y-8 flex-1">
                {notifications.length === 0 ? (
                  <div className="text-center py-20 opacity-20">
                    <Bell size={80} className="mx-auto mb-6" />
                    <p className="font-black uppercase tracking-widest text-xs">{t.notifications.noNotifications}</p>
                  </div>
                ) : notifications.map(n => (
                  <div 
                    key={n.id} 
                    onMouseEnter={() => markRead(n.id)}
                    className={`p-10 bg-zinc-900/40 border rounded-[3.5rem] space-y-6 shadow-xl transition-all ${readIds.includes(n.id) ? 'border-white/5 opacity-60' : 'border-blue-500/20 shadow-blue-500/5'}`}
                  >
                    <h4 className="font-black text-2xl italic uppercase text-white leading-tight">{n.title}</h4>
                    <p className="text-zinc-400 text-sm font-medium leading-relaxed">{n.message}</p>
                    {n.attachmentUrl && (
                      <div className="rounded-3xl overflow-hidden border border-white/10 p-4 bg-black/40 space-y-4">
                        <img src={n.attachmentUrl} className="w-full rounded-2xl shadow-2xl" alt="Attachment" />
                        <a href={n.attachmentUrl} download className="block text-center py-4 bg-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors">Download Asset</a>
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
