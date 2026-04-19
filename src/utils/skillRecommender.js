// Deterministic skill recommender for jobseeker registration (Step 5).
// Mines signals from education (Step 4), vocational training, work experience,
// and preferred occupations (Step 6) to produce ranked skill suggestions.
//
// Pure, client-side, zero API cost. No external deps.
//
// Course matching is two-layered: an exact-match table (COURSE_SKILL_MAP)
// keyed by the canonical course strings in src/data/courses.json takes
// priority. Unmatched or free-text courses fall back to COURSE_PATTERNS
// regex matching.

// Must stay in sync with PREDEFINED_SKILLS in Step5SkillsExperience.jsx
const PREDEFINED_SKILL_SET = new Set([
  'Auto Mechanic', 'Beautician', 'Carpentry Work', 'Computer Literate',
  'Domestic Chores', 'Driver', 'Electrician', 'Embroidery',
  'Gardening', 'Masonry', 'Painter/Artist', 'Painting Jobs',
  'Photography', 'Plumbing', 'Sewing/Dresses', 'Stenography',
  'Tailoring',
])

// Skill bundles reused across multiple courses
const RESEARCH_CORE = ['Research Methods', 'Academic Writing', 'Data Analysis', 'Critical Thinking']
const COMMUNICATION_CORE = ['Communication Skills', 'Report Writing', 'Presentation Skills']
const OFFICE_CORE = ['MS Office', 'MS Excel', 'Data Entry']
const TEACHING_CORE = ['Lesson Planning', 'Classroom Management', 'Communication Skills']
const LAB_CORE = ['Laboratory Testing', 'Laboratory Safety', 'Scientific Method']

// Exact-match course → skill bundle.
// Keys are matched case-insensitively after whitespace normalization.
const COURSE_SKILL_MAP = {
  // ---------- Senior High ----------
  'ABM (Accountancy, Business and Management)': {
    primary: ['Bookkeeping', 'MS Excel', 'Customer Service', 'Sales'],
    secondary: ['Communication Skills', 'Data Entry'],
    predefined: ['Computer Literate'],
  },
  'HUMSS (Humanities and Social Sciences)': {
    primary: ['Communication Skills', 'Report Writing', 'Research Methods'],
    secondary: ['MS Office', 'Critical Thinking'],
  },
  'STEM (Science, Technology, Engineering and Mathematics)': {
    primary: ['Scientific Method', 'Research Methods', 'Data Analysis', 'MS Excel'],
    secondary: ['Laboratory Safety', 'Problem Solving'],
    predefined: ['Computer Literate'],
  },
  'GAS (General Academic Strand)': {
    primary: ['Communication Skills', 'Research Methods', 'MS Office'],
    secondary: ['Report Writing', 'Critical Thinking'],
  },
  'Home Economics': {
    primary: ['Cooking', 'Food Preparation', 'Housekeeping', 'Food Safety'],
    secondary: ['Customer Service'],
    predefined: ['Domestic Chores', 'Sewing/Dresses', 'Gardening'],
  },
  'Information and Communication Technology': {
    primary: ['Computer Repair', 'Data Entry', 'Web Development', 'MS Office'],
    secondary: ['Typing Skills', 'Technical Support'],
    predefined: ['Computer Literate'],
  },
  'Industrial Arts': {
    primary: ['Carpentry', 'Welding', 'Electrical Work', 'Masonry'],
    secondary: ['Blueprint Reading'],
    predefined: ['Carpentry Work', 'Masonry', 'Electrician'],
  },
  'Agri-Fishery Arts': {
    primary: ['Farming', 'Aquaculture', 'Crop Management', 'Fishpond Management'],
    secondary: ['Soil Testing'],
    predefined: ['Gardening'],
  },
  'Sports Track': {
    primary: ['Physical Fitness Training', 'Coaching', 'First Aid'],
    secondary: ['Team Leadership'],
  },
  'Arts and Design Track': {
    primary: ['Graphic Design', 'Photography', 'Painting', 'Illustration'],
    secondary: ['Visual Communication'],
    predefined: ['Painter/Artist', 'Photography'],
  },

  // ---------- Tertiary — Humanities ----------
  'Bachelor of Arts in History': {
    primary: ['Research Methods', 'Academic Writing', 'Report Writing', 'Critical Thinking'],
    secondary: ['Communication Skills'],
  },
  'Bachelor of Arts in Philosophy': {
    primary: ['Critical Thinking', 'Academic Writing', 'Research Methods', 'Logical Reasoning'],
    secondary: ['Communication Skills'],
  },
  'Bachelor of Fine Arts Major in Industrial Design': {
    primary: ['Industrial Design', '3D Modeling', 'AutoCAD', 'Prototyping'],
    secondary: ['Graphic Design'],
  },
  'Bachelor of Fine Arts Major in Painting': {
    primary: ['Painting', 'Drawing', 'Color Theory', 'Illustration'],
    secondary: ['Art History'],
    predefined: ['Painter/Artist'],
  },
  'Bachelor of Fine Arts Major in Sculpture': {
    primary: ['Sculpting', 'Clay Modeling', 'Wood Carving', 'Metal Casting'],
    secondary: ['Drawing'],
    predefined: ['Painter/Artist'],
  },
  'Bachelor of Fine Arts Major in Visual Communication': {
    primary: ['Graphic Design', 'Illustration', 'Typography', 'Adobe Photoshop'],
    secondary: ['Photography'],
    predefined: ['Painter/Artist'],
  },

  // ---------- Tertiary — Social Sciences ----------
  'Bachelor of Arts in Economics': {
    primary: ['Economic Analysis', 'Data Analysis', 'Research Methods', 'MS Excel'],
    secondary: ['Report Writing', 'Statistics'],
  },
  'Bachelor of Science in Economics': {
    primary: ['Economic Analysis', 'Statistics', 'Data Analysis', 'MS Excel'],
    secondary: ['Research Methods', 'Report Writing'],
  },
  'Bachelor of Arts in Psychology': {
    primary: ['Counseling', 'Behavioral Assessment', 'Communication Skills', 'Research Methods'],
    secondary: ['Report Writing', 'Documentation'],
  },
  'Bachelor of Science in Psychology': {
    primary: ['Counseling', 'Behavioral Assessment', 'Psychometrics', 'Research Methods'],
    secondary: ['Report Writing', 'Statistics'],
  },
  'Bachelor of Science in Criminology': {
    primary: ['Criminal Investigation', 'Security Guard', 'Patrolling', 'Report Writing'],
    secondary: ['First Aid', 'Firearms Handling'],
  },
  'Bachelor of Arts in Political Science': {
    primary: ['Legal Research', 'Policy Analysis', 'Report Writing', 'Communication Skills'],
    secondary: ['Research Methods'],
  },
  'Bachelor of Arts in Linguistics': {
    primary: ['Linguistic Analysis', 'Translation', 'Academic Writing', 'Communication Skills'],
    secondary: ['Research Methods'],
  },
  'Bachelor of Arts in Literature': {
    primary: ['Academic Writing', 'Literary Analysis', 'Editing', 'Research Methods'],
    secondary: ['Communication Skills'],
  },
  'Bachelor of Arts in English': {
    primary: ['English Communication', 'Academic Writing', 'Editing', 'Proofreading'],
    secondary: ['Teaching'],
  },
  'Bachelor of Arts in Filipino': {
    primary: ['Filipino Language', 'Academic Writing', 'Editing', 'Translation'],
    secondary: ['Teaching'],
  },
  'Bachelor of Arts in Anthropology': {
    primary: ['Ethnographic Research', 'Research Methods', 'Report Writing', 'Field Interviews'],
    secondary: ['Communication Skills'],
  },
  'Bachelor of Arts in Sociology': {
    primary: ['Social Research', 'Research Methods', 'Report Writing', 'Data Analysis'],
    secondary: ['Communication Skills'],
  },
  'Bachelor of Science in Islamic Studies': {
    primary: ['Islamic Studies', 'Arabic Language', 'Academic Writing', 'Research Methods'],
    secondary: ['Communication Skills'],
  },

  // ---------- Tertiary — Natural Sciences ----------
  'Bachelor of Science in Environmental Science': {
    primary: ['Environmental Monitoring', 'Soil Testing', 'Laboratory Testing', 'Data Analysis'],
    secondary: ['Report Writing', 'GIS'],
  },
  'Bachelor of Science in Forestry': {
    primary: ['Environmental Monitoring', 'Soil Testing', 'Farming', 'GIS'],
    secondary: ['Field Research'],
    predefined: ['Gardening'],
  },
  'Bachelor of Science in Fisheries': {
    primary: ['Aquaculture', 'Fishpond Management', 'Marine Biology', 'Laboratory Testing'],
    secondary: ['Livestock Care'],
  },
  'Bachelor of Science in Geology': {
    primary: ['Geological Mapping', 'Soil Testing', 'Laboratory Testing', 'GIS'],
    secondary: ['Data Analysis', 'AutoCAD'],
  },
  'Bachelor of Science in Biology': {
    primary: ['Laboratory Testing', 'Specimen Handling', 'Scientific Method', 'Microscopy'],
    secondary: ['Data Analysis', 'Report Writing'],
  },
  'Bachelor of Science in Physics': {
    primary: ['Scientific Method', 'Data Analysis', 'Laboratory Testing', 'MATLAB'],
    secondary: ['Research Methods', 'MS Excel'],
  },
  'Bachelor of Science in Applied Physics': {
    primary: ['Scientific Method', 'Data Analysis', 'Instrumentation', 'MATLAB'],
    secondary: ['Laboratory Testing'],
  },
  'Bachelor of Science in Chemistry': {
    primary: ['Laboratory Testing', 'Chemical Analysis', 'Specimen Handling', 'Laboratory Safety'],
    secondary: ['Scientific Method', 'Data Analysis'],
  },
  'Bachelor of Science in Molecular Biology': {
    primary: ['Laboratory Testing', 'Microscopy', 'DNA Extraction', 'Specimen Handling'],
    secondary: ['Scientific Method'],
  },
  'Bachelor of Science in Agroforestry': {
    primary: ['Farming', 'Soil Testing', 'Environmental Monitoring', 'Crop Management'],
    secondary: ['Farm Record Keeping'],
    predefined: ['Gardening'],
  },

  // ---------- Tertiary — Formal Sciences ----------
  'Bachelor of Science in Computer Science': {
    primary: ['Programming', 'Web Development', 'Database Management', 'Debugging'],
    secondary: ['Problem Solving', 'Technical Documentation'],
    predefined: ['Computer Literate'],
  },
  'Bachelor of Science in Information Technology': {
    primary: ['Computer Repair', 'Network Setup', 'Technical Support', 'Database Management'],
    secondary: ['MS Office', 'Data Entry'],
    predefined: ['Computer Literate'],
  },
  'Bachelor of Science in Information Systems': {
    primary: ['Database Management', 'System Analysis', 'Data Entry', 'MS Office'],
    secondary: ['Technical Documentation'],
    predefined: ['Computer Literate'],
  },
  'Bachelor of Science in Mathematics': {
    primary: ['Mathematical Modeling', 'Statistics', 'Data Analysis', 'MS Excel'],
    secondary: ['MATLAB', 'Problem Solving'],
  },
  'Bachelor of Science in Applied Mathematics': {
    primary: ['Mathematical Modeling', 'Statistics', 'Data Analysis', 'MATLAB'],
    secondary: ['MS Excel'],
  },
  'Bachelor of Science in Statistics': {
    primary: ['Statistics', 'Data Analysis', 'SPSS', 'MS Excel'],
    secondary: ['Research Methods', 'Power BI'],
    predefined: ['Computer Literate'],
  },

  // ---------- Tertiary — Agriculture ----------
  'Bachelor of Science in Agriculture': {
    primary: ['Farming', 'Crop Management', 'Pest Control', 'Soil Testing'],
    secondary: ['Farm Record Keeping', 'Livestock Care'],
    predefined: ['Gardening'],
  },
  'Bachelor of Science in Agribusiness': {
    primary: ['Farm Management', 'Crop Management', 'Bookkeeping', 'MS Excel'],
    secondary: ['Sales', 'Supply Chain Management'],
    predefined: ['Gardening'],
  },

  // ---------- Tertiary — Architecture and Design ----------
  'Bachelor of Science in Architecture': {
    primary: ['AutoCAD', 'Blueprint Reading', '3D Modeling', 'Construction Estimation'],
    secondary: ['Project Management'],
  },
  'Bachelor of Science in Interior Design': {
    primary: ['Interior Design', 'AutoCAD', '3D Modeling', 'Space Planning'],
    secondary: ['Color Theory'],
  },
  'Bachelor in Landscape Architecture': {
    primary: ['Landscaping', 'AutoCAD', 'Site Planning', 'Horticulture'],
    secondary: ['Soil Testing'],
    predefined: ['Gardening'],
  },

  // ---------- Tertiary — Business ----------
  'Bachelor of Science in Accountancy': {
    primary: ['Bookkeeping', 'Financial Reporting', 'Auditing', 'MS Excel', 'Tax Preparation'],
    secondary: ['Attention to Detail', 'Data Entry'],
    predefined: ['Computer Literate'],
  },
  'Bachelor of Science in Accounting Technology': {
    primary: ['Bookkeeping', 'Financial Reporting', 'MS Excel', 'Accounting Software'],
    secondary: ['Data Entry', 'Tax Preparation'],
    predefined: ['Computer Literate'],
  },
  'Bachelor of Science in Business Administration (Business Economics)': {
    primary: ['Economic Analysis', 'MS Excel', 'Data Analysis', 'Business Analysis'],
    secondary: ['Report Writing'],
    predefined: ['Computer Literate'],
  },
  'Bachelor of Science in Business Administration (Financial Management)': {
    primary: ['Financial Reporting', 'MS Excel', 'Financial Analysis', 'Budgeting'],
    secondary: ['Bookkeeping', 'Attention to Detail'],
    predefined: ['Computer Literate'],
  },
  'Bachelor of Science in Business Administration (Human Resource Development)': {
    primary: ['Recruitment', 'Interviewing', 'Payroll', 'Employee Relations'],
    secondary: ['MS Office', 'Communication Skills'],
    predefined: ['Computer Literate'],
  },
  'Bachelor of Science in Business Administration (Marketing Management)': {
    primary: ['Sales', 'Social Media', 'Market Research', 'Customer Service'],
    secondary: ['Communication Skills', 'Content Creation'],
    predefined: ['Computer Literate'],
  },
  'Bachelor of Science in Business Administration (Operations Management)': {
    primary: ['Operations Management', 'Supply Chain Management', 'Process Improvement', 'Inventory Management'],
    secondary: ['MS Excel'],
    predefined: ['Computer Literate'],
  },
  'Bachelor of Science in Hotel and Restaurant Management': {
    primary: ['Customer Service', 'Food & Beverage Service', 'Front Desk', 'Housekeeping', 'Cooking'],
    secondary: ['Event Planning', 'Team Supervision'],
  },
  'Bachelor of Science in Entrepreneurship': {
    primary: ['Business Planning', 'Sales', 'Bookkeeping', 'Marketing'],
    secondary: ['MS Excel', 'Customer Service'],
    predefined: ['Computer Literate'],
  },
  'Bachelor of Science in Tourism Management': {
    primary: ['Customer Service', 'Tour Coordination', 'Front Desk', 'Event Planning'],
    secondary: ['Communication Skills', 'Travel Booking'],
    predefined: ['Computer Literate'],
  },
  'Bachelor of Science in Real Estate Management': {
    primary: ['Real Estate Sales', 'Property Appraisal', 'Customer Service', 'Contract Drafting'],
    secondary: ['MS Office'],
    predefined: ['Computer Literate'],
  },

  // ---------- Tertiary — Health Sciences ----------
  'Bachelor of Science in Nursing': {
    primary: ['Patient Care', 'Clinical Assessment', 'Medication Administration', 'First Aid', 'Medical Records'],
    secondary: ['Health Education', 'Documentation', 'Communication Skills'],
  },
  'Bachelor of Science in Physical Therapy': {
    primary: ['Physical Therapy', 'Patient Care', 'Rehabilitation', 'Anatomy Knowledge'],
    secondary: ['Documentation'],
  },
  'Bachelor of Science in Occupational Therapy': {
    primary: ['Occupational Therapy', 'Patient Care', 'Rehabilitation', 'Assistive Technology'],
    secondary: ['Documentation'],
  },
  'Bachelor of Science in Pharmacy': {
    primary: ['Pharmacology', 'Medication Administration', 'Inventory Management', 'Laboratory Testing'],
    secondary: ['Customer Service'],
  },
  'Bachelor of Science in Midwifery': {
    primary: ['Patient Care', 'Prenatal Care', 'Neonatal Care', 'First Aid'],
    secondary: ['Health Education', 'Documentation'],
  },
  'Bachelor of Science in Medical Technology': {
    primary: ['Laboratory Testing', 'Specimen Handling', 'Microscopy', 'Clinical Assessment'],
    secondary: ['Medical Records', 'Laboratory Safety'],
  },
  'Bachelor of Science in Radiologic Technology': {
    primary: ['Radiologic Imaging', 'Patient Care', 'Radiation Safety', 'Medical Records'],
    secondary: ['Clinical Assessment'],
  },
  'Bachelor of Science in Respiratory Therapy': {
    primary: ['Respiratory Therapy', 'Patient Care', 'First Aid', 'Ventilator Operation'],
    secondary: ['Clinical Assessment'],
  },
  'Bachelor of Science in Speech-Language Pathology': {
    primary: ['Speech Therapy', 'Patient Care', 'Communication Skills', 'Documentation'],
    secondary: ['Assistive Technology'],
  },

  // ---------- Tertiary — Education ----------
  'Bachelor in Secondary Education': {
    primary: TEACHING_CORE,
    secondary: ['MS Office', 'Curriculum Development'],
  },
  'Bachelor in Elementary Education': {
    primary: TEACHING_CORE,
    secondary: ['MS Office', 'Child Development'],
  },
  'Bachelor in Secondary Education (Technology and Livelihood Education)': {
    primary: [...TEACHING_CORE, 'Cooking', 'Computer Repair'],
    secondary: ['MS Office'],
    predefined: ['Domestic Chores'],
  },
  'Bachelor in Secondary Education (Biological Sciences)': {
    primary: [...TEACHING_CORE, 'Laboratory Safety'],
    secondary: ['Laboratory Testing', 'Scientific Method'],
  },
  'Bachelor in Secondary Education (English)': {
    primary: [...TEACHING_CORE, 'English Communication'],
    secondary: ['Academic Writing', 'Editing'],
  },
  'Bachelor in Secondary Education (Filipino)': {
    primary: [...TEACHING_CORE, 'Filipino Language'],
    secondary: ['Academic Writing'],
  },
  'Bachelor in Secondary Education (Mathematics)': {
    primary: [...TEACHING_CORE, 'Mathematics Instruction'],
    secondary: ['Statistics', 'MS Excel'],
  },
  'Bachelor in Secondary Education (Islamic Studies)': {
    primary: [...TEACHING_CORE, 'Islamic Studies', 'Arabic Language'],
    secondary: ['Academic Writing'],
  },
  'Bachelor in Secondary Education (MAPEH)': {
    primary: [...TEACHING_CORE, 'Physical Fitness Training', 'Music Instruction', 'Arts Instruction'],
    secondary: ['First Aid'],
  },
  'Bachelor in Secondary Education (Physical Sciences)': {
    primary: [...TEACHING_CORE, 'Laboratory Safety', 'Scientific Method'],
    secondary: ['Laboratory Testing'],
  },
  'Bachelor in Secondary Education (Social Studies)': {
    primary: [...TEACHING_CORE, 'Research Methods'],
    secondary: ['Academic Writing', 'Report Writing'],
  },
  'Bachelor in Secondary Education (Values Education)': {
    primary: [...TEACHING_CORE, 'Counseling'],
    secondary: ['Communication Skills'],
  },
  'Bachelor in Elementary Education (Preschool Education)': {
    primary: [...TEACHING_CORE, 'Early Childhood Education', 'Child Development'],
    secondary: ['First Aid'],
  },
  'Bachelor in Elementary Education (Special Education)': {
    primary: [...TEACHING_CORE, 'Special Education', 'Assistive Technology'],
    secondary: ['Patient Care'],
  },
  'Bachelor of Library and Information Science': {
    primary: ['Cataloging', 'Information Management', 'Database Management', 'Research Methods'],
    secondary: ['MS Office'],
    predefined: ['Computer Literate'],
  },
  'Bachelor of Physical Education': {
    primary: ['Physical Fitness Training', 'Coaching', 'Lesson Planning', 'First Aid'],
    secondary: ['Team Leadership'],
  },
  'Bachelor of Sports Science': {
    primary: ['Physical Fitness Training', 'Sports Nutrition', 'Exercise Physiology', 'First Aid'],
    secondary: ['Coaching'],
  },

  // ---------- Tertiary — Engineering ----------
  'Bachelor of Science in Aeronautical Engineering': {
    primary: ['Aircraft Maintenance', 'AutoCAD', 'Aerodynamics', 'Blueprint Reading'],
    secondary: ['Mechanical Maintenance'],
  },
  'Bachelor of Science in Chemical Engineering': {
    primary: ['Chemical Process Control', 'Laboratory Testing', 'Quality Assurance', 'Laboratory Safety'],
    secondary: ['MS Excel', 'Problem Solving'],
  },
  'Bachelor of Science in Ceramic Engineering': {
    primary: ['Materials Testing', 'Laboratory Testing', 'Quality Assurance', 'Kiln Operation'],
    secondary: ['AutoCAD'],
  },
  'Bachelor of Science in Civil Engineering': {
    primary: ['Blueprint Reading', 'Construction Estimation', 'Site Supervision', 'AutoCAD'],
    secondary: ['Project Management', 'Structural Analysis'],
  },
  'Bachelor of Science in Electrical Engineering': {
    primary: ['Electrical Installation', 'Electrical Wiring', 'Circuit Analysis', 'AutoCAD Electrical'],
    secondary: ['Electrical Safety'],
    predefined: ['Electrician'],
  },
  'Bachelor of Science in Electronics and Communications Engineering': {
    primary: ['Circuit Analysis', 'Electronics Troubleshooting', 'PCB Design', 'Telecommunications'],
    secondary: ['AutoCAD Electrical'],
  },
  'Bachelor of Science in Geodetic Engineering': {
    primary: ['Land Surveying', 'GIS', 'AutoCAD', 'Total Station Operation'],
    secondary: ['Mapping'],
  },
  'Bachelor of Science in Geological Engineering': {
    primary: ['Geological Mapping', 'Soil Testing', 'GIS', 'AutoCAD'],
    secondary: ['Laboratory Testing'],
  },
  'Bachelor of Science in Industrial Engineering': {
    primary: ['Process Improvement', 'Project Management', 'Quality Assurance', 'Operations Research'],
    secondary: ['MS Excel', 'Time and Motion Study'],
    predefined: ['Computer Literate'],
  },
  'Bachelor of Science in Marine Engineering': {
    primary: ['Marine Machinery Operation', 'Mechanical Maintenance', 'Welding', 'Ship Systems'],
    secondary: ['Blueprint Reading'],
  },
  'Bachelor of Science in Materials Engineering': {
    primary: ['Materials Testing', 'Laboratory Testing', 'Quality Assurance', 'Metallurgy'],
    secondary: ['AutoCAD'],
  },
  'Bachelor of Science in Mechanical Engineering': {
    primary: ['Mechanical Maintenance', 'HVAC', 'Welding', 'Blueprint Reading'],
    secondary: ['AutoCAD', 'Thermodynamics'],
  },
  'Bachelor of Science in Metallurgical Engineering': {
    primary: ['Metallurgy', 'Materials Testing', 'Laboratory Testing', 'Welding'],
    secondary: ['Quality Assurance'],
  },
  'Bachelor of Science in Mining Engineering': {
    primary: ['Mine Planning', 'Geological Mapping', 'Blasting Operations', 'Mine Safety'],
    secondary: ['AutoCAD'],
  },
  'Bachelor of Science in Sanitary Engineering': {
    primary: ['Water Treatment', 'Waste Management', 'Plumbing', 'AutoCAD'],
    secondary: ['Environmental Monitoring'],
    predefined: ['Plumbing'],
  },
  'Bachelor of Science in Computer Engineering': {
    primary: ['Programming', 'Embedded Systems', 'Circuit Analysis', 'Network Setup'],
    secondary: ['Debugging', 'Database Management'],
    predefined: ['Computer Literate'],
  },
  'Bachelor of Science in Agricultural Engineering': {
    primary: ['Farm Machinery Operation', 'Irrigation Systems', 'AutoCAD', 'Soil Testing'],
    secondary: ['Crop Management'],
    predefined: ['Gardening'],
  },
  'Bachelor of Science in Petroleum Engineering': {
    primary: ['Petroleum Operations', 'Geological Mapping', 'Drilling Operations', 'AutoCAD'],
    secondary: ['Laboratory Testing'],
  },

  // ---------- Tertiary — Media and Communication ----------
  'Bachelor of Science in Development Communication': {
    primary: ['Communication Skills', 'Content Creation', 'Social Media', 'Report Writing'],
    secondary: ['Community Outreach'],
  },
  'Bachelor of Arts in Journalism': {
    primary: ['Report Writing', 'News Writing', 'Interviewing', 'Editing'],
    secondary: ['Photography', 'Social Media'],
    predefined: ['Photography'],
  },
  'Bachelor of Arts in Communication': {
    primary: ['Communication Skills', 'Report Writing', 'Social Media', 'Content Creation'],
    secondary: ['Public Speaking'],
  },
  'Bachelor of Arts in Broadcasting': {
    primary: ['Broadcast Production', 'Video Editing', 'Scriptwriting', 'Public Speaking'],
    secondary: ['Audio Engineering'],
    predefined: ['Photography'],
  },

  // ---------- Tertiary — Public Administration ----------
  'Bachelor of Science in Customs Administration': {
    primary: ['Customs Regulations', 'Documentation', 'Logistics', 'MS Office'],
    secondary: ['Attention to Detail'],
    predefined: ['Computer Literate'],
  },
  'Bachelor of Science in Community Development': {
    primary: ['Community Outreach', 'Project Management', 'Communication Skills', 'Report Writing'],
    secondary: ['Counseling'],
  },
  'Bachelor of Science in Foreign Service': {
    primary: ['Diplomacy', 'Communication Skills', 'Foreign Languages', 'Report Writing'],
    secondary: ['Policy Analysis'],
  },
  'Bachelor of Arts in International Studies': {
    primary: ['International Relations', 'Research Methods', 'Foreign Languages', 'Report Writing'],
    secondary: ['Communication Skills'],
  },
  'Bachelor of Public Administration': {
    primary: ['Policy Analysis', 'Project Management', 'MS Office', 'Report Writing'],
    secondary: ['Communication Skills'],
    predefined: ['Computer Literate'],
  },
  'Bachelor of Science in Social Work': {
    primary: ['Counseling', 'Case Management', 'Communication Skills', 'Report Writing'],
    secondary: ['Documentation'],
  },
  'Bachelor of Science in Public Safety': {
    primary: ['Emergency Response', 'First Aid', 'Security Guard', 'Report Writing'],
    secondary: ['Patrolling'],
  },

  // ---------- Tertiary — Transportation ----------
  'Bachelor of Science in Marine Transportation': {
    primary: ['Navigation', 'Ship Operations', 'Maritime Safety', 'First Aid'],
    secondary: ['Communication Skills'],
  },

  // ---------- Tertiary — Family and Consumer Science ----------
  'Bachelor of Science in Nutrition and Dietetics': {
    primary: ['Nutrition Planning', 'Food Safety', 'Dietary Counseling', 'Menu Planning'],
    secondary: ['Food Preparation', 'Documentation'],
  },

  // ---------- Tertiary — Criminal Justice ----------
  'Bachelor of Science in Forensic Science': {
    primary: ['Forensic Analysis', 'Laboratory Testing', 'Specimen Handling', 'Documentation'],
    secondary: ['Criminal Investigation'],
  },

  // ---------- Graduate ----------
  'Master of Arts (MA)': {
    primary: RESEARCH_CORE,
    secondary: COMMUNICATION_CORE,
  },
  'Master of Science (MS)': {
    primary: [...RESEARCH_CORE, 'Scientific Method'],
    secondary: ['Report Writing', 'Statistics'],
  },
  'Master of Business Administration (MBA)': {
    primary: ['Project Management', 'Business Analysis', 'Leadership', 'MS Excel'],
    secondary: ['Financial Analysis', 'Strategic Planning', 'Team Supervision'],
    predefined: ['Computer Literate'],
  },
  'Master in Public Administration (MPA)': {
    primary: ['Policy Analysis', 'Project Management', 'Leadership', 'Report Writing'],
    secondary: ['Communication Skills'],
    predefined: ['Computer Literate'],
  },
  'Master of Education (MEd)': {
    primary: ['Curriculum Development', 'Lesson Planning', 'Education Research', 'Classroom Management'],
    secondary: ['Communication Skills'],
  },
  'Master of Engineering (MEng)': {
    primary: ['Project Management', 'Engineering Design', 'Research Methods', 'Technical Documentation'],
    secondary: ['AutoCAD'],
  },
  'Doctor of Philosophy (PhD)': {
    primary: [...RESEARCH_CORE, 'Academic Publishing'],
    secondary: ['Teaching', 'Grant Writing'],
  },
  'Doctor of Education (EdD)': {
    primary: ['Education Research', 'Curriculum Development', 'Academic Writing', 'Leadership'],
    secondary: ['Lesson Planning'],
  },
  'Doctor of Medicine (MD)': {
    primary: ['Patient Care', 'Clinical Assessment', 'Medical Records', 'Medical Terminology', 'Diagnosis'],
    secondary: ['First Aid', 'Health Education'],
  },
  'Doctor of Juridical Science (JSD)': {
    primary: ['Legal Research', 'Academic Writing', 'Legal Analysis', 'Report Writing'],
    secondary: ['Communication Skills'],
  },

  // ---------- Tertiary — Business (additions) ----------
  'Bachelor of Science in Finance': {
    primary: ['Financial Analysis', 'Financial Reporting', 'MS Excel', 'Investment Analysis', 'Budgeting'],
    secondary: ['Risk Assessment', 'Bookkeeping'],
    predefined: ['Computer Literate'],
  },
  'Bachelor of Science in Marketing': {
    primary: ['Market Research', 'Sales', 'Social Media', 'Content Creation', 'Brand Management'],
    secondary: ['Customer Service', 'Communication Skills'],
    predefined: ['Computer Literate'],
  },
  'Bachelor of Science in Management Accounting': {
    primary: ['Bookkeeping', 'Cost Accounting', 'Financial Reporting', 'MS Excel', 'Budgeting'],
    secondary: ['Attention to Detail', 'Tax Preparation'],
    predefined: ['Computer Literate'],
  },
  'Bachelor of Science in Internal Auditing': {
    primary: ['Auditing', 'Risk Assessment', 'Internal Controls', 'Financial Reporting', 'MS Excel'],
    secondary: ['Attention to Detail', 'Report Writing'],
    predefined: ['Computer Literate'],
  },
  'Bachelor of Science in Office Administration': {
    primary: ['Office Administration', 'MS Office', 'Data Entry', 'Records Management', 'Filing'],
    secondary: ['Typing Skills', 'Scheduling'],
    predefined: ['Computer Literate', 'Stenography'],
  },
  'Bachelor of Science in E-Commerce': {
    primary: ['Online Selling', 'Digital Marketing', 'Social Media', 'E-Commerce Platforms', 'Customer Service'],
    secondary: ['Content Creation', 'MS Excel'],
    predefined: ['Computer Literate'],
  },

  // ---------- Tertiary — Tech & Engineering (additions) ----------
  'Bachelor of Science in Data Science': {
    primary: ['Data Analysis', 'Python', 'SQL', 'Statistics', 'Machine Learning'],
    secondary: ['Power BI', 'Problem Solving'],
    predefined: ['Computer Literate'],
  },
  'Bachelor of Science in Entertainment and Multimedia Computing': {
    primary: ['Game Development', 'Animation', '3D Modeling', 'Programming', 'Digital Illustration'],
    secondary: ['Graphic Design', 'Video Editing'],
    predefined: ['Computer Literate'],
  },
  'Bachelor of Science in Software Engineering': {
    primary: ['Programming', 'Software Development', 'Debugging', 'Database Management', 'Version Control (Git)'],
    secondary: ['QA Testing', 'Technical Documentation'],
    predefined: ['Computer Literate'],
  },
  'Bachelor of Science in Mechatronics Engineering': {
    primary: ['Robotics', 'PLC Programming', 'Electronics Troubleshooting', 'Embedded Systems', 'AutoCAD'],
    secondary: ['Mechanical Maintenance', 'Sensor Integration'],
    predefined: ['Computer Literate'],
  },
  'Bachelor of Science in Manufacturing Engineering': {
    primary: ['Production Planning', 'Quality Assurance', 'Process Improvement', 'CNC Operation', 'Lean Manufacturing'],
    secondary: ['AutoCAD', 'Inventory Management'],
  },
  'Bachelor of Science in Packaging Engineering': {
    primary: ['Packaging Design', 'Materials Testing', 'Quality Assurance', 'AutoCAD', 'Production Planning'],
    secondary: ['Supply Chain Management'],
  },

  // ---------- Tertiary — Medicine (additions) ----------
  'Doctor of Dental Medicine (DMD)': {
    primary: ['Patient Care', 'Dental Assisting', 'Sterilization', 'Dental Charting', 'Oral Examination'],
    secondary: ['Medical Records', 'First Aid'],
  },
  'Doctor of Optometry (OD)': {
    primary: ['Eye Examination', 'Visual Acuity Testing', 'Patient Care', 'Contact Lens Fitting', 'Refraction'],
    secondary: ['Medical Records', 'Customer Service'],
  },
  'Doctor of Veterinary Medicine (DVM)': {
    primary: ['Animal Care', 'Animal Husbandry', 'Veterinary Assistance', 'Vaccination', 'Livestock Care'],
    secondary: ['Surgery Assistance', 'Medical Records'],
  },
  'Bachelor of Science in Public Health': {
    primary: ['Health Education', 'Community Outreach', 'Epidemiology', 'Health Program Planning', 'Data Analysis'],
    secondary: ['Report Writing', 'Policy Analysis'],
  },

  // ---------- Tertiary — Education (additions) ----------
  'Bachelor of Early Childhood Education': {
    primary: [...TEACHING_CORE, 'Early Childhood Education', 'Child Development', 'Storytelling'],
    secondary: ['First Aid', 'Parent Communication'],
  },
  'Bachelor of Special Needs Education': {
    primary: [...TEACHING_CORE, 'Special Education', 'Assistive Technology', 'Individualized Education Plans'],
    secondary: ['Behavioral Assessment', 'Patient Care'],
  },
  'Bachelor of Technology and Livelihood Education': {
    primary: [...TEACHING_CORE, 'Cooking', 'Sewing', 'Computer Repair', 'Entrepreneurship'],
    secondary: ['Food Safety'],
    predefined: ['Domestic Chores', 'Sewing/Dresses'],
  },
  'Bachelor of Technical-Vocational Teacher Education': {
    primary: [...TEACHING_CORE, 'Vocational Training', 'Curriculum Development', 'Skills Assessment'],
    secondary: ['Training Facilitation', 'Safety Practices'],
  },

  // ---------- Tertiary — Law (additions) ----------
  'Juris Doctor (JD)': {
    primary: ['Legal Research', 'Legal Writing', 'Case Analysis', 'Litigation Support', 'Contract Drafting'],
    secondary: ['Communication Skills', 'Documentation'],
  },
  'Bachelor of Laws (LLB)': {
    primary: ['Legal Research', 'Legal Writing', 'Case Analysis', 'Documentation'],
    secondary: ['Communication Skills', 'Contract Drafting'],
  },
  'Bachelor of Science in Legal Management': {
    primary: ['Legal Documentation', 'Paralegal Support', 'Case Filing', 'MS Office', 'Contract Review'],
    secondary: ['Communication Skills', 'Records Management'],
    predefined: ['Computer Literate'],
  },
  'Bachelor of Science in Law Enforcement Administration': {
    primary: ['Patrolling', 'Criminal Investigation', 'Report Writing', 'Emergency Response', 'Firearms Handling'],
    secondary: ['First Aid', 'Community Policing'],
  },
  'Bachelor of Science in Industrial Security Management': {
    primary: ['Security Operations', 'Risk Assessment', 'CCTV Monitoring', 'Patrolling', 'Incident Reporting'],
    secondary: ['First Aid', 'Emergency Response'],
  },

  // ---------- Tertiary — Aviation (additions) ----------
  'Bachelor of Science in Aviation': {
    primary: ['Flight Operations', 'Aviation Safety', 'Navigation', 'Aircraft Systems', 'Meteorology'],
    secondary: ['Radio Communication', 'First Aid'],
  },
  'Bachelor of Science in Aircraft Maintenance Technology': {
    primary: ['Aircraft Maintenance', 'Aviation Safety', 'Blueprint Reading', 'Mechanical Maintenance', 'Non-Destructive Testing'],
    secondary: ['Electronics Troubleshooting', 'Technical Documentation'],
  },
  'Bachelor of Science in Aerospace Engineering': {
    primary: ['Aerodynamics', 'Aircraft Systems', 'AutoCAD', 'Aircraft Maintenance', 'CFD Analysis'],
    secondary: ['Blueprint Reading', 'Materials Testing'],
  },

  // ---------- Tertiary — Arts (additions) ----------
  'Bachelor of Arts in Multimedia Arts': {
    primary: ['Graphic Design', 'Animation', 'Video Editing', 'Digital Illustration', 'Motion Graphics'],
    secondary: ['Photography', 'Adobe Photoshop'],
    predefined: ['Painter/Artist', 'Photography'],
  },
}

// Case-insensitive, whitespace-normalized lookup index
const COURSE_SKILL_LOOKUP = new Map(
  Object.entries(COURSE_SKILL_MAP).map(([k, v]) => [normalizeKey(k), v])
)

function normalizeKey(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

// Course keyword → skills (fallback for free-text / unmatched courses).
// Checked against `course_or_field` text (case-insensitive).
// Ordered most-specific → least-specific; multiple patterns can match and their skills merge.
const COURSE_PATTERNS = [
  // Health — specific first so medtech/radtech don't collide with generic medicine
  { pattern: /nursing|\bnurse\b/i, primary: ['Patient Care', 'Clinical Assessment', 'Medication Administration', 'First Aid', 'Medical Records'], secondary: ['Health Education', 'Documentation', 'Communication Skills'], predefined: ['Computer Literate'] },
  { pattern: /midwif/i, primary: ['Patient Care', 'Prenatal Care', 'Neonatal Care', 'First Aid'], secondary: ['Health Education', 'Documentation'] },
  { pattern: /pharma/i, primary: ['Pharmacology', 'Medication Administration', 'Inventory Management'], secondary: ['Customer Service'] },
  { pattern: /dent/i, primary: ['Patient Care', 'Dental Assisting', 'Sterilization'], secondary: ['Medical Records'] },
  { pattern: /medical\s*tech|medtech|radiolog|radiologic|laborator/i, primary: ['Laboratory Testing', 'Specimen Handling', 'Microscopy', 'Clinical Assessment'], secondary: ['Medical Records', 'Laboratory Safety'] },
  { pattern: /physical\s*therap|physio/i, primary: ['Physical Therapy', 'Patient Care', 'Rehabilitation'], secondary: ['Anatomy Knowledge'] },
  { pattern: /occupational\s*therap/i, primary: ['Occupational Therapy', 'Patient Care', 'Rehabilitation'], secondary: ['Assistive Technology'] },
  { pattern: /respiratory\s*therap/i, primary: ['Respiratory Therapy', 'Patient Care', 'First Aid'], secondary: ['Ventilator Operation'] },
  { pattern: /speech\s*(?:language|pathology|therap)/i, primary: ['Speech Therapy', 'Patient Care', 'Communication Skills'], secondary: ['Documentation'] },
  { pattern: /nutrition|dietet/i, primary: ['Nutrition Planning', 'Food Safety', 'Menu Planning'], secondary: ['Food Preparation'] },
  { pattern: /caregiv/i, primary: ['Patient Care', 'First Aid', 'Domestic Chores'], secondary: ['Cooking'], predefined: ['Domestic Chores'] },
  // "medicine" / "physician" — generic clinical, AFTER medtech so medtech wins on conflict
  { pattern: /\bmedicine\b|physician|surgeon|\bmd\b/i, primary: ['Patient Care', 'Clinical Assessment', 'Medical Records', 'Medical Terminology'], secondary: ['First Aid', 'Health Education'] },

  // Computing
  { pattern: /comput(?:er|ing)\s*sci|computer\s*engineer|software/i, primary: ['Programming', 'Web Development', 'Database Management', 'Debugging'], secondary: ['Problem Solving', 'Technical Documentation'], predefined: ['Computer Literate'] },
  { pattern: /information\s*tech|\bbsit\b|\bi\.?t\.?\b/i, primary: ['Computer Repair', 'Network Setup', 'Technical Support', 'Database Management'], secondary: ['MS Office', 'Data Entry'], predefined: ['Computer Literate'] },
  { pattern: /information\s*system/i, primary: ['Database Management', 'System Analysis', 'Data Entry', 'MS Office'], secondary: ['Technical Documentation'], predefined: ['Computer Literate'] },
  { pattern: /data\s*sci|data\s*analyt/i, primary: ['Data Analysis', 'SQL', 'Python', 'Power BI'], secondary: ['Problem Solving'], predefined: ['Computer Literate'] },

  // Business — specific first, then narrowed generic
  { pattern: /hotel|\bhrm\b|restaurant\s*management|tourism|hospitality/i, primary: ['Customer Service', 'Food & Beverage Service', 'Front Desk', 'Housekeeping', 'Cooking'], secondary: ['Event Planning'] },
  { pattern: /real\s*estate/i, primary: ['Real Estate Sales', 'Property Appraisal', 'Customer Service'], secondary: ['MS Office'] },
  { pattern: /accountan|\bbsa\b|accounting/i, primary: ['Bookkeeping', 'Financial Reporting', 'Auditing', 'MS Excel', 'Tax Preparation'], secondary: ['Attention to Detail', 'Data Entry'], predefined: ['Computer Literate'] },
  { pattern: /marketing/i, primary: ['Sales', 'Customer Service', 'Social Media', 'Market Research'], secondary: ['Communication Skills'] },
  { pattern: /finance|banking|financial\s*management/i, primary: ['Financial Reporting', 'MS Excel', 'Cash Handling', 'Bookkeeping'], secondary: ['Attention to Detail'] },
  { pattern: /human\s*resource|\bhrdm?\b/i, primary: ['Recruitment', 'Interviewing', 'Payroll', 'Employee Relations'], secondary: ['MS Office'] },
  { pattern: /entrepreneur|business\s*planning/i, primary: ['Business Planning', 'Sales', 'Bookkeeping', 'Marketing'], secondary: ['MS Excel'], predefined: ['Computer Literate'] },
  { pattern: /business\s*admin|\bbsba\b|operations\s*management/i, primary: ['Project Management', 'MS Office', 'Customer Service', 'Sales'], secondary: ['Communication Skills', 'Team Supervision'], predefined: ['Computer Literate'] },

  // Engineering — specific first
  { pattern: /engineer.*(civil|structur|sanitary)/i, primary: ['Blueprint Reading', 'Construction Estimation', 'Site Supervision', 'AutoCAD'], secondary: ['Project Management'] },
  { pattern: /engineer.*(electric(?!.*electronic)|\bee\b)/i, primary: ['Electrical Installation', 'Electrical Wiring', 'Circuit Analysis'], secondary: ['AutoCAD Electrical', 'Electrical Safety'], predefined: ['Electrician'] },
  { pattern: /engineer.*(electronic|ece|communications)/i, primary: ['Circuit Analysis', 'Electronics Troubleshooting', 'PCB Design'], secondary: ['AutoCAD Electrical'] },
  { pattern: /engineer.*(industrial|\bie\b)/i, primary: ['Process Improvement', 'Project Management', 'Quality Assurance'], secondary: ['MS Excel'] },
  { pattern: /engineer.*(chemical|\bche\b)/i, primary: ['Chemical Process Control', 'Laboratory Testing', 'Quality Assurance'], secondary: ['Laboratory Safety'] },
  { pattern: /engineer.*(mining|geolog|geodetic)/i, primary: ['Geological Mapping', 'GIS', 'AutoCAD'], secondary: ['Laboratory Testing'] },
  { pattern: /engineer.*(aeronaut|aerospace)/i, primary: ['Aircraft Maintenance', 'Aerodynamics', 'AutoCAD'], secondary: ['Blueprint Reading'] },
  { pattern: /engineer.*(marine)/i, primary: ['Marine Machinery Operation', 'Mechanical Maintenance', 'Welding'], secondary: ['Blueprint Reading'] },
  { pattern: /engineer.*(material|metallurg|ceramic)/i, primary: ['Materials Testing', 'Laboratory Testing', 'Quality Assurance'], secondary: ['Metallurgy'] },
  { pattern: /engineer.*(petroleum)/i, primary: ['Petroleum Operations', 'Drilling Operations', 'Geological Mapping'] },
  { pattern: /engineer.*(agricultur)/i, primary: ['Farm Machinery Operation', 'Irrigation Systems', 'AutoCAD'], secondary: ['Crop Management'], predefined: ['Gardening'] },
  { pattern: /engineer.*(mechanic|\bme\b)/i, primary: ['Mechanical Maintenance', 'HVAC', 'Welding', 'Blueprint Reading'], secondary: ['AutoCAD'] },
  { pattern: /architect/i, primary: ['AutoCAD', 'Blueprint Reading', '3D Modeling', 'Construction Estimation'], secondary: ['Project Management'] },
  { pattern: /interior\s*design/i, primary: ['Interior Design', 'AutoCAD', '3D Modeling'], secondary: ['Color Theory'] },
  { pattern: /landscape\s*architect|landscap/i, primary: ['Landscaping', 'AutoCAD', 'Horticulture'], predefined: ['Gardening'] },

  // Education / language
  { pattern: /educat|teacher|\bedu\b|\bbeed\b|\bbsed\b|pedago/i, primary: TEACHING_CORE, secondary: ['MS Office'], predefined: ['Computer Literate'] },
  { pattern: /library\s*(?:and\s*)?information/i, primary: ['Cataloging', 'Information Management', 'Database Management'], secondary: ['MS Office'], predefined: ['Computer Literate'] },

  // Agriculture / nature
  { pattern: /agricultur|agri\b|agrono|agribusiness|agroforest/i, primary: ['Farming', 'Crop Management', 'Pest Control', 'Soil Testing'], secondary: ['Farm Record Keeping'], predefined: ['Gardening'] },
  { pattern: /fisher|aqua/i, primary: ['Aquaculture', 'Fishpond Management', 'Livestock Care'] },
  { pattern: /forestry/i, primary: ['Environmental Monitoring', 'Soil Testing', 'Farming'] },
  { pattern: /veterinar/i, primary: ['Veterinary Assistance', 'Animal Husbandry', 'Livestock Care'] },
  { pattern: /environmental\s*sci/i, primary: ['Environmental Monitoring', 'Soil Testing', 'Laboratory Testing'], secondary: ['GIS'] },

  // Natural / formal sciences
  { pattern: /\bchemistry\b|\bchem\b/i, primary: ['Laboratory Testing', 'Chemical Analysis', 'Specimen Handling', 'Laboratory Safety'], predefined: ['Computer Literate'] },
  { pattern: /\bbiology\b|\bmolecular\b/i, primary: ['Laboratory Testing', 'Specimen Handling', 'Microscopy', 'Scientific Method'], predefined: ['Computer Literate'] },
  { pattern: /\bphysics\b/i, primary: ['Scientific Method', 'Data Analysis', 'Laboratory Testing'], secondary: ['MATLAB'], predefined: ['Computer Literate'] },
  { pattern: /geolog/i, primary: ['Geological Mapping', 'Soil Testing', 'Laboratory Testing'], secondary: ['GIS'] },
  { pattern: /mathematic|\bmath\b|applied\s*math/i, primary: ['Mathematical Modeling', 'Statistics', 'Data Analysis', 'MS Excel'], predefined: ['Computer Literate'] },
  { pattern: /statistic/i, primary: ['Statistics', 'Data Analysis', 'SPSS', 'MS Excel'], predefined: ['Computer Literate'] },

  // Law / public safety / social
  { pattern: /crimino|police|public\s*safety/i, primary: ['Security Guard', 'Patrolling', 'Report Writing'], secondary: ['First Aid'] },
  { pattern: /law\b|juris|legal/i, primary: ['Legal Research', 'Report Writing', 'Documentation'], secondary: ['Communication Skills'] },
  { pattern: /psycholog|social\s*work/i, primary: ['Counseling', 'Communication Skills', 'Report Writing'], secondary: ['Documentation'] },
  { pattern: /journal|broadcast|mass\s*comm|communicat|development\s*commun/i, primary: ['Report Writing', 'Social Media', 'Communication Skills'], secondary: ['Photography'] },
  { pattern: /political\s*sci|public\s*admin|foreign\s*service|international\s*stud/i, primary: ['Policy Analysis', 'Report Writing', 'Research Methods'], secondary: ['Communication Skills'] },
  { pattern: /customs\s*admin/i, primary: ['Customs Regulations', 'Documentation', 'Logistics'], secondary: ['MS Office'] },
  { pattern: /community\s*dev/i, primary: ['Community Outreach', 'Project Management', 'Report Writing'], secondary: ['Counseling'] },
  { pattern: /forensic/i, primary: ['Forensic Analysis', 'Laboratory Testing', 'Specimen Handling'], secondary: ['Documentation'] },

  // Humanities / languages
  { pattern: /philosoph/i, primary: ['Critical Thinking', 'Academic Writing', 'Research Methods'], secondary: ['Communication Skills'] },
  { pattern: /histor/i, primary: ['Research Methods', 'Academic Writing', 'Report Writing'], secondary: ['Critical Thinking'] },
  { pattern: /linguistic|literature|\benglish\b|filipino|anthropolog|sociolog/i, primary: ['Academic Writing', 'Research Methods', 'Communication Skills'], secondary: ['Editing'] },
  { pattern: /islamic\s*stud/i, primary: ['Islamic Studies', 'Arabic Language', 'Academic Writing'], secondary: ['Research Methods'] },
  { pattern: /economic/i, primary: ['Economic Analysis', 'Data Analysis', 'MS Excel', 'Statistics'], secondary: ['Research Methods'] },

  // Arts
  { pattern: /fine\s*arts|painting|sculpture|visual|industrial\s*design|arts\s*and\s*design/i, primary: ['Painting', 'Drawing', 'Graphic Design'], secondary: ['Photography'], predefined: ['Painter/Artist', 'Photography'] },

  // Transportation / marine
  { pattern: /marine\s*transport|maritime|navigation/i, primary: ['Navigation', 'Ship Operations', 'Maritime Safety', 'First Aid'] },

  // Physical education / sports
  { pattern: /physical\s*education|sports\s*science|sports\s*track/i, primary: ['Physical Fitness Training', 'Coaching', 'First Aid'], secondary: ['Team Leadership'] },

  // Senior High / TVL Tracks
  { pattern: /home\s*economic/i, primary: ['Cooking', 'Food Preparation', 'Housekeeping'], secondary: ['Customer Service'], predefined: ['Domestic Chores', 'Sewing/Dresses', 'Gardening'] },
  { pattern: /information\s*and\s*communication\s*technology|\bict\b/i, primary: ['Computer Repair', 'Data Entry', 'MS Office', 'Web Development'], secondary: ['Typing Skills'], predefined: ['Computer Literate'] },
  { pattern: /industrial\s*arts/i, primary: ['Carpentry', 'Welding', 'Electrical Work', 'Masonry'], predefined: ['Carpentry Work', 'Masonry', 'Electrician'] },
  { pattern: /agri.?fishery\s*arts/i, primary: ['Farming', 'Aquaculture', 'Crop Management'], predefined: ['Gardening'] },
  { pattern: /\babm\b|business\s*and\s*management/i, primary: ['Bookkeeping', 'MS Excel', 'Customer Service'], secondary: ['Sales'] },
  { pattern: /\bstem\b/i, primary: ['Scientific Method', 'Research Methods', 'Data Analysis', 'MS Excel'], secondary: ['Laboratory Safety', 'Problem Solving'], predefined: ['Computer Literate'] },
  { pattern: /\bhumss\b|humanities/i, primary: ['Communication Skills', 'Report Writing', 'Research Methods'], secondary: ['MS Office'] },
  { pattern: /\bgas\b|general\s*academic/i, primary: ['Communication Skills', 'Research Methods', 'MS Office'], secondary: ['Report Writing'] },

  // Business (additions)
  { pattern: /office\s*admin|\bosa\b/i, primary: ['Office Administration', 'MS Office', 'Data Entry', 'Records Management'], secondary: ['Filing'], predefined: ['Computer Literate'] },
  { pattern: /e-?commerce/i, primary: ['Online Selling', 'Digital Marketing', 'E-Commerce Platforms', 'Social Media'], secondary: ['Customer Service'], predefined: ['Computer Literate'] },
  { pattern: /internal\s*audit|audit(?:ing|or)/i, primary: ['Auditing', 'Risk Assessment', 'Internal Controls', 'Financial Reporting'], secondary: ['Attention to Detail'], predefined: ['Computer Literate'] },
  { pattern: /management\s*account/i, primary: ['Cost Accounting', 'Bookkeeping', 'Financial Reporting', 'MS Excel'], secondary: ['Budgeting'], predefined: ['Computer Literate'] },

  // Tech & Engineering (additions)
  { pattern: /mechatron/i, primary: ['Robotics', 'PLC Programming', 'Electronics Troubleshooting', 'Embedded Systems'], secondary: ['AutoCAD'], predefined: ['Computer Literate'] },
  { pattern: /manufactur.*engineer|engineer.*manufactur/i, primary: ['Production Planning', 'Quality Assurance', 'Process Improvement', 'CNC Operation'], secondary: ['Lean Manufacturing'] },
  { pattern: /packaging.*engineer|engineer.*packaging/i, primary: ['Packaging Design', 'Materials Testing', 'Quality Assurance'], secondary: ['AutoCAD'] },
  { pattern: /entertain.*comput|multimedia\s*comput/i, primary: ['Game Development', 'Animation', '3D Modeling', 'Programming'], secondary: ['Graphic Design'], predefined: ['Computer Literate'] },

  // Medicine (additions)
  { pattern: /optometr/i, primary: ['Eye Examination', 'Visual Acuity Testing', 'Patient Care', 'Refraction'], secondary: ['Medical Records'] },
  { pattern: /public\s*health|\bmph\b/i, primary: ['Health Education', 'Community Outreach', 'Epidemiology', 'Health Program Planning'], secondary: ['Data Analysis', 'Report Writing'] },

  // Education (additions)
  { pattern: /early\s*child|preschool/i, primary: [...TEACHING_CORE, 'Early Childhood Education', 'Child Development'], secondary: ['First Aid'] },
  { pattern: /special\s*(needs|educat)/i, primary: [...TEACHING_CORE, 'Special Education', 'Assistive Technology'], secondary: ['Behavioral Assessment'] },
  { pattern: /technical.?vocation|tech.?voc|\btle\b|technology\s*and\s*livelihood/i, primary: [...TEACHING_CORE, 'Vocational Training', 'Skills Assessment'], secondary: ['Curriculum Development'] },

  // Law (additions)
  { pattern: /juris\s*doctor|\bjd\b|\bllb\b|bachelor\s*of\s*laws/i, primary: ['Legal Research', 'Legal Writing', 'Case Analysis', 'Contract Drafting'], secondary: ['Communication Skills'] },
  { pattern: /legal\s*management/i, primary: ['Legal Documentation', 'Paralegal Support', 'Case Filing', 'MS Office'], secondary: ['Records Management'], predefined: ['Computer Literate'] },
  { pattern: /law\s*enforcement/i, primary: ['Patrolling', 'Criminal Investigation', 'Report Writing', 'Emergency Response'], secondary: ['First Aid'] },
  { pattern: /industrial\s*security/i, primary: ['Security Operations', 'Risk Assessment', 'CCTV Monitoring', 'Patrolling'], secondary: ['First Aid'] },

  // Aviation
  { pattern: /aviation|aircraft\s*maint|aerospace|\bflight\s*school\b/i, primary: ['Aviation Safety', 'Aircraft Systems', 'Aircraft Maintenance', 'Navigation'], secondary: ['Blueprint Reading', 'Radio Communication'] },

  // Arts (additions)
  { pattern: /multimedia\s*arts/i, primary: ['Graphic Design', 'Animation', 'Video Editing', 'Digital Illustration'], secondary: ['Photography'], predefined: ['Painter/Artist'] },

  // Graduate
  { pattern: /\bmba\b/i, primary: ['Project Management', 'Business Analysis', 'Leadership', 'MS Excel'], secondary: ['Financial Analysis', 'Strategic Planning'], predefined: ['Computer Literate'] },
  { pattern: /\bmpa\b|master.*public\s*admin/i, primary: ['Policy Analysis', 'Project Management', 'Leadership'], secondary: ['Report Writing'] },
  { pattern: /\bmed\b|master.*education/i, primary: ['Curriculum Development', 'Lesson Planning', 'Education Research'], secondary: ['Classroom Management'] },
  { pattern: /\bmeng\b|master.*engineer/i, primary: ['Project Management', 'Engineering Design', 'Research Methods'], secondary: ['AutoCAD'] },
  { pattern: /\bphd\b|doctor\s*of\s*philosoph/i, primary: ['Research Methods', 'Academic Writing', 'Academic Publishing'], secondary: ['Teaching'] },
  { pattern: /\bedd\b|doctor\s*of\s*education/i, primary: ['Education Research', 'Curriculum Development', 'Academic Writing'], secondary: ['Leadership'] },
  { pattern: /\bjsd\b|juridical\s*science/i, primary: ['Legal Research', 'Academic Writing', 'Legal Analysis'], secondary: ['Report Writing'] },
  { pattern: /\bma\b|master\s*of\s*arts/i, primary: RESEARCH_CORE, secondary: COMMUNICATION_CORE },
  { pattern: /\bms\b|master\s*of\s*science/i, primary: [...RESEARCH_CORE, 'Scientific Method'], secondary: ['Report Writing', 'Statistics'] },
]

// Work experience position keywords → skills
const POSITION_PATTERNS = [
  { pattern: /nurse|nursing|ward/i, skills: ['Patient Care', 'Clinical Assessment', 'Medication Administration', 'First Aid', 'Medical Records'] },
  { pattern: /caregiv|nanny|yaya/i, skills: ['Patient Care', 'First Aid', 'Domestic Chores', 'Cooking'], predefined: ['Domestic Chores'] },
  { pattern: /teacher|instructor|tutor|faculty|prof/i, skills: ['Lesson Planning', 'Classroom Management', 'Communication Skills'] },
  { pattern: /driver|courier|delivery|rider/i, skills: ['Driving', 'Navigation', 'Time Management'], predefined: ['Driver'] },
  { pattern: /cashier|teller/i, skills: ['Cashiering', 'Cash Handling', 'POS Operation', 'Customer Service'] },
  { pattern: /sales(?:person|man|woman|associate|rep|lady|clerk)?/i, skills: ['Sales', 'Customer Service', 'Product Knowledge', 'Upselling'] },
  { pattern: /cook|chef|kitchen/i, skills: ['Cooking', 'Food Preparation', 'Food Safety'] },
  { pattern: /baker|pastry/i, skills: ['Baking', 'Pastry Making', 'Food Safety'] },
  { pattern: /barista/i, skills: ['Barista', 'Coffee Brewing', 'Customer Service'] },
  { pattern: /waiter|server|f&b|food\s*attendant/i, skills: ['Food & Beverage Service', 'Restaurant Service', 'Customer Service'] },
  { pattern: /housekeep|room\s*attendant/i, skills: ['Housekeeping', 'Laundry Operations', 'Domestic Chores'], predefined: ['Domestic Chores'] },
  { pattern: /front\s*desk|receptionist|concierge/i, skills: ['Front Desk', 'Guest Relations', 'Customer Service', 'MS Office'] },
  { pattern: /security|guard|watchman|bantay/i, skills: ['Security Guard', 'Patrolling', 'Report Writing'] },
  { pattern: /program|developer|software|web|coder/i, skills: ['Programming', 'Web Development', 'Debugging', 'Git Version Control'] },
  { pattern: /electrician|wiring|electrical/i, skills: ['Electrical Installation', 'Electrical Wiring', 'Electrical Troubleshooting'], predefined: ['Electrician'] },
  { pattern: /carpenter|woodwork/i, skills: ['Carpentry', 'Blueprint Reading'], predefined: ['Carpentry Work'] },
  { pattern: /mason|concrete/i, skills: ['Masonry', 'Concrete Pouring', 'Rebar Installation'], predefined: ['Masonry'] },
  { pattern: /plumb/i, skills: ['Plumbing', 'Pipe Fitting', 'Sanitary Installation'], predefined: ['Plumbing'] },
  { pattern: /weld/i, skills: ['Welding', 'Arc Welding', 'Steel Fabrication'] },
  { pattern: /paint/i, skills: ['Painting'], predefined: ['Painting Jobs'] },
  { pattern: /mechanic|automotiv|vehicle\s*repair/i, skills: ['Auto Repair', 'Engine Overhaul', 'Mechanical Maintenance'], predefined: ['Auto Mechanic'] },
  { pattern: /admin|secretary|clerical|encoder|clerk/i, skills: ['Data Entry', 'MS Office', 'Typing Skills', 'Filing'], predefined: ['Computer Literate'] },
  { pattern: /accountan|bookkeep/i, skills: ['Bookkeeping', 'Financial Reporting', 'MS Excel'] },
  { pattern: /hr|human\s*resource|recruiter/i, skills: ['Recruitment', 'Interviewing', 'MS Office', 'Communication Skills'] },
  { pattern: /call\s*center|csr|customer\s*(?:service|care)/i, skills: ['Customer Service', 'English Communication', 'MS Office'] },
  { pattern: /encoder|data\s*entry/i, skills: ['Data Entry', 'Typing Skills', 'MS Office'] },
  { pattern: /farm|agri/i, skills: ['Farming', 'Crop Management', 'Harvesting'] },
  { pattern: /fisher/i, skills: ['Aquaculture', 'Fishpond Management'] },
  { pattern: /sew|tailor|dress/i, skills: ['Sewing', 'Tailoring'], predefined: ['Sewing/Dresses', 'Tailoring'] },
  { pattern: /beautician|hair\s*stylist|salon/i, skills: ['Hairdressing', 'Beauty Services'], predefined: ['Beautician'] },
  { pattern: /photograph/i, skills: ['Photography'], predefined: ['Photography'] },
  { pattern: /garden|landscap/i, skills: ['Gardening', 'Landscaping'], predefined: ['Gardening'] },
  { pattern: /stenograph/i, skills: ['Stenography', 'Typing Skills'], predefined: ['Stenography'] },
  { pattern: /helper|utility|janit/i, skills: ['Domestic Chores', 'Cleaning'], predefined: ['Domestic Chores'] },
]

// TESDA / vocational course keywords → skills
const TESDA_PATTERNS = [
  { pattern: /weld/i, skills: ['Welding', 'Arc Welding', 'Steel Fabrication'] },
  { pattern: /electric|wiring/i, skills: ['Electrical Installation', 'Electrical Wiring', 'Electrical Troubleshooting'], predefined: ['Electrician'] },
  { pattern: /plumb/i, skills: ['Plumbing', 'Pipe Fitting'], predefined: ['Plumbing'] },
  { pattern: /automotiv|auto\s*mech/i, skills: ['Auto Repair', 'Mechanical Maintenance'], predefined: ['Auto Mechanic'] },
  { pattern: /food\s*process|food\s*safety/i, skills: ['Food Safety', 'Food Preparation', 'Cooking'] },
  { pattern: /dressmak|tailor|sew/i, skills: ['Tailoring', 'Sewing'], predefined: ['Sewing/Dresses', 'Tailoring'] },
  { pattern: /comput|\bict\b/i, skills: ['Computer Repair', 'MS Office', 'Data Entry'], predefined: ['Computer Literate'] },
  { pattern: /caregiv/i, skills: ['Patient Care', 'First Aid', 'Domestic Chores'], predefined: ['Domestic Chores'] },
  { pattern: /bookkeep|accounting/i, skills: ['Bookkeeping', 'MS Excel'] },
  { pattern: /mason/i, skills: ['Masonry', 'Carpentry'], predefined: ['Masonry'] },
  { pattern: /carpent/i, skills: ['Carpentry'], predefined: ['Carpentry Work'] },
  { pattern: /beaut|hairdress|cosmetolog/i, skills: ['Hairdressing', 'Beauty Services'], predefined: ['Beautician'] },
  { pattern: /driving|driver/i, skills: ['Driving'], predefined: ['Driver'] },
  { pattern: /cook|culinary/i, skills: ['Cooking', 'Food Preparation', 'Food Safety'] },
  { pattern: /bake|pastry/i, skills: ['Baking', 'Pastry Making'] },
  { pattern: /bartend/i, skills: ['Bartending', 'Beverage Management'] },
  { pattern: /housekeep/i, skills: ['Housekeeping', 'Laundry Operations'] },
  { pattern: /refriger|aircon|hvac|ras/i, skills: ['HVAC', 'AC Installation', 'Refrigeration'] },
  { pattern: /security/i, skills: ['Security Guard', 'Patrolling'] },
  { pattern: /heavy\s*equip|forklift/i, skills: ['Heavy Equipment Operation', 'Forklift Operation'] },
  { pattern: /masaj|massage/i, skills: ['Massage Therapy', 'Spa Services'] },
  { pattern: /embroider/i, skills: ['Embroidery'], predefined: ['Embroidery'] },
]

// Universal transferable/soft skills added whenever any signal is present.
const SOFT_SKILL_UNIVERSAL = [
  'Communication Skills',
  'Active Listening',
  'Critical Thinking',
  'Problem Solving',
  'Time Management',
  'Teamwork',
  'Adaptability',
]

// Field-specific soft-skill overlays. Matched against course/position/training text.
const SOFT_PATTERNS = [
  { pattern: /psycholog|social\s*work|counsel|guidance|\bhrdm?\b|human\s*resource|recruit/i,
    skills: ['Empathy', 'Active Listening', 'Emotional Intelligence', 'Conflict Resolution', 'Interpersonal Skills'] },
  { pattern: /nurs|caregiv|midwif|therap|patient|medical\s*tech|radiolog/i,
    skills: ['Empathy', 'Patience', 'Attention to Detail', 'Stress Management'] },
  { pattern: /educat|teacher|tutor|\bbeed\b|\bbsed\b|pedago/i,
    skills: ['Patience', 'Public Speaking', 'Classroom Management'] },
  { pattern: /sales|marketing|customer|retail|cashier|teller|front\s*desk/i,
    skills: ['Persuasion', 'Negotiation', 'Customer Service Orientation'] },
  { pattern: /manage|business\s*admin|\bmba\b|leader|supervisor|operations|entrepreneur/i,
    skills: ['Leadership', 'Decision Making', 'Delegation', 'Strategic Thinking'] },
  { pattern: /engineer|architect|construction|software|program|developer/i,
    skills: ['Analytical Thinking', 'Attention to Detail'] },
  { pattern: /accountan|bookkeep|finance|audit|banking/i,
    skills: ['Attention to Detail', 'Integrity', 'Organizational Skills'] },
  { pattern: /tourism|hospitality|hotel|restaurant|\bhrm\b|guest|concierge/i,
    skills: ['Interpersonal Skills', 'Customer Service Orientation', 'Cultural Awareness'] },
  { pattern: /law\b|legal|juris|criminolog|forensic|police|public\s*safety/i,
    skills: ['Analytical Thinking', 'Attention to Detail', 'Integrity'] },
  { pattern: /journal|broadcast|communicat|mass\s*comm|public\s*relat/i,
    skills: ['Public Speaking', 'Creativity', 'Storytelling'] },
  { pattern: /fine\s*arts|painting|sculpture|visual|design|creative|photograph/i,
    skills: ['Creativity', 'Visual Thinking', 'Attention to Detail'] },
  { pattern: /driver|courier|delivery|security|guard|law\s*enforcement|industrial\s*security/i,
    skills: ['Alertness', 'Punctuality', 'Responsibility'] },
  { pattern: /early\s*child|preschool|special\s*(needs|educat)/i,
    skills: ['Patience', 'Empathy', 'Nurturing', 'Observation'] },
  { pattern: /dent|optometr|public\s*health|veterinar/i,
    skills: ['Empathy', 'Patience', 'Attention to Detail'] },
  { pattern: /aviation|aircraft|aerospace/i,
    skills: ['Situational Awareness', 'Composure Under Pressure', 'Attention to Detail', 'Discipline'] },
  { pattern: /mechatron|manufactur|packaging|industrial\s*engineer/i,
    skills: ['Attention to Detail', 'Safety Consciousness', 'Analytical Thinking'] },
  { pattern: /multimedia|entertain.*comput|e-?commerce/i,
    skills: ['Creativity', 'Visual Thinking', 'Attention to Detail'] },
  { pattern: /juris|\bjd\b|\bllb\b|legal\s*management|bachelor\s*of\s*laws/i,
    skills: ['Analytical Thinking', 'Attention to Detail', 'Integrity', 'Confidentiality'] },
]

// Course → job-aligned ("practical") skills based on likely Philippine career paths.
// Matched against course_or_field text and preferred_occupations.
const COURSE_PRACTICAL_PATTERNS = [
  // Social sciences
  { pattern: /psycholog/i, skills: ['Customer Service', 'HR Support', 'Interviewing Skills', 'Case Handling', 'Behavioral Assessment'] },
  { pattern: /social\s*work/i, skills: ['Case Handling', 'Community Outreach', 'Client Intake', 'Referral Coordination'] },
  { pattern: /sociolog|anthropolog/i, skills: ['Field Research', 'Data Collection', 'Community Outreach', 'Report Writing'] },
  { pattern: /political\s*sci|public\s*admin|foreign\s*service|international\s*stud|community\s*dev/i,
    skills: ['Program Coordination', 'Stakeholder Engagement', 'Grant Writing', 'Community Outreach'] },

  // Health
  { pattern: /nursing|\bnurse\b/i, skills: ['Vital Signs Monitoring', 'Patient Intake', 'Wound Dressing', 'IV Therapy', 'Medication Administration'] },
  { pattern: /midwif/i, skills: ['Prenatal Checkup', 'Neonatal Care', 'Birth Assistance'] },
  { pattern: /pharma/i, skills: ['Prescription Dispensing', 'Drug Inventory', 'Pharmacy Customer Service'] },
  { pattern: /medical\s*tech|medtech|laborator/i, skills: ['Blood Testing', 'Urinalysis', 'Specimen Collection', 'Lab Equipment Operation'] },
  { pattern: /radiolog/i, skills: ['X-Ray Operation', 'Patient Positioning', 'Radiation Safety'] },
  { pattern: /physical\s*therap|physio|occupational\s*therap|respiratory\s*therap|speech\s*(?:therap|language|pathology)/i,
    skills: ['Rehabilitation Exercises', 'Patient Progress Tracking', 'Therapy Plan Execution'] },
  { pattern: /nutrition|dietet/i, skills: ['Menu Planning', 'Dietary Counseling', 'Meal Preparation'] },
  { pattern: /\bmedicine\b|physician|\bmd\b/i, skills: ['Patient Consultation', 'Diagnosis', 'Prescription Writing', 'Medical Charting'] },

  // Business
  { pattern: /accountan|\bbsa\b|accounting/i, skills: ['Invoice Processing', 'Accounts Payable', 'Accounts Receivable', 'Payroll Processing', 'BIR Filing'] },
  { pattern: /marketing/i, skills: ['Social Media Marketing', 'Content Writing', 'Email Marketing', 'Lead Generation', 'Campaign Management'] },
  { pattern: /human\s*resource|\bhrdm?\b/i, skills: ['Recruitment Screening', 'Employee Onboarding', 'HR Documentation', 'Payroll Processing', 'Timekeeping'] },
  { pattern: /finance|banking|financial\s*management/i, skills: ['Loan Processing', 'Financial Reporting', 'Teller Operations', 'Cash Handling'] },
  { pattern: /business\s*admin|\bbsba\b/i, skills: ['Office Administration', 'Admin Assistance', 'Executive Support', 'Scheduling', 'Email Correspondence'] },
  { pattern: /entrepreneur|business\s*planning/i, skills: ['Online Selling', 'Inventory Management', 'Product Pricing', 'Vendor Management'] },
  { pattern: /hotel|\bhrm\b|restaurant\s*management|tourism|hospitality/i,
    skills: ['Guest Relations', 'Reservations Management', 'Concierge Services', 'Food & Beverage Service', 'Tour Coordination'] },
  { pattern: /real\s*estate/i, skills: ['Property Listing', 'Client Tours', 'Contract Drafting', 'Lead Follow-up'] },
  { pattern: /customs\s*admin/i, skills: ['Customs Documentation', 'Import/Export Processing', 'Cargo Inspection Coordination'] },

  // Computing / IT
  { pattern: /comput(?:er|ing)\s*sci|computer\s*engineer|software/i,
    skills: ['Tech Support', 'QA Testing', 'Front-end Development', 'Back-end Development', 'Version Control (Git)'] },
  { pattern: /information\s*tech|\bbsit\b/i,
    skills: ['IT Helpdesk', 'System Administration', 'Network Troubleshooting', 'Hardware Installation'] },
  { pattern: /information\s*system/i, skills: ['Business Analysis', 'Database Administration', 'System Documentation'] },
  { pattern: /data\s*sci|data\s*analyt/i, skills: ['Dashboard Building', 'Data Cleaning', 'Reporting Automation'] },

  // Engineering
  { pattern: /engineer.*(civil|structur|sanitary)/i, skills: ['Site Inspection', 'Quantity Surveying', 'Construction Supervision', 'Quality Control'] },
  { pattern: /engineer.*(electric(?!.*electronic)|\bee\b)/i, skills: ['Electrical Installation', 'Panel Wiring', 'Load Testing'] },
  { pattern: /engineer.*(electronic|ece|communications)/i, skills: ['PCB Assembly', 'Equipment Calibration', 'Signal Testing'] },
  { pattern: /engineer.*(mechanic|\bme\b)/i, skills: ['Equipment Maintenance', 'Preventive Maintenance', 'HVAC Servicing'] },
  { pattern: /engineer.*(industrial|\bie\b)/i, skills: ['Process Improvement', 'Time and Motion Study', 'Inventory Control'] },
  { pattern: /engineer.*(chemical|\bche\b)/i, skills: ['Quality Assurance Testing', 'Process Sampling', 'Plant Operations Support'] },
  { pattern: /architect/i, skills: ['Drafting', 'Design Rendering', 'Site Visit Coordination'] },
  { pattern: /interior\s*design/i, skills: ['Space Planning', 'Material Selection', 'Client Presentation'] },

  // Education
  { pattern: /educat|teacher|\bedu\b|\bbeed\b|\bbsed\b/i,
    skills: ['Tutoring', 'Student Assessment', 'Parent Communication', 'Module Preparation'] },

  // Law / safety
  { pattern: /law\b|juris|legal/i, skills: ['Legal Documentation', 'Case Filing', 'Paralegal Support', 'Client Intake'] },
  { pattern: /criminolog|police|public\s*safety/i,
    skills: ['Security Operations', 'Incident Reporting', 'CCTV Monitoring', 'Patrolling'] },
  { pattern: /forensic/i, skills: ['Evidence Handling', 'Crime Scene Documentation', 'Chain of Custody'] },

  // Media
  { pattern: /journal|broadcast|communicat|mass\s*comm|development\s*commun/i,
    skills: ['News Reporting', 'Copywriting', 'Social Media Management', 'Video Editing'] },

  // Humanities / language
  { pattern: /philosoph|histor/i, skills: ['Content Writing', 'Research Assistance', 'Editorial Support'] },
  { pattern: /linguistic|literature|\benglish\b|filipino/i,
    skills: ['Copy Editing', 'Transcription', 'ESL Tutoring', 'Translation'] },
  { pattern: /islamic\s*stud/i, skills: ['Translation', 'Community Teaching', 'Research Assistance'] },

  // Natural sciences
  { pattern: /environmental\s*sci|forestry|agroforest/i, skills: ['Field Sampling', 'Environmental Reporting', 'Permit Preparation'] },
  { pattern: /fisher|aqua/i, skills: ['Fishpond Maintenance', 'Stock Monitoring', 'Feed Management'] },
  { pattern: /\bchemistry\b|\bbiology\b|\bmolecular\b|\bphysics\b|geolog/i,
    skills: ['Lab Assistance', 'Sample Preparation', 'Technical Writing'] },
  { pattern: /mathematic|\bmath\b|statistic/i, skills: ['Data Entry', 'Report Generation', 'Tutoring'] },

  // Arts
  { pattern: /fine\s*arts|painting|sculpture|visual|industrial\s*design|arts\s*and\s*design/i,
    skills: ['Graphic Design', 'Digital Illustration', 'Photo Editing', 'Layout Design'] },

  // Agriculture
  { pattern: /agricultur|agri\b|agrono|agribusiness/i, skills: ['Crop Planting', 'Pest Control', 'Farm Record Keeping', 'Harvesting'] },
  { pattern: /veterinar/i, skills: ['Animal Handling', 'Vaccination Assistance', 'Clinic Reception'] },

  // Senior High tracks
  { pattern: /\babm\b|business\s*and\s*management/i, skills: ['Cashiering', 'Inventory Management', 'Office Administration', 'Customer Service'] },
  { pattern: /\bstem\b/i, skills: ['Data Entry', 'Technical Writing', 'Lab Assistance', 'QA Testing'] },
  { pattern: /\bhumss\b|humanities/i, skills: ['Administrative Support', 'Content Writing', 'Community Engagement', 'Customer Service'] },
  { pattern: /\bgas\b|general\s*academic/i, skills: ['Administrative Support', 'Data Entry', 'Customer Service', 'Content Writing'] },
  { pattern: /home\s*economic/i, skills: ['Housekeeping', 'Food Preparation', 'Childcare', 'Laundry Operations'] },
  { pattern: /information\s*and\s*communication\s*technology|\bict\b/i, skills: ['Tech Support', 'Data Entry', 'Computer Repair', 'Office Productivity'] },
  { pattern: /industrial\s*arts/i, skills: ['Carpentry', 'Metal Fabrication', 'Tool Handling'] },
  { pattern: /agri.?fishery\s*arts/i, skills: ['Crop Planting', 'Fishpond Management', 'Livestock Care'] },
  { pattern: /sports\s*track|physical\s*education|sports\s*science/i, skills: ['Coaching', 'Event Officiating', 'Fitness Instruction'] },

  // Transportation
  { pattern: /marine\s*transport|maritime|navigation/i, skills: ['Watchkeeping', 'Cargo Handling', 'Navigation Equipment Operation'] },

  // Business (additions)
  { pattern: /office\s*admin/i, skills: ['Executive Support', 'Scheduling', 'Email Correspondence', 'Records Management', 'Meeting Minutes'] },
  { pattern: /e-?commerce/i, skills: ['Shopee Seller Operations', 'Lazada Seller Operations', 'Product Listing', 'Order Fulfillment', 'Online Customer Support'] },
  { pattern: /internal\s*audit|audit(?:ing|or)/i, skills: ['Compliance Review', 'Audit Report Preparation', 'Sampling Procedures', 'Control Testing'] },
  { pattern: /management\s*account/i, skills: ['Cost Analysis', 'Variance Reporting', 'Budget Monitoring', 'Payroll Processing'] },

  // Tech & Engineering (additions)
  { pattern: /mechatron/i, skills: ['Automation Maintenance', 'Sensor Calibration', 'Control Panel Setup', 'Robotics Operation'] },
  { pattern: /manufactur.*engineer|engineer.*manufactur/i, skills: ['Production Line Setup', 'Quality Inspection', 'Equipment Maintenance', 'Shift Supervision'] },
  { pattern: /packaging.*engineer|engineer.*packaging/i, skills: ['Packaging Line Operation', 'Label Design', 'Vendor Coordination'] },
  { pattern: /entertain.*comput|multimedia\s*comput/i, skills: ['Game Asset Creation', 'UI/UX Design', 'Video Production', 'Animation'] },
  { pattern: /engineer.*aeronaut|engineer.*aerospace|aerospace/i, skills: ['Aircraft Servicing', 'Component Inspection', 'Maintenance Documentation'] },

  // Medicine (additions)
  { pattern: /dent/i, skills: ['Dental Cleaning', 'Oral Examination', 'Dental Charting', 'Chairside Assistance'] },
  { pattern: /optometr/i, skills: ['Eye Exams', 'Eyeglass Fitting', 'Contact Lens Fitting', 'Optical Dispensing'] },
  { pattern: /veterinar/i, skills: ['Animal Handling', 'Vaccination Assistance', 'Clinic Reception', 'Livestock Care'] },
  { pattern: /public\s*health|\bmph\b/i, skills: ['Health Campaign Facilitation', 'Community Immunization Support', 'Health Data Collection', 'Barangay Health Coordination'] },

  // Education (additions)
  { pattern: /early\s*child|preschool/i, skills: ['Storytime Facilitation', 'Play-based Learning', 'Child Supervision', 'Parent Communication'] },
  { pattern: /special\s*(needs|educat)/i, skills: ['IEP Drafting', 'Behavioral Intervention', 'One-on-One Tutoring', 'Assistive Device Setup'] },
  { pattern: /technical.?vocation|tech.?voc|\btle\b|technology\s*and\s*livelihood/i, skills: ['Hands-on Demonstration', 'Tool Handling Instruction', 'Workshop Management', 'Competency Assessment'] },

  // Law (additions)
  { pattern: /juris\s*doctor|\bjd\b|\bllb\b|bachelor\s*of\s*laws/i, skills: ['Case Research', 'Pleading Drafting', 'Court Filing', 'Client Consultation'] },
  { pattern: /legal\s*management/i, skills: ['Legal Secretary Work', 'Notarial Assistance', 'Case Docketing', 'Client Intake'] },
  { pattern: /law\s*enforcement/i, skills: ['Traffic Management', 'Arrest Procedures', 'Evidence Collection', 'Community Policing'] },
  { pattern: /industrial\s*security/i, skills: ['Guard Deployment', 'Access Control', 'Security Audits', 'Visitor Logging'] },

  // Aviation (additions)
  { pattern: /aviation|aircraft\s*maint|\bflight\s*school\b/i, skills: ['Pre-flight Inspection', 'Cabin Crew Operations', 'Ground Handling', 'Aviation Radio'] },

  // Arts (additions)
  { pattern: /multimedia\s*arts/i, skills: ['Social Media Graphics', 'Motion Graphics', 'Thumbnail Design', 'Video Editing'] },

  // Graduate generic
  { pattern: /\bmba\b|master.*business/i, skills: ['Team Management', 'Budget Planning', 'Project Coordination'] },
  { pattern: /\bmpa\b|master.*public\s*admin/i, skills: ['Policy Drafting', 'Program Management', 'Stakeholder Engagement'] },
  { pattern: /\bmed\b|master.*education/i, skills: ['Curriculum Writing', 'Training Facilitation', 'Mentoring'] },
]

function applyPatterns(text, patterns, primaryBucket, secondaryBucket, predefinedBucket) {
  if (!text || typeof text !== 'string') return
  for (const p of patterns) {
    if (p.pattern.test(text)) {
      if (p.primary) p.primary.forEach(s => primaryBucket.add(s))
      if (p.skills) p.skills.forEach(s => primaryBucket.add(s))
      if (p.secondary) p.secondary.forEach(s => secondaryBucket.add(s))
      if (p.predefined) p.predefined.forEach(s => predefinedBucket.add(s))
    }
  }
}

// Course-specific collector: exact-match table wins; otherwise regex fallback.
function collectCourseSignals(text, primaryBucket, secondaryBucket, predefinedBucket) {
  if (!text || typeof text !== 'string') return
  const entry = COURSE_SKILL_LOOKUP.get(normalizeKey(text))
  if (entry) {
    if (entry.primary) entry.primary.forEach(s => primaryBucket.add(s))
    if (entry.secondary) entry.secondary.forEach(s => secondaryBucket.add(s))
    if (entry.predefined) entry.predefined.forEach(s => predefinedBucket.add(s))
    return
  }
  applyPatterns(text, COURSE_PATTERNS, primaryBucket, secondaryBucket, predefinedBucket)
}

/**
 * Generate ranked skill suggestions from jobseeker registration formData.
 * @param {object} formData - merged registration form state
 * @returns {{ suggestions: string[], predefinedToCheck: string[], reasons: string[] }}
 */
export function generateSuggestedSkills(formData = {}) {
  const primary = new Set()     // Core (academic)
  const secondary = new Set()   // Core (secondary)
  const practical = new Set()   // Job-aligned
  const soft = new Set()        // Transferable / soft
  const predefined = new Set()
  const reasons = []

  const course = formData.course_or_field || ''
  if (course) {
    collectCourseSignals(course, primary, secondary, predefined)
    applyPatterns(course, COURSE_PRACTICAL_PATTERNS, practical, practical, predefined)
    applyPatterns(course, SOFT_PATTERNS, soft, soft, predefined)
    reasons.push(course)
  }

  const vocational = Array.isArray(formData.vocational_training) ? formData.vocational_training : []
  vocational.forEach(v => {
    if (v && v.course) {
      applyPatterns(v.course, TESDA_PATTERNS, practical, practical, predefined)
      applyPatterns(v.course, SOFT_PATTERNS, soft, soft, predefined)
      reasons.push(v.course)
    }
  })

  const experiences = Array.isArray(formData.work_experiences) ? formData.work_experiences : []
  experiences.forEach(exp => {
    if (exp && exp.position) {
      applyPatterns(exp.position, POSITION_PATTERNS, practical, practical, predefined)
      applyPatterns(exp.position, SOFT_PATTERNS, soft, soft, predefined)
      reasons.push(exp.position)
    }
  })

  const preferred = Array.isArray(formData.preferred_occupations) ? formData.preferred_occupations : []
  preferred.forEach(p => {
    if (typeof p === 'string') {
      applyPatterns(p, POSITION_PATTERNS, practical, practical, predefined)
      applyPatterns(p, COURSE_PRACTICAL_PATTERNS, practical, practical, predefined)
      applyPatterns(p, SOFT_PATTERNS, soft, soft, predefined)
    }
  })

  // Inject universal soft skills whenever we have any signal to suggest against.
  const hasSignal = !!course || vocational.length > 0 || experiences.length > 0 || preferred.length > 0
  if (hasSignal) SOFT_SKILL_UNIVERSAL.forEach(s => soft.add(s))

  const predefinedToCheck = [...predefined].filter(s => PREDEFINED_SKILL_SET.has(s))
  const alreadyPre = new Set(predefinedToCheck)

  // Build disjoint groups. Priority: Core > Practical > Soft (a skill appears in only one bucket).
  const coreArr = [
    ...[...primary].filter(s => !alreadyPre.has(s) && !PREDEFINED_SKILL_SET.has(s)),
    ...[...secondary].filter(s => !primary.has(s) && !alreadyPre.has(s) && !PREDEFINED_SKILL_SET.has(s)),
  ]
  const coreSet = new Set(coreArr)
  const practicalArr = [...practical].filter(
    s => !coreSet.has(s) && !alreadyPre.has(s) && !PREDEFINED_SKILL_SET.has(s)
  )
  const practicalSet = new Set(practicalArr)
  const softArr = [...soft].filter(
    s => !coreSet.has(s) && !practicalSet.has(s) && !alreadyPre.has(s) && !PREDEFINED_SKILL_SET.has(s)
  )

  const suggestions = [...coreArr, ...practicalArr, ...softArr]

  return {
    suggestions,
    predefinedToCheck,
    reasons: [...new Set(reasons)].filter(Boolean),
    groups: { core: coreArr, practical: practicalArr, soft: softArr },
  }
}

function orderBuckets(primary, secondary, predefined, limit) {
  const pre = [...predefined].filter(s => PREDEFINED_SKILL_SET.has(s))
  const ordered = [
    ...pre,
    ...[...primary].filter(s => !pre.includes(s)),
    ...[...secondary].filter(s => !primary.has(s) && !pre.includes(s)),
  ]
  return [...new Set(ordered)].slice(0, limit)
}

function suggestFor(text, patterns, limit = 6) {
  if (!text || typeof text !== 'string' || !text.trim()) return []
  const primary = new Set()
  const secondary = new Set()
  const predefined = new Set()
  applyPatterns(text, patterns, primary, secondary, predefined)
  return orderBuckets(primary, secondary, predefined, limit)
}

/**
 * Suggest skills for a single work-experience position.
 */
export function getSkillsForPosition(position = '') {
  return suggestFor(position, POSITION_PATTERNS)
}

/**
 * Suggest skills for a formal-education course. Exact-match against
 * canonical course list takes priority; free-text input falls back to regex.
 */
export function getSkillsForCourse(course = '', limit = 6) {
  if (!course || typeof course !== 'string' || !course.trim()) return []
  const primary = new Set()
  const secondary = new Set()
  const predefined = new Set()
  collectCourseSignals(course, primary, secondary, predefined)
  return orderBuckets(primary, secondary, predefined, limit)
}

/**
 * Suggest skills for a TESDA / vocational training course.
 */
export function getSkillsForTraining(course = '') {
  return suggestFor(course, TESDA_PATTERNS)
}
