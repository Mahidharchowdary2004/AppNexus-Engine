'use client';
import { useEffect, useState } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function DynamicModal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const { t } = useLocale();
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Small delay to ensure entry animation plays
      requestAnimationFrame(() => setIsAnimating(true));
      document.body.style.overflow = 'hidden';
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setMounted(false), 500);
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open && !mounted) return null;

  const sizeClasses = { 
    sm: 'max-w-md', 
    md: 'max-w-xl', 
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    full: 'max-w-[95vw]'
  };

  return (
    <div className={cn(
      "fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 overflow-hidden",
      open ? "pointer-events-auto" : "pointer-events-none"
    )}>
      {/* Dynamic Backdrop */}
      <div 
        className={cn(
          "absolute inset-0 bg-slate-950/60 backdrop-blur-[20px] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
          isAnimating ? "opacity-100" : "opacity-0"
        )} 
        onClick={onClose} 
      />
      
      {/* Ambient Pulsing Glow */}
      <div className={cn(
        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-600/20 rounded-full blur-[150px] pointer-events-none transition-all duration-1000 delay-100 mix-blend-soft-light animate-pulse",
        isAnimating ? "opacity-100 scale-100" : "opacity-0 scale-50"
      )} />

      {/* Modal Surface */}
      <div className={cn(
        "relative w-full flex flex-col overflow-hidden bg-white/70 backdrop-blur-[30px] rounded-[2rem] border border-white/60 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.8)_inset] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
        sizeClasses[size],
        isAnimating ? "scale-100 translate-y-0 opacity-100 rotate-0" : "scale-[0.95] translate-y-12 opacity-0"
      )}>
        
        {/* Dynamic Light Sweep */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2rem]">
          <div className="absolute -inset-[100%] bg-gradient-to-tr from-transparent via-white/5 to-transparent animate-[spin_10s_linear_infinite]" />
        </div>

        {/* Header Section */}
        <div className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-black/[0.05] bg-gradient-to-b from-white/40 to-transparent">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.3em]">
                {t('common.nexus_action') || 'Nexus Operation'}
              </p>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-[-0.03em] leading-tight">
              {t(title)}
            </h3>
          </div>
          
          <button 
            onClick={onClose} 
            className="group relative flex items-center justify-center w-10 h-10 rounded-[1.25rem] bg-slate-100/50 hover:bg-white text-slate-400 hover:text-red-500 shadow-sm hover:shadow-xl transition-all duration-500 active:scale-90 border border-white"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5 transition-all duration-500 group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="relative z-10 px-8 py-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
            {children}
          </div>
        </div>

        {/* Glossy Bottom Bar */}
        <div className="relative h-8 bg-gradient-to-t from-white/30 to-transparent border-t border-white/10 pointer-events-none flex items-center justify-center">
          <div className="w-8 h-1 bg-slate-200/50 rounded-full" />
        </div>
      </div>
    </div>
  );
}
