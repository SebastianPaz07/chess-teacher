import { useId } from 'react';

/**
 * Ilustración: un mini tablero con piezas y flechas que "dibuja" una idea.
 * `b`: filas separadas por "/" (arriba → abajo). Mayúscula = blancas, minúscula = negras,
 * "." = casilla vacía. `a`: flechas "col,fila>col,fila". `m`: casillas a resaltar "col,fila".
 */
export interface Scene {
  b: string;
  a?: string[];
  m?: string[];
}

const GLYPH: Record<string, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const CELL = 40;

const pt = (s: string) => s.split(',').map(Number) as [number, number];

export function PieceScene({ scene, size = 96, rounded = true, label }: { scene: Scene; size?: number | string; rounded?: boolean; label?: string }) {
  const id = useId().replace(/:/g, '');
  const rows = scene.b.split('/');
  const cols = Math.max(...rows.map((r) => r.length));
  const W = cols * CELL;
  const H = rows.length * CELL;
  const cx = (c: number) => c * CELL + CELL / 2;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ borderRadius: rounded ? 14 : 0, flexShrink: 0, display: 'block' }}
    >
      <defs>
        <marker id={`ah-${id}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#4fc3f7" />
        </marker>
      </defs>
      {rows.map((_, r) =>
        Array.from({ length: cols }).map((_, c) => (
          <rect key={`${r}-${c}`} x={c * CELL} y={r * CELL} width={CELL} height={CELL} fill={(r + c) % 2 === 0 ? 'var(--board-light)' : 'var(--board-dark)'} />
        )),
      )}
      {scene.m?.map((m) => {
        const [c, r] = pt(m);
        return <rect key={m} x={c * CELL + 2} y={r * CELL + 2} width={CELL - 4} height={CELL - 4} rx={8} fill="rgb(255 209 102 / 0.35)" stroke="#ffd166" strokeWidth={2.5} />;
      })}
      {scene.a?.map((a) => {
        const [from, to] = a.split('>');
        const [c1, r1] = pt(from);
        const [c2, r2] = pt(to);
        const dx = c2 - c1;
        const dy = r2 - r1;
        const len = Math.hypot(dx, dy) || 1;
        // Se acorta un poco para que la punta no tape la pieza
        const x1 = cx(c1) + (dx / len) * 10;
        const y1 = cx(r1) + (dy / len) * 10;
        const x2 = cx(c2) - (dx / len) * 8;
        const y2 = cx(r2) - (dy / len) * 8;
        return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4fc3f7" strokeWidth={5} strokeLinecap="round" opacity={0.9} markerEnd={`url(#ah-${id})`} />;
      })}
      {rows.map((row, r) =>
        [...row].map((ch, c) => {
          const g = GLYPH[ch.toLowerCase()];
          if (!g) return null;
          const white = ch === ch.toUpperCase();
          return (
            <text
              key={`p-${r}-${c}`}
              x={cx(c)}
              y={cx(r) + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={CELL * 0.86}
              fontFamily="var(--font-pieces)"
              fill={white ? '#ffffff' : '#1d1f4a'}
              stroke={white ? '#1d1f4a' : '#ffffff'}
              strokeWidth={white ? 1.6 : 0.8}
              paintOrder="stroke"
            >
              {g}
            </text>
          );
        }),
      )}
    </svg>
  );
}
