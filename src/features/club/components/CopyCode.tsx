import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { copyText } from '../copy';
import styles from '../club.module.css';

/** Código de invitación con botón para copiarlo. */
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!(await copyText(code, 'Copia el código'))) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span className={styles.codeBox}>
      Código <span className={styles.code}>{code}</span>
      <button type="button" className={styles.iconBtn} onClick={copy} aria-label={copied ? 'Código copiado' : 'Copiar código'} title={copied ? 'Copiado' : 'Copiar código'}>
        <Icon name={copied ? 'check' : 'copy'} />
      </button>
    </span>
  );
}
