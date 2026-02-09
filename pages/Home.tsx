
import React from 'react';
import { motion } from 'framer-motion';
import { Images, Clock, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../App';

// Define HeroSection locally as it was missing from App.tsx exports
const HeroSection = () => {
  const { t, isWorking, schedule, tashkentTime } = useApp();
  
  return (
    <section className="relative min-h-screen flex items-center pt-20 px-6 overflow-hidden">
      {/* Background decoration blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 blur-[120px] rounded-full -z-10" />
      
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-10"
        >
          <div className="space-y-4">
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-blue-500 font-black uppercase tracking-[0.4em] text-xs block"
            >
              {t.hero.greeting}
            </motion.span>
            <h1 className="text-7xl md:text-9xl font-black uppercase italic tracking-tighter leading-[0.8]">
              {t.hero.brand.split(' ')[0]} <br />
              <span className="text-blue-600">{t.hero.brand.split(' ')[1]}</span>
            </h1>
          </div>

          <p className="text-zinc-500 text-lg md:text-xl font-medium max-w-xl leading-relaxed">
            {t.hero.welcome}
          </p>

          <div className="flex flex-wrap gap-6">
            <Link 
              to={isWorking ? "/order" : "#"} 
              className={`px-10 py-6 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-2xl flex items-center gap-3 ${isWorking ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20' : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'}`}
            >
              {isWorking ? t.hero.ctaOrder : t.hero.ctaClosed}
            </Link>
            <Link 
              to="/portfolio" 
              className="px-10 py-6 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all"
            >
              {t.hero.ctaGallery}
            </Link>
          </div>

          <div className="flex items-center gap-10 pt-10 border-t border-white/5">
             <div>
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">{t.hero.workingHours}</p>
                <p className="text-sm font-black text-white italic">{schedule.start} — {schedule.end}</p>
             </div>
             <div>
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Status</p>
                <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full animate-pulse ${isWorking ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                   <span className="text-sm font-black text-white uppercase italic">{isWorking ? t.hero.statusOpen : t.hero.statusClosed}</span>
                </div>
             </div>
             <div>
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">{t.hero.currentTime}</p>
                <p className="text-sm font-black text-white italic font-mono">{tashkentTime}</p>
             </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="relative hidden lg:block"
        >
          <div className="aspect-square bg-zinc-900 rounded-[5rem] overflow-hidden border border-white/5 shadow-2xl p-4">
             <div className="w-full h-full bg-blue-600/5 rounded-[4rem] flex items-center justify-center">
                <div className="text-[12rem] font-black italic text-blue-600/20 select-none">ED</div>
             </div>
          </div>
          <motion.div 
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-10 -right-10 bg-white p-8 rounded-[3rem] shadow-2xl rotate-12"
          >
             <p className="text-black font-black text-xs uppercase tracking-widest">Premium<br/>Quality</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export const Home = () => {
  return (
    <div className="overflow-hidden">
      <HeroSection />
      
      <section className="py-40 px-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
        <FeatureCard 
          icon={<Images size={32}/>} 
          title="High-End Production" 
          desc="Professional graphics designed in high resolution for peak visual performance on any platform." 
        />
        <FeatureCard 
          icon={<Clock size={32}/>} 
          title="Fast Delivery" 
          desc="Optimized workflows mean your premium designs are ready for action in record time." 
        />
        <FeatureCard 
          icon={<ShieldCheck size={32}/>} 
          title="Direct Support" 
          desc="Personal communication with the lead designer via encrypted Telegram channels." 
        />
      </section>

      <section className="py-20 px-6 bg-zinc-950/50 border-y border-white/5">
        <div className="max-w-7xl mx-auto text-center space-y-12">
          <h3 className="text-5xl font-black uppercase italic tracking-tighter">TRUSTED BY CONTENT CREATORS</h3>
          <div className="flex flex-wrap justify-center gap-16 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
             <div className="text-4xl font-black italic">ELBEK</div>
             <div className="text-4xl font-black italic">DESIGN</div>
             <div className="text-4xl font-black italic">AGENCY</div>
             <div className="text-4xl font-black italic">ULTRA</div>
          </div>
        </div>
      </section>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }} 
    whileInView={{ opacity: 1, y: 0 }} 
    viewport={{ once: true }} 
    className="p-14 bg-zinc-900/30 rounded-[4rem] border border-white/5 hover:bg-zinc-900/50 transition-colors group"
  >
    <div className="w-16 h-16 bg-blue-600/10 text-blue-500 rounded-[1.5rem] flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform mb-8">
      {icon}
    </div>
    <h4 className="text-2xl font-black uppercase italic mb-4">{title}</h4>
    <p className="text-zinc-500 text-sm font-medium uppercase tracking-wider leading-[1.8]">
      {desc}
    </p>
  </motion.div>
);
