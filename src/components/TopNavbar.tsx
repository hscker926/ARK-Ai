import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import type { AppRoute } from '../types/ark';

interface TopNavbarProps {
  onNavigate: (route: AppRoute) => void;
  isAuthenticated: boolean;
}

export function TopNavbar({ onNavigate, isAuthenticated }: TopNavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#07070A]/90 backdrop-blur-md border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Title */}
        <button
          type="button"
          onClick={() => onNavigate('landing')}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] rounded-md"
        >
          <BrandLogo />
        </button>

        {/* Zone 2: 4 concise single-line nav links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-400">
          <button
            type="button"
            onClick={() => scrollToSection('capabilities')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Features
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('templates')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Templates
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('pricing')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Pricing
          </button>
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Sign In
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'register')}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0"
          >
            {isAuthenticated ? 'Open Studio' : 'Start Editing'}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/[0.08] bg-[#0D0D12] px-4 py-4 space-y-2">
          <button
            type="button"
            onClick={() => scrollToSection('capabilities')}
            className="block w-full text-left px-3 py-2.5 rounded-lg text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            Features
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('templates')}
            className="block w-full text-left px-3 py-2.5 rounded-lg text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            Templates
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('pricing')}
            className="block w-full text-left px-3 py-2.5 rounded-lg text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            Pricing
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onNavigate('login');
            }}
            className="block w-full text-left px-3 py-2.5 rounded-lg text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            Sign In
          </button>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onNavigate(isAuthenticated ? 'dashboard' : 'register');
              }}
              className="w-full py-2.5 px-4 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-medium text-center"
            >
              {isAuthenticated ? 'Open Studio' : 'Start Editing'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
