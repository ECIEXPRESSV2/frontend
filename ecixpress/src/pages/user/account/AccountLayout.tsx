import React from 'react';
import { Outlet } from 'react-router-dom';
import AccountNav from './AccountNav';

const AccountLayout: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white text-gray-900">
    <AccountNav />
    <main className="ml-16 pt-20 md:ml-64">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-52 left-1/2 h-[560px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.08)_0%,transparent_66%)] blur-3xl" />
        <div className="absolute right-[-220px] top-44 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(94,192,217,0.10)_0%,transparent_68%)] blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-6xl space-y-5 px-4 pb-10 md:px-8 lg:px-10">
        <Outlet />
      </div>
    </main>
  </div>
);

export default AccountLayout;
