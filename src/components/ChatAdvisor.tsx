import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  User as UserIcon, 
  Send, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Volume2, 
  VolumeX, 
  RefreshCw,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import { chatWithAdvisor, FinancialContextPayload } from '../services/aiApi';
import { TransactionItem } from '../services/googleSheets';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatAdvisorProps {
  financialContext: FinancialContextPayload;
  onOpenQuickEntryWithText?: (text: string) => void;
}

export const ChatAdvisor: React.FC<ChatAdvisorProps> = ({
  financialContext,
  onOpenQuickEntryWithText,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Olá! Sou o **FinanIA**, seu assistente de inteligência financeira. 📊

Tenho acesso em tempo real aos dados da sua planilha **"${financialContext.spreadsheetTitle || 'Google Sheets'}"**.

Você pode me perguntar livremente coisas como:
- *"Quanto gastei em alimentação este mês?"*
- *"Qual foi minha maior despesa recente?"*
- *"Como posso economizar R$ 300 até o fim do mês?"*
- *"Faça uma análise dos meus maiores ralos de dinheiro."*

Como posso te ajudar a cuidar do seu dinheiro hoje?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputPrompt;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const historyPayload = newHistory.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await chatWithAdvisor(historyPayload, financialContext);

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'Desculpe, tive uma instabilidade momentânea ao analisar os dados da planilha. Pode tentar perguntar novamente?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Text-To-Speech playback for assistant voice
  const handleSpeakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Clean markdown symbols for clearer speech
    const cleanText = text
      .replace(/[*_#`~\[\]]/g, '')
      .replace(/https?:\/\/\S+/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const QUICK_QUESTIONS = [
    'Quanto gastei com alimentação?',
    'Qual foi minha maior despesa?',
    'Como está meu saldo e receitas?',
    'Dicas práticas para economizar',
    'Resumo geral dos meus gastos',
  ];

  return (
    <div className="flex flex-col h-[680px] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      {/* Top Context Bar */}
      <div className="bg-slate-950/90 border-b border-slate-800 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                FinanIA - Consultoria Financeira
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Ao vivo com o Sheets
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Planilha ativa: <span className="text-slate-300 font-medium">{financialContext.spreadsheetTitle || 'Padrão'}</span>
              </p>
            </div>
          </div>

          {/* Quick Metrics Pills */}
          <div className="flex items-center gap-2 text-xs">
            <div className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">Saldo:</span>
              <span className={`font-bold ${financialContext.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                R$ {financialContext.balance.toFixed(2)}
              </span>
            </div>

            <div className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5 hidden sm:flex">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-slate-400">Gastos:</span>
              <span className="font-bold text-rose-400">
                R$ {financialContext.totalExpenses.toFixed(2)}
              </span>
            </div>

            <div className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5 hidden sm:flex">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">Receitas:</span>
              <span className="font-bold text-emerald-400">
                R$ {financialContext.totalIncome.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-md ${
                  isUser
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-emerald-400 border border-slate-700'
                }`}
              >
                {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-md ${
                  isUser
                    ? 'bg-emerald-600 text-white rounded-tr-none'
                    : 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-tl-none'
                }`}
              >
                {/* Content with basic markdown formatting */}
                <div className="whitespace-pre-wrap font-sans">
                  {msg.content}
                </div>

                {/* Footer with time & speech synthesis */}
                <div
                  className={`mt-2 flex items-center justify-between text-[10px] ${
                    isUser ? 'text-emerald-200' : 'text-slate-500'
                  }`}
                >
                  <span>{msg.timestamp}</span>

                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => handleSpeakText(msg.content)}
                      className="p-1 hover:text-emerald-400 transition-colors flex items-center gap-1"
                      title="Ouvir resposta em voz"
                    >
                      {isSpeaking ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                          <span className="text-rose-400">Parar</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Ouvir</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl rounded-tl-none p-4 text-xs text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
              <span className="ml-2 text-slate-400">FinanIA está analisando sua planilha...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Question Pills */}
      <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <Sparkles className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 ml-1" />
        {QUICK_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(q)}
            disabled={isLoading}
            className="flex-shrink-0 text-[11px] px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-emerald-300 border border-slate-700/60 transition-colors whitespace-nowrap"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Field */}
      <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Pergunte sobre seus gastos, receitas ou peça conselhos financeiros..."
            disabled={isLoading}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />

          <button
            type="submit"
            disabled={isLoading || !inputPrompt.trim()}
            className="p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </form>
      </div>
    </div>
  );
};
