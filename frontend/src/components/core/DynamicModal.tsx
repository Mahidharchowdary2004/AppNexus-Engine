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

  useEffect(() => {
    if (open) {
      setMounted(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setMounted(false), 400);
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
      {/* Backdrop with enhanced blur and subtle color shift */}
      <div 
        className={cn(
          "absolute inset-0 bg-slate-950/40 backdrop-blur-[12px] transition-all duration-500 ease-in-out",
          open ? "opacity-100" : "opacity-0"
        )} 
        onClick={onClose} 
      />
      
      {/* Glow Effect behind modal */}
      <div className={cn(
        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none transition-opacity duration-700",
        open ? "opacity-100" : "opacity-0"
      )} />

      {/* Modal Container */}
      <div className={cn(
        "relative w-full overflow-hidden bg-white/90 backdrop-blur-3xl rounded-[3rem] border border-white/40 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25),0_0_0_1px_rgba(255,255,255,0.4)_inset] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        sizeClasses[size],
        open ? "scale-100 translate-y-0 opacity-100 rotate-0" : "scale-[0.92] translate-y-12 opacity-0 -rotate-1"
      )}>
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

        {/* Header */}
        <div className="relative flex items-center justify-between px-12 py-10 border-b border-slate-200/40 bg-gradient-to-b from-white/20 to-transparent">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-[0.3em] ml-1">
              {t('common.action') || 'Nexus Operation'}
            </p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
              {t(title)}
            </h3>
          </div>
          
          <button 
            onClick={onClose} 
            className="group relative flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-100/50 hover:bg-white text-slate-400 hover:text-slate-900 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 active:scale-90"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {/* Subtle Tooltip */}
            <span className="absolute -bottom-10 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap pointer-events-none">
              Esc to close
            </span>
          </button>
        </div>

        {/* Content Area */}
        <div className="px-12 py-12 max-h-[70vh] overflow-y-auto custom-scrollbar relative">
          {/* Subtle noise/texture overlay could be added here for more premium feel */}
          <div className="relative z-10">
            {children}
          </div>
        </div>

        {/* Footer Accent (Optional, can be used for actions in children) */}
        <div className="h-6 bg-gradient-to-t from-slate-50/50 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
