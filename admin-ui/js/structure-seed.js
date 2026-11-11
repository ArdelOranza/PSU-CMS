/* ==========================================================================
   structure-seed.js — first-run sample data for University Structure
   (colleges, departments, programs) and User Management (roles, users).
   Loaded after storage.js. Records reference each other by ID, e.g.
   a department stores `collegeId`, a program stores `collegeId` + `departmentId`,
   a user stores `roleId`.
   PHP: these become rows in new tables (see README "University Structure").
   ========================================================================== */
window.CMS = window.CMS || {};

CMS.seedStructure = (function () {
  /* createdAt: earlier items get a later date, so the first row is "newest" and
     the lists open in the same order as the screenshots. */
  function stamp(i) {
    var d = new Date(Date.UTC(2026, 8, 1, 0, 0, 0) - i * 86400000);
    return d.toISOString();
  }
  function withDates(rows) {
    return rows.map(function (r, i) {
      r.createdAt = stamp(i); r.updatedAt = stamp(i);
      return r;
    });
  }
  function isoDaysAgo(n) {
    var d = new Date(); d.setDate(d.getDate() - n);
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  /* Extra sample faculty so the department heads in the design exist in the
     faculty directory. They are merged (once) into CMS.db.faculty by structure-db.js. */
  function faculty() {
    return [
      ['fac_seed_paolo', 'Engr. Paolo Diaz', 'Professor', 'Civil Engineering', 'paolo.diaz@psu.edu.ph', 'Leads structural engineering courses.'],
      ['fac_seed_lara', 'Dr. Lara Gomez', 'Professor', 'Information Technology', 'lara.gomez@psu.edu.ph', 'Teaches systems analysis and software engineering.'],
      ['fac_seed_carmen', 'Dr. Carmen Ocampo', 'Professor', 'Architecture', 'carmen.ocampo@psu.edu.ph', 'Teaches architectural design studios.'],
      ['fac_seed_elena', 'Dr. Elena Ramos', 'Professor', 'Elementary Education', 'elena.ramos@psu.edu.ph', 'Handles teacher education and curriculum courses.']
    ].map(function (r) {
      return { id: r[0], name: r[1], position: r[2], department: r[3], email: r[4], summary: r[5] };
    });
  }

  function colleges() {
    return withDates([
      { id: 'col_seed_cea', name: 'College of Engineering and Architecture', code: 'CEA', deanName: 'Dr. Roberto Lim',
        description: 'Prepares students for engineering and architecture professions.', image: '',
        contactEmail: 'cea@psu.edu.ph', contactNumber: '', vision: '', mission: '', headerImage: '', status: 'active' },
      { id: 'col_seed_coc', name: 'College of Computing', code: 'COC', deanName: 'Dr. Carmen Ocampo',
        description: 'Offers programs in computing and information technology.', image: '',
        contactEmail: 'coc@psu.edu.ph', contactNumber: '', vision: '', mission: '', headerImage: '', status: 'active' },
      { id: 'col_seed_cae', name: 'College of Arts and Education', code: 'CAE', deanName: 'Dr. Elena Ramos',
        description: 'Develops teachers, artists and language professionals.', image: '',
        contactEmail: 'cae@psu.edu.ph', contactNumber: '', vision: '', mission: '', headerImage: '', status: 'active' }
    ]);
  }

  function departments() {
    /* [id, collegeId, name, code, headId, headName, description] */
    return withDates([
      ['dept_seed_ce', 'col_seed_cea', 'Civil Engineering', 'CE', 'fac_seed_paolo', 'Engr. Paolo Diaz', 'Structural and construction'],
      ['dept_seed_it', 'col_seed_coc', 'Information Technology', 'IT', 'fac_seed_lara', 'Dr. Lara Gomez', 'Computing and software'],
      ['dept_seed_arch', 'col_seed_cea', 'Architecture', 'A', 'fac_seed_carmen', 'Dr. Carmen Ocampo', 'Design ng bahay'],
      ['dept_seed_elem', 'col_seed_cae', 'Elementary Education', 'EE', 'fac_seed_elena', 'Dr. Elena Ramos', 'Teacher education'],
      ['dept_seed_cs', 'col_seed_coc', 'Computer Science', 'CS', '', '', 'Algorithms and theory'],
      ['dept_seed_me', 'col_seed_cea', 'Mechanical Engineering', 'ME', 'fac_seed_2', 'Engr. Ramon Dela Cruz', 'Machines and thermal systems'],
      ['dept_seed_ele', 'col_seed_cea', 'Electrical Engineering', 'ELE', '', '', 'Power and electronics'],
      ['dept_seed_sec', 'col_seed_cae', 'Secondary Education', 'SE', 'fac_seed_3', 'Prof. Liza Manalo', 'High school teacher education'],
      ['dept_seed_ll', 'col_seed_cae', 'Languages and Literature', 'LL', '', '', 'Language and literary studies'],
      ['dept_seed_fa', 'col_seed_cae', 'Fine Arts', 'FA', '', '', 'Visual and performing arts']
    ].map(function (r) {
      return { id: r[0], collegeId: r[1], name: r[2], code: r[3], headId: r[4], headName: r[5], description: r[6],
               contactEmail: '', officeLocation: '', operationalHours: '', status: 'active' };
    }));
  }

  function programs() {
    /* [id, collegeId, departmentId, name, code, level, description] */
    return withDates([
      ['prog_seed_bsce', 'col_seed_cea', 'dept_seed_ce', 'BS Civil Engineering', 'BSCE', 'Bachelor', '4-year program'],
      ['prog_seed_bsit', 'col_seed_coc', 'dept_seed_it', 'BS Information Technology', 'BSIT', 'Bachelor', '4-year program'],
      ['prog_seed_bsed', 'col_seed_cae', 'dept_seed_sec', 'BS in Education', 'BSED', 'Bachelor', '4-year program'],
      ['prog_seed_bscs', 'col_seed_coc', 'dept_seed_cs', 'BS Computer Science', 'BSCS', 'Bachelor', '4-year program'],
      ['prog_seed_bsarch', 'col_seed_cea', 'dept_seed_arch', 'BS Architecture', 'BSArch', 'Bachelor', '5-year program'],
      ['prog_seed_beed', 'col_seed_cae', 'dept_seed_elem', 'Bachelor of Elementary Education', 'BEED', 'Bachelor', '4-year program']
    ].map(function (r) {
      return { id: r[0], collegeId: r[1], departmentId: r[2], name: r[3], code: r[4], degreeLevel: r[5], description: r[6],
               campus: '', careerProspects: '', admissionCriteria: '', accreditation: '', syllabusFileName: '', status: 'active' };
    }));
  }

  function roles() {
    return withDates([
      { id: 'role_seed_super', name: 'Super Administrator', tagline: 'Full system access', description: 'All permissions, settings, security' },
      { id: 'role_seed_admin', name: 'Administrator', tagline: 'Manage website content and users', description: 'Manage content, users, documents' },
      { id: 'role_seed_editor', name: 'Editor', tagline: 'Create, edit, and publish content', description: 'Publish and edit all content' },
      { id: 'role_seed_author', name: 'Author', tagline: 'Create and manage own content', description: 'Create and edit own drafts' }
    ]);
  }

  /* No passwords are ever stored (front-end demo only). */
  function users() {
    return withDates([
      { id: 'usr_seed_admin', fullName: 'Admin User', username: 'admin', email: 'admin@psu.edu.ph', roleId: 'role_seed_super', status: 'active', lastLogin: isoDaysAgo(0) },
      { id: 'usr_seed_raze', fullName: 'Raze Reyez', username: 'rreyez', email: 'rreyez@psu.edu.ph', roleId: 'role_seed_editor', status: 'active', lastLogin: isoDaysAgo(1) },
      { id: 'usr_seed_jay', fullName: 'Jay Ar Pritz', username: 'jpritz', email: 'jayprtiz@psu.edu.ph', roleId: 'role_seed_author', status: 'active', lastLogin: '2026-10-28' },
      { id: 'usr_seed_ann', fullName: 'Ann Lola', username: 'annlola', email: 'annlola@psu.edu.ph', roleId: 'role_seed_admin', status: 'suspended', lastLogin: '2026-10-02' }
    ].map(function (u) { u.photo = ''; u.collegeId = ''; u.departmentId = ''; return u; }));
  }

  return { colleges: colleges, departments: departments, programs: programs, roles: roles, users: users, faculty: faculty };
})();
