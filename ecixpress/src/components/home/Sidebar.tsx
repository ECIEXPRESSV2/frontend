import React, { Suspense, lazy, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Plus, Grid, Clipboard, MessageCircle, LogOut, Wallet, Shield, Store, PackageCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import NotificationBell from '../notifications/NotificationBell';

const StoreMapModal = lazy(() => import('../store/StoreMapModal'));

interface SidebarProps {
  activeItem?: string;
  defaultExpanded?: boolean;
  expanded?: boolean;
  lockExpanded?: boolean;
  showProfile?: boolean;
  showNotifications?: boolean;
  showTopbar?: boolean;
  onItemClick?: (item: string) => void;
  onExpandedChange?: (expanded: boolean) => void;
  onUserClick?: () => void;
  onOrdersClick?: () => void;
  onMessagesClick?: () => void;
  onCartClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeItem = 'home',
  defaultExpanded = false,
  expanded,
  lockExpanded = false,
  showProfile = false,
  showNotifications = false,
  showTopbar = true,
  onItemClick,
  onExpandedChange,
  onUserClick,
  onOrdersClick,
  onMessagesClick,
}) => {
  const navigate = useNavigate();
  const { userProfile, signOut, isAdmin, isVendor } = useAuth();
  const { balanceLabel, loading: walletLoading } = useWallet();
  const firstName = (userProfile?.fullName || userProfile?.email || 'Usuario').trim().split(/\s+/)[0] || 'Usuario';
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const [mapOpen, setMapOpen] = useState(false);
  const isExpanded = expanded ?? internalExpanded;
  const setIsExpanded = (next: boolean) => {
    if (expanded === undefined) setInternalExpanded(next);
    onExpandedChange?.(next);
  };
  // Cuando el panel de notificaciones está abierto, el sidebar se comprime y no se
  // vuelve a expandir con el hover hasta que se cierre.
  const [notifOpen, setNotifOpen] = useState(false);
  const [topbarExpanded, setTopbarExpanded] = useState(false);
  const [topbarNotifOpen, setTopbarNotifOpen] = useState(false);
  const isTopbarOpen = topbarExpanded || topbarNotifOpen;

  const menuItems = [
    { id: 'home', icon: Grid, label: 'Inicio', path: '/home' },
    { id: 'orders', icon: Clipboard, label: 'Pedidos', path: null },
  ];

  const adminItems = [
    { id: 'admin-users', icon: User, label: 'Usuarios', path: '/admin/users' },
    { id: 'admin-stores', icon: Store, label: 'Tiendas', path: '/admin/stores' },
    { id: 'admin-roles', icon: Shield, label: 'Roles', path: '/admin/roles' },
    { id: 'admin-audit', icon: Clipboard, label: 'Auditoría', path: '/admin/audit' },
  ];

  const vendorItems = [
    { id: 'vendor-stores', icon: Store, label: 'Mis Tiendas', path: '/vendor/stores' },
    { id: 'deliveries', icon: PackageCheck, label: 'Entregas', path: '/fulfillment/deliveries' },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/signin');
  };

  const handleMenuClick = (item: (typeof menuItems)[number]) => {
    onItemClick?.(item.id);

    if (item.id === 'orders') {
      onOrdersClick?.();
      if (!onOrdersClick) navigate('/orders');
      return;
    }

    if (item.path) navigate(item.path);
  };

  return (
    <>
      {showTopbar && (
        /* Cápsula flotante estilo liquid glass — anclada a la derecha */
        <div
          className={`fixed top-3 right-4 z-[70] flex h-14 items-center justify-end overflow-hidden border border-white/55 bg-white/65 backdrop-blur-2xl transition-all duration-300 ease-in-out [box-shadow:0_8px_32px_rgba(0,0,0,0.07),0_1px_0_rgba(255,255,255,0.85)_inset,0_-1px_0_rgba(0,0,0,0.04)_inset] md:right-5 ${
            isTopbarOpen ? 'w-[178px] gap-1 rounded-full px-2.5' : 'w-14 rounded-full px-2'
          }`}
          role="banner"
          onMouseEnter={() => setTopbarExpanded(true)}
          onMouseLeave={() => setTopbarExpanded(false)}
          aria-label="Acciones rápidas"
        >
          {/* Botón mensajes */}
          {isTopbarOpen && (
            <>
          <button
            type="button"
            onClick={() => {
              onMessagesClick?.();
              if (!onMessagesClick) navigate('/messages');
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/40 text-gray-500 backdrop-blur-sm transition hover:bg-white/70 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-yellow-300"
            title="Mensajes"
            aria-label="Abrir mensajes"
          >
            <MessageCircle size={19} strokeWidth={2.2} aria-hidden="true" />
          </button>

          {/* Campana */}
          <NotificationBell variant="topbar" onOpenChange={setTopbarNotifOpen} />

          {/* Divisor sutil */}
          <span className="mx-1 h-5 w-px rounded-full bg-gray-300/50" aria-hidden="true" />

            </>
          )}

          {/* Avatar de usuario */}
          <button
            type="button"
            onClick={() => {
              onUserClick?.();
              if (!onUserClick) navigate('/profile');
            }}
            className="relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 text-sm font-bold text-gray-950 shadow-[0_2px_8px_rgba(251,191,36,0.45),inset_0_1px_1px_rgba(255,255,255,0.5)] ring-2 ring-white/70 transition hover:ring-yellow-200/80 hover:shadow-[0_4px_14px_rgba(251,191,36,0.55)] focus:outline-none focus:ring-2 focus:ring-yellow-300"
            title={userProfile?.fullName || 'Mi perfil'}
            aria-label="Abrir perfil"
          >
            {userProfile?.avatarUrl ? (
              <img src={userProfile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span>{(userProfile?.fullName || userProfile?.email || 'E').trim()[0]?.toUpperCase()}</span>
            )}
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" aria-hidden="true" />
          </button>
        </div>
      )}

      <aside
      className={`fixed left-0 top-0 z-[60] h-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(254,249,195,0.78)_36%,rgba(253,230,138,0.70)_64%,rgba(255,255,255,0.82)_100%)] backdrop-blur-2xl border-r border-white/60 shadow-xl shadow-yellow-200/25 flex flex-col py-6 transition-all duration-300 ease-in-out overflow-hidden
        ${isExpanded ? 'w-64 max-md:w-16' : 'w-16'}`}
      onMouseEnter={() => {
        if (!lockExpanded && !notifOpen) setIsExpanded(true);
      }}
      onMouseLeave={() => {
        if (!lockExpanded) setIsExpanded(defaultExpanded);
      }}
    >
      <div className={`mb-5 flex items-center ${isExpanded ? 'justify-between px-4' : 'justify-center px-2'}`}>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-yellow-200/50 bg-gradient-to-br from-yellow-300/90 via-yellow-400/85 to-amber-400/90 shadow-[0_4px_14px_rgba(251,191,36,0.4),inset_0_1px_1px_rgba(255,255,255,0.55)] backdrop-blur-sm transition hover:from-yellow-300 hover:to-amber-400 hover:shadow-[0_6px_18px_rgba(251,191,36,0.5)] focus:outline-none focus:ring-2 focus:ring-yellow-300"
          title={isExpanded ? 'Contraer menú' : 'Abrir menú'}
          aria-label={isExpanded ? 'Contraer menú lateral' : 'Abrir menú lateral'}
        >
          <img
            src="/eci-icon.png"
            alt=""
            className={`h-full w-full object-cover transition-transform duration-300 ${isExpanded ? 'rotate-0' : 'rotate-90'}`}
            aria-hidden="true"
          />
        </button>
        {isExpanded && !showProfile && (
          <div className="ml-3 min-w-0 flex-1">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-amber-600">Hola</p>
            <p className="truncate text-sm font-bold leading-tight text-gray-900">{firstName}</p>
          </div>
        )}
        {isExpanded && showProfile && (
          <button
            onClick={() => {
              onUserClick?.();
              if (!onUserClick) navigate('/profile');
            }}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1.5 text-left transition hover:bg-white/60"
          >
            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 shadow-lg shadow-yellow-200/60 flex items-center justify-center">
              {userProfile?.avatarUrl ? (
                <img src={userProfile.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <User size={21} className="text-white" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight text-gray-900">
                {userProfile?.fullName || 'Mi Perfil'}
              </p>
              <p className="truncate text-xs text-gray-400">{userProfile?.email}</p>
            </div>
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 flex flex-col gap-1 w-full px-3 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item)}
              className={`relative w-full h-11 rounded-xl flex items-center transition-all duration-300 ease-in-out group overflow-hidden
                ${isActive ? 'bg-yellow-100 text-yellow-700 shadow-sm' : 'text-gray-500 hover:bg-white/70 hover:text-yellow-700'}
                ${isExpanded ? 'px-4' : 'justify-center'}`}
              title={item.label}
            >
              <Icon size={18} className="transition-transform duration-300 group-hover:scale-110 flex-shrink-0" />
              {isExpanded && <span className="ml-3 font-medium text-sm whitespace-nowrap">{item.label}</span>}
              {isActive && <div className="absolute left-0 w-1 h-6 bg-yellow-400 rounded-r-full" />}
            </button>
          );
        })}

        {showNotifications && (
          <NotificationBell
            expanded={isExpanded}
            onOpenChange={(open) => {
              setNotifOpen(open);
              if (open) setIsExpanded(false); // comprimir el sidebar al abrir
            }}
          />
        )}

        {/* Vendor section */}
        {isVendor() && (
          <>
            {isExpanded && <p className="text-xs text-gray-400 font-medium px-1 pt-3 pb-1 uppercase tracking-wider">Vendedor</p>}
            {!isExpanded && <div className="border-t border-gray-100 my-2" />}
            {vendorItems.map(item => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={`relative w-full h-11 rounded-xl flex items-center transition-all duration-300 ease-in-out group overflow-hidden
                    ${isActive ? 'bg-yellow-100 text-yellow-700 shadow-sm' : 'text-gray-500 hover:bg-white/70 hover:text-yellow-700'}
                    ${isExpanded ? 'px-4' : 'justify-center'}`}
                  title={item.label}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {isExpanded && <span className="ml-3 font-medium text-sm whitespace-nowrap">{item.label}</span>}
                  {isActive && <div className="absolute left-0 w-1 h-6 bg-yellow-400 rounded-r-full" />}
                </button>
              );
            })}
          </>
        )}

        {/* Admin section */}
        {isAdmin() && (
          <>
            {isExpanded && <p className="text-xs text-gray-400 font-medium px-1 pt-3 pb-1 uppercase tracking-wider">Administración</p>}
            {!isExpanded && <div className="border-t border-gray-100 my-2" />}
            {adminItems.map(item => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={`relative w-full h-11 rounded-xl flex items-center transition-all duration-300 ease-in-out group overflow-hidden
                    ${isActive ? 'bg-yellow-100 text-yellow-700 shadow-sm' : 'text-gray-500 hover:bg-white/70 hover:text-yellow-700'}
                    ${isExpanded ? 'px-4' : 'justify-center'}`}
                  title={item.label}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {isExpanded && <span className="ml-3 font-medium text-sm whitespace-nowrap">{item.label}</span>}
                  {isActive && <div className="absolute left-0 w-1 h-6 bg-yellow-400 rounded-r-full" />}
                </button>
              );
            })}
          </>
        )}

        {/* Profile section */}
        <>
          {isExpanded && <p className="text-xs text-gray-400 font-medium px-1 pt-3 pb-1 uppercase tracking-wider">Tu perfil</p>}
          {!isExpanded && <div className="border-t border-gray-100 my-2" />}
          <button
            type="button"
            onClick={() => {
              onUserClick?.();
              if (!onUserClick) navigate('/profile');
            }}
            className={`relative w-full h-11 rounded-xl flex items-center transition-all duration-300 ease-in-out group overflow-hidden text-gray-500 hover:bg-white/70 hover:text-yellow-700 ${
              isExpanded ? 'px-4' : 'justify-center'
            }`}
            title="Gestionar cuenta"
            aria-label="Gestionar cuenta"
          >
            <User size={18} className="flex-shrink-0" />
            {isExpanded && <span className="ml-3 font-medium text-sm whitespace-nowrap">Gestionar cuenta</span>}
          </button>
        </>
      </nav>

      {/* Wallet — solo saldo; al hacer click navega al perfil donde están los controles */}
      <div className="mt-4 mb-3 px-3">
        <button
          onClick={() => navigate('/profile/billetera')}
          title={`Saldo disponible: ${balanceLabel}`}
          className={`w-full rounded-xl flex items-center bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-sm hover:shadow-md transition-all overflow-hidden
            ${isExpanded ? 'p-3' : 'h-11 justify-center'}`}
        >
          <Wallet size={18} className="flex-shrink-0" />
          {isExpanded && (
            <div className="ml-3 text-left">
              <p className="text-[10px] text-white/80 uppercase tracking-wider leading-none">Saldo</p>
              <p className="text-base font-bold leading-tight">{walletLoading ? '—' : balanceLabel}</p>
            </div>
          )}
        </button>
      </div>

      {/* Bottom */}
      <div className="flex flex-col gap-1 w-full px-3">
        <button
          onClick={() => setMapOpen(true)}
          className={`w-full h-11 rounded-xl flex items-center bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-md hover:from-yellow-500 hover:to-yellow-600 transition-all overflow-hidden
            ${isExpanded ? 'px-4' : 'justify-center'}`}
          title="Nuevo pedido"
        >
          <Plus size={18} className="flex-shrink-0" />
          {isExpanded && <span className="ml-3 font-medium text-sm whitespace-nowrap">Nuevo pedido</span>}
        </button>

        <button
          onClick={handleLogout}
          className={`w-full h-11 rounded-xl flex items-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all overflow-hidden
            ${isExpanded ? 'px-4' : 'justify-center'}`}
          title="Cerrar sesión"
        >
          <LogOut size={18} className="flex-shrink-0" />
          {isExpanded && <span className="ml-3 font-medium text-sm whitespace-nowrap">Cerrar sesión</span>}
        </button>
      </div>
      </aside>

      {mapOpen && (
        <Suspense fallback={null}>
          <StoreMapModal open={mapOpen} onClose={() => setMapOpen(false)} />
        </Suspense>
      )}
    </>
  );
};

export default Sidebar;
