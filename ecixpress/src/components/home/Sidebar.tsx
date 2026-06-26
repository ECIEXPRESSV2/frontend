import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Plus, Grid, Clipboard, MessageCircle, LogOut, Wallet, Shield, Store, PackageCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import NotificationBell from '../notifications/NotificationBell';

interface SidebarProps {
  activeItem?: string;
  onItemClick?: (item: string) => void;
  onUserClick?: () => void;
  onOrdersClick?: () => void;
  onMessagesClick?: () => void;
  onCartClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeItem = 'home',
  onItemClick,
  onUserClick,
  onOrdersClick,
  onMessagesClick,
}) => {
  const navigate = useNavigate();
  const { userProfile, signOut, isAdmin, isVendor } = useAuth();
  const { balanceLabel, loading: walletLoading } = useWallet();
  const [isExpanded, setIsExpanded] = useState(false);

  const menuItems = [
    { id: 'home', icon: Grid, label: 'Inicio', path: '/home' },
    { id: 'orders', icon: Clipboard, label: 'Pedidos', path: null },
    { id: 'messages', icon: MessageCircle, label: 'Mensajes', path: null },
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

    if (item.id === 'messages') {
      onMessagesClick?.();
      if (!onMessagesClick) navigate('/messages');
      return;
    }

    if (item.path) navigate(item.path);
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white/40 backdrop-blur-xl border-r border-white/30 flex flex-col py-6 z-50 transition-all duration-300 ease-in-out overflow-hidden
        ${isExpanded ? 'w-64' : 'w-16'}`}
      // Solo expandir cuando el cursor entra al DOM real del sidebar. El panel de
      // notificaciones vive en un portal (document.body) pero en el árbol de React
      // es descendiente del aside, así que sus eventos de mouse se propagan hasta
      // aquí; este guard evita que pasar el mouse por el panel expanda el sidebar.
      onMouseEnter={(e) => {
        if (e.currentTarget.contains(e.target as Node)) setIsExpanded(true);
      }}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* User Icon Header */}
      <button
        onClick={() => {
          onUserClick?.();
          if (!onUserClick) navigate('/profile');
        }}
        className={`mb-6 flex items-center transition-all duration-300 ${isExpanded ? 'px-6' : 'justify-center'} hover:scale-105`}
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-yellow-200/60 flex-shrink-0 overflow-hidden">
          {userProfile?.avatarUrl ? (
            <img src={userProfile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <User size={24} className="text-white" />
          )}
        </div>
        {isExpanded && (
          <div className="ml-3 text-left">
            <p className="font-semibold text-gray-900 text-sm leading-tight truncate max-w-[140px]">
              {userProfile?.fullName || 'Mi Perfil'}
            </p>
            <p className="text-xs text-gray-400 truncate max-w-[140px]">{userProfile?.email}</p>
          </div>
        )}
      </button>

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
                ${isActive ? 'bg-yellow-100 text-yellow-600' : 'text-gray-500 hover:bg-yellow-50 hover:text-yellow-600'}
                ${isExpanded ? 'px-4' : 'justify-center'}`}
              title={item.label}
            >
              <Icon size={18} className="transition-transform duration-300 group-hover:scale-110 flex-shrink-0" />
              {isExpanded && <span className="ml-3 font-medium text-sm whitespace-nowrap">{item.label}</span>}
              {isActive && <div className="absolute left-0 w-1 h-6 bg-yellow-400 rounded-r-full" />}
            </button>
          );
        })}

        {/* Campana de notificaciones (tiempo real + bandeja persistida) */}
        <NotificationBell
          expanded={isExpanded}
          onOpenChange={(open) => {
            if (open) setIsExpanded(false); // comprimir el sidebar al abrir
          }}
        />

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
                    ${isActive ? 'bg-yellow-100 text-yellow-600' : 'text-gray-500 hover:bg-yellow-50 hover:text-yellow-600'}
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
                    ${isActive ? 'bg-yellow-100 text-yellow-600' : 'text-gray-500 hover:bg-yellow-50 hover:text-yellow-600'}
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
      </nav>

      {/* Wallet — solo saldo; al hacer click navega al perfil donde están los controles */}
      <div className="mt-4 mb-3 px-3">
        <button
          onClick={() => navigate('/profile')}
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
          onClick={() => navigate('/orders?new=1')}
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
  );
};

export default Sidebar;
