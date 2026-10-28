import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { groups, counts, blurb, coverage } from '../data.js'

export default function Register() {
  const [q, setQ] = useState('')
  const [collapsed, setCollapsed] = useState({})

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return groups
    return groups
      .map(g => ({
        ...g,
        items: g.items.filter(i =>
          (i.title + ' ' + i.slug + ' ' + i.group + ' ' + i.digest.map(d => d.items.join(' ')).join(' '))
            .toLowerCase().includes(needle)),
      }))
      .filter(g => g.items.length)
  }, [q])

  const total = filtered.reduce((a, g) => a + g.items.length, 0)
  const toggle = name => setCollapsed(c => ({ ...c, [name]: !c[name] }))

  return (
    <>
      <header className="masthead">
        <div className="eyebrow">Sarvam · Industrial BOM &amp; Value-Chain Dissection Engine</div>
        <h1>Industry BOM Registry</h1>
        <div className="subtitle">
          {counts.industries} industries · {counts.mappings} company–node mappings · {counts.companies} companies
        </div>
      </header>

      <div className="toolbar">
        <input className="q" type="search" placeholder="Filter industries, nodes, companies…" value={q} onChange={e => setQ(e.target.value)} />
        <button className="ctrl-btn" onClick={() => setCollapsed({})}>Expand all</button>
        <button className="ctrl-btn" onClick={() => setCollapsed(Object.fromEntries(groups.map(g => [g.name, true])))}>Collapse all</button>
        <span className="sec-note">{total} shown</span>
      </div>

      {filtered.length === 0 && <div className="empty">Nothing matches “{q}”.</div>}

      {filtered.map(g => {
        const open = !collapsed[g.name]
        return (
          <section className={'group' + (open ? ' open' : '')} key={g.name}>
            <button className="group__head" onClick={() => toggle(g.name)} aria-expanded={open}>
              <span className="chev" aria-hidden="true" />
              <span className="group__name">{g.name}</span>
              <span className="group__count">{g.items.length}</span>
            </button>
            <div className="group__panel">
              <div className="rows">
                {g.items.map(ind => {
                  const cov = coverage(ind)
                  return (
                    <Link className="row" to={'/i/' + ind.slug} key={ind.slug}>
                      <div className="row__title">
                        {ind.title}<span className="row__scope">INDIA</span>
                      </div>
                      <div className="row__desc">{blurb(ind)}</div>
                      <div className="row__meta">
                        {ind.meta.slice(0, 3).map((m, i) => (
                          <span className={'chip' + (i === 0 ? ' chip--gold' : '')} key={i}>{m}</span>
                        ))}
                        <span className="chip">{ind.nodes.length} nodes</span>
                        <span className="chip">{cov.covered} mapped</span>
                        {cov.gaps > 0 && <span className="chip">{cov.gaps} gaps</span>}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </section>
        )
      })}
    </>
  )
}
