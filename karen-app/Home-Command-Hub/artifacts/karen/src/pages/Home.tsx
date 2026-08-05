import React, { useRef, useState } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceInteraction, VoiceState } from '@/hooks/use-voice';
import { ChatTranscript } from '@/components/ChatTranscript';
import { useKarenSession } from '@/hooks/use-karen-session';
import { ActivityFeed } from '@/components/ActivityFeed';
import { CommandStatsBar } from '@/components/CommandStatsBar';
import { DeviceStatusRow } from '@/components/DeviceStatusRow';

export function Home() {
  const { conversationId, isReady } = useKarenSession();
  const { state, startListening, stopListening, sendTextMessage, messages } = useVoiceInteraction(conversationId);
  const [textInput, setTextInput] = useState("");

  const handleSendText = () => {
    if (textInput.trim() && state === "idle") {
      sendTextMessage(textInput.trim());
      setTextInput("");
    }
  };
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (isReady && state === 'idle') {
      startListening();
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    if (state === 'listening') {
      stopListening();
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] p-4 max-w-7xl mx-auto w-full gap-6">
      <DeviceStatusRow />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border border-border bg-card/20 rounded-lg flex flex-col relative overflow-hidden hud-glow-blue shadow-lg">
          {/* Decorative corners */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-secondary/50 pointer-events-none" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-secondary/50 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-secondary/50 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-secondary/50 pointer-events-none" />
          
          <ChatTranscript messages={messages} />

          <div className="p-6 border-t border-border/50 flex flex-col items-center justify-center bg-card/40 relative">
            
            {/* Visualizers */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
              {state === 'listening' && (
                <div className="flex items-center gap-1 opacity-50">
                  {[...Array(20)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-2 bg-primary listening-wave rounded-full" 
                      style={{ height: '40px', animationDelay: `${i * 0.05}s` }}
                    />
                  ))}
                </div>
              )}
              {state === 'processing' && (
                <div className="w-64 h-64 border border-secondary/30 rounded-full animate-spin border-t-secondary/80 pointer-events-none" style={{ animationDuration: '3s' }} />
              )}
              {state === 'responding' && (
                <div className="w-48 h-48 rounded-full border-4 border-secondary/40 shadow-[0_0_30px_rgba(0,102,255,0.4)] animate-pulse pointer-events-none" />
              )}
            </div>

            <button
              ref={buttonRef}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              disabled={!isReady || state === 'processing' || state === 'responding'}
              className={cn(
                "relative z-10 w-24 h-24 rounded-full flex items-center justify-center outline-none transition-all duration-300 group",
                !isReady ? "bg-muted text-muted-foreground border-border cursor-not-allowed" :
                state === 'idle' ? "bg-card border-2 border-primary text-primary hover:bg-primary/10 hud-glow-red hover:scale-105" :
                state === 'listening' ? "bg-primary text-primary-foreground border-2 border-primary scale-110 shadow-[0_0_40px_rgba(255,42,42,0.8)]" :
                state === 'processing' ? "bg-card border-2 border-secondary text-secondary hud-glow-blue cursor-wait" :
                "bg-secondary/20 border-2 border-secondary text-secondary hud-glow-blue shadow-[0_0_30px_rgba(0,102,255,0.6)] cursor-default"
              )}
            >
              {state === 'idle' || state === 'listening' ? (
                <Mic className={cn("w-10 h-10 transition-transform", state === 'listening' ? "scale-110 animate-pulse" : "group-hover:scale-110")} />
              ) : state === 'processing' ? (
                <Loader2 className="w-10 h-10 animate-spin" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-secondary shadow-[0_0_15px_#0066ff] animate-pulse" />
              )}

          


              {state === 'listening' && (
                <>
                  <div className="absolute inset-0 rounded-full border border-primary pulse-ring" />
                  <div className="absolute inset-0 rounded-full border border-primary pulse-ring" style={{ animationDelay: '0.5s' }} />
                </>
              )}
            </button>

          <div className="flex gap-2 mt-4 w-full max-w-sm">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendText(); }}
              disabled={!isReady || state !== 'idle'}
              placeholder="Escribile a Karen..."
              className="flex-1 bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-50"
            />
            <button
              onClick={handleSendText}
              disabled={!isReady || state !== 'idle' || !textInput.trim()}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50"
            >
              Enviar
            </button>
          </div>
            
            <div className="mt-4 font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase h-4">
              {!isReady ? 'INITIALIZING_SESSION...' :
               state === 'idle' ? 'HOLD_TO_SPEAK' :
               state === 'listening' ? 'RECORDING_AUDIO...' :
               state === 'processing' ? 'PROCESSING_COMMAND...' :
               'RESPONDING...'}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-6">
          <ActivityFeed />
        </div>
      </div>

      <CommandStatsBar />
    </div>
  );
}
