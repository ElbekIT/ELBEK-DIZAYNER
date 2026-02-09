
import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, off, update } from 'firebase/database';

import { auth, database } from './firebase';
import { Language, translations } from './translations';
import { UserProfile, WorkingHours, BlockStatus, AppUserMetadata } from './types';
import { OWNER_EMAIL } from './constants';

import { LoadingScreen } from './components/LoadingScreen';
import { Navbar } from './components/Navbar';
import { NotificationDrawer } from './components/NotificationDrawer';
import { BlockedOverlay } from './components/BlockedOverlay';

import { Home } from './pages/Home';
import { OrderPage } from './pages/OrderPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { MyOrdersPage } from './pages/MyOrdersPage';
import { AdminDashboard } from './pages/AdminDashboard';

// --- Global Context ---
interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations['uz-Latn'];
  user: UserProfile | null;
  isWorking: boolean;
  schedule: WorkingHours;
  tashkentTime: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};

export default function App() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('lang') as Language) || 'uz-Latn');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [blockStatus, setBlockStatus] = useState<BlockStatus | null>(null);
  const [isAppReady, setIsAppReady] = useState(false);
  const [schedule, setSchedule] = useState<WorkingHours>({ start: "10:00", end: "19:00" });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => { localStorage.setItem('lang', language); }, [language]);
  const t = useMemo(() => translations[language], [language]);

  // Global Working Hours & Current Time
  useEffect(() => {
    const sRef = ref(database, 'config/workingHours');
    const unsub = onValue(sRef, (snap) => {
      if (snap.val()) setSchedule(snap.val());
    });
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => { off(sRef); clearInterval(timer); };
  }, []);

  const tashkentTime = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tashkent',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    }).format(currentTime);
  }, [currentTime]);

  const isWorking = useMemo(() => {
    const toMin = (str: string) => {
      const [h, m] = str.split(':').map(Number);
      return h * 60 + m;
    };
    const now = toMin(tashkentTime.split(':').slice(0, 2).join(':'));
    const start = toMin(schedule.start);
    const end = toMin(schedule.end);
    return start <= end ? (now >= start && now <= end) : (now >= start || now <= end);
  }, [tashkentTime, schedule]);

  // Auth & User State
  useEffect(() => {
    let userMetaUnsub: (() => void) | undefined;

    const authUnsub = onAuthStateChanged(auth, async (fireUser) => {
      if (fireUser) {
        const profile: UserProfile = {
          uid: fireUser.uid, 
          email: fireUser.email || '', 
          displayName: fireUser.displayName || 'User', 
          photoURL: fireUser.photoURL || `https://ui-avatars.com/api/?name=${fireUser.displayName}`,
          isOwner: fireUser.email === OWNER_EMAIL
        };
        setUser(profile);

        const userRef = ref(database, `users/${fireUser.uid}`);
        await update(userRef, { ...profile, lastLogin: new Date().toISOString() });
        
        userMetaUnsub = onValue(userRef, (s) => {
          const meta = s.val() as AppUserMetadata | null;
          if (meta?.blockStatus) setBlockStatus(meta.blockStatus);
        });
      } else {
        setUser(null);
        setBlockStatus(null);
        if (userMetaUnsub) userMetaUnsub();
      }
      setIsAppReady(true);
    });

    return () => {
      authUnsub();
      if (userMetaUnsub) userMetaUnsub();
    };
  }, []);

  if (!isAppReady) return <LoadingScreen onComplete={() => {}} />;

  return (
    <AppContext.Provider value={{ language, setLanguage, t, user, isWorking, schedule, tashkentTime }}>
      <Router>
        <div className="min-h-screen bg-[#050505] selection:bg-blue-600 selection:text-white">
          <BlockedOverlay status={blockStatus} />
          <Navbar />
          
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/order" element={user ? <OrderPage /> : <Navigate to="/" />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/my-orders" element={<MyOrdersPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>

          <NotificationDrawer />
        </div>
      </Router>
    </AppContext.Provider>
  );
}
