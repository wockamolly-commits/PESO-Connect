import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const outputPath = path.join(projectRoot, 'src', 'data', 'psgc.json')

const API_BASE = 'https://psgc.gitlab.io/api'
const CITY_OR_MUNICIPALITY_SUFFIX = /\b(city|municipality)\b/gi

function normalizeName(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bsta\b\.?/g, 'santa')
    .replace(/\bsto\b\.?/g, 'santo')
    .replace(/\bof\b/g, '')
    .replace(CITY_OR_MUNICIPALITY_SUFFIX, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function formatProvinceName(name = '') {
  return name
    .replace(/\bDel\b/g, 'del')
    .replace(/\bDe\b/g, 'de')
}

function formatLocalityName(name = '') {
  if (/^City of /i.test(name)) {
    return `${name.replace(/^City of /i, '').trim()} City`
  }

  return name
}

async function fetchJson(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

const existingData = JSON.parse(fs.readFileSync(outputPath, 'utf8'))
const existingProvinceMap = new Map(existingData.provinces.map((province) => [normalizeName(province.name), province]))
const existingLocalityProvinceMap = new Map()

existingData.provinces.forEach((province) => {
  province.municipalities.forEach((municipality) => {
    existingLocalityProvinceMap.set(normalizeName(municipality.name), province.name)
  })
})

const [apiProvinces, apiLocalities, apiBarangays] = await Promise.all([
  fetchJson('/provinces/'),
  fetchJson('/cities-municipalities/'),
  fetchJson('/barangays/')
])

const provinceCodeByNormalizedName = new Map(
  apiProvinces.map((province) => [normalizeName(formatProvinceName(province.name)), province.code])
)

const barangaysByLocalityCode = new Map()
for (const barangay of apiBarangays) {
  const localityCode = barangay.cityCode || barangay.municipalityCode || barangay.subMunicipalityCode
  if (!localityCode) continue

  if (!barangaysByLocalityCode.has(localityCode)) {
    barangaysByLocalityCode.set(localityCode, [])
  }

  barangaysByLocalityCode.get(localityCode).push(barangay.name)
}

for (const [localityCode, barangayNames] of barangaysByLocalityCode.entries()) {
  barangaysByLocalityCode.set(localityCode, [...new Set(barangayNames)].sort((a, b) => a.localeCompare(b)))
}

const provinceBuckets = new Map(existingData.provinces.map((province) => [province.name, []]))

for (const locality of apiLocalities) {
  const normalizedLocalityName = normalizeName(formatLocalityName(locality.name))
  const fallbackProvinceName = existingLocalityProvinceMap.get(normalizedLocalityName)
  const matchedApiProvinceName = locality.provinceCode
    ? existingData.provinces.find((province) => provinceCodeByNormalizedName.get(normalizeName(province.name)) === locality.provinceCode)?.name
    : null

  const provinceName = matchedApiProvinceName || fallbackProvinceName || (locality.regionCode === '130000000' ? 'Metro Manila' : null)
  if (!provinceName || !provinceBuckets.has(provinceName)) {
    continue
  }

  provinceBuckets.get(provinceName).push({
    name: formatLocalityName(locality.name),
    barangays: barangaysByLocalityCode.get(locality.code) ?? []
  })
}

const provinces = existingData.provinces.map((province) => {
  const provinceLocalities = provinceBuckets.get(province.name) ?? []
  const localitiesByName = new Map()

  provinceLocalities.forEach((locality) => {
    localitiesByName.set(normalizeName(locality.name), locality)
  })

  province.municipalities.forEach((existingMunicipality) => {
    const localityKey = normalizeName(existingMunicipality.name)
    const matchingLocality = localitiesByName.get(localityKey)

    if (!matchingLocality) {
      localitiesByName.set(localityKey, {
        name: existingMunicipality.name,
        barangays: [...existingMunicipality.barangays].sort((a, b) => a.localeCompare(b))
      })
      return
    }

    if (matchingLocality.barangays.length === 0 && existingMunicipality.barangays.length > 0) {
      matchingLocality.barangays = [...existingMunicipality.barangays].sort((a, b) => a.localeCompare(b))
    }
  })

  return {
    name: province.name,
    municipalities: Array.from(localitiesByName.values()).sort((a, b) => a.name.localeCompare(b.name))
  }
})

fs.writeFileSync(outputPath, `${JSON.stringify({ provinces }, null, 2)}\n`)

console.log(`Wrote ${provinces.length} provinces to ${outputPath}`)
console.log(`Total municipalities/cities: ${provinces.reduce((sum, province) => sum + province.municipalities.length, 0)}`)
console.log(`Total barangays: ${provinces.reduce((sum, province) => sum + province.municipalities.reduce((municipalitySum, municipality) => municipalitySum + municipality.barangays.length, 0), 0)}`)
