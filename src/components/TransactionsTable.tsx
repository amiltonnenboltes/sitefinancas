import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Trash2, 
  ExternalLink, 
  Plus, 
  ArrowUpDown, 
  FileSpreadsheet,
  Download,
  Tag,
  CreditCard
} from 'lucide-react';
import { TransactionItem } from '../services/googleSheets';

interface TransactionsTableProps {
  transactions: TransactionItem[];
  spreadsheetTitle: string;
  spreadsheetUrl: string | null;
  onDeleteItem: (item: TransactionItem) => void;
  onOpenManualEntry: () => void;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
  spreadsheetTitle,
  spreadsheetUrl,
  onDeleteItem,
  onOpenManualEntry,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Despesa' | 'Receita'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Extract distinct categories
  const categoriesList = Array.from(
    new Set(transactions.map(t => t.category).filter(Boolean))
  ).sort();

  // Filter
  const filtered = transactions.filter(item => {
    const matchesSearch =
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.payment_method && item.payment_method.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;

    return matchesSearch && matchesType && matchesCategory;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'date') {
      const cmp = a.date.localeCompare(b.date);
      return sortOrder === 'asc' ? cmp : -cmp;
    } else {
      const cmp = (a.amount || 0) - (b.amount || 0);
      return sortOrder === 'asc' ? cmp : -cmp;
    }
  });

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl animate-fade-in">
      {/* Top Toolbar */}
      <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-slate-100">
              Registros Sincronizados com o Google Sheets
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Planilha ativa: <strong className="text-emerald-400">{spreadsheetTitle}</strong> ({transactions.length} linhas cadastradas)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {spreadsheetUrl && (
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              <span>Abrir no Google Sheets</span>
            </a>
          )}

          <button
            onClick={onOpenManualEntry}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="p-4 bg-slate-950/60 border-b border-slate-800/80 flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por descrição, categoria, observação..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Type Toggle */}
        <div className="inline-flex rounded-xl p-0.5 bg-slate-900 border border-slate-800 w-full sm:w-auto">
          {(['all', 'Despesa', 'Receita'] as const).map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                typeFilter === type
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {type === 'all' ? 'Todos' : type === 'Despesa' ? 'Despesas' : 'Receitas'}
            </button>
          ))}
        </div>

        {/* Category Select */}
        <div className="w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-44 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Todas Categorias</option>
            {categoriesList.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4 cursor-pointer hover:text-slate-200" onClick={() => toggleSort('date')}>
                <div className="flex items-center gap-1">
                  <span>Data</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Descrição</th>
              <th className="py-3 px-4">Categoria</th>
              <th className="py-3 px-4">Pagamento</th>
              <th className="py-3 px-4 text-right cursor-pointer hover:text-slate-200" onClick={() => toggleSort('amount')}>
                <div className="flex items-center justify-end gap-1">
                  <span>Valor (R$)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  Nenhum lançamento encontrado com os filtros selecionados.
                </td>
              </tr>
            ) : (
              sorted.map((item, idx) => {
                const isIncome = item.type === 'Receita';
                return (
                  <tr
                    key={item.id || idx}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Date */}
                    <td className="py-3 px-4 text-slate-300 font-mono whitespace-nowrap">
                      {item.date}
                    </td>

                    {/* Description & Notes */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-100">{item.description}</div>
                      {item.notes && (
                        <div className="text-[11px] text-slate-500 truncate max-w-xs" title={item.notes}>
                          {item.notes}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60 text-[11px]">
                        <Tag className="w-3 h-3 text-emerald-400" />
                        {item.category}
                      </span>
                    </td>

                    {/* Payment Method */}
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      <span className="flex items-center gap-1 text-[11px]">
                        <CreditCard className="w-3 h-3 text-slate-500" />
                        {item.payment_method || 'N/A'}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold">
                      <span className={isIncome ? 'text-emerald-400' : 'text-rose-400'}>
                        {isIncome ? '+' : '-'} R$ {item.amount.toFixed(2)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onDeleteItem(item)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Excluir este lançamento da planilha"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="p-4 bg-slate-950/60 border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>
          Exibindo {sorted.length} de {transactions.length} registros
        </span>
        <span className="font-mono text-slate-300">
          Soma dos itens exibidos:{' '}
          <strong className="text-slate-100 font-bold">
            R${' '}
            {sorted
              .reduce(
                (sum, t) => sum + (t.type === 'Receita' ? t.amount : -t.amount),
                0
              )
              .toFixed(2)}
          </strong>
        </span>
      </div>
    </div>
  );
};
