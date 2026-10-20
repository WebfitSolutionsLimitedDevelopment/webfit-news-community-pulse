import Link from "next/link";
import type { BlocKey, ElectorateLean, Party, TrendPoint } from "@/lib/coalition-data";

/**
 * Chart colours (validated with the dataviz palette checker: lightness band,
 * chroma floor and colour-blind separation all pass). "heroColour" is a darker
 * shade used only behind white text.
 */
export const BLOC_META: Record<
  BlocKey,
  { name: string; short: string; parties: string; colour: string; heroColour: string; soft: string }
> = {
  government: {
    name: "Current government",
    short: "Government",
    parties: "National · ACT · NZ First",
    colour: "#2a63b0",
    heroColour: "#1f4e8c",
    soft: "#eaf0f8",
  },
  opposition: {
    name: "Opposition",
    short: "Opposition",
    parties: "Labour · Green · Te Pāti Māori",
    colour: "#c0303a",
    heroColour: "#9e2530",
    soft: "#f9eaeb",
  },
  other: {
    name: "Other parties",
    short: "Others",
    parties: "Not in either bloc",
    colour: "#d08a1c",
    heroColour: "#7a5512",
    soft: "#f7f1e2",
  },
};

export function fmt(value: number) {
  return `${value.toFixed(1)}%`;
}

const BLOCS: BlocKey[] = ["government", "opposition", "other"];

/* ------------------------------------------------------------------ */
/* Momentum: cumulative bloc share by day                              */
/* ------------------------------------------------------------------ */

export function MomentumChart({ trend, compact = false }: { trend: TrendPoint[]; compact?: boolean }) {
  // compact = phone layout: narrower canvas so text stays readable when scaled down.
  const W = compact ? 360 : 680;
  const H = compact ? 260 : 280;
  const pad = compact ? { top: 14, right: 104, bottom: 30, left: 40 } : { top: 16, right: 150, bottom: 34, left: 40 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const x = (i: number) => pad.left + (trend.length === 1 ? innerW / 2 : (i / (trend.length - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - (v / 100) * innerH;
  const dayLabel = new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", timeZone: "UTC" });
  const label = (d: string) => dayLabel.format(new Date(`${d}T00:00:00Z`));

  // Show ~5 date labels at most.
  const step = Math.max(1, Math.ceil(trend.length / (compact ? 3 : 5)));
  const last = trend[trend.length - 1];

  // Spread end labels so they never overlap (min 16px apart).
  const ends = BLOCS.map((b) => ({ bloc: b, value: last[b], y: y(last[b]) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) {
    if (ends[i].y - ends[i - 1].y < 16) ends[i].y = ends[i - 1].y + 16;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Cumulative share of reader votes by bloc over time">
      {/* Recessive grid */}
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line
            x1={pad.left}
            x2={pad.left + innerW}
            y1={y(v)}
            y2={y(v)}
            stroke={v === 50 ? "#525252" : "#ece7dc"}
            strokeWidth={v === 50 ? 1.25 : 1}
            strokeDasharray={v === 50 ? "4 4" : undefined}
          />
          <text x={pad.left - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill={v === 50 ? "#262626" : "#737373"} fontWeight={v === 50 ? 700 : 400}>
            {v}%
          </text>
        </g>
      ))}

      {/* Lines */}
      {BLOCS.map((b) => (
        <polyline
          key={b}
          fill="none"
          stroke={BLOC_META[b].colour}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={trend.map((p, i) => `${x(i)},${y(p[b])}`).join(" ")}
        />
      ))}

      {/* End markers with a surface ring, then direct labels in ink */}
      {BLOCS.map((b) => (
        <circle key={b} cx={x(trend.length - 1)} cy={y(last[b])} r={4.5} fill={BLOC_META[b].colour} stroke="#ffffff" strokeWidth={2} />
      ))}
      {ends.map((e) => (
        <g key={e.bloc}>
          <rect x={x(trend.length - 1) + 12} y={e.y - 5} width={10} height={10} rx={2} fill={BLOC_META[e.bloc].colour} />
          <text x={x(trend.length - 1) + 27} y={e.y + 4} fontSize="12" fill="#262626">
            <tspan fontWeight="700">{fmt(e.value)}</tspan> {compact ? BLOC_META[e.bloc].short.replace("Government", "Gov").replace("Opposition", "Opp") : BLOC_META[e.bloc].short}
          </text>
        </g>
      ))}

      {/* X labels */}
      {trend.map((p, i) =>
        i % step === 0 || i === trend.length - 1 ? (
          <text key={p.date} x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="#737373">
            {label(p.date)}
          </text>
        ) : null,
      )}

      {/* Hover targets: one column per day, wider than the marks */}
      {trend.map((p, i) => {
        const half = trend.length === 1 ? innerW / 2 : innerW / (trend.length - 1) / 2;
        return (
          <rect key={`hit-${p.date}`} x={x(i) - half} y={pad.top} width={half * 2} height={innerH} fill="transparent">
            <title>
              {`${label(p.date)} — Government ${fmt(p.government)} · Opposition ${fmt(p.opposition)} · Others ${fmt(p.other)}`}
            </title>
          </rect>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Electorate map: every electorate, grouped by which bloc leads it   */
/* ------------------------------------------------------------------ */

const LEAD_ORDER: Array<ElectorateLean["lead"]> = ["government", "opposition", "other", "tied", "none"];
const LEAD_LABEL: Record<ElectorateLean["lead"], string> = {
  government: "Government bloc ahead",
  opposition: "Opposition bloc ahead",
  other: "Other parties ahead",
  tied: "Tied",
  none: "No votes yet",
};

function leadSwatch(lead: ElectorateLean["lead"]) {
  if (lead === "tied") return { background: "repeating-linear-gradient(45deg,#2a63b0 0 3px,#c0303a 3px 6px)" };
  if (lead === "none") return { background: "#d4d4d4" };
  return { background: BLOC_META[lead].colour };
}

export function ElectorateMap({ electorates }: { electorates: ElectorateLean[] }) {
  const groups = LEAD_ORDER.map((lead) => ({
    lead,
    items: electorates.filter((e) => e.lead === lead).sort((a, b) => a.name.localeCompare(b.name, "en-NZ")),
  })).filter((g) => g.items.length > 0);
  const withVotes = electorates.filter((e) => e.lead !== "none").length;

  return (
    <div>
      {/* Summary strip: share of electorates (not votes) led by each bloc */}
      {withVotes > 0 && (
        <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label="Electorates by leading bloc">
          {LEAD_ORDER.filter((l) => l !== "none").map((lead) => {
            const n = electorates.filter((e) => e.lead === lead).length;
            return n > 0 ? (
              <div key={lead} title={`${LEAD_LABEL[lead]}: ${n} of ${withVotes} electorates`} style={{ flex: n, ...leadSwatch(lead) }} />
            ) : null;
          })}
        </div>
      )}

      <div className="mt-5 space-y-5">
        {groups.map((g) => (
          <div key={g.lead}>
            <p className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
              <span className="inline-block h-3 w-3 rounded-sm" style={leadSwatch(g.lead)} />
              {LEAD_LABEL[g.lead]}
              <span className="font-normal text-neutral-500">
                · {g.items.length} electorate{g.items.length === 1 ? "" : "s"}
              </span>
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {g.items.map((e) => (
                <li key={e.slug}>
                  <Link
                    href={`/electorate-spotlight/${e.slug}`}
                    title={
                      e.lead === "none"
                        ? `${e.name}: no votes yet`
                        : `${e.name}: Government ${fmt(e.govShare)} · Opposition ${fmt(e.oppShare)}`
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-800 transition hover:border-neutral-400"
                  >
                    <span className="inline-block h-2 w-2 rounded-sm" style={leadSwatch(e.lead)} />
                    {e.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Closest contests: smallest government–opposition gap               */
/* ------------------------------------------------------------------ */

export function ClosestContests({ electorates }: { electorates: ElectorateLean[] }) {
  const close = electorates
    .filter((e) => e.govShare > 0 && e.oppShare > 0)
    .map((e) => ({ ...e, gap: Math.abs(e.govShare - e.oppShare) }))
    .sort((a, b) => a.gap - b.gap || a.name.localeCompare(b.name, "en-NZ"))
    .slice(0, 6);

  if (close.length === 0) {
    return <p className="text-sm text-neutral-500">Close contests appear once electorates have votes for both blocs.</p>;
  }

  return (
    <ul className="space-y-4">
      {close.map((e) => (
        <li key={e.slug}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <Link href={`/electorate-spotlight/${e.slug}`} className="truncate font-semibold text-neutral-900 hover:underline">
              {e.name}
            </Link>
            <span className="shrink-0 text-xs text-neutral-600">
              {e.gap === 0 ? "Dead heat" : `${e.gap.toFixed(1)} pt gap`}
            </span>
          </div>
          {/* Diverging bar: government grows left from the centre, opposition right */}
          <div
            className="mt-1.5 grid grid-cols-2 gap-[2px]"
            title={`Government ${fmt(e.govShare)} · Opposition ${fmt(e.oppShare)}`}
          >
            <div className="flex h-3 justify-end rounded-l-full bg-neutral-100">
              <div className="h-full rounded-l-full" style={{ width: `${e.govShare}%`, background: BLOC_META.government.colour }} />
            </div>
            <div className="flex h-3 rounded-r-full bg-neutral-100">
              <div className="h-full rounded-r-full" style={{ width: `${e.oppShare}%`, background: BLOC_META.opposition.colour }} />
            </div>
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-neutral-600 tabular-nums">
            <span>Gov {fmt(e.govShare)}</span>
            <span>Opp {fmt(e.oppShare)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Paths to a majority                                                */
/* ------------------------------------------------------------------ */

export function PathsToMajority({ paths }: { paths: Array<{ members: Party[]; share: number }> }) {
  if (paths.length === 0) {
    return <p className="text-sm text-neutral-500">No combination of parties passes 50% yet.</p>;
  }
  return (
    <ul className="divide-y divide-black/5">
      {paths.map((path) => {
        const blocs = new Set(path.members.map((m) => m.bloc));
        const tag =
          blocs.size === 1 && blocs.has("government")
            ? "Government bloc"
            : blocs.size === 1 && blocs.has("opposition")
              ? "Opposition bloc"
              : blocs.has("government") && blocs.has("opposition")
                ? "Cross-bloc"
                : "Mixed";
        return (
          <li key={path.members.map((m) => m.key).join("+")} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
            <div className="flex flex-1 flex-wrap items-center gap-1.5">
              {path.members.map((m, i) => (
                <span key={m.key} className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
                  {i > 0 && <span className="text-neutral-400">+</span>}
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: BLOC_META[m.bloc].colour }} />
                  {m.label}
                </span>
              ))}
            </div>
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-700">{tag}</span>
            <span className="w-16 text-right text-base font-bold tabular-nums text-neutral-900">{fmt(path.share)}</span>
          </li>
        );
      })}
    </ul>
  );
}
