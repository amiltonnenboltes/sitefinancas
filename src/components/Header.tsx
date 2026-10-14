import React from 'react';
import { User } from 'firebase/auth';
import { 
  Sparkles, 
  FileSpreadsheet, 
  ExternalLink, 
  LogOut, 
  LogIn, 
  Layers, 
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

interface HeaderProps {
  user: User | null;
  spreadsheetTitle: string | null;
  spreadsheetUrl: string | null;
  isSyncing: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onOpenSpreadsheetModal: () => void;
  onRefreshData: () => void;
  isDemoMode: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  spreadsheetTitle,
  spreadsheetUrl,
  isSyncing,
  onLogin,
  onLogout,
  onOpenSpreadsheetModal,
  onRefreshData,
  isDemoMode,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/30">
            <Sparkles className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-emerald-400 via-teal-200 to-white bg-clip-text text-transparent">
                FinanIA
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                Google Sheets AI
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Assistente Financeiro Multimodal & Controle de Gastos
            </p>
          </div>
        </div>

        {/* Center / Spreadsheet status */}
        <div className="flex items-center gap-2">
          {user && (
            <div className="flex items-center bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300 transition-all">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="font-medium truncate max-w-[140px] sm:max-w-[200px]" title={spreadsheetTitle || 'Minha Planilha'}>
                  {spreadsheetTitle || 'FinanIA - Controle'}
                </span>
                {isSyncing ? (
                  <RefreshCw className="w-3.5 h-3.5 text-teal-400 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </div>

              <div className="h-4 w-px bg-slate-700 mx-2" />

              <div className="flex items-center gap-1.5">
                <button
                  onClick={onRefreshData}
                  disabled={isSyncing}
                  title="Atualizar dados da planilha"
                  className="p-1 hover:text-emerald-300 hover:bg-slate-700/60 rounded-md transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>

                <button
                  onClick={onOpenSpreadsheetModal}
                  title="Trocar ou criar nova planilha"
                  className="p-1 hover:text-emerald-300 hover:bg-slate-700/60 rounded-md transition-colors flex items-center gap-1 text-[11px]"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Trocar</span>
                </button>

                {spreadsheetUrl && (
                  <a
                    href={spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir no Google Sheets"
                    className="p-1 hover:text-emerald-300 hover:bg-slate-700/60 rounded-md transition-colors text-emerald-400"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}

          {isDemoMode && !user && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Modo Demonstração (Conecte seu Google Sheets)</span>
            </div>
          )}
        </div>

        {/* User Account / Auth Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2.5">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Usuário'}
                  className="w-8 h-8 rounded-full border border-emerald-500/40 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-bold text-xs">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
              )}
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">
                  {user.displayName || 'Usuário'}
                </p>
                <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                  {user.email}
                </p>
              </div>
              <button
                onClick={onLogout}
                title="Desconectar"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Official Google Sign In Button */
            <button
              onClick={onLogin}
              className="group relative inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-medium text-xs sm:text-sm shadow-md hover:shadow-lg transition-all duration-200 border border-slate-200"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                <path fill="none" d="M0 0h48v48H0z" />
              </svg>
              <span>Conectar Google Sheets</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
