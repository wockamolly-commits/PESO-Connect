import { describe, expect, it } from 'vitest'
import { isTechnicalJob } from './technicalRole'

describe('isTechnicalJob', () => {
  // --- Category check (A) ---
  it('returns true for exact category match (Information Technology)', () => {
    expect(isTechnicalJob({ category: 'Information Technology', title: '', required_skills: [] })).toBe(true)
  })

  it('returns true for exact category match (Software Development)', () => {
    expect(isTechnicalJob({ category: 'Software Development', title: 'Anything', required_skills: [] })).toBe(true)
  })

  it('returns false for non-technical category with no title/skill signal', () => {
    expect(isTechnicalJob({ category: 'Sales', title: 'Account Manager', required_skills: [] })).toBe(false)
  })

  // --- Title check (B) ---
  it('returns true for "React Developer" title', () => {
    expect(isTechnicalJob({ category: '', title: 'React Developer', required_skills: [] })).toBe(true)
  })

  it('returns true for "IT Support Specialist" title', () => {
    expect(isTechnicalJob({ category: '', title: 'IT Support Specialist', required_skills: [] })).toBe(true)
  })

  it('returns true for "Technical Support Representative" title', () => {
    expect(isTechnicalJob({ category: '', title: 'Technical Support Representative', required_skills: [] })).toBe(true)
  })

  it('returns true for "Software Engineer" (compound form)', () => {
    expect(isTechnicalJob({ category: '', title: 'Software Engineer', required_skills: [] })).toBe(true)
  })

  it('returns true for "Data Scientist" title', () => {
    expect(isTechnicalJob({ category: '', title: 'Data Scientist', required_skills: [] })).toBe(true)
  })

  it('returns true for "UX Designer" title', () => {
    expect(isTechnicalJob({ category: '', title: 'UX Designer', required_skills: [] })).toBe(true)
  })

  // --- Negative title cases (compound-only rule) ---
  it('returns false for "Sales Engineer" (bare engineer is NOT a trigger)', () => {
    expect(isTechnicalJob({ category: '', title: 'Sales Engineer', required_skills: [] })).toBe(false)
  })

  it('returns false for "Landscape Architect"', () => {
    expect(isTechnicalJob({ category: '', title: 'Landscape Architect', required_skills: [] })).toBe(false)
  })

  it('returns false for "Sales Representative"', () => {
    expect(isTechnicalJob({ category: '', title: 'Sales Representative', required_skills: [] })).toBe(false)
  })

  // --- Skill-content fallback (C) ---
  it('returns true when required_skills contains a programming keyword', () => {
    expect(isTechnicalJob({ category: '', title: 'Specialist', required_skills: ['Python programming', 'Git'] })).toBe(true)
  })

  it('returns true when required_skills contains "web development"', () => {
    expect(isTechnicalJob({ category: '', title: 'Specialist', required_skills: ['web development experience'] })).toBe(true)
  })

  it('returns false when only non-technical skills are listed', () => {
    expect(isTechnicalJob({ category: '', title: 'Cashier', required_skills: ['customer service', 'cash handling'] })).toBe(false)
  })

  // --- All-miss ---
  it('returns false when category, title, and skills give no signal', () => {
    expect(isTechnicalJob({ category: 'Food and Beverage', title: 'Barista', required_skills: ['coffee preparation'] })).toBe(false)
  })

  // --- Null safety ---
  it('returns false for empty job object', () => {
    expect(isTechnicalJob({})).toBe(false)
  })
})
