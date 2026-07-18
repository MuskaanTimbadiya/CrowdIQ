import { useRef, useEffect, useState } from "react";
import { ChatMessage } from "../types";

interface ChatInterfaceProps {
  chatHistory: ChatMessage[];
  userLanguage: string;
  setUserLanguage: (lang: string) => void;
  onSendMessage: (msg: string) => void;
  loadingGuidance: boolean;
  showAssistant: boolean;
  setShowAssistant: (show: boolean) => void;
  selectAssetOnMap: (id: string, name: string, type: 'gate'|'road'|'transit', info: string) => void;
  setActiveTab: (tab: string) => void;
}

export function ChatInterface({
  chatHistory,
  userLanguage,
  setUserLanguage,
  onSendMessage,
  loadingGuidance,
  showAssistant,
  setShowAssistant,
}: ChatInterfaceProps) {
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showAssistant) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, showAssistant]);

  const handleSend = () => {
    if (!currentMessage.trim() || loadingGuidance) return;
    onSendMessage(currentMessage.trim());
    setCurrentMessage("");
  };

  if (!showAssistant) {
    return (
      <button
        onClick={() => setShowAssistant(true)}
        className="fixed bottom-14 right-4 md:bottom-16 md:right-8 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all z-50 cursor-pointer animate-fade-in"
        title="Open FIFA Volunt-AI"
        aria-label="Open Volunt-AI Guidance Assistant"
      >
        <span className="material-symbols-outlined text-[24px]">smart_toy</span>
      </button>
    );
  }

  return (
    <aside aria-label="Volunt-AI Chat" className="fixed bottom-14 right-4 md:bottom-16 md:right-8 w-[calc(100vw-2rem)] sm:w-80 glass-panel rounded-2xl shadow-2xl border-primary/10 flex flex-col overflow-hidden z-50 bg-surface/95 transition-all animate-fade-in">
      <header className="p-3 bg-primary flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/10 shadow-inner">
            <span className="material-symbols-outlined text-white text-[18px]">smart_toy</span>
          </div>
          <div>
            <p className="font-orbitron text-[10px] font-bold leading-none tracking-widest">FIFA VOLUNT-AI</p>
            <p className="text-[8px] text-white/80 mt-1 font-mono uppercase">Tactical Support Core</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={userLanguage}
            onChange={(e) => setUserLanguage(e.target.value)}
            aria-label="Select Language"
            className="bg-primary-dark/20 text-white rounded text-[9px] border border-white/25 focus:outline-none py-0.5 px-1.5 font-mono cursor-pointer font-bold"
          >
            <option value="English" className="text-on-surface">EN</option>
            <option value="Spanish" className="text-on-surface">ES</option>
            <option value="French" className="text-on-surface">FR</option>
            <option value="Portuguese" className="text-on-surface">PT</option>
          </select>
          <button
            onClick={() => setShowAssistant(false)}
            aria-label="Close Chat"
            className="text-white/80 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      </header>

      <section aria-live="polite" className="p-4 h-64 overflow-y-auto space-y-3 text-[11px] bg-surface-container-low/40">
        {chatHistory.map((msg) => (
          <article
            key={msg.id}
            className={`flex flex-col gap-1 max-w-[85%] rounded-xl p-2.5 shadow-sm border animate-fade-in ${
              msg.sender === "user"
                ? "bg-primary/5 border-primary/20 text-on-surface self-end ml-auto"
                : msg.sender === "system"
                  ? "bg-surface-container border-outline-variant/30 text-outline text-[9px] self-center w-full text-center rounded-md py-1 font-mono"
                  : "bg-surface border-outline-variant/30 text-on-surface self-start mr-auto"
            }`}
          >
            <p className="leading-relaxed whitespace-pre-wrap font-sans">{msg.text}</p>
            
            {msg.suggestedRoute && (
              <div className="mt-2 pt-2 border-t border-outline-variant/20 text-[9px] space-y-1.5 font-mono">
                <span className="text-primary font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">navigation</span>
                  Route ({msg.suggestedRoute.mode}):
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {msg.suggestedRoute.path.map((wp, wIdx) => (
                    <span key={wIdx} className="flex items-center gap-1 font-mono">
                      {wIdx > 0 && <span className="text-outline text-[8px]">&raquo;</span>}
                      <span className="bg-surface-container border border-outline-variant/30 text-on-surface-variant px-1.5 py-0.5 rounded text-[8px] font-bold">
                        {wp}
                      </span>
                    </span>
                  ))}
                </div>
                <div className="text-[8px] text-outline mt-1">Travel Time: <strong className="text-on-surface font-bold">{msg.suggestedRoute.travelTime}m</strong></div>
              </div>
            )}
            <span className={`text-[8px] font-mono mt-1 ${msg.sender === "user" ? "text-primary/70" : "text-outline"} self-end`}>
              {msg.timestamp}
            </span>
          </article>
        ))}
        {loadingGuidance && (
          <div className="flex gap-1.5 max-w-[85%] bg-surface border border-outline-variant/30 rounded-xl p-3 self-start shadow-sm items-center">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
          </div>
        )}
        <div ref={chatEndRef} />
      </section>

      <footer className="p-3 bg-surface-container border-t border-outline-variant/30 flex gap-2">
        <input
          type="text"
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask for directions or bypasses..."
          aria-label="Ask for directions"
          className="flex-1 bg-surface border border-outline-variant/30 rounded text-on-surface px-3 py-1.5 text-[11px] focus:outline-none focus:border-primary font-sans transition-colors placeholder:text-outline-variant"
          disabled={loadingGuidance}
        />
        <button
          onClick={handleSend}
          disabled={!currentMessage.trim() || loadingGuidance}
          aria-label="Send Message"
          className="bg-primary text-white rounded w-8 h-8 flex items-center justify-center disabled:opacity-50 hover:bg-primary-dark transition-colors cursor-pointer shadow-sm active:scale-95"
        >
          <span className="material-symbols-outlined text-[14px]">send</span>
        </button>
      </footer>
    </aside>
  );
}
