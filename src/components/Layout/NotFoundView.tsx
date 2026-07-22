import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface NotFoundViewProps {
  message?: string;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({
  message = "This presentation link is invalid or has expired."
}) => {
  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 antialiased font-sans select-none items-center justify-center p-6 relative overflow-hidden">
      
      {/* Decorative background gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] rounded-full bg-rose-500/5 blur-[100px] pointer-events-none" />

      {/* Main Card */}
      <div className="max-w-md w-full text-center relative z-10 flex flex-col items-center">
        {/* Branding Icon */}
        <div className="p-4 bg-gradient-to-br from-indigo-500/20 to-rose-500/20 rounded-3xl border border-white/10 shadow-2xl mb-6 relative group animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-rose-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-300" />
          <Sparkles className="w-10 h-10 text-indigo-400 relative" />
        </div>

        {/* Brand Title */}
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 font-mono mb-2">
          WildVision AI
        </span>

        {/* Main Error Headers */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight leading-tight mb-3">
          Presentation Unreachable
        </h1>
        
        <p className="text-sm text-slate-400 leading-relaxed mb-8 max-w-sm">
          {message}
        </p>

        {/* Action button */}
        <a
          href="/"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white text-xs font-extrabold py-3.5 px-6 rounded-xl shadow-2xl hover:shadow-indigo-500/20 transition-all duration-200 cursor-pointer select-none font-sans transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
        >
          <span>Return to WildVision</span>
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>

      {/* Footer credits */}
      <div className="absolute bottom-6 text-[10px] text-slate-500 uppercase tracking-widest font-mono">
        &copy; {new Date().getFullYear()} WildVision &bull; Architectural Rendering Suite
      </div>

    </div>
  );
};
