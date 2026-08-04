import React from 'react';
import { useGetCommandStats } from '@workspace/api-client-react';
import { Activity, CheckCircle, XCircle } from 'lucide-react';

export function CommandStatsBar() {
  const { data: stats } = useGetCommandStats({ query: { refetchInterval: 5000 } });

  if (!stats) return null;

  const successRate = stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : 0;

  return (
    <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-muted-foreground border-t border-border/50 pt-4 mt-4">
      <div className="flex items-center gap-2">
        <Activity className="w-3 h-3 text-primary" />
        <span>TOTAL_CMDS: <span className="text-foreground">{stats.total}</span></span>
      </div>
      <div className="flex items-center gap-2">
        <CheckCircle className="w-3 h-3 text-secondary" />
        <span>SUCCESS: <span className="text-secondary">{stats.successful}</span></span>
      </div>
      <div className="flex items-center gap-2">
        <XCircle className="w-3 h-3 text-destructive" />
        <span>FAILED: <span className="text-destructive">{stats.failed}</span></span>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <span>EFFICIENCY:</span>
        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden border border-border/50">
          <div 
            className="h-full bg-secondary transition-all duration-500" 
            style={{ width: `${successRate}%` }} 
          />
        </div>
        <span className="text-foreground">{successRate}%</span>
      </div>
    </div>
  );
}
