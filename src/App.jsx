import React from 'react'
import { Routes, Route, NavLink, Link } from 'react-router-dom'
import Register from './pages/Register.jsx'
import Industry from './pages/Industry.jsx'
import Companies from './pages/Companies.jsx'
import Company from './pages/Company.jsx'
import { counts } from './data.js'

export default function App() {
  return (
    <>
      <div className="topbar">
        <div className="topbar__in">
          <Link to="/" className="brand">Industry BOM Registry</Link>
          <nav className="nav">
            <NavLink to="/" end>Register</NavLink>
            <NavLink to="/companies">Companies</NavLink>
          </nav>
        </div>
      </div>
      <div className="container">
        <Routes>
          <Route path="/" element={<Register />} />
          <Route path="/i/:slug" element={<Industry />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/c/:key" element={<Company />} />
          <Route path="*" element={<div className="empty">Not found. <Link to="/">Back to the register</Link>.</div>} />
        </Routes>
        <div className="footnote">
          {counts.industries} industries &middot; {counts.mappings} company&ndash;node mappings &middot; {counts.companies} companies.
          Data derived from the Industry BOM Registry; every figure carries the label recorded on its entry page.
        </div>
      </div>
    </>
  )
}
