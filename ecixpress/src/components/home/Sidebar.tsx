import React, { useState } from 'react';
import { User, Plus, Grid, ShoppingCart, Clipboard, MessageCircle, LogOut, Wallet, Bell } from 'lucide-react';

interface SidebarProps {
  activeItem?: string;
  onItemClick?: (item: string) => void;
  onUserClick?: () => void;
  onCartClick?: () => void;
  onOrdersClick?: () => void;
  onMessagesClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeItem = 'home', onItemClick, onUserClick, onCartClick, onOrdersClick, onMessagesClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const menuItems = [
    { id: 'home', icon: Grid, label: 'Inicio' },
    { id: 'orders', icon: Clipboard, label: 'Pedidos' },
    { id: 'cart', icon: ShoppingCart, label: 'Carrito' },
    { id: 'messages', icon: MessageCircle, label: 'Mensajes' },
    { id: 'notifications', icon: Bell, label: 'Notificaciones' },
  ];

  return (
    <aside 
      className={`fixed left-0 top-0 h-screen bg-white/40 backdrop-blur-xl border-r border-white/30 flex flex-col py-6 z-50 transition-all duration-300 ease-in-out overflow-hidden
        ${isExpanded ? 'w-64' : 'w-16'}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* User Icon Header */}
      <button
        onClick={onUserClick}
        className={`mb-8 flex items-center transition-all duration-300 ${isExpanded ? 'px-6' : 'justify-center'} hover:scale-105`}
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-yellow-200/60 flex-shrink-0">
          <User size={24} className="text-white" />
        </div>
        {isExpanded && (
          <span className="ml-4 font-semibold text-gray-900 opacity-100 transition-all duration-300 delay-75">Mi Perfil</span>
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-2 w-full px-3 transition-all duration-300">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'cart' && onCartClick) {
                  onCartClick();
                } else if (item.id === 'orders' && onOrdersClick) {
                  onOrdersClick();
                } else if (item.id === 'messages' && onMessagesClick) {
                  onMessagesClick();
                } else {
                  onItemClick?.(item.id);
                }
              }}
              className={`relative w-full h-12 rounded-xl flex items-center transition-all duration-300 ease-in-out group overflow-hidden
                ${isActive 
                  ? 'bg-yellow-100 text-yellow-600' 
                  : 'text-gray-500 hover:bg-yellow-50 hover:text-yellow-600'
                } ${isExpanded ? 'px-4' : 'justify-center'}`}
              title={item.label}
            >
              <Icon size={20} className="transition-transform duration-300 group-hover:scale-110 flex-shrink-0" />
              {isExpanded && (
                <span className="ml-4 font-medium text-sm whitespace-nowrap opacity-100 transition-opacity duration-200">
                  {item.label}
                </span>
              )}
              {isActive && (
                <div className="absolute left-0 w-1 h-6 bg-yellow-400 rounded-r-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Wallet Section */}
      <div className={`mt-8 mb-4 px-3 transition-all duration-300`}>
        {isExpanded ? (
          <button
            className="w-full rounded-xl flex items-center bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm hover:shadow-md transition-all duration-300 ease-in-out group overflow-hidden p-5 flex-row"
            title="Billetera"
          >
            <div className="flex items-center justify-center rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-lg shadow-yellow-200/60 flex-shrink-0 w-12 h-12">
              <Wallet size={22} />
            </div>
            <div className="ml-4 flex-1 text-left">
              <p className="text-xs text-gray-500 font-medium">Saldo</p>
              <p className="text-xl font-bold text-gray-900">$125.50</p>
            </div>
          </button>
        ) : (
          <button
            className="w-full h-12 rounded-xl flex items-center justify-center text-gray-500 hover:bg-yellow-50 hover:text-yellow-600 transition-all duration-300 ease-in-out group"
            title="Billetera"
          >
            <Wallet size={20} className="transition-transform duration-300 group-hover:scale-110" />
          </button>
        )}
      </div>

      {/* Bottom Actions */}
      <div className={`flex flex-col gap-2 w-full px-3 transition-all duration-300`}>
        <button
          className={`w-full h-12 rounded-xl flex items-center bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-lg shadow-yellow-200/60 hover:from-yellow-500 hover:to-yellow-600 transition-all duration-300 ease-in-out group overflow-hidden
            ${isExpanded ? 'px-4' : 'justify-center'}`}
          title="Nuevo pedido"
        >
          <Plus size={20} className="transition-transform duration-300 group-hover:rotate-90 flex-shrink-0" />
          {isExpanded && (
            <span className="ml-4 font-medium text-sm whitespace-nowrap opacity-100 transition-opacity duration-200">Nuevo pedido</span>
          )}
        </button>
        
        <button
          className={`w-full h-12 rounded-xl flex items-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all duration-300 ease-in-out overflow-hidden
            ${isExpanded ? 'px-4' : 'justify-center'}`}
          title="Cerrar sesión"
        >
          <LogOut size={20} className="flex-shrink-0" />
          {isExpanded && (
            <span className="ml-4 font-medium text-sm whitespace-nowrap opacity-100 transition-opacity duration-200">Cerrar sesión</span>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
