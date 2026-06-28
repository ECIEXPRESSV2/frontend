import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { accountNavItems } from './accountNavItems';

const AccountNav: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/signin');
  };

  return (
    <>
      {/* Rail escritorio */}
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col border-r border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(255,251,235,0.72)_45%,rgba(255,255,255,0.94)_100%)] px-3 py-6 shadow-xl shadow-amber-200/18 backdrop-blur-2xl md:flex">
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="mb-5 inline-flex items-center gap-2 rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-white hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Volver a ECIxpress
        </button>

        <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Mi cuenta</p>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Navegación de cuenta">
          {accountNavItems.map(({ id, label, icon: Icon, path }) => (
            <NavLink
              key={id}
              to={path}
              className={({ isActive }) =>
                `relative flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-yellow-300 ${
                  isActive
                    ? 'bg-amber-100 text-amber-800 shadow-sm'
                    : 'text-gray-600 hover:bg-white/70 hover:text-amber-700'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className="flex-shrink-0" aria-hidden="true" />
                  <span className="whitespace-nowrap">{label}</span>
                  {isActive && <span className="absolute left-0 h-6 w-1 rounded-r-full bg-amber-400" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-2 flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-medium text-gray-600 transition hover:bg-red-50 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
        >
          <LogOut size={18} className="flex-shrink-0" aria-hidden="true" />
          Cerrar sesión
        </button>
      </aside>

      {/* Pestañas móvil/tablet */}
      <div className="sticky top-0 z-40 border-b border-white/60 bg-white/85 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => navigate('/home')}
            aria-label="Volver a ECIxpress"
            className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-white/70 bg-white/70 text-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-300"
          >
            <ArrowLeft size={16} aria-hidden="true" />
          </button>
          <nav className="flex flex-1 gap-1 overflow-x-auto pb-1" aria-label="Navegación de cuenta">
            {accountNavItems.map(({ id, label, icon: Icon, path }) => (
              <NavLink
                key={id}
                to={path}
                className={({ isActive }) =>
                  `flex h-10 min-h-[44px] flex-shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-yellow-300 ${
                      isActive ? 'bg-amber-100 text-amber-800' : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                <Icon size={15} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
};

export default AccountNav;
