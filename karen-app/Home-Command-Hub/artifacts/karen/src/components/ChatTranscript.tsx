import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, ShieldAlert } from 'lucide-react';
import type { ChatMessage } from '@/hooks/use-voice';

interface ChatTranscriptProps {
  messages: ChatMessage[];
}

export function ChatTranscript({ messages }: ChatTranscriptProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 font-mono text-sm" ref={containerRef}>
      {messages.length === 0 ? (
        <div className="m-auto text-center text-muted-foreground flex flex-col items-center gap-2 opacity-50">
          <div className="w-16 h-16 rounded-full border border-primary/30 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border border-secondary/30 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" />
            </div>
          </div>
          <div>AWAITING INPUT...</div>
        </div>
      ) : (
        messages.map((msg) => (
          <div 
            key={msg.id} 
            className={cn(
              "max-w-[85%] rounded-md p-3 animate-in fade-in slide-in-from-bottom-2",
              msg.role === 'user' ? "self-end bg-primary/10 border border-primary/30 text-foreground" :
              msg.role === 'karen' ? "self-start bg-secondary/10 border border-secondary/30 text-secondary-foreground" :
              "self-center w-full bg-card border border-border text-center text-xs text-muted-foreground"
            )}
          >
            <div className="mb-1 text-[10px] opacity-50 tracking-wider">
              {msg.role === 'user' ? 'USER' : msg.role === 'karen' ? 'KAREN' : 'SYSTEM'}
            </div>
            
            {msg.isAction ? (
              <div className={cn(
                "inline-flex items-center gap-2 px-2 py-1 rounded-sm border",
                msg.success ? "border-secondary text-secondary bg-secondary/10" : "border-destructive text-destructive bg-destructive/10"
              )}>
                {msg.success ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                {msg.content}
              </div>
            ) : (
              <div className={cn(
                "leading-relaxed",
                msg.role === 'karen' ? "text-secondary drop-shadow-[0_0_5px_rgba(0,102,255,0.5)]" : ""
              )}>
                {msg.content}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
