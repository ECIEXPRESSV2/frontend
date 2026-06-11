import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, MapPin, Edit, Camera } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';

const UserProfile: React.FC = () => {
  const navigate = useNavigate();
  const [activeSidebarItem, setActiveSidebarItem] = useState('profile');
  
  // Mock data - fácil de reemplazar con datos del backend
  const userData = {
    id: 1,
    name: 'Juan Pérez',
    email: 'juan.perez@email.com',
    phone: '+57 300 123 4567',
    location: 'Bogotá, Colombia',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop',
    balance: 125.50,
    ordersCount: 24,
    memberSince: 'Enero 2024'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      {/* Sidebar */}
      <Sidebar 
        activeItem={activeSidebarItem}
        onItemClick={setActiveSidebarItem}
      />

      {/* Main Content */}
      <main className="ml-16 p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Back Button */}
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 backdrop-blur-xl border border-white/40 text-gray-700 font-medium text-sm hover:bg-yellow-50 hover:text-yellow-600 transition-all duration-300"
          >
            <ArrowLeft size={16} />
            Volver
          </button>

          {/* Profile Header */}
          <div className="rounded-2xl bg-white/60 backdrop-blur-xl shadow-sm overflow-hidden">
            <div className="relative h-32 bg-gradient-to-r from-yellow-400 to-yellow-500">
              <button className="absolute top-4 right-4 p-2 rounded-lg bg-white/20 backdrop-blur-xl text-white hover:bg-white/30 transition-all duration-300">
                <Camera size={20} />
              </button>
            </div>
            
            <div className="px-6 pb-6">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-4 -mt-12">
                <div className="relative">
                  <img
                    src={userData.avatar}
                    alt={userData.name}
                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
                  />
                  <button className="absolute bottom-0 right-0 p-2 rounded-full bg-yellow-400 text-white shadow-md hover:bg-yellow-500 transition-all duration-300">
                    <Edit size={14} />
                  </button>
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">{userData.name}</h1>
                  <p className="text-gray-500 text-sm">Miembro desde {userData.memberSince}</p>
                </div>

                <button className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold hover:from-yellow-500 hover:to-yellow-600 transition-all duration-300 shadow-md">
                  Editar Perfil
                </button>
              </div>
            </div>
          </div>

          {/* User Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Info */}
            <div className="rounded-2xl bg-white/60 backdrop-blur-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Información Personal</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Mail size={18} className="text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900">{userData.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Phone size={18} className="text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Teléfono</p>
                    <p className="text-sm font-medium text-gray-900">{userData.phone}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <MapPin size={18} className="text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Ubicación</p>
                    <p className="text-sm font-medium text-gray-900">{userData.location}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Stats */}
            <div className="rounded-2xl bg-white/60 backdrop-blur-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Estadísticas</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-yellow-50">
                  <div className="flex items-center gap-3">
                    <User size={18} className="text-yellow-600" />
                    <span className="text-sm text-gray-700">Pedidos realizados</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{userData.ordersCount}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-xl bg-yellow-50">
                  <div className="flex items-center gap-3">
                    <span className="text-yellow-600 font-bold">$</span>
                    <span className="text-sm text-gray-700">Saldo disponible</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">${userData.balance.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl bg-white/60 backdrop-blur-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Acciones Rápidas</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 hover:bg-yellow-50 transition-all duration-300">
                <Edit size={18} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Editar información</span>
              </button>
              
              <button className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 hover:bg-yellow-50 transition-all duration-300">
                <MapPin size={18} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Direcciones</span>
              </button>
              
              <button className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 hover:bg-yellow-50 transition-all duration-300">
                <User size={18} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Cambiar contraseña</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserProfile;
