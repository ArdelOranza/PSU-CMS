/* ==========================================================================
   seed-data.js — sample records used the first time a page loads (and when
   CMS.dev.resetAll() is called). Real data is never overwritten by this file.
   Lists are shown newest-first by `createdAt`, so the seed rows are written in
   the order they should appear on screen.
   ========================================================================== */
window.CMS = window.CMS || {};

CMS.seed = (function () {
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  /* 'YYYY-MM-DD' for today + offset days (local time) */
  function day(offset) {
    var d = new Date();
    d.setDate(d.getDate() + offset);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  /* decreasing timestamps keep the seed order when sorted newest-first */
  function stamp(i) { return new Date(Date.now() - i * 60000).toISOString(); }
  function p(text) { return '<p>' + text + '</p>'; }

  var ALL = CMS.config.allCampuses;

  function news() {
    var rows = [
      ['PSU Opens Enrollment for Second Semester', 'Campus News', 'John Rich Tagle', ALL, '2026-10-28', 'published', 'Registration for the second semester is now open for all programs.', p('Registration for the second semester is now open. Students are advised to check their schedules and settle their accounts before the deadline.')],
      ['Engineering Students Win National Design Contest', 'Academics', 'Edrian Baccarat', 'Urdaneta', '2026-10-24', 'published', 'A team of engineering students took first place in a national design competition.', p('The team presented a low-cost water filtration prototype and beat finalists from 18 other universities.')],
      ['Research Congress Call for Papers', 'Research', 'Paul Douh', ALL, '2026-10-20', 'pending', 'Researchers are invited to submit abstracts for the annual Research Congress.', p('Abstracts may be submitted until the end of next month. Accepted papers will be presented in parallel sessions.')],
      ['Intramurals 2026 Highlights', 'Sports', 'Aula Efseven', 'Lingayen', '2026-10-15', 'draft', 'A look back at the best moments of this year\'s intramurals.', p('Colleges competed in basketball, volleyball, athletics and chess over five days.')],
      ['Library Digitization Project Completed', 'Campus News', 'Viexi Arwan', 'Urdaneta', '2026-09-30', 'archived', 'Thousands of theses and journals are now available online.', p('The library finished scanning its thesis collection and added it to the online catalog.')],
      ['College of Nursing Holds Pinning Ceremony', 'Events', 'Ana Reyes', 'Lingayen', '2026-09-26', 'published', 'Graduating nursing students received their pins in a candle-lit ceremony.', p('Family members and faculty joined the ceremony held at the university auditorium.')],
      ['New Wi-Fi Access Points Installed on Campus', 'Campus News', 'Pedro Cruz', 'Binmaley', '2026-09-20', 'published', 'Faster internet is now available in classrooms and common areas.', p('IT services installed 40 new access points across three buildings.')],
      ['Faculty Research Grants Announced', 'Research', 'Paul Douh', ALL, '2026-09-12', 'published', 'Twelve research proposals were selected for funding this year.', p('The grants cover equipment, fieldwork and publication costs.')],
      ['Community Extension Program Reaches 5 Barangays', 'Community', 'John Rich Tagle', 'Bayambang', '2026-09-05', 'draft', 'Students and faculty brought free workshops to nearby communities.', p('Topics included financial literacy, first aid and basic computer skills.')],
      ['Basketball Team Advances to Regional Finals', 'Sports', 'Aula Efseven', 'Alaminos City', '2026-08-29', 'published', 'The varsity team won its semifinal match by 12 points.', p('The finals will be held next month.')],
      ['Student Council Elections Results', 'Campus News', 'Viexi Arwan', 'Santa Maria', '2026-08-18', 'archived', 'The newly elected officers will take their oath next week.', p('Voter turnout reached its highest level in five years.')],
      ['Science Fair Showcases Student Inventions', 'Academics', 'Edrian Baccarat', 'Infanta', '2026-08-10', 'pending', 'More than 60 projects were displayed at this year\'s science fair.', p('Judges awarded prizes in environment, health and technology categories.')]
    ];
    return rows.map(function (r, i) {
      return { id: 'news_seed_' + (i + 1), title: r[0], category: r[1], author: r[2], campus: r[3], publishedAt: r[4],
               status: r[5], shortDescription: r[6], content: r[7], image: '', createdAt: stamp(i), updatedAt: stamp(i) };
    });
  }

  function announcements() {
    var rows = [
      ['Midterm Examination Schedule', 'Academic', 'Registrar', ALL, 'normal', '2026-10-27', '2026-11-15', 'published', p('The midterm examination schedule has been posted. Please check your college bulletin board and the student portal.')],
      ['Suspension of Classes \u2013 Typhoon', 'Advisory', 'Admin User', ALL, 'urgent', '2026-10-22', '2026-10-25', 'published', p('Classes at all levels are suspended due to the approaching typhoon. Stay safe and monitor official advisories.')],
      ['Scholarship Application Deadline', 'Scholarship', 'Ana Reyes', ALL, 'normal', '2026-10-18', '2026-11-30', 'published', p('Applications for the scholarship program close on the date shown. Submit all requirements to the Scholarship Office.')],
      ['Faculty Meeting Notice', 'Administrative', 'Pedro Cruz', 'Urdaneta', 'normal', '2026-10-12', '2026-11-05', 'pending', p('A general faculty meeting will be held in the conference room. Attendance is required.')],
      ['Enrollment Schedule for Freshmen', 'Academic', 'Registrar', ALL, 'normal', '2026-10-26', day(40), 'published', p('Incoming freshmen should follow the enrollment schedule per college. Bring your admission slip and a valid ID.')],
      ['Library Hours During Semester Break', 'Advisory', 'Viexi Arwan', 'Lingayen', 'normal', '2026-10-20', day(25), 'published', p('The library will close at 5:00 PM during the semester break.')],
      ['Water Interruption This Week', 'Advisory', 'Admin User', 'Urdaneta', 'urgent', '2026-11-08', day(2), 'published', p('Water supply will be interrupted for pipe repairs. Please store water in advance.')],
      ['Campus Clean-up Drive', 'Administrative', 'Pedro Cruz', 'Binmaley', 'normal', '2026-11-01', day(12), 'draft', p('Volunteers are needed for the clean-up drive. Sign-up sheets are at the student affairs office.')]
    ];
    return rows.map(function (r, i) {
      return { id: 'ann_seed_' + (i + 1), title: r[0], category: r[1], author: r[2], campus: r[3], priority: r[4],
               publishedAt: r[5], expiresAt: r[6], status: r[7], content: r[8], attachment: null,
               createdAt: stamp(i), updatedAt: stamp(i) };
    });
  }

  function eventCategories() {
    return [
      { id: 'cat_academic', name: 'Academic', description: 'Lectures, forums, and academic programs' },
      { id: 'cat_cultural', name: 'Cultural', description: 'Arts, festivals, and heritage events' },
      { id: 'cat_sports', name: 'Sports', description: 'Intramurals and athletic meets' },
      { id: 'cat_seminar', name: 'Seminar', description: 'Workshops and trainings' }
    ].map(function (c, i) { c.createdAt = stamp(i); c.updatedAt = stamp(i); return c; });
  }

  /* Dates are relative to the first load, so Upcoming / Ongoing / Completed
     all show up. (+3 and +11 days match the screenshot dates on Nov 9, 2026.) */
  function events() {
    var rows = [
      ['Research Congress 2026', 'cat_academic', day(3), day(3), '08:00', '17:00', 'PSU Convention Center', 'Research Office', 'published', 'Researchers present their latest work in parallel sessions.'],
      ['Founding Anniversary', 'cat_cultural', day(11), day(11), '09:00', '', 'Main Campus Grounds', 'Office of the President', 'published', 'A celebration of the university\'s founding with a parade and program.'],
      ['Nursing Pinning Ceremony', 'cat_academic', day(-1), day(1), '14:00', '', 'Auditorium', 'College of Nursing', 'published', 'Graduating nursing students receive their pins.'],
      ['Intramurals Opening', 'cat_sports', '2026-10-05', '2026-10-05', '07:00', '', 'Oval', 'Sports Office', 'published', 'Opening parade and ceremonies for the intramurals.'],
      ['Teaching Strategies Workshop', 'cat_seminar', day(18), day(18), '13:00', '16:00', 'Faculty Lounge', 'College of Education', 'published', 'A hands-on workshop on active learning methods.'],
      ['Cultural Night', 'cat_cultural', day(25), day(25), '18:00', '21:00', 'Open Grounds', 'Student Affairs Office', 'published', 'Music, dance and food from across the region.'],
      ['Career Fair 2026', 'cat_seminar', day(32), day(32), '09:00', '16:00', 'Gymnasium', 'Career Services', 'draft', 'Meet employers and learn about job openings.'],
      ['Thesis Writing Seminar', 'cat_seminar', day(-20), day(-20), '10:00', '12:00', 'Library Hall', 'Graduate School', 'published', 'Tips on structuring and defending a thesis.']
    ];
    return rows.map(function (r, i) {
      return { id: 'evt_seed_' + (i + 1), title: r[0], categoryId: r[1], startDate: r[2], endDate: r[3], startTime: r[4], endTime: r[5],
               venue: r[6], organizer: r[7], state: r[8], description: r[9], banner: '', createdAt: stamp(i), updatedAt: stamp(i) };
    });
  }

  /* Sample data for modules owned by teammates (Documents, Faculty & Staff).
     Replace these when those modules are integrated. */
  function documents() {
    return [
      ['Enrollment Guide.pdf', 'PDF', '2026-10-10', 'Step-by-step guide to online and on-site registration.'],
      ['Student Handbook 2026-2027.pdf', 'PDF', '2026-08-01', 'Rules, rights and services for all students.'],
      ['Scholarship Application Form.docx', 'DOCX', '2026-09-15', 'Fillable form for scholarship applicants.'],
      ['Academic Calendar AY 2026-2027.pdf', 'PDF', '2026-07-20', 'Important dates for the academic year.'],
      ['Research Ethics Guidelines.pdf', 'PDF', '2026-06-30', 'Ethical standards for faculty and student research.'],
      ['Campus Map.pdf', 'PDF', '2026-06-12', 'Map of buildings, offices and facilities.']
    ].map(function (r, i) {
      return { id: 'doc_seed_' + (i + 1), title: r[0], fileType: r[1], date: r[2], summary: r[3] };
    });
  }

  function faculty() {
    return [
      ['Dr. Maria Santos', 'Professor', 'College of Nursing', 'maria.santos@example.edu', 'Teaches community health nursing and leads the clinical training program.'],
      ['Engr. Ramon Dela Cruz', 'Associate Professor', 'College of Engineering', 'ramon.delacruz@example.edu', 'Specializes in structural design and heads the engineering research group.'],
      ['Prof. Liza Manalo', 'Assistant Professor', 'College of Education', 'liza.manalo@example.edu', 'Handles courses on curriculum development and assessment.'],
      ['Dr. Jose Villanueva', 'Dean', 'College of Arts and Sciences', 'jose.villanueva@example.edu', 'Oversees academic programs in the humanities and natural sciences.'],
      ['Ms. Carmela Ortiz', 'University Registrar', 'Registrar\'s Office', 'carmela.ortiz@example.edu', 'Manages student records, registration and graduation clearance.'],
      ['Mr. Benito Flores', 'Librarian', 'University Library', 'benito.flores@example.edu', 'Coordinates library services and the digital collection.']
    ].map(function (r, i) {
      return { id: 'fac_seed_' + (i + 1), name: r[0], position: r[1], department: r[2], email: r[3], summary: r[4] };
    });
  }

  return { news: news, announcements: announcements, eventCategories: eventCategories, events: events, documents: documents, faculty: faculty };
})();
