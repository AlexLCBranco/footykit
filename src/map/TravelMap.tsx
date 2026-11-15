// The continent map beside the Day List (calendarkit's travel view, adapted): Europe for European venues, South America
// for South American ones. Nothing focused: a dot per match, labelled "AWAY @ HOME" + city where it fits (else without
// the city, else the home team, else nothing — labels never overlap). A focused match (hovered or pinned row or dot):
// for both teams, previous match → this (solid) → next (dashed), straight-line km on each line, the view fitted to
// those places; a panel under the map per team (last / this / next with date, time, city, km, days between).
// Venues from the first altitude level up (config/altitude.ts) are marked, the mark growing with the level. Never part of a copied image. Loaded lazily with its basemaps.

import { geoAzimuthalEqualArea } from 'd3-geo';
import type { ReactNode } from 'react';
import { TeamLink } from '../components/Bits';
import { useFooty } from '../components/ctx';
import { kickoffTime, shortDay, weekdayShort, type Model } from '../data/model';
import type { Match } from '../data/snapshot';
import { matchTravel, venueOf, type Leg, type TeamTravel } from '../data/travel';
import { ALTITUDE_LEVELS } from '../../config/altitude';
import { altitudeLevel, altitudeText, type Venue } from '../data/venues';
import { BASEMAPS, type Basemap } from './basemaps';
import { around, placeLabels, textWidth, type LabelAsk } from './labels';

type Continent = keyof typeof BASEMAPS;
const continentOf = (v: Venue): Continent => (v.lon < -25 ? 'southAmerica' : 'europe');

const projectors = new Map<Continent, (v: Venue) => { x: number; y: number } | undefined>();
function projector(c: Continent) {
  let f = projectors.get(c);
  if (!f) {
    const b = BASEMAPS[c];
    const p = geoAzimuthalEqualArea().rotate(b.rotate).scale(b.scale).translate(b.translate);
    f = (v) => { const xy = p([v.lon, v.lat]); return xy ? { x: xy[0], y: xy[1] } : undefined; };
    projectors.set(c, f);
  }
  return f;
}

/** Away: pink, home: green (calendarkit's pair; one colour per team for its lines and its panel text). */
const COLOR = { a: '#ef7f96', h: '#3fc89a' } as const;
const FONT = '600 13px "Inter fk", system-ui, sans-serif';

interface Box { x: number; y: number; w: number; h: number }
/** The part of the map shown: everything, or the places with room around them (never narrower than MIN_SPAN units). */
function fit(b: Basemap, pts: { x: number; y: number }[]): Box {
  if (!pts.length) return { x: 0, y: 0, w: b.w, h: b.h };
  const MIN_SPAN = 180;
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const aspect = b.h / b.w;
  let w = Math.max(x1 - x0, MIN_SPAN) * 1.5, h = Math.max(y1 - y0, MIN_SPAN * aspect) * 1.4;
  if (h / w > aspect) w = h / aspect; else h = w * aspect;
  if (w >= b.w) return { x: 0, y: 0, w: b.w, h: b.h };
  return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h };
}

const fmtKm = (n: number) => `${n.toLocaleString('en-US')} km`;

/** The map never taller than this (South America is 1.4 times as tall as wide): it narrows instead. */
const MAX_H = 600;
export const mapWidth = (c: Continent, width: number) => Math.min(width, Math.round((MAX_H * BASEMAPS[c].w) / BASEMAPS[c].h));

function MapSvg({ c, width: room, children, view, onEmpty }: { c: Continent; width: number; children: (u: number) => ReactNode; view: Box; onEmpty: () => void }) {
  const b = BASEMAPS[c];
  const width = mapWidth(c, room);
  const height = Math.round((width * b.h) / b.w);
  const u = view.w / width; // map units per screen px
  return (
    <svg className="fk-map-svg" width={width} height={height} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} role="img" aria-label={`${b.name} map`} onClick={(e) => { if (e.target === e.currentTarget) onEmpty(); }}>
      <g className="fk-map-land" style={{ strokeWidth: u }} onClick={onEmpty}>{b.land.map((d, i) => <path key={i} d={d} />)}</g>
      {children(u)}
    </svg>
  );
}

function Altitude({ v, at, u }: { v: Venue; at: { x: number; y: number }; u: number }) {
  const level = altitudeLevel(v.elev);
  if (!level) return null;
  const s = (5 + 1.5 * level.rank) * u;
  return (
    <g className={`fk-map-alt fk-alt-${level.rank}`} data-testid="map-altitude" data-level={level.name}>
      <path d={`M${at.x} ${at.y - 2.2 * s}l${s} ${1.6 * s}h${-2 * s}z`} />
      <text x={at.x + 1.3 * s} y={at.y - 1.2 * s} style={{ fontSize: 11 * u }}>{altitudeText(v.elev!)}</text>
    </g>
  );
}

/** Nothing focused: the day's matches on one continent. */
function DayDots({ model, c, list, width, onFocus, onPin }: { model: Model; c: Continent; list: { m: Match; v: Venue }[]; width: number; onFocus: (id?: string) => void; onPin: (id: string) => void }) {
  const b = BASEMAPS[c];
  const proj = projector(c);
  const view = { x: 0, y: 0, w: b.w, h: b.h };
  const s = mapWidth(c, width) / b.w;
  const pts = list.map((x) => ({ ...x, p: proj(x.v)! })).filter((x) => x.p);
  const labels = (() => {
    const asks: LabelAsk[] = pts.map(({ m, p }) => {
      const at = { x: p.x * s, y: p.y * s };
      const base = `${model.team(m.a).abbr} @ ${model.team(m.h).abbr}`;
      const texts = [`${base} · ${m.city ?? ''}`, base, model.team(m.h).abbr];
      return { key: m.id, options: texts.flatMap((t, variant) => around(at, textWidth(t, FONT) + 4, 16).map((r) => ({ ...r, variant }))) };
    });
    const blocked = pts.map(({ p }) => ({ x: p.x * s - 5, y: p.y * s - 5, w: 10, h: 10 }));
    return placeLabels(asks, blocked, { x: 0, y: 0, w: b.w * s, h: b.h * s });
  })();
  return (
    <MapSvg c={c} width={width} view={view} onEmpty={() => undefined}>
      {(u) => pts.map(({ m, v, p }) => {
        const l = labels.get(m.id);
        const base = `${model.team(m.a).abbr} @ ${model.team(m.h).abbr}`;
        const text = l ? [`${base} · ${m.city ?? ''}`, base, model.team(m.h).abbr][l.variant] : undefined;
        return (
          <g key={m.id} className="fk-map-dot" onMouseEnter={() => onFocus(m.id)} onMouseLeave={() => onFocus(undefined)} onClick={() => onPin(m.id)} data-testid="map-dot">
            <circle cx={p.x} cy={p.y} r={5 * u} />
            <Altitude v={v} at={p} u={u} />
            {l && text && <text x={l.x * u + 2 * u} y={(l.y + 12) * u} style={{ fontSize: 12.5 * u }}>{text}</text>}
          </g>
        );
      })}
    </MapSvg>
  );
}

/** A focused match: both teams' legs. */
function Focus({ model, m, width, onEmpty }: { model: Model; m: Match; width: number; onEmpty: () => void }) {
  const here = venueOf(m)!;
  const c = continentOf(here);
  const b = BASEMAPS[c];
  const proj = projector(c);
  const [ta, th] = matchTravel(model, m);
  const at = proj(here)!;
  const legs: { side: 'a' | 'h'; kind: 'prev' | 'next'; leg: Leg; p?: { x: number; y: number }; v?: Venue }[] = [];
  for (const [side, t] of [['a', ta], ['h', th]] as const) {
    for (const kind of ['prev', 'next'] as const) {
      const leg = t[kind];
      if (!leg) continue;
      const v = venueOf(leg.m);
      // a venue on the other continent (a club's trip abroad) has no point here: its km stays in the panel
      legs.push({ side, kind, leg, v, p: v && continentOf(v) === c ? proj(v) : undefined });
    }
  }
  const view = fit(b, [at, ...legs.flatMap((l) => (l.p ? [l.p] : []))]);
  return (
    <MapSvg c={c} width={width} view={view} onEmpty={onEmpty}>
      {(u) => (
        <>
          {legs.map(({ side, kind, leg, p }, i) => {
            if (!p || leg.stayed) return null;
            const [from, to] = kind === 'prev' ? [p, at] : [at, p];
            // the two teams' lines to the same place are drawn a little apart
            const off = (side === 'a' ? -1 : 1) * 2.5 * u;
            // each team's distance at its own point along the line (35 % / 65 %), so two labels on one route don't overlap
            const t = side === 'a' ? 0.35 : 0.65;
            const mid = { x: from.x + (to.x - from.x) * t + off, y: from.y + (to.y - from.y) * t + off };
            return (
              <g key={i} className={`fk-map-leg fk-map-${kind}`} style={{ color: COLOR[side] }}>
                <line x1={from.x + off} y1={from.y + off} x2={to.x + off} y2={to.y + off} style={{ strokeWidth: 3 * u, strokeDasharray: kind === 'next' ? `${7 * u} ${5 * u}` : undefined }} />
                <circle cx={p.x} cy={p.y} r={4.5 * u} />
                {leg.km !== undefined && <text x={mid.x} y={mid.y} style={{ fontSize: 15 * u, strokeWidth: 4 * u }} textAnchor="middle">{fmtKm(leg.km)}</text>}
              </g>
            );
          })}
          <circle className="fk-map-here" cx={at.x} cy={at.y} r={7 * u} style={{ strokeWidth: 2 * u }} />
          <text className="fk-map-city" x={at.x + 10 * u} y={at.y + 5 * u} style={{ fontSize: 14 * u, strokeWidth: 4 * u }}>{m.city ?? m.v}</text>
          <Altitude v={here} at={at} u={u} />
          {legs.filter((l) => l.leg.stayed && l.kind === 'prev').map((l) => (
            <text key={l.side} className="fk-map-stayed" x={at.x + 10 * u} y={at.y + (l.side === 'a' ? 22 : 38) * u} style={{ fontSize: 12 * u, color: COLOR[l.side], strokeWidth: 3 * u }}>stayed · 0 km</text>
          ))}
        </>
      )}
    </MapSvg>
  );
}

function PanelLine({ label, m, team, leg }: { label: string; m?: Match; team: string; leg?: Leg }) {
  const { model, timeZone } = useFooty();
  if (!m) return <div className="fk-map-pl"><span className="fk-map-pk">{label}</span><span className="fk-muted">{label === 'last' ? 'none (first match of the season)' : 'none scheduled'}</span></div>;
  const home = m.h === team;
  const day = model.dayOf(m);
  return (
    <div className="fk-map-pl">
      <span className="fk-map-pk">{label}</span>
      <span>{home ? 'vs' : '@'} <TeamLink id={home ? m.a : m.h} day={day} logo="none" /> · {model.comp(m.c).code} · {weekdayShort(day)} {shortDay(day)} {m.tbd ? 'TBD' : kickoffTime(m.t, timeZone)} · {m.city ?? m.v ?? 'venue unknown'}{(() => { const e = venueOf(m)?.elev; return altitudeLevel(e) ? <span className={`fk-alt-note fk-alt-${altitudeLevel(e)!.rank}`}> ▲ {altitudeText(e!)}</span> : null; })()}</span>
      {leg && <span className="fk-map-pkm">{leg.stayed ? 'same ground' : leg.km !== undefined ? fmtKm(leg.km) : '? km'} · {leg.days} day{leg.days === 1 ? '' : 's'}</span>}
    </div>
  );
}

function Panel({ t, m, side }: { t: TeamTravel; m: Match; side: 'a' | 'h' }) {
  const { model } = useFooty();
  return (
    <div className="fk-map-team" style={{ color: COLOR[side] }}>
      <div className="fk-map-tname"><TeamLink id={t.team} day={model.dayOf(m)} label="short" logoSize={16} /></div>
      {t.followed ? (
        <>
          <PanelLine label="last" m={t.prev?.m} team={t.team} leg={t.prev} />
          <PanelLine label="this" m={m} team={t.team} />
          <PanelLine label="next" m={t.next?.m} team={t.team} leg={t.next} />
        </>
      ) : <div className="fk-muted fk-map-pl">Not a followed club: its other matches aren't loaded.</div>}
    </div>
  );
}

export default function TravelMap({ list, focus, pinned, onFocus, onPin, width }: { list: Match[]; focus?: string; pinned?: string; onFocus: (id?: string) => void; onPin: (id?: string) => void; width: number }) {
  const { model } = useFooty();
  const placed = list.map((m) => ({ m, v: venueOf(m) })).filter((x): x is { m: Match; v: Venue } => !!x.v);
  const unplaced = list.length - placed.length;
  const focused = focus ? list.find((m) => m.id === focus) : undefined;
  const focusedPlaced = focused && venueOf(focused) ? focused : undefined;
  const byContinent = (['europe', 'southAmerica'] as const).map((c) => [c, placed.filter((x) => continentOf(x.v) === c)] as const).filter(([, l]) => l.length);
  return (
    <aside className="fk-map" data-capture-exclude="true" data-testid="travel-map" onKeyDown={(e) => { if (e.key === 'Escape') onPin(undefined); }}>
      {focusedPlaced ? (
        <>
          <Focus model={model} m={focusedPlaced} width={width} onEmpty={() => onPin(undefined)} />
          <div className="fk-map-panel" data-testid="map-panel">
            {matchTravel(model, focusedPlaced).map((t, i) => <Panel key={t.team} t={t} m={focusedPlaced} side={i === 0 ? 'a' : 'h'} />)}
          </div>
        </>
      ) : byContinent.length ? (
        byContinent.map(([c, l]) => <DayDots key={c} model={model} c={c} list={l} width={width} onFocus={onFocus} onPin={(id) => onPin(id)} />)
      ) : (
        <p className="fk-muted">{list.length ? 'No venue of today\'s matches is on the map.' : 'No matches today.'}</p>
      )}
      <p className="fk-map-legend fk-muted">
        {focusedPlaced ? <>Solid: from the last match · dashed: to the next · straight-line km · ▲ altitude from {ALTITUDE_LEVELS[0]!.from.toLocaleString('en-US')} m (moderate → insane){pinned ? ' · pinned (Esc or click the map to unpin)' : ''}</> : <>Hover a match to see both teams' trips; click to pin. ▲ altitude from {ALTITUDE_LEVELS[0]!.from.toLocaleString('en-US')} m (moderate → insane).</>}
        {unplaced > 0 && ` ${unplaced} match${unplaced > 1 ? 'es' : ''} without a known venue.`}
      </p>
    </aside>
  );
}
