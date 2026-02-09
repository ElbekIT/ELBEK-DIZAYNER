
import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { BlockStatus } from '../types';
import { logout } from '../firebase';

export const BlockedOverlay = ({ status }: { status: BlockStatus | null }) => {
  if (!status?.isBlocked) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-6">
      <div className="max-w-md w-full text-center bg-zinc-900 border border-rose-500/20 p-16 rounded-[4rem] shadow-2xl">
        <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-rose-500/20 text-rose-500">
          <ShieldAlert size={40} />
        </div>
        <h3 className="text-4xl font-black uppercase italic tracking-tighter mb-4 text-white">ACCESS DENIED</h3>
        <p className="text-zinc-500 font-bold leading-relaxed mb-10">Your account has been restricted by the administrator. Contact support if you believe this is an error.</p>
        <button 
          onClick={logout} 
          className="w-full py-6 bg-white text-black font-black uppercase rounded-2xl tracking-[0.2em] text-[10px] hover:bg-rose-600 hover:text-white transition-all shadow-xl active:scale-95"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};
