import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Plus, Grid, Clipboard, MessageCircle, LogOut, Wallet, Store, PackageCheck, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import { useNotifications } from '../../context/NotificationsContext';
import { useChat } from '../../context/ChatContext';
import NotificationBell from '../notifications/NotificationBell';
import CartDraftsBell from '../orders/CartDraftsBell';

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
  // Centro de monitoreo: visible para ADMIN o ANALYST (rol de solo lectura de métricas).
  const canMonitor =
    (userProfile?.roles.includes('ADMIN') || userProfile?.roles.includes('ANALYST')) ?? false;
  const { balanceLabel, loading: walletLoading } = useWallet();
  const { unreadCount: unreadNotifications } = useNotifications();
  const { unreadMessagesCount } = useChat();
  const firstName = (userProfile?.fullName || userProfile?.email || 'Usuario').trim().split(/\s+/)[0] || 'Usuario';
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const [mapOpen, setMapOpen] = useState(false);
  // Carritos pendientes: CartDraftsBell hace su propio fetch y solo nos avisa si hay
  // alguno, para que el puntico rojo del avatar los cuente sin duplicar la petición.
  const [hasCartDrafts, setHasCartDrafts] = useState(false);
  const hasPending = unreadNotifications > 0 || unreadMessagesCount > 0 || hasCartDrafts;
  const isExpanded = expanded ?? internalExpanded;
  const setIsExpanded = (next: boolean) => {
    if (expanded === undefined) setInternalExpanded(next);
    onExpandedChange?.(next);
  };

  // Publica el ancho actual del sidebar para que el contenido de la página (con la clase
  // `app-shift`) se corra a la derecha en vez de quedar tapado. En pantallas md- el CSS ya
  // fuerza 4rem, porque ahí el sidebar no se ensancha aunque esté "expandido".
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', isExpanded ? '16rem' : '4rem');
  }, [isExpanded]);
  // Cuando el panel de notificaciones está abierto, el sidebar se comprime y no se
  // vuelve a expandir con el hover hasta que se cierre.
  const [notifOpen, setNotifOpen] = useState(false);
  // Menú desplegable del usuario (Gestionar cuenta / Cerrar sesión) que aparece al hacer clic
  // en la bolita del avatar de la cápsula superior derecha.
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [topbarExpanded, setTopbarExpanded] = useState(false);
  const [topbarNotifOpen, setTopbarNotifOpen] = useState(false);
  // Con el scroll arriba del todo la cápsula aparece desplegada (como si el mouse estuviera
  // encima); al bajar se retrae y solo se abre con hover.
  const [topbarAtTop, setTopbarAtTop] = useState(true);
  const isTopbarOpen = topbarAtTop || topbarExpanded || topbarNotifOpen || userMenuOpen;

  useEffect(() => {
    const handleScroll = () => {
      const atTop = window.scrollY <= 4;
      setTopbarAtTop(atTop);
      // Al alejarse del tope se cierran los paneles de notificaciones y el menú del usuario;
      // el hover sigue vigente.
      if (!atTop) {
        setTopbarNotifOpen(false);
        setNotifOpen(false);
        setUserMenuOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const menuItems = [
    { id: 'home', icon: Grid, label: 'Inicio', path: '/home' },
    { id: 'profile', icon: User, label: 'Perfil', path: '/profile' },
    { id: 'orders', icon: Clipboard, label: 'Pedidos', path: null },
  ];

  const adminItems = [
    { id: 'admin-users', icon: User, label: 'Usuarios', path: '/admin/users' },
    { id: 'admin-stores', icon: Store, label: 'Tiendas', path: '/admin/stores' },
    { id: 'admin-audit', icon: Clipboard, label: 'Auditoría', path: '/admin/audit' },
  ];

  const vendorItems = [
    { id: 'vendor-stores', icon: Store, label: 'Mis Tiendas', path: '/vendor/stores' },
    { id: 'vendor-orders', icon: Clipboard, label: 'Pedidos', path: '/vendor/orders' },
    { id: 'deliveries', icon: PackageCheck, label: 'Entregas', path: '/fulfillment/deliveries' },
  ];

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await signOut();
    navigate('/signin');
  };

  // "Gestionar cuenta" desde el menú del avatar: respeta el callback si la página lo provee
  // (p. ej. Home navega a /profile); si no, navega directo.
  const handleManageAccount = () => {
    setUserMenuOpen(false);
    onUserClick?.();
    if (!onUserClick) navigate('/profile');
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
        <>
        {/* Cápsula flotante estilo liquid glass — anclada a la derecha */}
        <div
          className={`fixed top-3 right-4 z-[70] flex h-14 w-auto items-center justify-end overflow-hidden border border-white/55 bg-white/65 backdrop-blur-2xl transition-all duration-300 ease-in-out [box-shadow:0_8px_32px_rgba(0,0,0,0.07),0_1px_0_rgba(255,255,255,0.85)_inset,0_-1px_0_rgba(0,0,0,0.04)_inset] md:right-5 ${
            isTopbarOpen ? 'max-w-[340px] gap-2 rounded-full px-2.5' : 'max-w-[3.5rem] rounded-full px-2'
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
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/55 text-gray-500 backdrop-blur-sm transition hover:border-[var(--accent-200)] hover:bg-[var(--accent-50)] hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
            title="Mensajes"
            aria-label="Abrir mensajes"
          >
            <MessageCircle size={20} strokeWidth={2.2} aria-hidden="true" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
              </span>
            )}
          </button>

          {/* Atajo de carritos pendientes (solo aparece si hay algún pedido en carrito) */}
          <CartDraftsBell onOpenChange={setTopbarNotifOpen} onHasDraftsChange={setHasCartDrafts} />

          {/* Campana */}
          <NotificationBell variant="topbar" onOpenChange={setTopbarNotifOpen} />

          {/* Divisor sutil */}
          <span className="h-5 w-px rounded-full bg-gray-300/50" aria-hidden="true" />

            </>
          )}

          {/* Avatar de usuario */}
          <div className="relative inline-flex flex-shrink-0">
            <button
              type="button"
              onClick={() => setUserMenuOpen((open) => !open)}
              className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-200 via-amber-300 to-[var(--accent-soft-to)] text-sm font-bold text-gray-900 shadow-[0_2px_8px_rgb(var(--accent-rgb)/0.35),inset_0_1px_1px_rgba(255,255,255,0.5)] ring-2 ring-white/70 transition hover:ring-[var(--accent-200)] hover:shadow-[0_4px_14px_rgb(var(--accent-rgb)/0.45)] focus:outline-none focus:ring-2 focus:ring-amber-300"
              title={userProfile?.fullName || 'Mi cuenta'}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              aria-label="Abrir menú de la cuenta"
            >
              {userProfile?.avatarUrl ? (
                <img src={userProfile.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span>{(userProfile?.fullName || userProfile?.email || 'E').trim()[0]?.toUpperCase()}</span>
              )}
            </button>
            {/* Puntico rojo: hay algo por ver (mensajes, notificaciones o carritos
                pendientes). Hermano del <button>, no anidado dentro de la rama de la
                imagen ni de la inicial, para que se vea con o sin foto de perfil. */}
            {hasPending && (
              <span
                className="pointer-events-none absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white"
                aria-label="Tienes novedades pendientes"
              />
            )}
          </div>
        </div>

        {/* Menú del avatar: Gestionar cuenta / Cerrar sesión. Se renderiza FUERA de la cápsula
            (que recorta con overflow-hidden) como capa fija anclada bajo el avatar. */}
        {userMenuOpen && (
          <>
            {/* Capa para cerrar al hacer clic fuera, sin oscurecer la pantalla */}
            <div className="fixed inset-0 z-[75]" onClick={() => setUserMenuOpen(false)} aria-hidden="true" />
            <div
              role="menu"
              aria-label="Menú de la cuenta"
              className="animate-menu-pop fixed right-4 top-[4.75rem] z-[80] w-56 overflow-hidden rounded-2xl border border-white/60 bg-white/85 p-1.5 backdrop-blur-2xl [box-shadow:0_16px_40px_rgba(0,0,0,0.12),0_1px_0_rgba(255,255,255,0.85)_inset] md:right-5"
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleManageAccount}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:translate-x-0.5 hover:bg-amber-50 hover:text-amber-700"
              >
                <User size={18} className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                <span>Gestionar cuenta</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition-all duration-200 hover:translate-x-0.5 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut size={18} className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </>
        )}
        </>
      )}

      <aside
      className={`fixed left-0 top-0 z-[60] h-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.90)_0%,var(--accent-surface-soft)_36%,var(--accent-surface)_64%,rgba(255,255,255,0.90)_100%)] backdrop-blur-2xl border-r border-white/60 [box-shadow:0_20px_25px_-5px_rgb(var(--accent-rgb)/0.18),0_8px_10px_-6px_rgb(var(--accent-rgb)/0.18)] flex flex-col py-6 transition-all duration-300 ease-in-out overflow-hidden
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
          className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--accent-200)_60%,transparent)] bg-[linear-gradient(135deg,var(--accent-300),var(--accent-400))] shadow-[0_4px_14px_rgb(var(--accent-rgb)/0.28),inset_0_1px_1px_rgba(255,255,255,0.55)] backdrop-blur-sm transition hover:shadow-[0_6px_18px_rgb(var(--accent-rgb)/0.38)] focus:outline-none focus:ring-2 focus:ring-amber-300"
          title={isExpanded ? 'Contraer menú' : 'Abrir menú'}
          aria-label={isExpanded ? 'Contraer menú lateral' : 'Abrir menú lateral'}
        >
          <img
            src="/ecixpress-icon.png"
            alt=""
            className={`sidebar-eci-logo h-full w-full object-cover transition-transform duration-300 ${isExpanded ? 'rotate-0' : 'rotate-90'}`}
            aria-hidden="true"
          />
        </button>
        {isExpanded && !showProfile && (
          <div className="ml-3 min-w-0 flex-1">
            <p className="truncate font-display text-xl font-semibold leading-tight text-gray-900">Hola,</p>
            <p className="truncate font-display text-xl font-semibold leading-tight text-[var(--accent-600)]">{firstName}</p>
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
              <p className="truncate text-xs text-gray-500">{userProfile?.email}</p>
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
                ${isActive ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-gray-600 hover:bg-white/70 hover:text-amber-700'}
                ${isExpanded ? 'px-4' : 'justify-center'}`}
              title={item.label}
            >
              <Icon size={18} className="transition-transform duration-300 group-hover:scale-110 flex-shrink-0" />
              {isExpanded && <span className="ml-3 font-medium text-sm whitespace-nowrap">{item.label}</span>}
              {isActive && <div className="absolute left-0 w-1 h-6 bg-amber-400 rounded-r-full" />}
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
            {isExpanded && <p className="text-xs text-gray-500 font-medium px-1 pt-3 pb-1 uppercase tracking-wider">Vendedor</p>}
            {!isExpanded && <div className="border-t border-gray-100 my-2" />}
            {vendorItems.map(item => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={`relative w-full h-11 rounded-xl flex items-center transition-all duration-300 ease-in-out group overflow-hidden
                    ${isActive ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-gray-600 hover:bg-white/70 hover:text-amber-700'}
                    ${isExpanded ? 'px-4' : 'justify-center'}`}
                  title={item.label}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {isExpanded && <span className="ml-3 font-medium text-sm whitespace-nowrap">{item.label}</span>}
                  {isActive && <div className="absolute left-0 w-1 h-6 bg-amber-400 rounded-r-full" />}
                </button>
              );
            })}
          </>
        )}

        {/* Monitoreo — ADMIN o ANALYST. Su propia sección porque no depende de ser admin. */}
        {canMonitor && (
          <>
            {isExpanded && <p className="text-xs text-gray-500 font-medium px-1 pt-3 pb-1 uppercase tracking-wider">Monitoreo</p>}
            {!isExpanded && <div className="border-t border-gray-100 my-2" />}
            <button
              onClick={() => navigate('/admin/monitoring')}
              className={`relative w-full h-11 rounded-xl flex items-center transition-all duration-300 ease-in-out group overflow-hidden
                ${activeItem === 'admin-monitoring' ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-gray-600 hover:bg-white/70 hover:text-amber-700'}
                ${isExpanded ? 'px-4' : 'justify-center'}`}
              title="Centro de monitoreo"
            >
              <Activity size={18} className="flex-shrink-0" />
              {isExpanded && <span className="ml-3 font-medium text-sm whitespace-nowrap">Monitoreo</span>}
              {activeItem === 'admin-monitoring' && <div className="absolute left-0 w-1 h-6 bg-amber-400 rounded-r-full" />}
            </button>
          </>
        )}

        {/* Admin section */}
        {isAdmin() && (
          <>
            {isExpanded && <p className="text-xs text-gray-500 font-medium px-1 pt-3 pb-1 uppercase tracking-wider">Administración</p>}
            {!isExpanded && <div className="border-t border-gray-100 my-2" />}
            {adminItems.map(item => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={`relative w-full h-11 rounded-xl flex items-center transition-all duration-300 ease-in-out group overflow-hidden
                    ${isActive ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-gray-600 hover:bg-white/70 hover:text-amber-700'}
                    ${isExpanded ? 'px-4' : 'justify-center'}`}
                  title={item.label}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {isExpanded && <span className="ml-3 font-medium text-sm whitespace-nowrap">{item.label}</span>}
                  {isActive && <div className="absolute left-0 w-1 h-6 bg-amber-400 rounded-r-full" />}
                </button>
              );
            })}
          </>
        )}

        {/* "Gestionar cuenta" y "Cerrar sesión" ya no viven aquí: ahora salen del menú del
            avatar (la bolita) en la cápsula superior derecha. */}
      </nav>

      {/* Wallet — solo saldo; al hacer click navega al perfil donde están los controles */}
      <div className="mt-4 mb-3 px-3">
        <button
          onClick={() => navigate('/profile/pagos')}
          title={`Saldo disponible: ${balanceLabel}`}
          className={`w-full rounded-xl flex items-center bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-sm hover:shadow-md transition-all overflow-hidden
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
          className={`w-full h-11 rounded-xl flex items-center bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-md hover:from-amber-500 hover:to-amber-600 transition-all overflow-hidden
            ${isExpanded ? 'px-4' : 'justify-center'}`}
          title="Nuevo pedido"
        >
          <Plus size={18} className="flex-shrink-0" />
          {isExpanded && <span className="ml-3 font-medium text-sm whitespace-nowrap">Nuevo pedido</span>}
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
