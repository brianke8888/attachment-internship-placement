const bcrypt = require('bcryptjs')
const { pool } = require('./db')

const COMPANIES = [
  { name: 'TechCorp Africa', industry: 'Software Engineering', desc: 'Leading software company building cloud and mobile solutions across East Africa.', web: 'https://techcorp.africa', loc: 'Nairobi, Kenya' },
  { name: 'Finnovate Labs', industry: 'Financial Technology', desc: 'Fintech startup building payment and lending infrastructure for emerging markets.', web: 'https://finnovate.io', loc: 'Remote (Africa)' },
  { name: 'GreenEnergy Solutions', industry: 'Energy', desc: 'Renewable energy company driving solar and wind projects across the continent.', web: 'https://greenenergy.co.ke', loc: 'Nairobi, Kenya' },
  { name: 'MediConnect', industry: 'Healthcare', desc: 'Health-tech platform connecting patients to doctors through telemedicine.', web: 'https://mediconnect.health', loc: 'Kigali, Rwanda' },
  { name: 'EduBridge', industry: 'Education', desc: 'EdTech startup making quality education accessible through digital learning platforms.', web: 'https://edubridge.learn', loc: 'Lagos, Nigeria' },
  { name: 'AgriTech Global', industry: 'Agriculture', desc: 'IoT and data-driven solutions for modern farming and supply chain optimization.', web: 'https://agritech.global', loc: 'Accra, Ghana' },
  { name: 'LogiSwift', industry: 'Logistics', desc: 'Last-mile delivery and logistics platform using AI for route optimization.', web: 'https://logiswift.deliver', loc: 'Nairobi, Kenya' },
  { name: 'DataHive Analytics', industry: 'Data', desc: 'Big data and analytics consultancy helping organizations make data-driven decisions.', web: 'https://datahive.ai', loc: 'Cape Town, South Africa' },
  { name: 'CyberShield', industry: 'Cybersecurity', desc: 'Cybersecurity firm providing penetration testing, auditing, and security training.', web: 'https://cybershield.sec', loc: 'Remote (Africa)' },
  { name: 'CreativeDot', industry: 'Design', desc: 'Digital design agency specializing in UX/UI, branding, and product design.', web: 'https://creativedot.design', loc: 'Dar es Salaam, Tanzania' },
]

const STUDENTS = [
  { name: 'Alex Kamau', course: 'BSc Computer Science', skills: 'JavaScript, React, Node.js, TypeScript, SQL, Git' },
  { name: 'Grace Wanjiku', course: 'BSc Information Technology', skills: 'Python, Django, PostgreSQL, Docker, AWS' },
  { name: 'Brian Otieno', course: 'BSc Software Engineering', skills: 'Java, Spring Boot, Angular, MySQL, Microservices' },
  { name: 'Faith Chepkoech', course: 'BSc Data Science', skills: 'Python, R, TensorFlow, SQL, Tableau, Statistics' },
  { name: 'Daniel Mwangi', course: 'BSc Computer Science', skills: 'C++, Rust, Go, Distributed Systems, Linux' },
  { name: 'Cynthia Achieng', course: 'BSc Information Systems', skills: 'Business Analysis, SQL, Tableau, Agile, UML' },
  { name: 'Samuel Kiprop', course: 'BSc Electrical Engineering', skills: 'Embedded C, PCB Design, IoT, Arduino, MATLAB' },
  { name: 'Esther Nyambura', course: 'BSc Computer Science', skills: 'Flutter, Dart, Firebase, Mobile UI, REST APIs' },
  { name: 'Kevin Omondi', course: 'BSc Mathematics', skills: 'Python, MATLAB, LaTeX, Data Analysis, Optimization' },
  { name: 'Janet Wairimu', course: 'BSc Business IT', skills: 'SQL, Excel, Power BI, Project Management, Communication' },
  { name: 'Peter Njoroge', course: 'BSc Computer Science', skills: 'Vue.js, Nuxt, Node.js, MongoDB, Tailwind CSS' },
  { name: 'Sarah Akinyi', course: 'BSc Telecommunications', skills: 'Networking, Cisco, Wireshark, Linux, Python' },
  { name: 'Joseph Kipngetich', course: 'BSc Computer Engineering', skills: 'Verilog, FPGA, ARM, C, Embedded Linux' },
  { name: 'Diana Muthoni', course: 'BSc Statistics', skills: 'R, SPSS, SAS, Excel, Statistical Modeling, Research' },
  { name: 'Michael Ochieng', course: 'BSc Computer Science', skills: 'React Native, TypeScript, GraphQL, AWS, CI/CD' },
  { name: 'Ruth Chebet', course: 'BSc Information Science', skills: 'Knowledge Management, SQL, Web Development, UX Research' },
  { name: 'David Kariuki', course: 'BSc Computer Science', skills: 'Python, FastAPI, PostgreSQL, Redis, Docker, Kubernetes' },
  { name: 'Nancy Jerop', course: 'BSc Software Engineering', skills: 'C#, .NET, Azure, SQL Server, Entity Framework' },
  { name: 'Patrick Mutua', course: 'BSc Computer Science', skills: 'Ruby on Rails, PostgreSQL, Heroku, RSpec, Sidekiq' },
  { name: 'Elizabeth Nderitu', course: 'BSc AI & Machine Learning', skills: 'Python, PyTorch, NLP, Computer Vision, Transformers' },
]

const INTERNSHIPS_DATA = [
  { companyIdx: 0, title: 'Frontend Engineering Intern', desc: 'Build delightful UIs with React and Next.js. Ship real features used by thousands.', req: 'Strong JavaScript, familiarity with React, REST APIs, Git.', loc: 'Nairobi, Kenya (Hybrid)', dur: '3 months', cat: 'Software Engineering', deadlineDays: 21 },
  { companyIdx: 0, title: 'Backend Engineering Intern', desc: 'Build and scale Node.js microservices powering our payment platform.', req: 'Node.js, SQL, understanding of HTTP and APIs, Linux.', loc: 'Nairobi, Kenya (On-site)', dur: '6 months', cat: 'Software Engineering', deadlineDays: 14 },
  { companyIdx: 1, title: 'Product Design Intern', desc: 'Help shape the design language of our fintech products.', req: 'Figma proficiency, portfolio of UI work, design systems.', loc: 'Remote (Africa)', dur: '4 months', cat: 'Design', deadlineDays: 30 },
  { companyIdx: 1, title: 'Data Analyst Intern', desc: 'Turn raw data into insight. Build dashboards and present findings.', req: 'SQL, basic statistics, Excel, Python a plus.', loc: 'Remote (Africa)', dur: '3 months', cat: 'Data', deadlineDays: 10 },
  { companyIdx: 2, title: 'Energy Systems Intern', desc: 'Assist in designing solar energy systems for residential and commercial clients.', req: 'Basic electrical knowledge, AutoCAD, Excel.', loc: 'Nairobi, Kenya', dur: '3 months', cat: 'General', deadlineDays: 20 },
  { companyIdx: 3, title: 'Software Development Intern', desc: 'Develop features for our telemedicine platform serving thousands of patients.', req: 'JavaScript, React, Node.js, REST APIs.', loc: 'Kigali, Rwanda', dur: '4 months', cat: 'Software Engineering', deadlineDays: 25 },
  { companyIdx: 4, title: 'Content Development Intern', desc: 'Create engaging educational content for our digital learning platform.', req: 'Strong writing, basic HTML/CSS, research skills.', loc: 'Lagos, Nigeria', dur: '3 months', cat: 'General', deadlineDays: 15 },
  { companyIdx: 5, title: 'IoT Engineering Intern', desc: 'Work on sensor integration and data pipelines for smart farming solutions.', req: 'Arduino, Python, basic electronics.', loc: 'Accra, Ghana', dur: '4 months', cat: 'Software Engineering', deadlineDays: 18 },
  { companyIdx: 6, title: 'Operations Intern', desc: 'Support logistics operations and help optimize delivery routes.', req: 'Excel, analytical thinking, communication skills.', loc: 'Nairobi, Kenya', dur: '3 months', cat: 'Operations', deadlineDays: 12 },
  { companyIdx: 7, title: 'Data Engineering Intern', desc: 'Build ETL pipelines and maintain data warehouses for analytics.', req: 'SQL, Python, data modeling basics.', loc: 'Cape Town, South Africa', dur: '5 months', cat: 'Data', deadlineDays: 22 },
  { companyIdx: 8, title: 'Security Operations Intern', desc: 'Assist in security monitoring, incident response, and vulnerability assessments.', req: 'Networking basics, Linux, Python, security fundamentals.', loc: 'Remote (Africa)', dur: '4 months', cat: 'General', deadlineDays: 28 },
  { companyIdx: 9, title: 'UX Research Intern', desc: 'Conduct user interviews, usability testing, and synthesize research findings.', req: 'Research methods, communication, Figma basics.', loc: 'Dar es Salaam, Tanzania', dur: '3 months', cat: 'Design', deadlineDays: 16 },
]

async function hash(pw) {
  return bcrypt.hash(pw, 10)
}

async function main() {
  console.log('Seeding database...')

  await pool.query('SET FOREIGN_KEY_CHECKS = 0')
  await pool.query('TRUNCATE TABLE applications')
  await pool.query('TRUNCATE TABLE internships')
  await pool.query('TRUNCATE TABLE student_profiles')
  await pool.query('TRUNCATE TABLE company_profiles')
  await pool.query('TRUNCATE TABLE users')
  await pool.query('SET FOREIGN_KEY_CHECKS = 1')

  const pw = await hash('12345678')

  // Admin
  const [adminRes] = await pool.query(
    'INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)',
    ['System Admin', 'kipkosgeib1@gmail.com', await hash('12345678'), 'admin']
  )

  // 10 Companies
  const companyUserIds = []
  const companyProfileIds = []
  for (let i = 0; i < COMPANIES.length; i++) {
    const c = COMPANIES[i]
    const [userRes] = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)',
      [c.name, `hr@company${i + 1}.com`, pw, 'company']
    )
    companyUserIds.push(userRes.insertId)

    const [profRes] = await pool.query(
      `INSERT INTO company_profiles (user_id, company_name, industry, description, website, location, profile_complete, status)
       VALUES (?,?,?,?,?,?,1,'approved')`,
      [userRes.insertId, c.name, c.industry, c.desc, c.web, c.loc]
    )
    companyProfileIds.push(profRes.insertId)
  }

  // 20 Students
  const studentUserIds = []
  const studentProfileIds = []
  for (let i = 0; i < STUDENTS.length; i++) {
    const s = STUDENTS[i]
    const [userRes] = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)',
      [s.name, `student${i + 1}@uni.edu`, pw, 'student']
    )
    studentUserIds.push(userRes.insertId)

    const phone = `+254 7${String(Math.floor(10 + Math.random() * 90)).padStart(2, '0')} ${String(Math.floor(100 + Math.random() * 900)).padStart(3, '0')} ${String(Math.floor(100 + Math.random() * 900)).padStart(3, '0')}`
    const bio = `${s.name.split(' ')[0]} is a passionate ${s.course} student looking for an internship to apply their skills in ${s.skills.split(',')[0]} and grow professionally.`

    const [profRes] = await pool.query(
      `INSERT INTO student_profiles (user_id, course, skills, phone, bio, profile_complete)
       VALUES (?,?,?,?,?,1)`,
      [userRes.insertId, s.course, s.skills, phone, bio]
    )
    studentProfileIds.push(profRes.insertId)
  }

  // Internships
  const internshipIds = []
  const deadline = (days) => {
    const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10)
  }

  for (const int of INTERNSHIPS_DATA) {
    const [iRes] = await pool.query(
      `INSERT INTO internships (company_id, title, description, requirements, location, duration, category, deadline, status, is_approved)
       VALUES (?,?,?,?,?,?,?,?,'open',1)`,
      [companyProfileIds[int.companyIdx], int.title, int.desc, int.req, int.loc, int.dur, int.cat, deadline(int.deadlineDays)]
    )
    internshipIds.push(iRes.insertId)
  }

  // Sample applications (first few students apply to first few internships)
  for (let s = 0; s < 5; s++) {
    for (let i = 0; i < 3; i++) {
      const idx = (s + i) % internshipIds.length
      await pool.query(
        `INSERT IGNORE INTO applications (student_id, internship_id, cover_letter, status) VALUES (?,?,?,?)`,
        [studentProfileIds[s], internshipIds[idx],
         `I am excited to apply for this opportunity. As a ${STUDENTS[s].course} student with skills in ${STUDENTS[s].skills}, I believe I would be a great fit.`,
         'pending']
      )
    }
  }

  console.log('\n✓ Seed complete!\n')
  console.log('Demo accounts (all use password "12345678"):')
  console.log('  Admin:   kipkosgeib1@gmail.com   / 12345678')
  for (let i = 0; i < COMPANIES.length; i++) {
    console.log(`  Company: hr@company${i + 1}.com      / 12345678`)
  }
  for (let i = 0; i < STUDENTS.length; i++) {
    console.log(`  Student: student${i + 1}@uni.edu      / 12345678`)
  }
  console.log(`\nInserted: 1 admin, ${COMPANIES.length} companies, ${STUDENTS.length} students, ${INTERNSHIPS_DATA.length} internships, 15 applications`)

  await pool.end()
  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
