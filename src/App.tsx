import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { 
  Sparkles, 
  Bot, 
  PieChart, 
  Table, 
  FileSpreadsheet, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  Layers, 
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Wallet,
  Calendar,
  ExternalLink
} from 'lucide-react';

import { 
  initAuth, 
  googleSignIn, 
  logout, 
  getAccessToken, 
  setCachedAccessToken 
} from './services/firebaseAuth';
import { 
  TransactionItem, 
  SpreadsheetFile, 
  listUserSpreadsheets, 
  createFinancialSpreadsheet, 
  readTransactionsFromSheet, 
  appendTransactionsToSheet, 
  deleteTransactionFromSheet, 
  getSpreadsheetDetails 
} from './services/googleSheets';
import { ParseResponse, FinancialContextPayload } from './services/aiApi';
import { INITIAL_DEMO_TRANSACTIONS } from './data/mockData';

import { Header } from './components/Header';
import { AssistantHub } from './components/AssistantHub';
import { ChatAdvisor } from './components/ChatAdvisor';
import { DashboardAnalytics } from './components/DashboardAnalytics';
import { TransactionsTable } from './components/TransactionsTable';
import { TransactionConfirmModal } from './components/TransactionConfirmModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { SpreadsheetPickerModal } from './components/SpreadsheetPickerModal';

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Spreadsheet state
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string>('FinanIA - Controle Financeiro');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);
  const [userSpreadsheets, setUserSpreadsheets] = useState<SpreadsheetFile[]>([]);
  const [isSpreadsheetLoading, setIsSpreadsheetLoading] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Financial transactions state
  const [transactions, setTransactions] = useState<TransactionItem[]>(INITIAL_DEMO_TRANSACTIONS);
  const isDemoMode = !user || !spreadsheetId;

  // Navigation tab: 'assistente' | 'chat' | 'analise' | 'planilha'
  const [activeTab, setActiveTab] = useState<'assistente' | 'chat' | 'analise' | 'planilha'>('assistente');

  // Modals state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingTransactions, setPendingTransactions] = useState<TransactionItem[]>([]);
  const [aiSummaryMessage, setAiSummaryMessage] = useState<string>('');
  const [isSavingToSheet, setIsSavingToSheet] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<TransactionItem | null>(null);
  const [isDeletingRow, setIsDeletingRow] = useState(false);

  const [pickerModalOpen, setPickerModalOpen] = useState(false);

  // Notification banner
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Auth initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setIsAuthLoading(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setIsAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // When user signs in and gets token, list spreadsheets and auto-select/create
  const loadUserSheetsAndData = useCallback(async (token: string) => {
    setIsSpreadsheetLoading(true);
    try {
      const sheets = await listUserSpreadsheets(token);
      setUserSpreadsheets(sheets);

      // Check if user already has a FinanIA spreadsheet
      const existingFinania = sheets.find(s => s.name.toLowerCase().includes('finania'));

      if (existingFinania) {
        setSpreadsheetId(existingFinania.id);
        setSpreadsheetTitle(existingFinania.name);
        setSpreadsheetUrl(existingFinania.webViewLink || `https://docs.google.com/spreadsheets/d/${existingFinania.id}/edit`);
        await syncDataFromSheet(token, existingFinania.id);
        showToast(`Planilha "${existingFinania.name}" conectada com sucesso!`, 'success');
      } else if (sheets.length > 0) {
        // Offer or pick first sheet, or allow creating new
        setSpreadsheetId(sheets[0].id);
        setSpreadsheetTitle(sheets[0].name);
        setSpreadsheetUrl(sheets[0].webViewLink || `https://docs.google.com/spreadsheets/d/${sheets[0].id}/edit`);
        await syncDataFromSheet(token, sheets[0].id);
        showToast(`Planilha "${sheets[0].name}" conectada!`, 'info');
      } else {
        // No sheets found in Drive, auto-create dedicated financial sheet
        await handleCreateNewSpreadsheet(token, 'FinanIA - Controle Financeiro');
      }
    } catch (err: any) {
      console.error('Error loading sheets:', err);
      showToast('Falha ao conectar com o Google Drive.', 'error');
    } finally {
      setIsSpreadsheetLoading(false);
    }
  }, []);

  useEffect(() => {
    if (accessToken && user) {
      loadUserSheetsAndData(accessToken);
    } else {
      setTransactions(INITIAL_DEMO_TRANSACTIONS);
    }
  }, [accessToken, user, loadUserSheetsAndData]);

  // Read transactions from current active sheet
  const syncDataFromSheet = async (token: string, sheetId: string) => {
    setIsSyncing(true);
    try {
      const items = await readTransactionsFromSheet(token, sheetId);
      setTransactions(items);
    } catch (err: any) {
      console.error('Sync error:', err);
      showToast('Não foi possível ler os lançamentos da planilha.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Google Login action
  const handleGoogleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        showToast('Login com o Google realizado com sucesso!', 'success');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      showToast('Não foi possível fazer login com o Google.', 'error');
    }
  };

  // Logout action
  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      setSpreadsheetId(null);
      setTransactions(INITIAL_DEMO_TRANSACTIONS);
      showToast('Desconectado com sucesso.', 'info');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Create brand new spreadsheet
  const handleCreateNewSpreadsheet = async (tokenOverride?: string, customTitle?: string) => {
    const token = tokenOverride || accessToken;
    if (!token) return;

    setIsCreatingSheet(true);
    try {
      const created = await createFinancialSpreadsheet(token, customTitle);
      setSpreadsheetId(created.id);
      setSpreadsheetTitle(created.name);
      setSpreadsheetUrl(created.url);
      setTransactions([]); // fresh sheet starts clean
      setPickerModalOpen(false);

      // Refresh sheets list
      const sheets = await listUserSpreadsheets(token);
      setUserSpreadsheets(sheets);

      showToast(`Nova planilha "${created.name}" criada e pronta para uso!`, 'success');
    } catch (err: any) {
      console.error('Create sheet error:', err);
      showToast(err.message || 'Erro ao criar planilha.', 'error');
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Select an existing spreadsheet
  const handleSelectSpreadsheet = async (sheetId: string, sheetName: string) => {
    if (!accessToken) return;
    setSpreadsheetId(sheetId);
    setSpreadsheetTitle(sheetName);
    setSpreadsheetUrl(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`);
    setPickerModalOpen(false);
    await syncDataFromSheet(accessToken, sheetId);
    showToast(`Conectado à planilha "${sheetName}".`, 'success');
  };

  // Received parse result from AssistantHub (Audio, Image, or Text)
  const handleAssistantParsedResult = (result: ParseResponse) => {
    if (!result.transactions || result.transactions.length === 0) {
      showToast('Nenhuma transação foi identificada na mensagem.', 'info');
      return;
    }

    const items: TransactionItem[] = result.transactions.map((t, idx) => ({
      id: `new-${Date.now()}-${idx}`,
      date: t.date || new Date().toISOString().split('T')[0],
      description: t.description || 'Gasto sem descrição',
      category: t.category || 'Alimentação',
      type: t.type || 'Despesa',
      amount: t.amount || 0,
      payment_method: t.payment_method || 'Pix',
      notes: t.notes || '',
    }));

    setPendingTransactions(items);
    setAiSummaryMessage(result.summary || 'Transação extraída pela IA');
    setConfirmModalOpen(true);
  };

  // User confirmed the transaction in the modal -> save to Google Sheets!
  const handleConfirmAndSaveTransactions = async (finalItems: TransactionItem[]) => {
    setIsSavingToSheet(true);

    try {
      if (user && accessToken && spreadsheetId) {
        // Real Google Sheets append!
        await appendTransactionsToSheet(accessToken, spreadsheetId, finalItems);
        await syncDataFromSheet(accessToken, spreadsheetId);
        showToast(
          `${finalItems.length} lançamento(s) registrado(s) com sucesso no Google Sheets!`,
          'success'
        );
      } else {
        // Demo mode: update local state
        setTransactions(prev => [...finalItems, ...prev]);
        showToast(
          `${finalItems.length} lançamento(s) simulado(s) no modo demonstração! Conecte o Google Sheets para salvar na sua conta.`,
          'info'
        );
      }
      setConfirmModalOpen(false);
      setPendingTransactions([]);
    } catch (err: any) {
      console.error('Save to sheet error:', err);
      showToast('Erro ao gravar dados na planilha do Google Sheets.', 'error');
    } finally {
      setIsSavingToSheet(false);
    }
  };

  // Trigger delete modal for a specific row
  const handleRequestDelete = (item: TransactionItem) => {
    setItemToDelete(item);
    setDeleteModalOpen(true);
  };

  // User confirmed deletion -> delete row in Google Sheets!
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    setIsDeletingRow(true);
    try {
      if (user && accessToken && spreadsheetId && itemToDelete.rowIndex !== undefined) {
        // Fetch sheetId from metadata
        const details = await getSpreadsheetDetails(accessToken, spreadsheetId);
        const tabSheetId = details.sheets[0]?.sheetId || 0;
        await deleteTransactionFromSheet(accessToken, spreadsheetId, tabSheetId, itemToDelete.rowIndex);
        await syncDataFromSheet(accessToken, spreadsheetId);
        showToast('Registro excluído com sucesso do Google Sheets.', 'success');
      } else {
        // Demo mode deletion
        setTransactions(prev => prev.filter(t => t.id !== itemToDelete.id));
        showToast('Registro removido da visualização de demonstração.', 'info');
      }
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (err: any) {
      console.error('Delete error:', err);
      showToast('Não foi possível excluir a linha da planilha.', 'error');
    } finally {
      setIsDeletingRow(false);
    }
  };

  // Open manual entry modal
  const handleOpenManualEntry = () => {
    setPendingTransactions([
      {
        id: `manual-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: 0,
        type: 'Despesa',
        category: 'Alimentação',
        payment_method: 'Pix',
        notes: '',
      },
    ]);
    setAiSummaryMessage('Preencha os campos para registrar manualmente na sua planilha');
    setConfirmModalOpen(true);
  };

  // Calculate quick metrics for the active financial context
  const totalIncome = transactions
    .filter(t => t.type === 'Receita')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'Despesa')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const balance = totalIncome - totalExpenses;

  const categoryMap: { [cat: string]: { total: number; count: number } } = {};
  transactions
    .filter(t => t.type === 'Despesa')
    .forEach(t => {
      const cat = t.category || 'Outros';
      if (!categoryMap[cat]) categoryMap[cat] = { total: 0, count: 0 };
      categoryMap[cat].total += t.amount || 0;
      categoryMap[cat].count += 1;
    });

  const categoriesSummary = Object.entries(categoryMap).map(([category, data]) => ({
    category,
    total: data.total,
    count: data.count,
  }));

  const financialContextPayload: FinancialContextPayload = {
    spreadsheetTitle,
    totalExpenses,
    totalIncome,
    balance,
    categoriesSummary,
    recentTransactions: transactions.slice(0, 15),
    currentMonthName: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 animate-bounce">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-xs sm:text-sm font-medium ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                : toastMessage.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                : 'bg-cyan-950/90 border-cyan-500/40 text-cyan-200'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        user={user}
        spreadsheetTitle={spreadsheetTitle}
        spreadsheetUrl={spreadsheetUrl}
        isSyncing={isSyncing}
        onLogin={handleGoogleLogin}
        onLogout={handleLogout}
        onOpenSpreadsheetModal={() => setPickerModalOpen(true)}
        onRefreshData={() => {
          if (accessToken && spreadsheetId) {
            syncDataFromSheet(accessToken, spreadsheetId);
            showToast('Dados atualizados com sucesso!', 'info');
          }
        }}
        isDemoMode={isDemoMode}
      />

      {/* Hero / Onboarding Callout if not signed in */}
      {!user && (
        <div className="bg-gradient-to-r from-emerald-950/50 via-slate-900 to-teal-950/40 border-b border-emerald-500/20 py-4 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-slate-100">
                  Conecte seu Google Sheets para salvar seus gastos automaticamente
                </p>
                <p className="text-[11px] text-slate-400">
                  O FinanIA grava suas receitas e despesas direto na sua planilha do Google Drive, sem intermediários.
                </p>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-950 text-xs font-semibold shadow-md transition-all whitespace-nowrap"
            >
              <span>Conectar com Google</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 border-b border-slate-800">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab('assistente')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'assistente'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Assistente & Lançamentos</span>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'chat'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>Consultar Finanças (Chat IA)</span>
            </button>

            <button
              onClick={() => setActiveTab('analise')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'analise'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>Visão Geral & Gráficos</span>
            </button>

            <button
              onClick={() => setActiveTab('planilha')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'planilha'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>Planilha & Histórico</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                {transactions.length}
              </span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={handleOpenManualEntry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Lançamento Manual</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Assistente & Lançamentos */}
        {activeTab === 'assistente' && (
          <div className="space-y-6">
            {/* Input Hub */}
            <AssistantHub
              onParsedResult={handleAssistantParsedResult}
              spreadsheetTitle={spreadsheetTitle}
            />

            {/* Quick Glance at Recent Expenses and Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Saldo Atual Card */}
              <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Saldo Atual</span>
                  <h4 className={`text-xl font-bold mt-1 ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    R$ {balance.toFixed(2)}
                  </h4>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-400">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>

              {/* Total Despesas Card */}
              <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Despesas Registradas</span>
                  <h4 className="text-xl font-bold text-rose-400 mt-1">
                    R$ {totalExpenses.toFixed(2)}
                  </h4>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-rose-400">
                  <TrendingDown className="w-5 h-5" />
                </div>
              </div>

              {/* Total Receitas Card */}
              <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Receitas Registradas</span>
                  <h4 className="text-xl font-bold text-teal-400 mt-1">
                    R$ {totalIncome.toFixed(2)}
                  </h4>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-teal-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Recent 5 Transactions Strip */}
            <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Últimos Gastos Registrados na Planilha
                </h3>
                <button
                  onClick={() => setActiveTab('planilha')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                >
                  <span>Ver todos ({transactions.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-slate-800/80">
                {transactions.slice(0, 5).map((t, idx) => (
                  <div key={t.id || idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 font-mono text-[11px]">{t.date}</span>
                      <div>
                        <p className="font-semibold text-slate-200">{t.description}</p>
                        <p className="text-[10px] text-slate-400">{t.category} • {t.payment_method}</p>
                      </div>
                    </div>
                    <span className={`font-mono font-bold ${t.type === 'Receita' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.type === 'Receita' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Chat com Agente IA */}
        {activeTab === 'chat' && (
          <ChatAdvisor
            financialContext={financialContextPayload}
            onOpenQuickEntryWithText={(text) => {
              setActiveTab('assistente');
            }}
          />
        )}

        {/* Tab 3: Visão Geral & Gráficos */}
        {activeTab === 'analise' && (
          <DashboardAnalytics
            transactions={transactions}
            spreadsheetTitle={spreadsheetTitle}
          />
        )}

        {/* Tab 4: Planilha & Histórico */}
        {activeTab === 'planilha' && (
          <TransactionsTable
            transactions={transactions}
            spreadsheetTitle={spreadsheetTitle}
            spreadsheetUrl={spreadsheetUrl}
            onDeleteItem={handleRequestDelete}
            onOpenManualEntry={handleOpenManualEntry}
          />
        )}
      </main>

      {/* Mandatory Transaction Confirm Modal */}
      <TransactionConfirmModal
        isOpen={confirmModalOpen}
        transactions={pendingTransactions}
        spreadsheetTitle={spreadsheetTitle}
        onConfirm={handleConfirmAndSaveTransactions}
        onCancel={() => {
          setConfirmModalOpen(false);
          setPendingTransactions([]);
        }}
        isSaving={isSavingToSheet}
        summaryMessage={aiSummaryMessage}
      />

      {/* Mandatory Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        item={itemToDelete}
        spreadsheetTitle={spreadsheetTitle}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        isDeleting={isDeletingRow}
      />

      {/* Spreadsheet Picker / Manager Modal */}
      <SpreadsheetPickerModal
        isOpen={pickerModalOpen}
        spreadsheets={userSpreadsheets}
        currentSpreadsheetId={spreadsheetId}
        onSelect={handleSelectSpreadsheet}
        onCreateNew={(title) => handleCreateNewSpreadsheet(accessToken || undefined, title)}
        onClose={() => setPickerModalOpen(false)}
        isLoading={isSpreadsheetLoading}
        isCreating={isCreatingSheet}
      />
    </div>
  );
}
