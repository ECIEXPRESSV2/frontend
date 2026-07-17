import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { CheckCircle2, Loader2, Mail, Send, X } from 'lucide-react';
import {
  addPqrsMessage,
  closePqrs,
  getPqrsThread,
  type PqrsThread,
} from '../../services/pqrsService';

const POLL_MS = 5000;

interface Props {
  id: string;
  isAdmin: boolean;
  getToken: () => Promise<string>;
  onClose: () => void;
  /** Se llama tras responder o cerrar, para que la lista del padre se refresque. */
  onChanged?: () => void;
}

const PqrsThreadModal: React.FC<Props> = ({ id, isAdmin, getToken, onClose, onChanged }) => {
  const [thread, setThread] = useState<PqrsThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    try {
      const token = await getToken();
      const data = await getPqrsThread(id, token);
      setThread(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la PQRS');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void load();
    const timer = setInterval(() => { if (active) void load(); }, POLL_MS);
    return () => { active = false; clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [thread?.messages.length]);

  const handleSend = async () => {
    const body = reply.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const token = await getToken();
      const updated = await addPqrsMessage(id, body, token);
      setThread(updated);
      setReply('');
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo enviar la respuesta');
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    setClosing(true);
    try {
      const token = await getToken();
      const updated = await closePqrs(id, token);
      setThread(updated);
      onChanged?.();
      toast.success('PQRS cerrada.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cerrar la PQRS');
    } finally {
      setClosing(false);
    }
  };

  const isClosed = thread?.status === 'CLOSED';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="flex h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-amber-600" aria-hidden="true" />
              <h2 className="truncate text-base font-bold text-gray-950">{thread?.subject ?? 'PQRS'}</h2>
            </div>
            {isAdmin && thread?.user && (
              <p className="mt-0.5 truncate text-xs text-gray-400">{thread.user.fullName} · {thread.user.email}</p>
            )}
            <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${isClosed ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
              {isClosed ? 'Cerrada' : 'Abierta'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {isAdmin && !isClosed && (
              <button
                type="button"
                onClick={handleClose}
                disabled={closing}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {closing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Cerrar PQRS
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex h-full items-center justify-center text-gray-400"><Loader2 className="animate-spin" size={22} /></div>
          ) : !thread || thread.messages.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Sin mensajes.</p>
          ) : (
            <div className="space-y-3">
              {thread.messages.map((m) => {
                const fromAdmin = m.senderRole === 'ADMIN';
                return (
                  <div key={m.id} className={`flex ${fromAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${fromAdmin ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-800'}`}>
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className={`mt-1 text-[10px] ${fromAdmin ? 'text-amber-100' : 'text-gray-400'}`}>
                        {fromAdmin ? 'Administrador' : 'Tú'} · {new Date(m.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-5 py-3">
          {isClosed ? (
            <p className="text-center text-xs text-gray-400">Esta PQRS ya está cerrada.</p>
          ) : (
            <div className="flex items-end gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
                rows={2}
                maxLength={5000}
                placeholder="Escribe una respuesta..."
                className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-100"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={sending || !reply.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default PqrsThreadModal;
