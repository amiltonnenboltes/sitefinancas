import React, { useState, useRef } from 'react';
import { 
  Mic, 
  Square, 
  Camera, 
  Upload, 
  Sparkles, 
  Send, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Play,
  RotateCcw,
  Volume2
} from 'lucide-react';
import { AudioRecorder, RecordedAudio } from '../utils/audioRecorder';
import { parseFinancialWithAI, ParseResponse } from '../services/aiApi';

interface AssistantHubProps {
  onParsedResult: (result: ParseResponse) => void;
  spreadsheetTitle: string;
}

export const AssistantHub: React.FC<AssistantHubProps> = ({
  onParsedResult,
  spreadsheetTitle,
}) => {
  const [activeTab, setActiveTab] = useState<'audio' | 'image' | 'text'>('audio');

  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<RecordedAudio | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const timerIntervalRef = useRef<any>(null);

  // Image state
  const [selectedImage, setSelectedImage] = useState<{
    file: File;
    previewUrl: string;
    base64: string;
    mimeType: string;
  } | null>(null);
  const [imageNotes, setImageNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Text state
  const [textInput, setTextInput] = useState('');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Start Voice Recording
  const handleStartRecording = async () => {
    try {
      setErrorMsg(null);
      setRecordedAudio(null);
      const recorder = new AudioRecorder();
      audioRecorderRef.current = recorder;
      await recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Mic error:', err);
      setErrorMsg(err.message || 'Erro ao acessar o microfone. Verifique as permissões.');
      setIsRecording(false);
    }
  };

  // Stop Voice Recording
  const handleStopRecording = async () => {
    if (!audioRecorderRef.current) return;
    try {
      clearInterval(timerIntervalRef.current);
      const audioData = await audioRecorderRef.current.stop();
      setIsRecording(false);
      setRecordedAudio(audioData);
    } catch (err: any) {
      console.error('Stop mic error:', err);
      setErrorMsg('Falha ao processar gravação de áudio.');
      setIsRecording(false);
    }
  };

  const handleCancelRecording = () => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.cancel();
    }
    clearInterval(timerIntervalRef.current);
    setIsRecording(false);
    setRecordedAudio(null);
    setRecordingDuration(0);
  };

  // Submit recorded audio to AI
  const handleSubmitAudio = async () => {
    if (!recordedAudio) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const result = await parseFinancialWithAI({
        type: 'audio',
        dataBase64: recordedAudio.base64,
        mimeType: recordedAudio.mimeType,
        currentDate: new Date().toISOString().split('T')[0],
      });

      onParsedResult(result);
      setRecordedAudio(null);
    } catch (err: any) {
      console.error('Audio parse error:', err);
      setErrorMsg(err.message || 'Não foi possível entender o áudio. Tente falar mais perto do microfone ou digitar.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Image File selection
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const mimeType = file.type || 'image/jpeg';
    const previewUrl = URL.createObjectURL(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      const base64 = res.includes(',') ? res.split(',')[1] : res;
      setSelectedImage({
        file,
        previewUrl,
        base64,
        mimeType,
      });
    };
    reader.readAsDataURL(file);
  };

  // Submit Image to AI
  const handleSubmitImage = async () => {
    if (!selectedImage) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const result = await parseFinancialWithAI({
        type: 'image',
        dataBase64: selectedImage.base64,
        mimeType: selectedImage.mimeType,
        content: imageNotes,
        currentDate: new Date().toISOString().split('T')[0],
      });

      onParsedResult(result);
      setSelectedImage(null);
      setImageNotes('');
    } catch (err: any) {
      console.error('Image parse error:', err);
      setErrorMsg(err.message || 'Erro ao processar imagem. Verifique a nitidez da foto do cupom fiscal ou recibo.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit Text to AI
  const handleSubmitText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textInput.trim()) return;

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const result = await parseFinancialWithAI({
        type: 'text',
        content: textInput,
        currentDate: new Date().toISOString().split('T')[0],
      });

      onParsedResult(result);
      setTextInput('');
    } catch (err: any) {
      console.error('Text parse error:', err);
      setErrorMsg(err.message || 'Erro ao interpretar texto.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Lançamento Rápido com IA
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Mande áudio, foto de comprovante/recibo ou escreva naturalmente para registrar na planilha
          </p>
        </div>

        {/* Multimodal Tabs */}
        <div className="inline-flex rounded-xl p-1 bg-slate-950/80 border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('audio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'audio'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voz / Áudio</span>
          </button>

          <button
            onClick={() => setActiveTab('image')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'image'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Nota Fiscal / Imagem</span>
          </button>

          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'text'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Texto Rápido</span>
          </button>
        </div>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tab 1: Audio / Voice Recording */}
      {activeTab === 'audio' && (
        <div className="mt-6 flex flex-col items-center text-center">
          {!isRecording && !recordedAudio && (
            <div className="space-y-4 max-w-md">
              <button
                type="button"
                onClick={handleStartRecording}
                disabled={isProcessing}
                className="group relative w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 flex items-center justify-center text-slate-950 shadow-xl shadow-emerald-500/25 transition-all transform hover:scale-105 active:scale-95 mx-auto"
              >
                <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-20 group-hover:opacity-40" />
                <Mic className="w-9 h-9" />
              </button>

              <div>
                <h3 className="text-sm font-semibold text-slate-200">
                  Toque para Gravar um Áudio
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Exemplo: <span className="text-emerald-300 italic">"Paguei 48 reais no almoço de hoje no débito"</span> ou <span className="text-emerald-300 italic">"Recebi um Pix de 250 de um serviço"</span>
                </p>
              </div>

              {/* Sample voice prompt chips */}
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {[
                  'Gastei 55 reais no supermercado no crédito',
                  'Paguei a conta de luz de 140 reais no Pix',
                  'Abasteci 120 de gasolina ontem',
                ].map((hint, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setTextInput(hint);
                      setActiveTab('text');
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 border border-slate-700/60 transition-colors"
                  >
                    "{hint}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active recording state */}
          {isRecording && (
            <div className="space-y-4 py-4 max-w-sm">
              <div className="relative w-24 h-24 rounded-full bg-rose-600/20 border-2 border-rose-500 flex items-center justify-center mx-auto">
                <div className="w-16 h-16 rounded-full bg-rose-500 flex items-center justify-center text-white animate-pulse shadow-lg shadow-rose-500/40">
                  <Mic className="w-8 h-8" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>Gravando áudio: {formatTimer(recordingDuration)}</span>
                </div>
                <p className="text-xs text-slate-400">
                  Fale sobre sua despesa ou receita normalmente...
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelRecording}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/30 transition-all"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Concluir Gravação</span>
                </button>
              </div>
            </div>
          )}

          {/* Audio recorded preview and submit */}
          {recordedAudio && !isRecording && (
            <div className="w-full max-w-md p-4 bg-slate-950/80 rounded-2xl border border-emerald-500/30 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <Volume2 className="w-4 h-4" />
                  <span>Áudio pronto ({recordedAudio.durationSeconds}s)</span>
                </div>
                <button
                  onClick={() => setRecordedAudio(null)}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Gravar de novo</span>
                </button>
              </div>

              <audio
                controls
                src={URL.createObjectURL(recordedAudio.blob)}
                className="w-full h-10 rounded-lg filter invert-[0.85] contrast-[1.2]"
              />

              <button
                type="button"
                onClick={handleSubmitAudio}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>A IA está ouvindo e extraindo sua transação...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Interpretar Áudio com IA & Lançar</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Image / Receipt / Nota Fiscal */}
      {activeTab === 'image' && (
        <div className="mt-6 space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageFileChange}
            accept="image/*"
            className="hidden"
          />

          {!selectedImage ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-950/70 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Camera className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">
                Tire uma foto ou envie a imagem da Nota Fiscal
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Funciona com cupons fiscais (NFC-e), recibos de pagamento, comprovantes de Pix ou anotações manuais de gastos
              </p>
              <span className="mt-3 inline-block px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium">
                Selecionar arquivo ou Câmera
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
              {/* Image Preview with scanner effect */}
              <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 aspect-[4/3] flex items-center justify-center">
                <img
                  src={selectedImage.previewUrl}
                  alt="Nota Fiscal"
                  className="w-full h-full object-contain"
                />
                {isProcessing && (
                  <div className="absolute inset-0 bg-emerald-950/50 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-4">
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent absolute top-1/2 -translate-y-1/2 animate-bounce" />
                    <Sparkles className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
                    <p className="text-xs font-semibold text-emerald-200">
                      Escaneando cupom fiscal com visão computacional...
                    </p>
                  </div>
                )}
              </div>

              {/* Action and details */}
              <div className="flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {selectedImage.file.name}
                    </span>
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="text-xs text-rose-400 hover:text-rose-300"
                    >
                      Remover foto
                    </button>
                  </div>

                  <div className="mt-3">
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Algum comentário ou instrução adicional? (Opcional)
                    </label>
                    <textarea
                      value={imageNotes}
                      onChange={(e) => setImageNotes(e.target.value)}
                      placeholder="Ex: Foi pago no cartão de crédito; considere apenas os itens de alimentação..."
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSubmitImage}
                  disabled={isProcessing}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processando nota fiscal...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Escanear Nota & Extrair Gastos</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Text Natural Language */}
      {activeTab === 'text' && (
        <form onSubmit={handleSubmitText} className="mt-6 space-y-3">
          <div className="relative">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Digite livremente sua despesa ou receita. Ex: 'Comprei 3 remédios na farmácia deu 89,90 no cartão de crédito ontem à tarde'"
              rows={3}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl p-4 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-inner"
            />

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500">
                Pressione enviar para a IA extrair data, categoria, tipo e valor automaticamente
              </span>

              <button
                type="submit"
                disabled={isProcessing || !textInput.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all"
              >
                {isProcessing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Interpretando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Lançar com IA</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick chip examples */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 font-medium">Sugestões:</span>
            {[
              'Almoço restaurante R$ 42 débito',
              'Pix de R$ 350 recebido consultoria',
              'Uber trabalho R$ 28,90 crédito',
              'Supermercado Carrefour R$ 240 pix',
            ].map((s, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => setTextInput(s)}
                className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </form>
      )}
    </div>
  );
};
