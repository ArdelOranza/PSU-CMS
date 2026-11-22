/* ==========================================================================
   academics-data.js — sample data + data-access API for the Academics screens
   (Colleges, Departments, Academic Programs and their detail pages).

   ONE source of truth for all six pages. Every page reads through window.PSUAcademics,
   so replacing this file with a fetch() to a PHP/JSON endpoint later does not touch
   the page scripts.

   Hierarchy (linked by IDs):  College -> Departments -> Academic Programs
                               Faculty belong to departments, news belongs to a department.

   ABOUT THE SAMPLE DATA
   - Real values come from the UX screenshots: the 6 colleges and their deans, the 9 departments
     and chairpersons on the Departments screen, the 8 programs on the Programs screen,
     the College of Computing contact details, the IT department details and its faculty, news
     and the BS Information Technology page (including the first-semester subjects).
   - Everything marked `sample: true` is a PLACEHOLDER added only so the card counts shown in the
     screenshots ("8 programs · 5 departments", 26 departments / 39 programs, pagination)
     are produced by the data instead of being typed in. It is not official PSU information.
   - Vision, mission and descriptions are the design's own placeholder text.
   - Campus assignments other than the ones shown in the screenshots are sample values.
   - Counts on the cards are calculated from these records (never hard-coded).
   ========================================================================== */
(function (global) {
  'use strict';

  var PLACEHOLDER_1 = 'This is placeholder text. Replace it with the content written in the CMS. Keep paragraphs short so they are easy to read on desktop and mobile.';
  var PLACEHOLDER_2 = 'Another paragraph goes here. This page only displays what is saved in the CMS.';

  /* Campus list as shown in the site footer */
  var CAMPUSES = [
    'Lingayen-Main', 'Alaminos', 'Asingan', 'Bayambang', 'Binmaley', 'Infanta', 'San Carlos',
    'Sta. Maria', 'Urdaneta', 'School of Advanced Studies', 'Open University Systems'
  ];

  /* ---------------------------------------------------------------- Colleges */
  /* logo: path to an emblem image (relative to this site's client-ui/ folder), e.g.
           'assets/images/colleges/computing.png'. Leave '' to show an initials badge. */
  var COLLEGES = [
    { id: 'arts-sciences', name: 'College of Arts and Sciences', abbreviation: 'CAS', logo: '',
      deanName: 'Dr. Din D. Goat', deanEmail: '', campuses: ['Lingayen-Main', 'Alaminos'],
      vision: PLACEHOLDER_1, mission: PLACEHOLDER_1, contactEmail: '', contactNumber: '', officeLocation: '' },
    { id: 'business-management', name: 'College of Business and Management', abbreviation: 'CBM', logo: '',
      deanName: 'Dr. San Sinukob', deanEmail: '', campuses: ['Lingayen-Main', 'Urdaneta'],
      vision: PLACEHOLDER_1, mission: PLACEHOLDER_1, contactEmail: '', contactNumber: '', officeLocation: '' },
    { id: 'computing', name: 'College of Computing', abbreviation: 'CCS', logo: '',
      deanName: 'Dr. Mari I. Mar', deanEmail: 'marlimar@psu.edu.ph', campuses: ['Lingayen-Main'],
      vision: PLACEHOLDER_1, mission: PLACEHOLDER_1,
      contactEmail: 'coc@psu.edu.ph', contactNumber: '+63 232 1119 8233', officeLocation: 'CCS Building, Main Campus' },
    { id: 'education', name: 'College of Education', abbreviation: 'COE', logo: '',
      deanName: 'Dr. Carl E. Des', deanEmail: '', campuses: ['Lingayen-Main', 'Bayambang', 'Sta. Maria'],
      vision: PLACEHOLDER_1, mission: PLACEHOLDER_1, contactEmail: '', contactNumber: '', officeLocation: '' },
    { id: 'engineering', name: 'College of Engineering', abbreviation: 'ENG', logo: '',
      deanName: 'Dr. Ciao Tzu', deanEmail: '', campuses: ['Lingayen-Main', 'Urdaneta'],
      vision: PLACEHOLDER_1, mission: PLACEHOLDER_1, contactEmail: '', contactNumber: '', officeLocation: '' },
    { id: 'fisheries', name: 'College of Fisheries', abbreviation: 'FIS', logo: '',
      deanName: 'Dr. Nas Nandro', deanEmail: '', campuses: ['Binmaley', 'Infanta'],
      vision: PLACEHOLDER_1, mission: PLACEHOLDER_1, contactEmail: '', contactNumber: '', officeLocation: '' }
  ];

  /* ------------------------------------------------------------ Departments */
  var DEPARTMENTS = [];
  function addDepartment(id, collegeId, name, chairperson, extra) {
    var d = {
      id: id, collegeId: collegeId, name: name, chairperson: chairperson || '',
      description: [PLACEHOLDER_1, PLACEHOLDER_2], contactEmail: '', officeLocation: '', operationalHours: '', sample: false
    };
    for (var k in (extra || {})) d[k] = extra[k];
    DEPARTMENTS.push(d);
  }
  // From the Departments screen (this order = page 1 of the screenshot)
  addDepartment('information-technology', 'computing', 'Department of Information Technology', 'Dr. Ana Riyz',
    { contactEmail: 'dit@psu.edu.ph', officeLocation: 'COC Building, Room 204', operationalHours: 'Mon to Fri, 8:00 AM to 5:00 PM' });
  addDepartment('computer-science', 'computing', 'Department of Computer Science', 'Prof. Liza Mendz');
  addDepartment('information-systems', 'computing', 'Department of Information Systems', 'Mr. Carlo Bautista');
  addDepartment('civil-engineering', 'engineering', 'Department of Civil Engineering', 'Engr. Pedro Rams');
  addDepartment('electrical-engineering', 'engineering', 'Department of Electrical Engineering', 'Engr. JD Cruz');
  addDepartment('elementary-education', 'education', 'Department of Elementary Education', 'Dr. Grace Villain');
  addDepartment('secondary-education', 'education', 'Department of Secondary Education', 'Dr. Anygma Gonzales');
  addDepartment('fisheries', 'fisheries', 'Department of Fisheries', 'Dr. Nard Villain');
  addDepartment('business-administration', 'business-management', 'Department of Business Administration', 'Ms. Rhea Doms');
  // PLACEHOLDERS so each college reaches the department count shown on the Colleges screen
  [['arts-sciences', 'CAS', 5], ['business-management', 'CBM', 3], ['education', 'COE', 4], ['engineering', 'ENG', 3], ['fisheries', 'FIS', 2]]
    .forEach(function (row) {
      for (var i = 1; i <= row[2]; i++) {
        addDepartment(row[1].toLowerCase() + '-sample-' + i, row[0], 'Sample Department ' + i + ' (' + row[1] + ')', '', { sample: true });
      }
    });

  /* --------------------------------------------------------------- Programs */
  var PROGRAMS = [];
  function addProgram(id, collegeId, departmentId, name, level, campuses, extra) {
    var p = {
      id: id, collegeId: collegeId, departmentId: departmentId, name: name, degreeLevel: level, campuses: campuses,
      description: [PLACEHOLDER_1, PLACEHOLDER_2], careerProspects: [], admissionCriteria: [], accreditation: '',
      curriculumFile: '',   // e.g. 'assets/documents/curriculum/bs-information-technology.pdf' once the real file exists
      curriculum: [], sample: false
    };
    for (var k in (extra || {})) p[k] = extra[k];
    PROGRAMS.push(p);
  }
  // From the Academic Programs screen (this order = page 1 of the screenshot)
  addProgram('bs-information-technology', 'computing', 'information-technology', 'BS Information Technology', 'Undergraduate',
    ['Lingayen-Main', 'Urdaneta'], {
      accreditation: 'AACCUP Level III',
      careerProspects: ['Software developer', 'Systems and network administrator', 'IT support and help desk specialist'],
      admissionCriteria: ['Senior high school graduate', 'Passed the College Admission Test', 'Submitted complete documentary requirements'],
      curriculum: [
        { year: 'First Year', semester: 'First Semester', subjects: [
          { code: 'IT 101', name: 'Introduction to Computing', units: 3 },
          { code: 'IT 102', name: 'Computer Programming 1', units: 3 },
          { code: 'GE 101', name: 'Understanding the Self', units: 3 },
          { code: 'PE 101', name: 'Physical Fitness', units: 2 }] },
        { year: 'First Year', semester: 'Second Semester', subjects: [] },
        { year: 'Second Year', semester: 'First Semester', subjects: [] },
        { year: 'Second Year', semester: 'Second Semester', subjects: [] }
      ] });
  addProgram('bs-computer-science', 'computing', 'computer-science', 'BS Computer Science', 'Undergraduate', ['Lingayen-Main']);
  addProgram('bachelor-secondary-education', 'education', 'secondary-education', 'Bachelor of Secondary Education', 'Undergraduate', ['Lingayen-Main', 'Bayambang']);
  addProgram('bs-civil-engineering', 'engineering', 'civil-engineering', 'BS Civil Engineering', 'Undergraduate', ['Lingayen-Main', 'Urdaneta']);
  addProgram('bs-fisheries', 'fisheries', 'fisheries', 'BS Fisheries', 'Undergraduate', ['Binmaley']);
  addProgram('bs-business-administration', 'business-management', 'business-administration', 'BS Business Administration', 'Undergraduate', ['Lingayen-Main', 'Urdaneta']);
  addProgram('master-of-arts-in-education', 'education', 'secondary-education', 'Master of Arts in Education', 'Graduate', ['School of Advanced Studies']);
  addProgram('master-in-information-technology', 'computing', 'information-technology', 'Master in Information Technology', 'Graduate', ['School of Advanced Studies']);
  // Also shown on the College of Computing details screen
  addProgram('bs-information-systems', 'computing', 'information-systems', 'BS Information Systems', 'Undergraduate', ['Lingayen-Main']);
  // PLACEHOLDERS so each college reaches the program count shown on the Colleges screen
  [['arts-sciences', 'CAS', 8], ['business-management', 'CBM', 5], ['education', 'COE', 7], ['engineering', 'ENG', 6], ['fisheries', 'FIS', 4]]
    .forEach(function (row) {
      var depts = DEPARTMENTS.filter(function (d) { return d.collegeId === row[0]; });
      var college = COLLEGES.filter(function (c) { return c.id === row[0]; })[0];
      for (var i = 1; i <= row[2]; i++) {
        addProgram(row[1].toLowerCase() + '-sample-program-' + i, row[0], depts[(i - 1) % depts.length].id,
          'Sample Program ' + i + ' (' + row[1] + ')', i % 4 === 0 ? 'Graduate' : 'Undergraduate', [college.campuses[0]], { sample: true });
      }
    });

  /* ---------------------------------------------------------------- Faculty */
  /* departmentIds: the first entry is the home department; others are shared/service teaching. */
  var FACULTY = [
    { id: 'mari-mar', fullName: 'Dr. Mari I. Mar', position: 'Dean', collegeId: 'computing', departmentIds: ['information-technology'], email: 'marlimar@psu.edu.ph', status: 'Active', profileImage: '' },
    { id: 'jd-cruz', fullName: 'Prof. JD Cruz', position: 'Associate Professor', collegeId: 'engineering', departmentIds: ['electrical-engineering', 'information-technology'], email: 'jdcruz@psu.edu.ph', status: 'Active', profileImage: '' },
    { id: 'ana-riyz', fullName: 'Dr. Ana Riyz', position: 'Department Chair', collegeId: 'computing', departmentIds: ['information-technology'], email: 'anariyz@psu.edu.ph', status: 'Active', profileImage: '' },
    { id: 'pedro-rams', fullName: 'Engr. Pedro Rams', position: 'Instructor', collegeId: 'engineering', departmentIds: ['civil-engineering', 'information-technology'], email: 'pedrorams@psu.edu.ph', status: 'Active', profileImage: '' },
    { id: 'liza-mendz', fullName: 'Prof. Liza Mendz', position: 'Department Chair', collegeId: 'computing', departmentIds: ['computer-science'], email: '', status: 'Active', profileImage: '' },
    { id: 'carlo-bautista', fullName: 'Mr. Carlo Bautista', position: 'Department Chair', collegeId: 'computing', departmentIds: ['information-systems'], email: '', status: 'Active', profileImage: '' },
    { id: 'grace-villain', fullName: 'Dr. Grace Villain', position: 'Department Chair', collegeId: 'education', departmentIds: ['elementary-education'], email: '', status: 'Active', profileImage: '' },
    { id: 'anygma-gonzales', fullName: 'Dr. Anygma Gonzales', position: 'Department Chair', collegeId: 'education', departmentIds: ['secondary-education'], email: '', status: 'Active', profileImage: '' },
    { id: 'nard-villain', fullName: 'Dr. Nard Villain', position: 'Department Chair', collegeId: 'fisheries', departmentIds: ['fisheries'], email: '', status: 'Active', profileImage: '' },
    { id: 'rhea-doms', fullName: 'Ms. Rhea Doms', position: 'Department Chair', collegeId: 'business-management', departmentIds: ['business-administration'], email: '', status: 'Active', profileImage: '' }
  ];

  /* -------------------------------------------------- Department news (dated ISO) */
  /* link: URL of the full article once it exists in the CMS; '' = shown as plain text. */
  var NEWS = [
    { id: 'n1', departmentId: 'information-technology', title: 'Department seminar on cybersecurity basics', date: '2026-10-06', type: 'News', link: '' },
    { id: 'n2', departmentId: 'information-technology', title: 'Schedule of thesis defense', date: '2026-10-02', type: 'Announcement', link: '' },
    { id: 'n3', departmentId: 'information-technology', title: 'Call for student assistants', date: '2026-09-25', type: 'Announcement', link: '' }
  ];

  /* ------------------------------------------------------------ Data access */
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function copy(list) { return list.slice(); }
  /* Undergraduate first, then graduate, keeping the sample order inside each group */
  function levelOrder(list) {
    return list.map(function (p, i) { return { p: p, i: i }; })
      .sort(function (a, b) { return (a.p.degreeLevel === b.p.degreeLevel ? 0 : a.p.degreeLevel === 'Undergraduate' ? -1 : 1) || a.i - b.i; })
      .map(function (x) { return x.p; });
  }

  var API = {
    campuses: CAMPUSES,
    levels: ['Undergraduate', 'Graduate'],
    colleges: function () { return copy(COLLEGES); },
    college: function (id) { return byId(COLLEGES, id); },
    departments: function () { return copy(DEPARTMENTS); },
    department: function (id) { return byId(DEPARTMENTS, id); },
    programs: function () { return copy(PROGRAMS); },
    program: function (id) { return byId(PROGRAMS, id); },
    faculty: function () { return copy(FACULTY); },
    departmentsOfCollege: function (collegeId) { return DEPARTMENTS.filter(function (d) { return d.collegeId === collegeId; }); },
    programsOfCollege: function (collegeId) { return levelOrder(PROGRAMS.filter(function (p) { return p.collegeId === collegeId; })); },
    programsOfDepartment: function (deptId) { return PROGRAMS.filter(function (p) { return p.departmentId === deptId; }); },
    facultyOfDepartment: function (deptId) { return FACULTY.filter(function (f) { return f.departmentIds.indexOf(deptId) !== -1; }); },
    newsOfDepartment: function (deptId) {
      return NEWS.filter(function (n) { return n.departmentId === deptId; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    },
    /* campuses a department is available at = its college's campuses */
    departmentCampuses: function (dept) { var c = byId(COLLEGES, dept.collegeId); return c ? c.campuses : []; },
    /* counts shown on cards are calculated, never typed in */
    collegeStats: function (collegeId) {
      return { departments: API.departmentsOfCollege(collegeId).length, programs: API.programsOfCollege(collegeId).length };
    },
    departmentStats: function (deptId) {
      return { faculty: API.facultyOfDepartment(deptId).length, programs: API.programsOfDepartment(deptId).length };
    },
    /* Returns a list of broken relationships (empty array = data is consistent). Used by the tests. */
    validate: function () {
      var problems = [];
      DEPARTMENTS.forEach(function (d) { if (!byId(COLLEGES, d.collegeId)) problems.push('department ' + d.id + ' -> missing college ' + d.collegeId); });
      PROGRAMS.forEach(function (p) {
        var d = byId(DEPARTMENTS, p.departmentId);
        if (!byId(COLLEGES, p.collegeId)) problems.push('program ' + p.id + ' -> missing college ' + p.collegeId);
        if (!d) problems.push('program ' + p.id + ' -> missing department ' + p.departmentId);
        else if (d.collegeId !== p.collegeId) problems.push('program ' + p.id + ' college differs from its department college');
        p.campuses.forEach(function (c) { if (CAMPUSES.indexOf(c) === -1) problems.push('program ' + p.id + ' unknown campus ' + c); });
      });
      FACULTY.forEach(function (f) {
        if (!byId(COLLEGES, f.collegeId)) problems.push('faculty ' + f.id + ' -> missing college');
        f.departmentIds.forEach(function (id) { if (!byId(DEPARTMENTS, id)) problems.push('faculty ' + f.id + ' -> missing department ' + id); });
      });
      NEWS.forEach(function (n) { if (!byId(DEPARTMENTS, n.departmentId)) problems.push('news ' + n.id + ' -> missing department'); });
      COLLEGES.forEach(function (c) { c.campuses.forEach(function (k) { if (CAMPUSES.indexOf(k) === -1) problems.push('college ' + c.id + ' unknown campus ' + k); }); });
      return problems;
    }
  };

  global.PSUAcademics = API;
})(window);
