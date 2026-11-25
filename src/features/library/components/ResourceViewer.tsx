import { Icon } from '@/components/ui/Icon';
import { useState } from 'react';
import { Badge, Card, Loader, Modal } from '@/components/ui';
import type { Resource } from '@/content/schema';
import styles from './ResourceViewer.module.css';

const previewUrl = (id: string) => `https://drive.google.com/file/d/${id}/preview`;

/** Abre un video o libro dentro de la app (vista previa embebida). */
export function ResourceViewer({ resource, onClose }: { resource: Resource | null; onClose: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <Modal
      open={Boolean(resource)}
      onClose={() => {
        setLoaded(false);
        onClose();
      }}
      size="xl"
      title={resource?.title}
    >
      {resource && (
        <div className={styles.frameWrap}>
          {!loaded && <Loader label="Cargando material…" />}
          <iframe
            className={styles.frame}
            style={{ opacity: loaded ? 1 : 0 }}
            src={previewUrl(resource.id)}
            title={resource.title}
            allow="autoplay; fullscreen"
            onLoad={() => setLoaded(true)}
          />
        </div>
      )}
    </Modal>
  );
}

/** Lista compacta de recursos relacionados (para lecciones y aperturas). */
export function ResourceList({ items, title = 'Material relacionado' }: { items: Resource[]; title?: string }) {
  const [open, setOpen] = useState<Resource | null>(null);
  if (!items.length) return null;
  return (
    <Card title={title} icon="video" subtitle="Videos y libros de la base de conocimientos sobre este tema">
      <ul className={styles.list}>
        {items.map((r) => (
          <li key={r.id}>
            <button className={styles.item} onClick={() => setOpen(r)}>
              <span className={styles.icon}><Icon name={r.type === 'video' ? 'play' : 'book'} /></span>
              <span className={styles.title}>{r.title}</span>
              <Badge tone={r.type === 'video' ? 'primary' : 'accent'}>{r.type === 'video' ? 'Video' : 'Libro'}</Badge>
            </button>
          </li>
        ))}
      </ul>
      <ResourceViewer resource={open} onClose={() => setOpen(null)} />
    </Card>
  );
}
