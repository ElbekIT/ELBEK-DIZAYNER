
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ImageIcon, AlertCircle } from 'lucide-react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '../firebase';
import { PortfolioItem } from '../types';
import { useApp } from '../App';
import { ProtectedImage } from '../components/ProtectedImage';

export const PortfolioPage = () => {
  const { t } = useApp();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // PUBLIC READ ACCESS: No auth check required here for viewing
    const pRef = ref(database, 'portfolio');
    
    const unsub = onValue(pRef, (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          const sorted = Object.keys(data)
            .map(k => ({ ...data[k], id: k }))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setItems(sorted as PortfolioItem[]);
        } else {
          setItems([]);
        }
        setError(false);
      } catch (err) {
        console.error("Data parse error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }, (err) => {
      console.error("Firebase Database read error:", err);
      setError(true);
      setLoading(false);
    });

    return () => off(pRef);
  }, []);

  return (
    <div className="pt-40 pb-20 px-6 max-w-7xl mx-auto min-h-screen">
      <div className="text-center mb-24">
        <motion.h2 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="text-7xl md:text-9xl font-black uppercase italic mb-6 tracking-tighter"
        >
          OUR <span className="text-blue-600">WORK.</span>
        </motion.h2>
        <p className="text-zinc-500 font-black uppercase tracking-[0.5em] text-[10px]">{t.portfolio.subtitle}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-video bg-zinc-900 animate-pulse rounded-[3rem]" />)}
        </div>
      ) : error ? (
        <div className="text-center py-40 bg-rose-500/5 rounded-[4rem] border border-rose-500/10">
           <AlertCircle size={60} className="mx-auto text-rose-500 mb-6" />
           <p className="text-rose-500 font-black uppercase tracking-widest text-sm italic">Failed to sync with the vault. Please refresh.</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-40 border-2 border-dashed border-white/5 rounded-[4rem]">
           <ImageIcon size={60} className="mx-auto text-zinc-800 mb-6" />
           <p className="text-zinc-800 font-black uppercase tracking-widest text-sm italic">The gallery is currently being curated...</p>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
        >
          {items.map(item => (
            <motion.div 
              key={item.id} 
              layout 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="group relative aspect-video rounded-[3rem] overflow-hidden border border-white/5 hover:border-blue-500/30 transition-all duration-700 hover:scale-[1.03]"
            >
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
