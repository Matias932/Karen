import React from 'react';
import { useListCommandLogs } from '@workspace/api-client-react';
import { Terminal, Check, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ActivityFeed() {
  const { data: logs } = useListCommandLogs({ limit: 8 }, { query: { refetchInterval: 3000 } });

  return (
    <div className="border border-border bg-card/30 rounded-md overflow-hidden hud-glow flex flex-col h-full">
      <div className="bg-border/30 px-3 py-2 border-b border-border flex items-center gap-2">
        <Terminal className="w-4 h-4 text-primary" />
        <h3 className="font-mono text-xs font-bold tracking-widest text-primary">SYS_LOG</h3>
      </div>
      <div className="p-3 overflow-y-auto flex-1 flex flex-col gap-2">
        {logs?.length === 0 ? (
          <div className="text-center text-muted-foreground font-mono text-xs py-8">NO ACTIVITY DETECTED</div>
        ) : (
          logs?.map(log => (
            <div key={log.id} className="animate-in slide-in-from-left-4 fade-in duration-300">
              <div className="flex items-start gap-3 font-mono text-[11px]">
                <div className="text-muted-foreground whitespace-nowrap pt-0.5">
                  {new Date(log.createdAt).toLocaleTimeString([], { hour12: false })}
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-secondary">[{log.deviceName || 'UNKNOWN'}]</span>
                    <span className="text-foreground">{log.command}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {log.status === 'success' && <span className="text-secondary flex items-center gap-1"><Check className="w-3 h-3" /> OK</span>}
                    {log.status === 'failed' && <span className="text-destructive flex items-center gap-1"><X className="w-3 h-3" /> ERR</span>}
                    {log.status === 'pending' && <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> PENDING</span>}
                    {log.response && <span className="text-muted-foreground truncate max-w-[200px]">- {log.response}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
