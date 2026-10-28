import React, { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { bySlug, companyKey, byCompanyKey, coverage } from '../data.js'

const TAG = { direct: 'tag--direct', indirect: 'tag--indirect', supplier: 'tag--supplier', conglomerate: 'tag--conglomerate' }
const PRI = { high: 'dot--high', med: 'dot--med', medium: 'dot--med', low: 'dot--low' }

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

function CompanyMap({ nodes }) {
  const [sel, setSel] = useState(nodes[0]?.id ?? null)
  const node = nodes.find(n => n.id === sel) || nodes[0]
  if (!nodes.length) return <div className="empty">No company map on this page.</div>

  return (
    <div className="map-layout">
      <div className="map-nodes">
        {nodes.map(n => (
          <button
            key={n.id}
            className={'node-btn' + (n.id === node?.id ? ' is-active' : '')}
            onClick={() => setSel(n.id)}
          >
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
              const key = byCompanyKey.get(c.n.toLowerCase()) ? companyKey(byCompanyKey.get(c.n.toLowerCase())) : null
              return (
                <div className="co" key={i}>
                  <div className="co__name">
                    {key ? <Link to={'/c/' + encodeURIComponent(key)}>{c.n}</Link> : c.n}
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
                {nodes.map(n => (
                  <td className="c" key={n.id}>{r.cells.has(n.id) ? letter(r.cells.get(n.id)) : '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

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
          {ind.nodes.length} nodes · {cov.covered} with mapped companies · {cov.gaps} coverage gaps
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

      <div className="sec-head">
        <span className="sec-num">01</span>
        <span className="sec-title">Digest</span>
        <span className="sec-note">{ind.digest.length} blocks</span>
      </div>
      <div className="digest">
        {ind.digest.map((d, i) => (
          <div className="digest__item" key={i}>
            <div className="digest__h">{d.h}</div>
            <ul>{d.items.map((t, j) => <li key={j}>{t}</li>)}</ul>
          </div>
        ))}
      </div>

      <div className="sec-head">
        <span className="sec-num">02</span>
        <span className="sec-title">BOM tree &amp; company map</span>
        <span className="sec-note">click a node → its companies</span>
      </div>
      <CompanyMap nodes={ind.nodes} />

      <div className="sec-head">
        <span className="sec-num">03</span>
        <span className="sec-title">Company × node matrix</span>
        <span className="sec-note">D direct · I indirect · S supplier · C conglomerate</span>
      </div>
      <Matrix nodes={ind.nodes} />

      <MetricModal metric={metric} onClose={() => setMetric(null)} />
    </>
  )
}
