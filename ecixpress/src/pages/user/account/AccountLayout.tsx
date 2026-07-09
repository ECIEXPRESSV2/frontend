import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../../components/home/Sidebar';
import { useAuth } from '../../../context/AuthContext';
import { useWallet } from '../../../context/WalletContext';
import { useRefreshOnScrollTop } from '../../../hooks/useRefreshOnScrollTop';
import AccountNav from './AccountNav';

const AccountLayout: React.FC = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const { refreshProfile } = useAuth();
  const { refresh: refreshWallet } = useWallet();

  useRefreshOnScrollTop(async () => {
    await Promise.allSettled([refreshProfile(), refreshWallet()]);
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white text-gray-900">
      <Sidebar
        activeItem="profile"
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
      />

      <main className="relative z-[51] app-shift min-h-screen px-4 pb-28 pt-20 md:px-8 md:pb-10 lg:px-10">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-52 left-1/2 h-[560px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.08)_0%,transparent_66%)] blur-3xl" />
          <div className="absolute right-[-220px] top-44 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(94,192,217,0.10)_0%,transparent_68%)] blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl space-y-5">
          <AccountNav />
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AccountLayout;
