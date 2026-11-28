import { useState } from 'react';
import { Button } from '@/components/ui';
import type { Club } from '@/services/club';
import { copyText } from '../copy';

export const inviteUrl = (club: Pick<Club, 'inviteCode'>) => `${window.location.origin}/unirse/${club.inviteCode}`;

/** Copia al portapapeles el link para que alguien se una al club. */
export function InviteButton({ club, size = 'sm', variant = 'ghost', label = 'Invitar' }: { club: Club; size?: 'sm' | 'md' | 'lg'; variant?: 'secondary' | 'primary' | 'ghost'; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!(await copyText(inviteUrl(club), 'Copia el link de invitación'))) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button size={size} variant={variant} icon={copied ? 'check' : 'link'} onClick={copy} aria-label="Copiar link de invitación al club">
      {copied ? 'Link copiado' : label}
    </Button>
  );
}
