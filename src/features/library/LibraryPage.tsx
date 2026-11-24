import { Icon } from '@/components/ui/Icon';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Card, EmptyState, Tabs } from '@/components/ui';
import { driveRootFolderId, resources } from '@/content/registry';
import type { Resource } from '@/content/schema';
import { ResourceViewer } from './components/ResourceViewer';
import styles from './LibraryPage.module.css';

type Filter = 'all' | 'video' | 'pdf';

/** Biblioteca: todo el material del Drive (catálogo generado con `npm run inventory`). */
export function LibraryPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Resource | null>(null);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = resources.filter((r) => (filter === 'all' || r.type === filter) && (!q || r.title.toLowerCase().includes(q) || r.tags.some((t) => t.includes(q))));
    const byFolder = new Map<string, Resource[]>();
    for (const r of list) {
      const top = r.folder.split(' / ').slice(0, 2).join(' / ') || 'Raíz';
      byFolder.set(top, [...(byFolder.get(top) ?? []), r]);
    }
    return [...byFolder.entries()];
  }, [filter, query]);

  return (
    <div className="stack">
      <PageHeader
        icon="video"
        title="Biblioteca"
        subtitle={
          <>
            {resources.length} recursos de tu{' '}
            <a href={`https://drive.google.com/drive/folders/${driveRootFolderId}`} target="_blank" rel="noreferrer">
              carpeta de Drive
            </a>
            . Las lecciones enlazan automáticamente el material relacionado.
          </>
        }
      />
      <div className={styles.searchBox}>
        <Icon name="search" className={styles.searchIcon} />
        <input
          className={styles.search}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          placeholder="Buscar videos y libros: caro-kann, táctica, finales…"
          aria-label="Buscar en la biblioteca"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button type="button" className={styles.clear} onClick={() => setQuery('')} aria-label="Borrar búsqueda">
            <Icon name="close" />
          </button>
        )}
      </div>
      <Tabs
        value={filter}
        onChange={setFilter}
        items={[
          { value: 'all', label: 'Todo' },
          { value: 'video', label: 'Videos', icon: 'play' },
          { value: 'pdf', label: 'Libros', icon: 'book' },
        ]}
      />
      {groups.length === 0 && <EmptyState icon="search" title="Sin resultados" />}
      {groups.map(([folder, items]) => (
        <Card key={folder} title={folder} subtitle={`${items.length} recursos`} icon="books">
          <div className={styles.grid}>
            {items.map((r) => (
              <button key={r.id} className={styles.item} onClick={() => setOpen(r)}>
                <span className={styles.thumb}><Icon name={r.type === 'video' ? 'play' : 'book'} weight="light" /></span>
                <span className={styles.title}>{r.title}</span>
                <span className={styles.tags}>
                  {r.tags.slice(0, 3).map((t) => (
                    <Badge key={t} tone="primary">
                      {t}
                    </Badge>
                  ))}
                </span>
              </button>
            ))}
          </div>
        </Card>
      ))}
      <ResourceViewer resource={open} onClose={() => setOpen(null)} />
    </div>
  );
}
