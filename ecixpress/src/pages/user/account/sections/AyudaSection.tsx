import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { ChevronDown, HelpCircle, Loader2, Mail, MessageSquarePlus } from 'lucide-react';
import AccountSectionHeader from '../AccountSectionHeader';
import CreatePqrsModal from '../modals/CreatePqrsModal';
import PqrsThreadModal from '../../../../components/pqrs/PqrsThreadModal';
import { useAuth } from '../../../../context/AuthContext';
import { createPqrs, listPqrs, type PqrsListItem } from '../../../../services/pqrsService';
import { faqData } from '../../../../lib/faqData';

const AyudaSection: React.FC = () => {
  const { getToken } = useAuth();
  const [tickets, setTickets] = useState<PqrsListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      setTickets(await listPqrs(token));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar tus PQRS');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async (payload: { subject: string; body: string }) => {
    setCreating(true);
    try {
      const token = await getToken();
      await createPqrs(payload, token);
      toast.success('PQRS enviada. Un administrador te responderá pronto.');
      setCreateOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo enviar la PQRS');
    } finally {
      setCreating(false);
    }
  };

  const allQuestions = faqData.flatMap((item) => item.questions);

  return (
    <>
      <AccountSectionHeader titulo="Ayuda" />

      {/* Mis PQRS */}
      <section className="rounded-3xl border border-white/70 bg-white/82 p-5 shadow-lg shadow-gray-200/60 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-amber-600" aria-hidden="true" />
            <h2 className="text-base font-bold text-gray-900">Mis PQRS</h2>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gray-950 px-3.5 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            <MessageSquarePlus size={15} aria-hidden="true" /> Nueva PQRS
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8 text-gray-400"><Loader2 className="animate-spin" size={20} /></div>
        ) : tickets.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            Aún no has enviado ninguna petición, queja, reclamo o sugerencia.
          </p>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => {
              const last = t.messages[0];
              const isClosed = t.status === 'CLOSED';
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3 text-left transition hover:bg-yellow-50/60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-gray-900">{t.subject}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${isClosed ? 'bg-gray-200 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                        {isClosed ? 'Cerrada' : 'Abierta'}
                      </span>
                    </div>
                    {last && <p className="mt-0.5 truncate text-xs text-gray-400">{last.senderRole === 'ADMIN' ? 'Administrador: ' : ''}{last.body}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">
                    {new Date(t.updatedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* FAQ */}
      <section className="rounded-3xl border border-white/70 bg-white/82 p-5 shadow-lg shadow-gray-200/60 backdrop-blur-xl">
        <div className="mb-4 flex items-center gap-2">
          <HelpCircle size={18} className="text-amber-600" aria-hidden="true" />
          <h2 className="text-base font-bold text-gray-900">Preguntas frecuentes</h2>
        </div>
        <div className="space-y-2">
          {allQuestions.map((item, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/60">
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                aria-expanded={openFaq === index}
              >
                <span className="text-sm font-semibold text-gray-800">{item.question}</span>
                <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
              </button>
              <div className={`overflow-hidden transition-all duration-200 ${openFaq === index ? 'max-h-96' : 'max-h-0'}`}>
                <p className="px-4 pb-3 text-sm text-gray-500">{item.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <CreatePqrsModal open={createOpen} loading={creating} onClose={() => setCreateOpen(false)} onSubmit={handleCreate} />
      {selectedId && (
        <PqrsThreadModal
          id={selectedId}
          isAdmin={false}
          getToken={getToken}
          onClose={() => setSelectedId(null)}
          onChanged={load}
        />
      )}
    </>
  );
};

export default AyudaSection;
