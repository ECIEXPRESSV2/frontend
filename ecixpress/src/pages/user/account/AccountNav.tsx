import React from 'react';
import { NavLink } from 'react-router-dom';
import { accountNavItems } from './accountNavItems';

const AccountNav: React.FC = () => (
  <nav
    className="flex gap-1 overflow-x-auto rounded-2xl border border-white/70 bg-white/80 p-1 shadow-sm shadow-gray-200/60 backdrop-blur-xl"
    aria-label="Navegacion de cuenta"
  >
    {accountNavItems.map(({ id, label, icon: Icon, path }) => (
      <NavLink
        key={id}
        to={path}
        className={({ isActive }) =>
          `inline-flex h-11 min-w-max flex-shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-yellow-300 md:px-4 ${
            isActive
              ? 'bg-amber-100 text-amber-800 shadow-sm'
              : 'text-gray-600 hover:bg-white/80 hover:text-amber-700'
          }`
        }
      >
        <Icon size={17} className="flex-shrink-0" aria-hidden="true" />
        <span className="whitespace-nowrap">{label}</span>
      </NavLink>
    ))}
  </nav>
);

export default AccountNav;
