import React, { useState } from 'react';
import { 
  Check, 
  X, 
  FileSpreadsheet, 
  AlertCircle, 
  Calendar, 
  DollarSign, 
  Tag, 
  CreditCard, 
  FileText,
  Plus,
  Trash2
} from 'lucide-react';
import { TransactionItem } from '../services/googleSheets';

interface TransactionConfirmModalProps {
  isOpen: boolean;
  transactions: TransactionItem[];
  spreadsheetTitle: string;
  onConfirm: (finalTransactions: TransactionItem[]) => void;
  onCancel: () => void;
  isSaving: boolean;
  summaryMessage?: string;
}

const CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Lazer',
  'Saúde',
  'Educação',
  'Serviços',
  'Compras',
  'Investimentos',
  'Receitas/Salário',
  'Outros',
];

const PAYMENT_METHODS = [
  'Pix',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Dinheiro',
  'Boleto',
  'Transferência',
  'Não especificado',
];

export const TransactionConfirmModal: React.FC<TransactionConfirmModalProps> = ({
  isOpen,
  transactions: initialItems,
  spreadsheetTitle,
  onConfirm,
  onCancel,
  isSaving,
  summaryMessage,
}) => {
  const [items, setItems] = useState<TransactionItem[]>(initialItems);

  // Sync state whenever modal opens with new items
  React.useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  if (!isOpen || items.length === 0) return null;

  const handleFieldChange = (index: number, field: keyof TransactionItem, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddNewItem = () => {
    setItems(prev => [
      ...prev,
      {
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: 0,
        type: 'Despesa',
        category: 'Alimentação',
        payment_method: 'Pix',
        notes: '',
      },
    ]);
  };

  const totalAmount = items.reduce(
    (sum, t) => sum + (t.type === 'Despesa' ? -Number(t.amount || 0) : Number(t.amount || 0)),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-white my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-100">
                Confirmar Lançamento no Google Sheets
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Revise os dados extraídos pela inteligência artificial antes de gravar na planilha:
              <strong className="text-emerald-400 font-semibold ml-1">{spreadsheetTitle}</strong>
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Summary Banner */}
        {summaryMessage && (
          <div className="mt-4 p-3 bg-slate-800/60 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-xs text-slate-300">
            <AlertCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-400">Diagnóstico da IA: </span>
              {summaryMessage}
            </div>
          </div>
        )}

        {/* Transaction Cards List */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1">
          {items.map((item, index) => (
            <div
              key={index}
              className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    Item #{index + 1}
                  </span>
                  {/* Type Pill Toggle */}
                  <div className="inline-flex rounded-lg p-0.5 bg-slate-800 border border-slate-700">
                    <button
                      type="button"
                      onClick={() => handleFieldChange(index, 'type', 'Despesa')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                        item.type === 'Despesa'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Despesa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFieldChange(index, 'type', 'Receita')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                        item.type === 'Receita'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Receita
                    </button>
                  </div>
                </div>

                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="text-xs text-rose-400 hover:text-rose-300 p-1 rounded-md hover:bg-rose-500/10 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover</span>
                  </button>
                )}
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Descrição */}
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 font-medium mb-1">
                    Descrição do Lançamento
                  </label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleFieldChange(index, 'description', e.target.value)}
                    placeholder="Ex: Almoço no Restaurante, Uber, Salário..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>

                {/* Valor */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.amount}
                    onChange={(e) => handleFieldChange(index, 'amount', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-semibold focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>

                {/* Data */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    Data
                  </label>
                  <input
                    type="date"
                    value={item.date}
                    onChange={(e) => handleFieldChange(index, 'date', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>

                {/* Categoria */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-emerald-400" />
                    Categoria
                  </label>
                  <select
                    value={item.category}
                    onChange={(e) => handleFieldChange(index, 'category', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 text-sm"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Forma de Pagamento */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                    Forma de Pagamento
                  </label>
                  <select
                    value={item.payment_method}
                    onChange={(e) => handleFieldChange(index, 'payment_method', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 text-sm"
                  >
                    {PAYMENT_METHODS.map(pay => (
                      <option key={pay} value={pay}>
                        {pay}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Observações */}
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Observações / Itens da Nota
                  </label>
                  <input
                    type="text"
                    value={item.notes || ''}
                    onChange={(e) => handleFieldChange(index, 'notes', e.target.value)}
                    placeholder="Detalhes adicionais (opcional)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddNewItem}
            className="w-full py-2 border border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl text-xs text-slate-400 hover:text-emerald-400 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar outro item a este lançamento</span>
          </button>
        </div>

        {/* Footer with Mandatory User Confirmation Actions */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 text-center sm:text-left">
            Total a registrar: <strong className="text-slate-100 text-sm font-bold">R$ {Math.abs(totalAmount).toFixed(2)}</strong> ({items.length} item{items.length > 1 ? 's' : ''})
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() => onConfirm(items)}
              disabled={isSaving || items.some(i => !i.description.trim() || i.amount <= 0)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Gravando no Google Sheets...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirmar e Lançar na Planilha</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
