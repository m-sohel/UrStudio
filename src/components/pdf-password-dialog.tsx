'use client';

import React, { useState } from 'react';
import { Lock, Key, AlertCircle, Eye, EyeOff } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface PdfPasswordDialogProps {
  isOpen: boolean;
  fileName: string;
  onUnlock: (password: string) => void;
  onCancel: () => void;
}

export function PdfPasswordDialog({
  isOpen,
  fileName,
  onUnlock,
  onCancel,
}: PdfPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter the document password');
      return;
    }
    setError(null);
    onUnlock(password);
    setPassword('');
  };

  const handleClose = () => {
    setPassword('');
    setError(null);
    onCancel();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-md w-full max-w-[calc(100vw-2rem)] overflow-hidden">
        <DialogHeader className="min-w-0 pr-6">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <DialogTitle className="text-base font-semibold text-foreground">Password Protected PDF</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground break-words leading-relaxed mt-1">
            <span className="font-semibold text-foreground break-all">{fileName}</span> is encrypted. Please enter the password to unlock it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="pdf-password" className="text-xs font-medium">Document Password</Label>
            <div className="relative">
              <Input
                id="pdf-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                className="pr-10 text-sm"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="p-3 bg-muted/50 rounded-lg border border-border text-xs text-muted-foreground space-y-1.5 break-words leading-relaxed">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Key className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Cybercafé Quick Tip:</span>
            </div>
            <p>
              • <strong>e-Aadhaar</strong>: First 4 letters of name in CAPITAL + 4-digit Birth Year (e.g. <code className="bg-background/80 px-1 py-0.5 rounded border border-border text-[11px] font-mono">MOHA1995</code>).
            </p>
            <p>
              • <strong>e-PAN Card</strong>: Date of Birth in DDMMYYYY format (e.g. <code className="bg-background/80 px-1 py-0.5 rounded border border-border text-[11px] font-mono">15081992</code>).
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
              Unlock & Load
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
