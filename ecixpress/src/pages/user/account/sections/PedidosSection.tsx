import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { toast } from 'react-toastify';
import AccountSectionHeader from '../AccountSectionHeader';
import OrderCard from '../../../../components/orders/OrderCard';
import { mockOrderHistory } from '../../../../mock/userProfile';

const PedidosSection: React.FC = () => {
  const navigate = useNavigate();
  const orders = mockOrderHistory;

  return (
    <>
      <AccountSectionHeader titulo="Pedidos" />
      {orders.length === 0 ? (
        <div className="rounded-3xl border border-white/70 bg-white/82 p-10 text-center shadow-lg shadow-gray-200/60 backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-yellow-200 bg-gradient-to-br from-white to-yellow-50 text-amber-600 shadow-md">
            <ShoppingBag size={26} aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Aún no tienes pedidos</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">Cuando hagas tu primer pedido aparecerá aquí.</p>
          <button type="button" onClick={() => navigate('/home')} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300">
            Explorar tiendas
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onDetail={() => toast.info(`Detalle de ${order.id} — próximamente`)}
              onReorder={() => toast.success(`Pedido ${order.id} añadido al carrito (demo)`)}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default PedidosSection;
