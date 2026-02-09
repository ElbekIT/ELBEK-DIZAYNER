
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, Trash2, ImageIcon, Smartphone, Bell, Clock, 
  ShieldAlert, X, AlertTriangle, Terminal, Info, Copy, Check 
} from 'lucide-react';
import { ref, onValue, off, set, update, remove } from 'firebase/database';
import { ref as sRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { database, storage } from '../firebase';
import { useApp } from '../App';
import { Order, OrderStatus, PortfolioItem, AppUserMetadata } from '../types';

export const AdminDashboard = () => {
  const { user } = useApp();
  const [tab, setTab] = useState<'orders' | 'portfolio' | 'broadcast' | 'schedule'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<AppUserMetadata[]>([]);

  useEffect(() => {
    if (!user?.isOwner) return;
    const oRef = ref(database, 'orders');
    const uRef = ref(database, 'users');
    
    onValue(oRef, (s) => {
      const data = s.val();
      setOrders(data ? Object.values(data).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as Order[] : []);
    });
    onValue(uRef, (s) => setUsers(s.val() ? Object.values(s.val()) as AppUserMetadata[] : []));

    return () => { off(oRef); off(uRef); };
  }, [user]);

  if (!user?.isOwner) return <Navigate to="/" />;

  return (
    <div className="pt-40 pb-20 px-6 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 mb-20">
        <div>
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-7xl font-black uppercase italic tracking-tighter leading-none"
          >
            ADMIN <span className="text-blue-600">COMMAND.</span>
          </motion.h2>
          <p className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.5em] mt-4">Security Protocol: Authorized Access Only</p>
        </div>
        <div className="flex bg-zinc-900/50 p-2 rounded-[2rem] border border-white/5 backdrop-blur-3xl overflow-x-auto no-scrollbar max-w-full">
          {['orders', 'portfolio', 'broadcast', 'schedule'].map((t: any) => (
            <button 
              key={t} 
              onClick={() => setTab(t)} 
              className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${tab === t ? 'bg-blue-600 text-white shadow-xl scale-105' : 'text-zinc-500 hover:text-white'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={tab} 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
        >
          {tab === 'orders' && <OrdersList orders={orders} />}
          {tab === 'portfolio' && <PortfolioAdminManager />}
          {tab === 'broadcast' && <BroadcastManager users={users} />}
          {tab === 'schedule' && <ScheduleManager />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const OrdersList = ({ orders }: { orders: Order[] }) => (
  <div className="grid grid-cols-1 gap-6">
    {orders.length === 0 ? (
      <div className="py-40 text-center text-zinc-800 uppercase font-black tracking-widest italic border-2 border-dashed border-white/5 rounded-[4rem]">
        No Active Missions Detected
      </div>
    ) : orders.map(o => (
      <motion.div 
        key={o.id}
        layout
        className="bg-zinc-900/30 border border-white/5 p-10 rounded-[3rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-8 group hover:bg-zinc-900/50 transition-colors"
      >
        <div className="space-y-2">
          <div className="flex gap-4 items-center">
            <span className="text-[10px] font-black uppercase text-zinc-600">MISSION ID: {o.id}</span>
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border tracking-widest ${
              o.status === OrderStatus.CHECKING ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
              o.status === OrderStatus.CANCELLED ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 
              'bg-blue-500/10 text-blue-500 border-blue-500/20'
            }`}>{o.status}</span>
          </div>
          <h4 className="text-3xl font-black uppercase italic">{o.firstName} {o.lastName}</h4>
          <p className="text-xs text-zinc-500 font-black uppercase">{o.designTypes.join(' + ')} • {o.game}</p>
          <div className="flex items-center gap-4 mt-4">
             <a href={`tel:${o.phoneNumber}`} className="p-3 bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all"><Smartphone size={20}/></a>
             <span className="text-sm font-black text-zinc-300">{o.phoneNumber}</span>
          </div>
        </div>
        <div className="text-left md:text-right space-y-4 w-full md:w-auto">
          <p className="text-4xl font-black italic text-blue-500">{o.totalPrice.toLocaleString()} UZS</p>
          <select 
            value={o.status} 
            onChange={async (e) => await update(ref(database, `orders/${o.id}`), { status: e.target.value })}
            className="w-full md:w-auto bg-black border border-white/10 p-4 rounded-xl text-[10px] font-black uppercase text-zinc-500 focus:border-blue-500 transition-all outline-none"
          >
            <option value={OrderStatus.CHECKING}>Checking</option>
            <option value={OrderStatus.CHECKED}>Checked</option>
            <option value={OrderStatus.APPROVED}>Approved</option>
            <option value={OrderStatus.CANCELLED}>Cancelled</option>
          </select>
        </div>
      </motion.div>
    ))}
  </div>
);

const PortfolioAdminManager = () => {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCorsHelp, setShowCorsHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const pRef = ref(database, 'portfolio');
    const unsub = onValue(pRef, s => setItems(s.val() ? Object.keys(s.val()).map(k => ({ ...s.val()[k], id: k })) : []));
    return () => off(pRef);
  }, []);

  const handleUpload = async () => {
    if (!title || !file) return;
    setLoading(true);
    setErrorMessage(null);
    
    // Guardian Timeout: Stop the "Infinite Spinner" after 20 seconds
    const uploadTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("NETWORK_TIMEOUT")), 20000)
    );

    try {
      const id = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const storageRef = sRef(storage, `portfolio/${id}`);
      
      // Attempt the upload with a safety timeout
      await Promise.race([
        uploadBytes(storageRef, file),
        uploadTimeout
      ]);

      const url = await getDownloadURL(storageRef);
      
      await set(ref(database, `portfolio/${id}`), { 
        title, 
        imageUrl: url, 
        createdAt: new Date().toISOString() 
      });
      
      setTitle(''); 
      setFile(null); 
      setPreview(null);
      alert("SUCCESS: Design deployed to the public vault.");
    } catch(e: any) { 
      console.error("Upload Error:", e);
      let msg = "Upload failed. Please check your connection.";
      
      if (e.message === "NETWORK_TIMEOUT") {
        msg = "Upload TIMED OUT. This is usually caused by Firebase CORS blocking your Vercel domain.";
        setShowCorsHelp(true);
      } else if (e.message?.includes("CORS") || e.code?.includes("unauthorized")) {
        msg = "SECURITY BLOCK: Firebase Storage rejected the request (CORS Error).";
        setShowCorsHelp(true);
      }
      setErrorMessage(msg);
    } finally { 
      setLoading(false); 
    }
  };

  const handleDelete = async (item: PortfolioItem) => {
    if (!window.confirm("Permanently erase this asset from history?")) return;
    try {
      const itemStorageRef = sRef(storage, `portfolio/${item.id}`);
      await deleteObject(itemStorageRef).catch(err => console.warn("Asset missing from storage, purging DB record anyway."));
      await remove(ref(database, `portfolio/${item.id}`));
      alert("Asset Erased.");
    } catch (e) {
      console.error("Delete Error:", e);
      alert("Erase operation failed.");
    }
  };

  const copyCorsCommand = () => {
    const cmd = `gsutil cors set cors.json gs://darian-electronics.firebasestorage.app`;
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-20">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
        <div className="xl:col-span-2 space-y-8">
          <div className="bg-zinc-900/50 p-12 rounded-[4rem] border border-white/5 shadow-2xl space-y-8 backdrop-blur-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-[0.02] -rotate-12"><ImageIcon size={200} /></div>
            <h3 className="text-4xl font-black uppercase italic tracking-tighter">VAULT INGESTION</h3>
            
            <AnimatePresence>
              {errorMessage && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex gap-4 items-start"
                >
                  <AlertTriangle className="text-rose-500 shrink-0" size={20} />
                  <div>
                    <p className="text-[10px] font-black uppercase text-rose-500 tracking-[0.2em] mb-1">Upload Interrupted</p>
                    <p className="text-sm text-zinc-300">{errorMessage}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-600 ml-4 tracking-widest">ARTWORK TITLE</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Minecraft 4K Render" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    className="w-full bg-black border border-white/5 p-6 rounded-3xl outline-none font-black text-xs uppercase focus:border-blue-500 transition-all" 
                  />
                </div>
                <button 
                  disabled={loading || !title || !file} 
                  onClick={handleUpload} 
                  className="w-full py-8 bg-blue-600 text-white font-black uppercase rounded-3xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-20 relative group overflow-hidden"
                >
                  {loading && <div className="absolute inset-0 bg-white/10 animate-pulse" />}
                  {loading ? <Loader2 className="animate-spin" /> : 'SECURE IN VAULT'}
                </button>
              </div>

              <label className="block w-full aspect-video border-2 border-dashed border-white/10 rounded-[3rem] cursor-pointer hover:bg-white/5 transition-all overflow-hidden flex items-center justify-center relative">
                {preview ? (
                  <div className="relative w-full h-full">
                    <img src={preview} className="w-full h-full object-cover" alt="Preview" />
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); setFile(null); setPreview(null); }}
                      className="absolute top-4 right-4 p-2 bg-black/60 rounded-xl text-white hover:bg-rose-600 transition-colors z-10"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="text-center opacity-30 group-hover:opacity-100 transition-opacity">
                    <ImageIcon size={48} className="mx-auto mb-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Select Imagery</span>
                  </div>
                )}
                {!preview && <input type="file" className="hidden" accept="image/*" onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setFile(f);
                    const r = new FileReader();
                    r.onload = (re) => setPreview(re.target?.result as string);
                    r.readAsDataURL(f);
                  }
                }} />}
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={`p-8 rounded-[3rem] border transition-all duration-700 backdrop-blur-3xl ${showCorsHelp ? 'bg-amber-500/10 border-amber-500/30 ring-4 ring-amber-500/5' : 'bg-zinc-900/30 border-white/5'}`}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-500"><Terminal size={20} /></div>
              <h4 className="font-black text-[10px] uppercase tracking-widest">CORS SECURITY PATCH</h4>
            </div>
            <p className="text-zinc-500 text-[11px] font-bold leading-relaxed mb-6">If uploads stay on loading forever, execute this command in your local terminal to authorize the Vercel domain:</p>
            <div className="bg-black p-5 rounded-2xl border border-white/5 space-y-4 font-mono text-[9px] relative group overflow-hidden">
              <button onClick={copyCorsCommand} className="absolute top-3 right-3 text-zinc-600 hover:text-white transition-colors">{copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}</button>
              <p className="text-blue-400 break-all leading-relaxed pr-6">gsutil cors set cors.json gs://darian-electronics.firebasestorage.app</p>
            </div>
            <a href="https://console.firebase.google.com/" target="_blank" className="mt-6 text-[10px] font-black uppercase text-amber-500/50 hover:text-amber-500 transition-colors flex items-center gap-2"><Info size={14} /> Documentation</a>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <h3 className="text-2xl font-black uppercase italic tracking-tighter ml-4">ASSET INVENTORY</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {items.map(i => (
            <motion.div 
              key={i.id} 
              layout
              className="group relative aspect-video rounded-[2.5rem] overflow-hidden border border-white/5 shadow-xl"
            >
              <img src={i.imageUrl} className="w-full h-full object-cover" alt={i.title} />
              <div className="absolute inset-0 bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-6 text-center">
                <p className="font-black uppercase italic mb-6 text-xs tracking-widest">{i.title}</p>
                <button 
                  onClick={() => handleDelete(i)} 
                  className="p-4 bg-rose-600 rounded-2xl shadow-xl hover:scale-110 active:scale-90 transition-all"
                >
                  <Trash2 size={24}/>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

const BroadcastManager = ({ users }: { users: AppUserMetadata[] }) => {
  const [title, setTitle] = useState('');
  const [msg, setMsg] = useState('');
  const [target, setTarget] = useState('global');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if(!title || !msg) return;
    setLoading(true);
    try {
      const id = Math.random().toString(36).substring(7);
      const path = target === 'global' ? `notifications/global/${id}` : `notifications/private/${target}/${id}`;
      await set(ref(database, path), { id, title, message: msg, type: target === 'global' ? 'global' : 'private', targetUid: target === 'global' ? null : target, createdAt: new Date().toISOString() });
      setTitle(''); setMsg('');
      alert("Intel transmitted.");
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto bg-zinc-900/50 p-16 rounded-[4rem] border border-white/5 space-y-10 shadow-2xl backdrop-blur-3xl">
      <h3 className="text-4xl font-black uppercase italic tracking-tighter text-center">INTEL BROADCAST</h3>
      <div className="space-y-4">
        <label className="text-[10px] font-black uppercase text-zinc-600 ml-1 tracking-widest">Protocol Target</label>
        <select value={target} onChange={e => setTarget(e.target.value)} className="w-full bg-black border border-white/5 p-5 rounded-2xl outline-none text-[10px] font-black uppercase tracking-widest text-zinc-400 focus:border-blue-500 transition-all">
          <option value="global">GLOBAL BROADCAST</option>
          {users.map(u => <option key={u.uid} value={u.uid}>{u.displayName}</option>)}
        </select>
      </div>
      <input type="text" placeholder="Subject Headline" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-black border border-white/5 p-5 rounded-2xl outline-none font-black text-xs uppercase" />
      <textarea placeholder="Message content..." value={msg} onChange={e => setMsg(e.target.value)} className="w-full h-48 bg-black border border-white/5 p-6 rounded-3xl outline-none resize-none font-medium text-sm text-zinc-300" />
      <button disabled={loading || !title || !msg} onClick={handleSend} className="w-full py-6 bg-blue-600 text-white font-black uppercase rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-20">
        {loading ? <Loader2 className="animate-spin" /> : 'TRANSMIT INTEL'}
      </button>
    </div>
  );
};

const ScheduleManager = () => {
  const { schedule } = useApp();
  const [hours, setHours] = useState(schedule);

  const save = async () => {
    await set(ref(database, 'config/workingHours'), hours);
    alert("System Synchronized.");
  };

  return (
    <div className="max-w-xl mx-auto bg-zinc-900/50 p-16 rounded-[4rem] border border-white/5 space-y-12 text-center shadow-2xl backdrop-blur-3xl">
      <h3 className="text-4xl font-black uppercase italic tracking-tighter">OPERATIONAL UPTIME</h3>
      <div className="grid grid-cols-2 gap-10">
        <div><label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">START</label><input type="time" value={hours.start} onChange={e => setHours({...hours, start: e.target.value})} className="w-full bg-black border border-white/5 p-6 rounded-[1.5rem] mt-4 font-black text-2xl text-white outline-none focus:border-blue-500 transition-all" /></div>
        <div><label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">END</label><input type="time" value={hours.end} onChange={e => setHours({...hours, end: e.target.value})} className="w-full bg-black border border-white/5 p-6 rounded-[1.5rem] mt-4 font-black text-2xl text-white outline-none focus:border-blue-500 transition-all" /></div>
      </div>
      <button onClick={save} className="w-full py-6 bg-blue-600 text-white font-black uppercase rounded-[1.5rem] shadow-xl active:scale-95 transition-all tracking-[0.2em] text-[10px]">COMMIT CONFIG</button>
    </div>
  );
};
