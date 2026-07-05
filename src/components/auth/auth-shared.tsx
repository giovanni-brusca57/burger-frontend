import { memo } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// ---------------------------------------------------------------------------
// extractError — shared error extraction utility
// ---------------------------------------------------------------------------

export function extractError(err: unknown, fallback: string): string {
  return typeof err === 'object' && err !== null && 'message' in err
    ? String((err as { message: unknown }).message)
    : fallback;
}

// ---------------------------------------------------------------------------
// AuthModalLogo — shared header logo block used across all auth modals
// ---------------------------------------------------------------------------

export const AuthModalLogo = memo(function AuthModalLogo({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <DialogHeader>
      <div className="flex items-center gap-2.5">
        <img src="/burger-logo.svg" alt="Burger" className="h-7 w-auto" />
        <DialogTitle>{title}</DialogTitle>
      </div>
      <DialogDescription>{description}</DialogDescription>
    </DialogHeader>
  );
});

// ---------------------------------------------------------------------------
// AuthErrorBanner — inline error display used across all auth modals
// ---------------------------------------------------------------------------

export const AuthErrorBanner = memo(function AuthErrorBanner({ error }: { error: string }) {
  if (!error) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
      <AlertCircle className="size-4 shrink-0" />
      <span>{error}</span>
    </div>
  );
});

// ---------------------------------------------------------------------------
// PasswordInput — reusable password field with show/hide toggle
// ---------------------------------------------------------------------------

export interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  show: boolean;
  onToggle: () => void;
  ariaLabel: string;
  autoComplete?: string;
  placeholder?: string;
}

export const PasswordInput = memo(function PasswordInput({
  id,
  value,
  onChange,
  show,
  onToggle,
  ariaLabel,
  autoComplete = 'current-password',
  placeholder = '••••••••',
}: PasswordInputProps) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        autoComplete={autoComplete}
        className="pr-10"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        aria-label={ariaLabel}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});
