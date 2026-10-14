import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { TransactionItem } from '../services/googleSheets';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  item: TransactionItem | null;
  spreadsheetTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  item,
  spreadsheetTitle,
  onConfirm,
  onCancel,
  isDeleting,
}) => {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-2xl shadow-2xl p-6 text-white">
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold text-slate-100">
              Excluir Lançamento
            </h3>
          </div>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-xs text-slate-300">
            Você tem certeza que deseja remover este registro da sua planilha{' '}
            <strong className="text-emerald-400">{spreadsheetTitle}</strong>?
          </p>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Descrição:</span>
              <span className="font-semibold text-slate-200">{item.description}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Valor:</span>
              <span className={`font-bold ${item.type === 'Receita' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {item.type === 'Receita' ? '+' : '-'} R$ {item.amount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Categoria:</span>
              <span className="text-slate-300">{item.category}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Data:</span>
              <span className="text-slate-300">{item.date}</span>
            </div>
          </div>

          <p className="text-[11px] text-rose-300/80 italic">
            * Esta ação modificará permanentemente a linha correspondente no Google Sheets.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Excluindo...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Excluir Definitivamente</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
