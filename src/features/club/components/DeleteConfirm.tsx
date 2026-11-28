import { useState } from 'react';
import { Button, Modal } from '@/components/ui';

interface Props {
  open: boolean;
  /** «¿Borrar la publicación?» */
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

/** Pide confirmación antes de borrar algo del muro. */
export function DeleteConfirm({ open, title, description, onClose, onConfirm }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    if (busy) return;
    setError(null);
    onClose();
  };
  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={close}
      size="sm"
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="danger" loading={busy} onClick={confirm}>
            Borrar
          </Button>
        </>
      }
    >
      <p style={{ margin: 0 }}>{description}</p>
      {error && <p style={{ margin: 0, color: 'var(--color-danger)' }}>{error}</p>}
    </Modal>
  );
}
