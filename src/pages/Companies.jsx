import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { companies, companyKey, counts } from '../data.js'

const COLS = [
  { k: 'rank', label: '#', num: true },
  { k: 'name', label: 'Company' },
  { k: 'industries_count', label: 'Industries', num: true },
  { k: 'direct_count', label: 'Direct in', num: true },
  { k: 'nodes_count', label: 'Nodes', num: true },
]

export default function Companies() {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState({ k: 'rank', dir: 1 })

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const base = needle
      ? companies.filter(c => (c.name + ' ' + c.ticker + ' ' + c.industries.map(i => i.name).join(' ')).toLowerCase().includes(needle))
      : companies
    const out = [...base].sort((a, b) => {
      const k = sort.k
      if (k === 'name') return a.name.localeCompare(b.name) * sort.dir
      return ((a[k] ?? 0) - (b[k] ?? 0)) * sort.dir
    })
    return out
  }, [q, sort])

  const click = k => setSort(s => ({ k, dir: s.k === k ? -s.dir : (k === 'name' ? 1 : -1) }))

  return (
    <>
      <header className="masthead">
        <div className="eyebrow">Derived view</div>
        <h1>Company <span>master list</span></h1>
        <div className="subtitle">
          {counts.companies} companies · {counts.multi_industry} in two or more industries · ranked by breadth, then direct-player position
        </div>
      </header>

      <div className="toolbar">
        <input className="q" type="search" placeholder="Filter by company, ticker or industry…" value={q} onChange={e => setQ(e.target.value)} />
        <span className="sec-note">{rows.length} of {companies.length} shown</span>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                {COLS.map(c => (
                  <th key={c.k} onClick={() => click(c.k)}>
                    {c.label}{sort.k === c.k ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
                <th>Industries &amp; position</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <tr key={companyKey(c)}>
                  <td className="c">{c.rank}</td>
                  <td>
                    <Link to={'/c/' + encodeURIComponent(companyKey(c))}><b>{c.name}</b></Link>
                    <div className="co__ticker">{c.ticker}</div>
                  </td>
                  <td className="c">{c.industries_count}</td>
                  <td className="c">{c.direct_count}</td>
                  <td className="c">{c.nodes_count}</td>
                  <td>
                    {c.industries.slice(0, 3).map((i, j) => (
                      <span className="chip" key={j}>{i.name}</span>
                    ))}
                    {c.industries_count > 3 && <span className="chip">+{c.industries_count - 3} more</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
