import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { bySlug, companyKey, byCompanyKey, coverage } from '../data.js'
import Diagram from '../components/Diagram.jsx'

const TAG = { direct: 'tag--direct', indirect: 'tag--indirect', supplier: 'tag--supplier', conglomerate: 'tag--conglomerate' }
const PRI = { high: 'dot--high', med: 'dot--med', medium: 'dot--med', low: 'dot--low' }

/* ---------------- metric detail popup ---------------- */
function MetricModal({ metric, onClose }) {
  if (!metric) return null
  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal__close" onClick={onClose}>close</button>
        <div className="modal__kicker">Metric detail</div>
        <div className="modal__val">{metric.val}</div>
        <div className="modal__label">{metric.label}</div>
        {metric.sub && <div className="modal__body">{metric.sub}</div>}
        <div className="modal__body" style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, opacity: .75 }}>
          Basis: as recorded on the entry page — figures keep their original data label.
        </div>
      </div>
    </div>
  )
}

/* ---------------- value-chain ladder ---------------- */
function Ladder({ rungs }) {
  return (
    <div className="ladder">
      {rungs.map((r, i) => (
        <div className={'rung rung--' + r.tier} key={i}>
          <div className="rung__label">{r.label}</div>
          <div className="rung__body">{r.body}</div>
        </div>
      ))}
    </div>
  )
}

/* ---------------- bottlenecks: risk (red) vs opportunity (green) ---------------- */
function Bottlenecks({ pairs }) {
  return (
    <div className="bn-list">
      {pairs.map((p, i) => (
        <div className="bn" key={i}>
          <div className="bn__risk">
            <div className="bn__h"><span className="flagdot flagdot--red" /> Risk</div>
            {p.risk.title && <div className="bn__title">{p.risk.title}</div>}
            <p>{p.risk.text}</p>
          </div>
          <div className="bn__opp">
            <div className="bn__h"><span className="flagdot flagdot--green" /> Opportunity</div>
            {p.opp.title && <div className="bn__title">{p.opp.title}</div>}
            <p>{p.opp.text}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------------- digest block group ---------------- */
function Digest({ items }) {
  return (
    <div className="digest">
      {items.map((d, i) => (
        <div className="digest__item" key={i}>
          <div className="digest__h">{d.h}</div>
          <ul>{d.items.map((t, j) => <li key={j}>{t}</li>)}</ul>
        </div>
      ))}
    </div>
  )
}

/* ---------------- company map ---------------- */
function CompanyMap({ nodes }) {
  const [sel, setSel] = useState(nodes[0]?.id ?? null)
  const node = nodes.find(n => n.id === sel) || nodes[0]
  if (!nodes.length) return <div className="empty">No company map on this page.</div>

  return (
    <div className="map-layout">
      <div className="map-nodes">
        {nodes.map(n => (
          <button key={n.id} className={'node-btn' + (n.id === node?.id ? ' is-active' : '')} onClick={() => setSel(n.id)}>
            <div className="node-btn__name">{n.name}</div>
            <div className="node-btn__meta">
              <span className={'dot ' + (PRI[n.pri] || 'dot--none')} />
              <span>{n.pri}</span>
              {n.bott && <span className="flag flag--bott">bottleneck</span>}
              {!n.companies.length && <span className="flag flag--gap">gap</span>}
            </div>
          </button>
        ))}
      </div>

      <aside className="map-panel">
        {node && (
          <>
            <div className="map-panel__kicker">{(node.pri || '').toUpperCase()} priority node</div>
            <div className="map-panel__title">{node.name}</div>
            <div className="map-panel__fn">{node.fn}</div>
            {node.importDep && <div className="map-panel__row"><span className="mini">Import dependence</span><span>{node.importDep}</span></div>}
            {node.conc && <div className="map-panel__row"><span className="mini">Concentration</span><span>{node.conc}</span></div>}
            {node.companies.length === 0 && (
              <div className="nocov">
                <b>NO COVERAGE IN SELECTED UNIVERSE</b>
                <span className="near">{node.near || node.gap || 'No listed player in NSE / BSE.'}</span>
              </div>
            )}
            {node.companies.map((c, i) => {
              const match = byCompanyKey.get(c.n.toLowerCase())
              return (
                <div className="co" key={i}>
                  <div className="co__name">
                    {match ? <Link to={'/c/' + encodeURIComponent(companyKey(match))}>{c.n}</Link> : c.n}
                  </div>
                  <div className="co__ticker">{c.t}</div>
                  <div className="co__tags"><span className={'tag ' + (TAG[c.e] || 'tag--direct')}>{c.e}</span></div>
                  {c.m && <div className="co__mat">{c.m}</div>}
                  {c.ev && <div className="co__ev">Basis: {c.ev}</div>}
                </div>
              )
            })}
          </>
        )}
      </aside>
    </div>
  )
}

/* ---------------- company x node matrix ---------------- */
function Matrix({ nodes }) {
  const rows = useMemo(() => {
    const m = new Map()
    for (const n of nodes) {
      for (const c of n.companies) {
        const k = c.t || c.n
        if (!m.has(k)) m.set(k, { name: c.n, ticker: c.t, cells: new Map() })
        m.get(k).cells.set(n.id, c.e)
      }
    }
    return [...m.values()].sort((a, b) => b.cells.size - a.cells.size || a.name.localeCompare(b.name))
  }, [nodes])

  const letter = e => ({ direct: 'D', indirect: 'I', supplier: 'S', conglomerate: 'C' }[e] || '—')

  return (
    <div className="table-wrap">
      <div className="table-scroll">
        <table className="data">
          <thead>
            <tr>
              <th>Company</th>
              {nodes.map(n => <th key={n.id} title={n.name}>{n.name.length > 22 ? n.name.slice(0, 21) + '…' : n.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.ticker + r.name}>
                <td><b>{r.name}</b><div className="co__ticker">{r.ticker}</div></td>
                {nodes.map(n => <td className="c" key={n.id}>{r.cells.has(n.id) ? letter(r.cells.get(n.id)) : '—'}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------------- generic table (regulatory calendar) ---------------- */
function DataTable({ rows, head }) {
  return (
    <div className="table-wrap">
      <div className="table-scroll">
        <table className="data">
          <thead><tr>{(head || ['Date / window', 'Item', 'What it does', 'Label']).map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>{r.map((c, j) => <td key={j}>{j === 3 ? <span className="chip chip--gold">{c}</span> : c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------------- page ---------------- */
export default function Industry() {
  const { slug } = useParams()
  const ind = bySlug.get(slug)
  const [metric, setMetric] = useState(null)

  if (!ind) return <div className="empty">No industry called “{slug}”. <Link to="/">Back to the register</Link>.</div>

  const cov = coverage(ind)

  return (
    <>
      <div className="eyebrow">{ind.group}</div>
      <header className="masthead">
        <h1>{ind.title}</h1>
        <div className="subtitle">
          {ind.nodes.length} nodes · {cov.covered} with mapped companies · {cov.gaps} coverage gaps · {ind.sections.length} sections
        </div>
      </header>

      <div style={{ marginBottom: 18 }}>
        {ind.meta.map((m, i) => <span className={'chip' + (i === 0 ? ' chip--gold' : '')} key={i}>{m}</span>)}
      </div>

      {ind.metrics.length > 0 && (
        <div className="metric-cards">
          {ind.metrics.map((m, i) => (
            <button className={'metric-card' + (m.gold ? ' metric-card--gold' : '')} key={i} onClick={() => setMetric(m)}>
              <div className="metric-card__val">{m.val}</div>
              <div className="metric-card__label">{m.label}</div>
              {m.sub && <div className="metric-card__sub">{m.sub}</div>}
            </button>
          ))}
        </div>
      )}

      {ind.sections.map((sec, i) => (
        <section key={i}>
          <div className="sec-head">
            <span className="sec-num">{String(i + 1).padStart(2, '0')}</span>
            <span className="sec-title">{sec.title}</span>
            {sec.note && <span className="sec-note">{sec.note}</span>}
          </div>

          {sec.source && <Diagram source={sec.source} />}
          {sec.items && <Digest items={sec.items} />}
          {sec.rungs && <Ladder rungs={sec.rungs} />}
          {sec.kind === 'map' && <CompanyMap nodes={ind.nodes} />}
          {sec.kind === 'matrix' && <Matrix nodes={ind.nodes} />}
          {sec.pairs && <Bottlenecks pairs={sec.pairs} />}
          {sec.tables && sec.tables.map((t, j) => <DataTable key={j} head={t.head} rows={t.rows} />)}
        </section>
      ))}

      <MetricModal metric={metric} onClose={() => setMetric(null)} />
    </>
  )
}
