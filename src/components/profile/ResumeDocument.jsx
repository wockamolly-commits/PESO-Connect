import {
  Document,
  Page,
  View,
  Text,
  Image,
  Link,
  StyleSheet,
} from '@react-pdf/renderer'

const DARK_BLUE = '#1e3a5f'
const LIGHT_BLUE_BG = '#2a4f7a'
const PILL_BG = 'rgba(255,255,255,0.15)'
const SECTION_BORDER = '#e5e7eb'
const MUTED_TEXT = '#666666'

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

  // Sidebar styles
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
  sidebarSectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
    paddingBottom: 3,
    marginBottom: 6,
    marginTop: 14,
  },
  contactItem: {
    fontSize: 9,
    marginBottom: 3,
    opacity: 0.9,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  skillPill: {
    backgroundColor: PILL_BG,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    fontSize: 8,
  },
  languageItem: {
    fontSize: 9,
    marginBottom: 2,
    opacity: 0.9,
  },

  // Main column styles
  mainSectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: DARK_BLUE,
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: SECTION_BORDER,
    paddingBottom: 3,
    marginBottom: 8,
    marginTop: 16,
  },
  mainSectionTitleFirst: {
    marginTop: 0,
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
  },
  certItem: {
    fontSize: 10,
    marginBottom: 2,
  },
  portfolioLink: {
    fontSize: 10,
    color: '#2563eb',
    textDecoration: 'none',
  },
})

function getInitials(fullName) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function SidebarSection({ title, children }) {
  return (
    <View>
      <Text style={styles.sidebarSectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function MainSection({ title, first, children }) {
  return (
    <View>
      <Text style={[styles.mainSectionTitle, first && styles.mainSectionTitleFirst]}>
        {title}
      </Text>
      {children}
    </View>
  )
}

export default function ResumeDocument({ userData }) {
  const {
    full_name,
    email,
    mobile_number,
    city,
    province,
    profile_photo,
    skills,
    languages,
    work_experiences,
    highest_education,
    school_name,
    course_or_field,
    year_graduated,
    certifications,
    portfolio_url,
  } = userData || {}

  const hasSkills = skills && skills.length > 0
  const hasLanguages = languages && languages.length > 0
  const hasExperience = work_experiences && work_experiences.length > 0
  const hasEducation = !!highest_education
  const hasCertifications = certifications && certifications.length > 0
  const hasPortfolio = !!portfolio_url

  const location = [city, province].filter(Boolean).join(', ')

  // Determine which is the first main section (for removing top margin)
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
        {/* Sidebar */}
        <View style={styles.sidebar}>
          {profile_photo ? (
            <Image src={profile_photo} style={styles.photoCircle} />
          ) : (
            <View style={styles.initialsCircle}>
              <Text style={styles.initialsText}>{getInitials(full_name)}</Text>
            </View>
          )}
          <Text style={styles.sidebarName}>{full_name || 'Name'}</Text>

          <SidebarSection title="Contact">
            {email && <Text style={styles.contactItem}>{email}</Text>}
            {mobile_number && <Text style={styles.contactItem}>{mobile_number}</Text>}
            {location && <Text style={styles.contactItem}>{location}</Text>}
          </SidebarSection>

          {hasSkills && (
            <SidebarSection title="Skills">
              <View style={styles.skillsContainer}>
                {skills.map((skill, i) => (
                  <Text key={i} style={styles.skillPill}>{skill}</Text>
                ))}
              </View>
            </SidebarSection>
          )}

          {hasLanguages && (
            <SidebarSection title="Languages">
              {languages.map((lang, i) => (
                <Text key={i} style={styles.languageItem}>
                  {lang.language}{lang.proficiency ? ` (${lang.proficiency})` : ''}
                </Text>
              ))}
            </SidebarSection>
          )}
        </View>

        {/* Main Column */}
        <View style={styles.main}>
          {hasExperience && (
            <MainSection title="Work Experience" first={isFirstMain()}>
              {work_experiences.map((exp, i) => (
                <View key={i} style={styles.experienceEntry}>
                  <Text style={styles.experiencePosition}>{exp.position || 'Position'}</Text>
                  <Text style={styles.experienceCompany}>{exp.company || 'Company'}</Text>
                  {exp.duration && (
                    <Text style={styles.experienceDuration}>{exp.duration}</Text>
                  )}
                </View>
              ))}
            </MainSection>
          )}

          {hasEducation && (
            <MainSection title="Education" first={isFirstMain()}>
              <Text style={styles.educationDegree}>
                {[highest_education, course_or_field].filter(Boolean).join(' — ')}
              </Text>
              {school_name && <Text style={styles.educationSchool}>{school_name}</Text>}
              {year_graduated && (
                <Text style={styles.educationYear}>Graduated {year_graduated}</Text>
              )}
            </MainSection>
          )}

          {hasCertifications && (
            <MainSection title="Certifications" first={isFirstMain()}>
              {certifications.map((cert, i) => (
                <Text key={i} style={styles.certItem}>{cert}</Text>
              ))}
            </MainSection>
          )}

          {hasPortfolio && (
            <MainSection title="Portfolio" first={isFirstMain()}>
              <Link src={portfolio_url} style={styles.portfolioLink}>
                {portfolio_url}
              </Link>
            </MainSection>
          )}
        </View>
      </Page>
    </Document>
  )
}
