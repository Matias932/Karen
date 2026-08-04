import { Link, useLocation } from 'wouter';
import { Activity, Cpu, ShieldAlert, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHealthCheck } from '@workspace/api-client-react';

export function Header() {
  const [location] = useLocation();
  const { data: health } = useHealthCheck();

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-sm bg-background/80 border-b border-border hud-glow">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-6 h-6 text-primary" />
            <span className="font-mono text-xl font-bold tracking-widest text-primary drop-shadow-[0_0_8px_rgba(255,42,42,0.8)]">
              K.A.R.E.N.
            </span>
          </div>
          <div className="h-6 w-px bg-border mx-2" />
          <nav className="flex items-center gap-6">
            <Link 
              href="/" 
              className={cn(
                "text-sm font-mono tracking-wider transition-colors hover:text-primary",
                location === "/" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
              )}
            >
              CONSOLE
            </Link>
            <Link 
              href="/devices" 
              className={cn(
                "text-sm font-mono tracking-wider transition-colors hover:text-primary",
                location === "/devices" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
              )}
            >
              DEVICES
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-muted-foreground">SYS_STATUS:</span>
            {health?.status === 'ok' ? (
              <span className="text-secondary flex items-center gap-1">
                <Activity className="w-3 h-3" /> NOMINAL
              </span>
            ) : (
              <span className="text-destructive flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> ERROR
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
