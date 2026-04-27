import {
  Document,
  Page,
  View,
  Text,
  Image,
  Link,
  StyleSheet,
} from '@react-pdf/renderer'
import { normalizeResumeData } from '../../utils/resumeExport'

const DARK_BLUE = '#1e3a5f'
const LIGHT_BLUE_BG = '#2a4f7a'
const SECTION_BORDER = '#e5e7eb'
const MUTED_TEXT = '#666666'
const ACCENT_GREEN = '#22c55e'

const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333333',
  },
  sidebar: {
    width: '35%',
    backgroundColor: DARK_BLUE,
    color: '#ffffff',
    padding: 20,
    paddingTop: 30,
  },
  main: {
    width: '65%',
    padding: 25,
    paddingTop: 30,
  },
  photoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: 'center',
    marginBottom: 10,
  },
  initialsCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: LIGHT_BLUE_BG,
    alignSelf: 'center',
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  sidebarName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  sidebarHeadline: {
    fontSize: 9,
    textAlign: 'center',
    opacity: 0.9,
    marginTop: -10,
    marginBottom: 14,
  },
  sidebarSectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    borderBottomWidth: 1,
    borderBottomColor: ACCENT_GREEN,
    paddingBottom: 3,
    marginBottom: 6,
    marginTop: 14,
  },
  sidebarLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
    marginTop: 2,
  },
  contactItem: {
    fontSize: 9,
    marginBottom: 5,
    opacity: 0.9,
  },
  skillsContainer: {
    flexDirection: 'column',
  },
  skillText: {
    fontSize: 9,
    lineHeight: 1.4,
    opacity: 0.9,
  },
  languageItem: {
    fontSize: 9,
    marginBottom: 2,
    opacity: 0.9,
  },
  mainSectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: DARK_BLUE,
    borderBottomWidth: 1,
    borderBottomColor: ACCENT_GREEN,
    paddingBottom: 3,
    marginBottom: 8,
    marginTop: 16,
  },
  mainSectionTitleFirst: {
    marginTop: 0,
  },
  bodyText: {
    fontSize: 10,
    marginBottom: 4,
    lineHeight: 1.35,
  },
  valueLine: {
    fontSize: 10,
    marginBottom: 3,
  },
  bulletItem: {
    fontSize: 9,
    color: '#333333',
    marginBottom: 2,
  },
  mutedText: {
    fontSize: 8.5,
    color: MUTED_TEXT,
    marginBottom: 2,
  },
  experienceEntry: {
    marginBottom: 8,
  },
  experiencePosition: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  experienceCompany: {
    fontSize: 10,
  },
  experienceDuration: {
    fontSize: 8,
    color: MUTED_TEXT,
    marginTop: 1,
  },
  educationDegree: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  educationSchool: {
    fontSize: 10,
  },
  educationYear: {
    fontSize: 8,
    color: MUTED_TEXT,
    marginTop: 1,
    marginBottom: 3,
  },
  subEntry: {
    marginBottom: 7,
  },
  certItem: {
    fontSize: 10,
    marginBottom: 2,
  },
  roleLine: {
    fontSize: 10,
    marginBottom: 4,
  },
  roleLabel: {
    fontFamily: 'Helvetica-Bold',
  },
  portfolioLink: {
    fontSize: 10,
    color: '#2563eb',
    textDecoration: 'none',
    marginBottom: 3,
  },
})

function getInitials(fullName) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function formatSectionTitle(title) {
  return title
    .toUpperCase()
    .split('')
    .join(' ')
}

function SidebarSection({ title, children }) {
  return (
    <View>
      <Text style={styles.sidebarSectionTitle}>{formatSectionTitle(title)}</Text>
      {children}
    </View>
  )
}

function MainSection({ title, first, children }) {
  return (
    <View>
      <Text style={[styles.mainSectionTitle, first && styles.mainSectionTitleFirst]}>
        {formatSectionTitle(title)}
      </Text>
      {children}
    </View>
  )
}

function BulletList({ items, textStyle = styles.bulletItem, prefix = '- ' }) {
  return items.map((item, index) => (
    <Text key={`${item}-${index}`} style={textStyle}>
      {prefix}{item}
    </Text>
  ))
}

function LabeledValue({ label, value, labelStyle, valueStyle }) {
  if (!value) return null
  return (
    <View>
      <Text style={labelStyle}>{label}</Text>
      <Text style={valueStyle}>{value}</Text>
    </View>
  )
}

export default function ResumeDocument({ userData }) {
  const resume = normalizeResumeData(userData)

  const hasSkills = resume.skills.length > 0
  const hasLanguages = resume.languages.length > 0
  const hasExperience = resume.workExperiences.length > 0
  const hasEducation = !!resume.education
  const hasTraining = resume.vocationalTraining.length > 0
  const hasLicenses = resume.professionalLicenses.length > 0
  const hasCertifications = resume.certifications.length > 0
  const hasPortfolio = !!resume.portfolioUrl
  const hasPreferences =
    resume.preferredJobTypes.length > 0 ||
    resume.preferredOccupations.length > 0 ||
    resume.preferredLocalLocations.length > 0 ||
    resume.preferredOverseasLocations.length > 0 ||
    resume.expectedSalaryMin ||
    resume.expectedSalaryMax ||
    resume.willingToRelocate

  const location = resume.location
  const preferredRoles = resume.preferredOccupations.slice(0, 3).join(' | ')
  const personalInfoItems = [
    { label: 'DATE OF BIRTH', value: resume.dateOfBirth },
    { label: 'SEX', value: resume.sex },
    { label: 'CIVIL STATUS', value: resume.civilStatus },
  ].filter(({ value }) => Boolean(value))
  const preferenceItems = [
    resume.preferredJobTypes.length > 0
      ? `Preferred job types: ${resume.preferredJobTypes.join(', ')}`
      : '',
    resume.preferredOccupations.length > 0
      ? `Preferred occupations: ${resume.preferredOccupations.join(', ')}`
      : '',
    resume.preferredLocalLocations.length > 0
      ? `Preferred local locations: ${resume.preferredLocalLocations.join(', ')}`
      : '',
    resume.preferredOverseasLocations.length > 0
      ? `Preferred overseas locations: ${resume.preferredOverseasLocations.join(', ')}`
      : '',
    resume.expectedSalaryMin || resume.expectedSalaryMax
      ? `Expected salary: ${[resume.expectedSalaryMin, resume.expectedSalaryMax].filter(Boolean).join(' - ')}`
      : '',
    resume.willingToRelocate
      ? `Willing to relocate: ${resume.willingToRelocate === 'yes' ? 'Yes' : 'No'}`
      : '',
  ].filter(Boolean)
  const credentialItems = [
    ...(resume.civilServiceEligibility
      ? [
          resume.civilServiceDate
            ? `Civil service eligibility: ${resume.civilServiceEligibility} (${resume.civilServiceDate})`
            : `Civil service eligibility: ${resume.civilServiceEligibility}`,
        ]
      : []),
    ...resume.certifications,
  ]

  let firstMainRendered = false
  function isFirstMain() {
    if (!firstMainRendered) {
      firstMainRendered = true
      return true
    }
    return false
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.sidebar}>
          {resume.profilePhoto ? (
            <Image src={resume.profilePhoto} style={styles.photoCircle} />
          ) : (
            <View style={styles.initialsCircle}>
              <Text style={styles.initialsText}>{getInitials(resume.fullName)}</Text>
            </View>
          )}

          <Text style={styles.sidebarName}>{resume.fullName || 'Name'}</Text>
          {preferredRoles && <Text style={styles.sidebarHeadline}>{preferredRoles}</Text>}

          {(resume.email || resume.mobileNumber || location) && (
            <SidebarSection title="Contact">
              <LabeledValue label="EMAIL" value={resume.email} labelStyle={styles.sidebarLabel} valueStyle={styles.contactItem} />
              <LabeledValue label="MOBILE" value={resume.mobileNumber} labelStyle={styles.sidebarLabel} valueStyle={styles.contactItem} />
              <LabeledValue label="ADDRESS" value={location} labelStyle={styles.sidebarLabel} valueStyle={styles.contactItem} />
            </SidebarSection>
          )}

          {personalInfoItems.length > 0 && (
            <SidebarSection title="Personal Profile">
              {personalInfoItems.map(({ label, value }) => (
                <LabeledValue
                  key={label}
                  label={label}
                  value={value}
                  labelStyle={styles.sidebarLabel}
                  valueStyle={styles.contactItem}
                />
              ))}
            </SidebarSection>
          )}

          {hasSkills && (
            <SidebarSection title="Skills">
              <View style={styles.skillsContainer}>
                <Text style={styles.skillText}>{resume.skills.join('   ')}</Text>
              </View>
            </SidebarSection>
          )}

          {hasLanguages && (
            <SidebarSection title="Languages">
              {resume.languages.map(({ language, proficiency }, index) => (
                <Text key={`${language}-${index}`} style={styles.languageItem}>
                  {proficiency ? `${language} ${proficiency}` : language}
                </Text>
              ))}
            </SidebarSection>
          )}
        </View>

        <View style={styles.main}>
          {resume.summary && (
            <MainSection title="Profile Summary" first={isFirstMain()}>
              <Text style={styles.bodyText}>{resume.summary}</Text>
            </MainSection>
          )}

          {hasExperience && (
            <MainSection title="Work Experience" first={isFirstMain()}>
              {resume.workExperiences.map((experience, index) => (
                <View key={`${experience.company}-${experience.position}-${index}`} style={styles.experienceEntry}>
                  <Text style={styles.experiencePosition}>{experience.position || 'Position'}</Text>
                  <Text style={styles.experienceCompany}>{experience.company || 'Company'}</Text>
                  {experience.duration && (
                    <Text style={styles.experienceDuration}>{experience.duration}</Text>
                  )}
                  {experience.employmentStatus && (
                    <Text style={styles.mutedText}>{experience.employmentStatus.toUpperCase()}</Text>
                  )}
                  {experience.address && (
                    <Text style={styles.mutedText}>{experience.address}</Text>
                  )}
                  {experience.description && (
                    <Text style={styles.bodyText}>{experience.description}</Text>
                  )}
                </View>
              ))}
            </MainSection>
          )}

          {hasEducation && (
            <MainSection title="Education" first={isFirstMain()}>
              <View style={styles.subEntry}>
                <Text style={styles.educationDegree}>
                  {[resume.education.highestEducation, resume.education.courseOrField].filter(Boolean).join(' — ')}
                </Text>
                {resume.education.schoolName && (
                  <Text style={styles.educationSchool}>{resume.education.schoolName}</Text>
                )}
                {resume.education.details.length > 0 && (
                  <View>
                    {resume.education.details.map((detail, index) => (
                      <Text key={`${detail}-${index}`} style={styles.educationYear}>{detail}</Text>
                    ))}
                  </View>
                )}
              </View>
            </MainSection>
          )}

          {hasTraining && (
            <MainSection title="Vocational Training" first={isFirstMain()}>
              {resume.vocationalTraining.map((training, index) => {
                const details = [
                  training.institution,
                  training.hours ? `${training.hours} hours` : '',
                  training.certificateLevel,
                  training.skillsAcquired ? `Skills acquired: ${training.skillsAcquired}` : '',
                ].filter(Boolean)

                return (
                  <View key={`${training.course}-${index}`} style={styles.subEntry}>
                    <Text style={styles.educationDegree}>{training.course || 'Training'}</Text>
                    {details.map((detail, detailIndex) => (
                      <Text key={`${detail}-${detailIndex}`} style={styles.valueLine}>{detail}</Text>
                    ))}
                  </View>
                )
              })}
            </MainSection>
          )}

          {(hasLicenses || hasCertifications) && (
            <MainSection title="Licenses and Certifications" first={isFirstMain()}>
              {hasLicenses && resume.professionalLicenses.map((license, index) => {
                const details = [
                  license.number ? `License number: ${license.number}` : '',
                  license.validUntil ? `Valid until: ${license.validUntil}` : '',
                ].filter(Boolean)

                return (
                  <View key={`${license.name}-${index}`} style={styles.subEntry}>
                    <Text style={styles.educationDegree}>{license.name || 'Professional license'}</Text>
                    {details.length > 0 && <BulletList items={details} />}
                  </View>
                )
              })}

              {credentialItems.length > 0 && (
                <View>
                  {credentialItems.map((credential, index) => (
                    <Text key={`${credential}-${index}`} style={styles.certItem}>{credential}</Text>
                  ))}
                </View>
              )}
            </MainSection>
          )}

          {(hasPreferences || hasPortfolio) && (
            <MainSection title="Career Preferences" first={isFirstMain()}>
              {resume.preferredOccupations.length > 0 && (
                <Text style={styles.roleLine}>
                  <Text style={styles.roleLabel}>TARGET ROLES </Text>
                  {resume.preferredOccupations.join(' | ')}
                </Text>
              )}
              {hasPreferences && <BulletList items={preferenceItems.filter((item) => !item.startsWith('Preferred occupations:'))} />}
              {hasPortfolio && (
                <Link src={resume.portfolioUrl} style={styles.portfolioLink}>
                  {resume.portfolioUrl}
                </Link>
              )}
            </MainSection>
          )}
        </View>
      </Page>
    </Document>
  )
}
