
import React, { useState, useEffect } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
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
      setError(true);
      setLoading(false);
    });

    return () => off(pRef);
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemAnim = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 25, stiffness: 200 } }
  };

  return (
    <div className="pt-40 pb-20 px-6 max-w-7xl mx-auto min-h-screen">
      <div className="text-center mb-32 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block px-6 py-2 bg-blue-600/10 border border-blue-500/20 rounded-full text-blue-500 text-[10px] font-black uppercase tracking-[0.4em]"
        >
          {t.portfolio.title}
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="text-7xl md:text-9xl font-black uppercase italic tracking-tighter"
        >
          OUR <span className="text-blue-600">WORK.</span>
        </motion.h2>
        <p className="text-zinc-500 font-black uppercase tracking-[0.5em] text-[10px]">{t.portfolio.subtitle}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-video bg-zinc-900/40 animate-pulse rounded-[3rem]" />)}
        </div>
      ) : error ? (
        <div className="text-center py-40 bg-rose-500/5 rounded-[4rem] border border-rose-500/10">
           <AlertCircle size={60} className="mx-auto text-rose-500 mb-6" />
           <p className="text-rose-500 font-black uppercase tracking-widest text-sm italic">System Link Failure. Please Refresh.</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-40 border-2 border-dashed border-white/5 rounded-[4rem]">
           <ImageIcon size={60} className="mx-auto text-zinc-800 mb-6" />
           <p className="text-zinc-800 font-black uppercase tracking-widest text-sm italic">Gallery Curation in Progress...</p>
        </div>
      ) : (
        <LayoutGroup>
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
          >
            {items.map(item => (
              <motion.div 
                key={item.id} 
                variants={itemAnim}
                layout
                className="group relative aspect-video rounded-[3rem] overflow-hidden border border-white/5 hover:border-blue-500/30 transition-all duration-700 shadow-2xl"
              >
                <ProtectedImage src={item.imageUrl} alt={item.title} className="w-full h-full" />
                <div className="absolute inset-x-0 bottom-0 p-10 bg-gradient-to-t from-black to-transparent translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                  <p className="font-black uppercase italic text-2xl tracking-tighter">{item.title}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="w-8 h-px bg-blue-600"></span>
                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.3em]">Premium Production</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </LayoutGroup>
      )}
    </div>
  );
};
