import { useState } from 'react';
import { Button } from '@/components/ui';
import type { Club } from '@/services/club';

/** Comparte el enlace de invitación (WhatsApp, etc.) o lo copia. */
export function InviteButton({ club, size = 'sm', variant = 'secondary' }: { club: Club; size?: 'sm' | 'md' | 'lg'; variant?: 'secondary' | 'primary' | 'ghost' }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/unirse/${club.inviteCode}`;
  const text = `¡Únete a mi club de ajedrez «${club.name}»! Practicamos juntos todos los días. Código: ${club.inviteCode}`;

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: club.name, text, url });
        return;
      }
    } catch {
      return; // el usuario canceló
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copia el enlace de invitación', url);
    }
  };

  return (
    <Button size={size} variant={variant} icon={copied ? 'check' : 'share'} onClick={share}>
      {copied ? 'Enlace copiado' : 'Invitar'}
    </Button>
  );
}
