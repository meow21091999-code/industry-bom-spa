import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { byCompanyKey, bySlug } from '../data.js'

const TAG = { direct: 'tag--direct', indirect: 'tag--indirect', supplier: 'tag--supplier', conglomerate: 'tag--conglomerate' }

export default function Company() {
  const { key } = useParams()
  const c = byCompanyKey.get(decodeURIComponent(key))

  if (!c) return <div className="empty">No company matching “{decodeURIComponent(key)}”. <Link to="/companies">Back to the list</Link>.</div>

  return (
    <>
      <div className="eyebrow">Company</div>
      <header className="masthead">
        <h1>{c.name}</h1>
        <div className="subtitle">
          {c.ticker || 'unlisted / no ticker'} · rank {c.rank} · {c.industries_count} {c.industries_count === 1 ? 'industry' : 'industries'} · direct player in {c.direct_count} · {c.nodes_count} nodes
        </div>
      </header>

      {c.also_known_as?.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          {c.also_known_as.map((a, i) => <span className="chip" key={i}>{a}</span>)}
        </div>
      )}

      <div className="sec-head">
        <span className="sec-num">01</span>
        <span className="sec-title">Where it sits</span>
        <span className="sec-note">position in each industry</span>
      </div>

      <div className="rows">
        {c.industries.map(ind => {
          const meta = bySlug.get(ind.slug)
          return (
            <div className="row" key={ind.slug} style={{ cursor: 'default' }}>
              <div className="row__title">
                {meta ? <Link to={'/i/' + ind.slug}>{ind.name}</Link> : ind.name}
              </div>
              {ind.positions.map((p, i) => (
                <div key={i} style={{ marginTop: 8 }}>
                  <span className={'tag ' + (TAG[p.exposure] || 'tag--direct')}>{p.exposure}</span>
                  <div className="co__mat" style={{ marginTop: 6 }}>
                    {p.nodes.join(' · ')}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </>
  )
}
