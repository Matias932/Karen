import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] w-full text-center space-y-6">
      <h1 className="text-4xl font-mono font-bold text-destructive tracking-widest drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">
        ERROR_404
      </h1>
      <p className="text-lg text-muted-foreground font-mono">
        DATA SECTOR NOT FOUND. MODULE CORRUPTED OR OFFLINE.
      </p>
      <Link
        href="/"
        className="text-primary hover:text-primary-foreground hover:bg-primary border border-primary px-6 py-2 rounded-sm font-mono tracking-widest transition-all hud-glow-red"
      >
        RETURN_TO_BASE
      </Link>
    </div>
  );
}
