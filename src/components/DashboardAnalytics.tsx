import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PieChart, 
  ShieldCheck, 
  Sparkles, 
  AlertTriangle, 
  Lightbulb, 
  CheckCircle,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { TransactionItem } from '../services/googleSheets';
import { fetchFinancialInsights, FinancialContextPayload } from '../services/aiApi';

interface DashboardAnalyticsProps {
  transactions: TransactionItem[];
  spreadsheetTitle: string;
}

export const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({
  transactions,
  spreadsheetTitle,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [insightsData, setInsightsData] = useState<{
    healthScore: number;
    healthStatus: string;
    summaryHighlight: string;
    insights: Array<{
      title: string;
      description: string;
      type: 'warning' | 'success' | 'tip' | 'info';
      category?: string;
    }>;
  } | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Extract available months from transactions
  const monthsList = Array.from(
    new Set(
      transactions
        .map(t => (t.date ? t.date.substring(0, 7) : ''))
        .filter(Boolean)
    )
  ).sort().reverse();

  // Filter transactions by selected month
  const filtered = selectedMonth === 'all'
    ? transactions
    : transactions.filter(t => t.date && t.date.startsWith(selectedMonth));

  // Totals
  const totalIncome = filtered
    .filter(t => t.type === 'Receita')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalExpenses = filtered
    .filter(t => t.type === 'Despesa')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  // Category breakdown for expenses
  const categoryMap: { [cat: string]: { total: number; count: number } } = {};
  filtered
    .filter(t => t.type === 'Despesa')
    .forEach(t => {
      const cat = t.category || 'Outros';
      if (!categoryMap[cat]) categoryMap[cat] = { total: 0, count: 0 };
      categoryMap[cat].total += t.amount || 0;
      categoryMap[cat].count += 1;
    });

  const categoriesSorted = Object.entries(categoryMap)
    .map(([cat, data]) => ({
      category: cat,
      total: data.total,
      count: data.count,
      percent: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Payment method breakdown
  const paymentMap: { [pay: string]: number } = {};
  filtered.forEach(t => {
    const pay = t.payment_method || 'Não especificado';
    paymentMap[pay] = (paymentMap[pay] || 0) + (t.amount || 0);
  });

  // Load automated AI insights when transactions change
  useEffect(() => {
    if (transactions.length === 0) return;

    let isMounted = true;
    setLoadingInsights(true);

    const payload: FinancialContextPayload = {
      spreadsheetTitle,
      totalExpenses,
      totalIncome,
      balance,
      categoriesSummary: categoriesSorted.map(c => ({
        category: c.category,
        total: c.total,
        count: c.count,
      })),
      recentTransactions: transactions.slice(0, 15),
      currentMonthName: selectedMonth,
    };

    fetchFinancialInsights(payload)
      .then(res => {
        if (isMounted) {
          setInsightsData(res);
          setLoadingInsights(false);
        }
      })
      .catch(err => {
        console.warn('Failed to load insights:', err);
        if (isMounted) setLoadingInsights(false);
      });

    return () => {
      isMounted = false;
    };
  }, [transactions.length, selectedMonth]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Month Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-300">Filtrar Período:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
          >
            <option value="all">Todo o Histórico da Planilha</option>
            {monthsList.map(m => {
              const [year, month] = m.split('-');
              const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
              const label = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
              return (
                <option key={m} value={m}>
                  {label.charAt(0).toUpperCase() + label.slice(1)}
                </option>
              );
            })}
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Mostrando <strong className="text-slate-200 font-semibold">{filtered.length}</strong> lançamentos na planilha
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Líquido */}
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Saldo no Período</span>
            <div className={`p-2 rounded-xl ${balance >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className={`text-2xl font-black ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              R$ {balance.toFixed(2)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              {balance >= 0 ? (
                <>
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Superávit</span> nas contas
                </>
              ) : (
                <>
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-rose-400 font-medium">Déficit</span> nas contas
                </>
              )}
            </p>
          </div>
        </div>

        {/* Total Despesas */}
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total de Despesas</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-rose-400">
              R$ {totalExpenses.toFixed(2)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {filtered.filter(t => t.type === 'Despesa').length} gastos lançados
            </p>
          </div>
        </div>

        {/* Total Receitas */}
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total de Receitas</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-teal-400">
              R$ {totalIncome.toFixed(2)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {filtered.filter(t => t.type === 'Receita').length} entradas registradas
            </p>
          </div>
        </div>

        {/* Taxa de Poupança */}
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Taxa de Poupança</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-cyan-300">
              {savingsRate.toFixed(1)}%
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {savingsRate > 20 ? 'Excelente capacidade de poupança' : 'Abaixo da meta recomendada (20%)'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Categories Breakdown & AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories Breakdown (2 cols) */}
        <div className="lg:col-span-2 p-6 bg-slate-900/90 border border-slate-800 rounded-3xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-100">
                Divisão de Despesas por Categoria
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Total: R$ {totalExpenses.toFixed(2)}
            </span>
          </div>

          {categoriesSorted.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl">
              Nenhuma despesa registrada para o período selecionado.
            </div>
          ) : (
            <div className="space-y-4">
              {categoriesSorted.map((cat, idx) => {
                // Color palette for category bars
                const colors = [
                  'bg-emerald-500',
                  'bg-teal-400',
                  'bg-cyan-500',
                  'bg-sky-400',
                  'bg-indigo-500',
                  'bg-violet-400',
                  'bg-amber-500',
                  'bg-rose-500',
                ];
                const barColor = colors[idx % colors.length];

                return (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${barColor}`} />
                        <span className="font-semibold text-slate-200">{cat.category}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({cat.count}x)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-slate-100">
                          R$ {cat.total.toFixed(2)}
                        </span>
                        <span className="text-[11px] text-slate-400 w-12 text-right">
                          {cat.percent.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(cat.percent, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Health Score & Smart Insights Card (1 col) */}
        <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-3xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  Saúde Financeira IA
                </h3>
              </div>
              {loadingInsights && (
                <span className="text-[10px] text-emerald-400 animate-pulse">Atualizando...</span>
              )}
            </div>

            {/* Health Score Gauge */}
            {insightsData ? (
              <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/30 border border-emerald-500/30 text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-900 border-2 border-emerald-400 shadow-lg shadow-emerald-500/20">
                  <span className="text-xl font-black text-emerald-400">
                    {insightsData.healthScore}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                    {insightsData.healthStatus}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 italic">
                    "{insightsData.summaryHighlight}"
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-4 rounded-2xl bg-slate-950/50 text-center text-xs text-slate-400 border border-slate-800">
                Avaliando dados da planilha...
              </div>
            )}

            {/* AI Insights list */}
            <div className="mt-4 space-y-2.5">
              <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                Insights Inteligentes:
              </h4>

              {insightsData?.insights && insightsData.insights.length > 0 ? (
                insightsData.insights.map((insight, idx) => {
                  const isWarning = insight.type === 'warning';
                  const isSuccess = insight.type === 'success';

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs space-y-1 transition-all ${
                        isWarning
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                          : isSuccess
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        {isWarning ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        ) : isSuccess ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <Lightbulb className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                        )}
                        <span>{insight.title}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-90">
                        {insight.description}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="p-3 text-center text-xs text-slate-500 bg-slate-950 rounded-xl">
                  Adicione lançamentos na planilha para gerar recomendações personalizadas.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
