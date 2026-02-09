
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../App';
import { logout, signInWithGoogle } from '../firebase';

export const Navbar = () => {
  const { user, t, language, setLanguage, isWorking } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handle);
    return () => window.removeEventListener('scroll', handle);
  }, []);

  const links = [
    { name: t.nav.home, path: '/' },
    { name: t.nav.order, path: '/order', disabled: !isWorking },
    { name: t.nav.portfolio, path: '/portfolio' },
    { name: t.nav.myOrders, path: '/my-orders' },
  ];
  if (user?.isOwner) links.push({ name: t.nav.admin, path: '/admin' });

  return (
    <nav className={`fixed top-0 inset-x-0 z-[60] transition-all duration-500 ${scrolled ? 'bg-black/80 backdrop-blur-2xl border-b border-white/5 h-20' : 'h-24'}`}>
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center font-black italic shadow-2xl group-hover:scale-110 transition-transform">ED</div>
          <span className="text-xl font-bold tracking-tight">Elbek<span className="text-blue-500">Design</span></span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-10">
          {links.map(l => (
            l.disabled ? (
              <span key={l.path} className="text-[10px] font-black uppercase text-zinc-700 opacity-30 cursor-not-allowed">{l.name}</span>
            ) : (
              <Link 
                key={l.path} 
                to={l.path} 
                className={`text-[10px] font-black uppercase tracking-widest transition-colors hover:text-blue-500 relative ${loc.pathname === l.path ? 'text-blue-500' : 'text-zinc-500'}`}
              >
                {l.name}
                {loc.pathname === l.path && (
                  <motion.div layoutId="nav-underline" className="absolute -bottom-8 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />
                )}
              </Link>
            )
          ))}
          
          <div className="w-px h-6 bg-white/10 mx-2" />
          
          <div className="flex items-center gap-6">
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-transparent text-[10px] font-black uppercase text-zinc-500 outline-none cursor-pointer hover:text-white"
            >
              <option value="uz-Latn">UZ</option>
              <option value="uz-Cyrl">ЎЗ</option>
              <option value="ru">RU</option>
            </select>
            {user ? (
              <div className="flex items-center gap-4">
                <img src={user.photoURL} className="w-9 h-9 rounded-2xl ring-1 ring-blue-600 object-cover" alt="User" />
                <button onClick={logout} className="p-2 text-zinc-600 hover:text-rose-500 transition-colors"><LogOut size={16} /></button>
              </div>
            ) : (
              <button 
                onClick={signInWithGoogle} 
                className="px-6 py-3 bg-white text-black text-[10px] font-black uppercase rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-xl"
              >
                {t.nav.signIn}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Toggle */}
        <button onClick={() => setMobileMenu(!mobileMenu)} className="lg:hidden p-2 text-white">
          {mobileMenu ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenu && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-zinc-950 border-b border-white/5 overflow-hidden"
          >
            <div className="p-6 flex flex-col gap-6">
              {links.map(l => (
                !l.disabled && (
                  <Link 
                    key={l.path} 
                    to={l.path} 
                    onClick={() => setMobileMenu(false)}
                    className={`text-lg font-black uppercase tracking-widest flex items-center justify-between ${loc.pathname === l.path ? 'text-blue-500' : 'text-zinc-500'}`}
                  >
                    {l.name} <ChevronRight size={18} />
                  </Link>
                )
              ))}
              {!user && (
                <button 
                  onClick={() => { signInWithGoogle(); setMobileMenu(false); }} 
                  className="w-full py-4 bg-white text-black font-black uppercase text-xs rounded-2xl"
                >
                  {t.nav.signIn}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
