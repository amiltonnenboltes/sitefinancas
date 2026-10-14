import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Plus, 
  X, 
  Search, 
  Check, 
  ExternalLink,
  Link as LinkIcon,
  Loader2
} from 'lucide-react';
import { SpreadsheetFile } from '../services/googleSheets';

interface SpreadsheetPickerModalProps {
  isOpen: boolean;
  spreadsheets: SpreadsheetFile[];
  currentSpreadsheetId: string | null;
  onSelect: (sheetId: string, sheetTitle: string) => void;
  onCreateNew: (customTitle?: string) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
  isCreating: boolean;
}

export const SpreadsheetPickerModal: React.FC<SpreadsheetPickerModalProps> = ({
  isOpen,
  spreadsheets,
  currentSpreadsheetId,
  onSelect,
  onCreateNew,
  onClose,
  isLoading,
  isCreating,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newTitle, setNewTitle] = useState('FinanIA - Minhas Finanças');
  const [directIdOrUrl, setDirectIdOrUrl] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (!isOpen) return null;

  const filteredSheets = spreadsheets.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreateNew(newTitle);
    setShowCreateForm(false);
  };

  const handleDirectIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directIdOrUrl.trim()) return;

    let id = directIdOrUrl.trim();
    // If user pasted a full URL, extract the ID
    // e.g. https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
    const match = id.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      id = match[1];
    }

    onSelect(id, 'Planilha Conectada');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-white max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                Gerenciar Planilha do Google Sheets
              </h3>
              <p className="text-xs text-slate-400">
                Escolha onde o FinanIA deve salvar e sincronizar seus dados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4 flex-1 overflow-y-auto pr-1">
          {/* Create New Trigger */}
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full p-3.5 bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900 border border-emerald-500/30 hover:border-emerald-400/60 rounded-xl text-left transition-all group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-emerald-300">
                    Criar Nova Planilha Financeira
                  </h4>
                  <p className="text-xs text-slate-400">
                    Gera automaticamente uma planilha formatada com abas e colunas prontas
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium text-emerald-400 px-3 py-1 bg-emerald-500/10 rounded-lg">
                Criar
              </span>
            </button>
          ) : (
            <form onSubmit={handleCreate} className="p-4 bg-slate-950 rounded-xl border border-emerald-500/40 space-y-3">
              <h4 className="text-xs font-semibold text-emerald-300">
                Nome da Nova Planilha no Google Drive:
              </h4>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: FinanIA - Controle Financeiro 2026"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newTitle.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white shadow-md disabled:opacity-50"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Criando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Criar e Conectar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Connect by URL / ID */}
          <form onSubmit={handleDirectIdSubmit} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
            <label className="block text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-teal-400" />
              Ou cole o Link ou ID de uma planilha existente:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={directIdOrUrl}
                onChange={(e) => setDirectIdOrUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
              <button
                type="submit"
                disabled={!directIdOrUrl.trim()}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-medium disabled:opacity-50"
              >
                Conectar
              </button>
            </div>
          </form>

          {/* List existing sheets from Google Drive */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Planilhas encontradas no seu Google Drive:
              </label>
              <span className="text-[10px] text-slate-500">
                {filteredSheets.length} encontrada{filteredSheets.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome da planilha..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-700"
              />
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <Loader2 className="w-5 h-5 text-emerald-400 animate-spin mx-auto" />
                <p>Buscando suas planilhas no Google Drive...</p>
              </div>
            ) : filteredSheets.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
                Nenhuma planilha encontrada. Crie uma nova acima!
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {filteredSheets.map((sheet) => {
                  const isCurrent = sheet.id === currentSpreadsheetId;
                  return (
                    <div
                      key={sheet.id}
                      className={`p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                        isCurrent
                          ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                          : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileSpreadsheet className={`w-4 h-4 flex-shrink-0 ${isCurrent ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{sheet.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">ID: {sheet.id.slice(0, 16)}...</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {sheet.webViewLink && (
                          <a
                            href={sheet.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-500 hover:text-slate-300"
                            title="Abrir no Google Sheets"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {isCurrent ? (
                          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Ativa
                          </span>
                        ) : (
                          <button
                            onClick={() => onSelect(sheet.id, sheet.name)}
                            className="text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md transition-colors"
                          >
                            Selecionar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
