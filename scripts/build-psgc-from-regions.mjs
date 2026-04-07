import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const sourceFiles = [
  'scripts/psgc-regions-1-3.js',
  'scripts/psgc-regions-4a-5.js',
  'scripts/psgc-regions-6-8.js',
  'scripts/psgc-regions-9-12.js',
  'scripts/psgc-regions-13-barmm-car-ncr.js'
]

const outputPath = path.join(projectRoot, 'src', 'data', 'psgc.json')
const existingData = JSON.parse(fs.readFileSync(outputPath, 'utf8'))

const CITY_OR_MUNICIPALITY_SUFFIX = /\b(city|municipality)\b/gi

function normalizeName(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bsta\b\.?/g, 'santa')
    .replace(/\bsto\b\.?/g, 'santo')
    .replace(CITY_OR_MUNICIPALITY_SUFFIX, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function loadRegionData(relativeFilePath) {
  const absoluteFilePath = path.join(projectRoot, relativeFilePath)
  const source = fs.readFileSync(absoluteFilePath, 'utf8')
  const context = { module: { exports: [] }, exports: {} }
  vm.runInNewContext(source, context, { filename: absoluteFilePath })
  return context.module.exports
}

function choosePreferredMunicipality(currentEntry, nextEntry) {
  if (!currentEntry) return nextEntry

  const currentScore = currentEntry.barangays.length + (/\bcity\b/i.test(currentEntry.name) ? 100 : 0)
  const nextScore = nextEntry.barangays.length + (/\bcity\b/i.test(nextEntry.name) ? 100 : 0)

  return nextScore > currentScore ? nextEntry : currentEntry
}

function mergeMunicipalities(...municipalityLists) {
  const municipalityMap = new Map()

  municipalityLists
    .flat()
    .filter(Boolean)
    .forEach((municipality) => {
      const key = normalizeName(municipality.name)
      const existingMunicipality = municipalityMap.get(key)
      const mergedBarangays = Array.from(new Set([
        ...(existingMunicipality?.barangays ?? []),
        ...(municipality.barangays ?? [])
      ])).sort((a, b) => a.localeCompare(b))

      const preferredMunicipality = choosePreferredMunicipality(existingMunicipality, {
        name: municipality.name,
        barangays: mergedBarangays
      })

      municipalityMap.set(key, {
        ...preferredMunicipality,
        barangays: mergedBarangays
      })
    })

  return Array.from(municipalityMap.values()).sort((a, b) => a.name.localeCompare(b.name))
}

const provinceMap = new Map()

sourceFiles
  .map(loadRegionData)
  .flat()
  .forEach((province) => {
    const provinceKey = normalizeName(province.name)
    const existingProvince = provinceMap.get(provinceKey)

    provinceMap.set(provinceKey, {
      name: province.name,
      municipalities: mergeMunicipalities(existingProvince?.municipalities ?? [], province.municipalities ?? [])
    })
  })

existingData.provinces.forEach((province) => {
  const provinceKey = normalizeName(province.name)
  const existingProvince = provinceMap.get(provinceKey)

  provinceMap.set(provinceKey, {
    name: existingProvince?.name ?? province.name,
    municipalities: mergeMunicipalities(existingProvince?.municipalities ?? [], province.municipalities ?? [])
  })
})

const provinceOrder = [
  ...existingData.provinces.map((province) => normalizeName(province.name)),
  ...Array.from(provinceMap.keys())
]

const seenProvinceKeys = new Set()
const provinces = provinceOrder
  .filter((provinceKey) => {
    if (seenProvinceKeys.has(provinceKey)) return false
    seenProvinceKeys.add(provinceKey)
    return provinceMap.has(provinceKey)
  })
  .map((provinceKey) => provinceMap.get(provinceKey))

fs.writeFileSync(outputPath, `${JSON.stringify({ provinces }, null, 2)}\n`)

console.log(`Wrote ${provinces.length} provinces to ${outputPath}`)
console.log(`Total municipalities/cities: ${provinces.reduce((sum, province) => sum + province.municipalities.length, 0)}`)
