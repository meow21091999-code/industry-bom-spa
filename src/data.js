import registry from '../data/registry.json'

export const industries = registry.industries
export const companies = registry.companies
export const counts = registry.counts
export const generated = registry.generated

export const bySlug = new Map(industries.map(i => [i.slug, i]))

export const companyKey = c => c.symbol || c.name.toLowerCase()
export const byCompanyKey = new Map(companies.map(c => [companyKey(c), c]))

/** industries grouped by sector, groups ordered by size then name */
export const groups = (() => {
  const m = new Map()
  for (const ind of industries) {
    const g = ind.group || 'Ungrouped'
    if (!m.has(g)) m.set(g, [])
    m.get(g).push(ind)
  }
  return [...m.entries()]
    .map(([name, items]) => ({ name, items: items.sort((a, b) => a.title.localeCompare(b.title)) }))
    .sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name))
})()

/** a short one-line description for a register row, from its Snapshot digest */
export const blurb = ind => {
  const snap = ind.digest.find(d => /snapshot/i.test(d.h))
  const text = snap?.items?.[0] || ind.digest[0]?.items?.[0] || ''
  return text.length > 190 ? text.slice(0, 187).trimEnd() + '…' : text
}

export const nodesWithCompanies = ind => ind.nodes.filter(n => n.companies.length)
export const coverage = ind => {
  const total = ind.nodes.length
  const covered = ind.nodes.filter(n => n.companies.length).length
  return { total, covered, gaps: total - covered }
}
