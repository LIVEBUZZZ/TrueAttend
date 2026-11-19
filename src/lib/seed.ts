// ---------------------------------------------------------------------------
// TrueAttend — deterministic seed dataset
// ---------------------------------------------------------------------------
// Produces a fully populated database so the app is usable immediately with
// zero manual setup: 3 courses, 15 students, attendance history, an active
// live session, an audit trail and open correction disputes.
// ---------------------------------------------------------------------------

import type {
  AttendanceRecord,
  AuditLog,
  CorrectionDispute,
  Course,
  Database,
  Profile,
  Session,
  VerificationMode,
} from '../types';

export const DB_VERSION = 1;
export const DEMO_LIVE_SESSION_ID = 'ses_live_cs201';
export const DEMO_STUDENT_ID = 'usr_student_demo';
export const DEMO_INSTRUCTOR_ID = 'usr_instructor_demo';

const MIN = 60_000;
const DAY = 86_400_000;

/** Deterministic PRNG so the demo data is stable across reloads. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const AVATAR_PALETTE = [
  '#4F46E5',
  '#0EA5E9',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#6366F1',
];

const STUDENT_DEFS: Array<{ name: string; email: string; studentId: string; pin: string }> = [
  { name: 'Alex Rivera', email: 'alex.rivera@student.trueattend.app', studentId: 'STU-1001', pin: '2468' },
  { name: 'Priya Sharma', email: 'priya.sharma@student.trueattend.app', studentId: 'STU-1002', pin: '3141' },
  { name: 'Marcus Chen', email: 'marcus.chen@student.trueattend.app', studentId: 'STU-1003', pin: '5927' },
  { name: 'Sofia Almeida', email: 'sofia.almeida@student.trueattend.app', studentId: 'STU-1004', pin: '1042' },
  { name: 'Daniel Okafor', email: 'daniel.okafor@student.trueattend.app', studentId: 'STU-1005', pin: '7781' },
  { name: 'Yuki Tanaka', email: 'yuki.tanaka@student.trueattend.app', studentId: 'STU-1006', pin: '8352' },
  { name: 'Fatima Noor', email: 'fatima.noor@student.trueattend.app', studentId: 'STU-1007', pin: '6619' },
  { name: "Liam O'Brien", email: 'liam.obrien@student.trueattend.app', studentId: 'STU-1008', pin: '4407' },
  { name: 'Zoe Martin', email: 'zoe.martin@student.trueattend.app', studentId: 'STU-1009', pin: '9283' },
  { name: 'Noah Kaplan', email: 'noah.kaplan@student.trueattend.app', studentId: 'STU-1010', pin: '2716' },
  { name: 'Aisha Bello', email: 'aisha.bello@student.trueattend.app', studentId: 'STU-1011', pin: '5503' },
  { name: 'Tomas Silva', email: 'tomas.silva@student.trueattend.app', studentId: 'STU-1012', pin: '3894' },
  { name: 'Hannah Wright', email: 'hannah.wright@student.trueattend.app', studentId: 'STU-1013', pin: '7128' },
  { name: 'Raj Patel', email: 'raj.patel@student.trueattend.app', studentId: 'STU-1014', pin: '9046' },
  { name: 'Elena Petrova', email: 'elena.petrova@student.trueattend.app', studentId: 'STU-1015', pin: '6335' },
];

const MODES: VerificationMode[] = ['qr_token', 'credentials', 'biometric_check'];

export function buildSeedDatabase(): Database {
  const now = Date.now();
  const rand = mulberry32(20260120);

  // --- profiles -----------------------------------------------------------
  const instructor: Profile = {
    id: DEMO_INSTRUCTOR_ID,
    name: 'Dr. Amara Okafor',
    email: 'instructor@trueattend.app',
    role: 'instructor',
    department: 'Computer Science',
    title: 'Associate Professor',
    avatarColor: '#4F46E5',
  };

  const studentIds = STUDENT_DEFS.map((_, i) => (i === 0 ? DEMO_STUDENT_ID : `usr_stu_${1001 + i}`));

  // --- courses ------------------------------------------------------------
  const cs201Students = studentIds; // all 15
  const cs330Students = studentIds.slice(0, 12);
  const cs410Students = studentIds.slice(0, 8);

  const courses: Course[] = [
    {
      id: 'crs_cs201',
      code: 'CS-201',
      title: 'Data Structures & Algorithms',
      instructorId: DEMO_INSTRUCTOR_ID,
      room: 'Hall B-204',
      schedule: 'Mon / Wed · 10:00',
      enrolledStudentIds: cs201Students,
      color: '#4F46E5',
    },
    {
      id: 'crs_cs330',
      code: 'CS-330',
      title: 'Database Systems',
      instructorId: DEMO_INSTRUCTOR_ID,
      room: 'Lab C-110',
      schedule: 'Tue / Thu · 13:30',
      enrolledStudentIds: cs330Students,
      color: '#10B981',
    },
    {
      id: 'crs_cs410',
      code: 'CS-410',
      title: 'Human-Computer Interaction',
      instructorId: DEMO_INSTRUCTOR_ID,
      room: 'Studio A-12',
      schedule: 'Fri · 09:00',
      enrolledStudentIds: cs410Students,
      color: '#F59E0B',
    },
  ];

  const students: Profile[] = STUDENT_DEFS.map((def, i) => ({
    id: studentIds[i],
    name: def.name,
    email: def.email,
    role: 'student',
    studentId: def.studentId,
    pin: def.pin,
    department: 'Computer Science',
    courseIds: [
      'crs_cs201',
      ...(cs330Students.includes(studentIds[i]) ? ['crs_cs330'] : []),
      ...(cs410Students.includes(studentIds[i]) ? ['crs_cs410'] : []),
    ],
    avatarColor: AVATAR_PALETTE[i % AVATAR_PALETTE.length],
  }));

  // --- sessions + attendance history -------------------------------------
  const sessions: Session[] = [];
  const attendanceRecords: AttendanceRecord[] = [];
  const auditLogs: AuditLog[] = [];
  let recCounter = 1000;

  const addRecord = (
    studentId: string,
    session: Session,
    status: AttendanceRecord['status'],
    verifiedAt: number,
    method: AttendanceRecord['method'],
    note?: string,
  ) => {
    attendanceRecords.push({
      id: `att_${recCounter++}`,
      studentId,
      sessionId: session.id,
      courseId: session.courseId,
      status,
      verifiedAt,
      method,
      verificationNote: note,
    });
  };

  // Generate 4 historical sessions per course over the previous weeks.
  courses.forEach((course, courseIdx) => {
    const enrolled = course.enrolledStudentIds;
    for (let w = 4; w >= 1; w -= 1) {
      const startedAt = now - w * 7 * DAY - courseIdx * DAY + (10 + courseIdx) * 60 * MIN;
      const duration = 15;
      const session: Session = {
        id: `ses_hist_${course.code.replace('-', '')}_w${w}`,
        courseId: course.id,
        instructorId: DEMO_INSTRUCTOR_ID,
        sessionToken: `H${courseIdx}${w}${Math.floor(rand() * 900 + 100)}`.slice(0, 6),
        verificationMode: MODES[(w + courseIdx) % MODES.length],
        startedAt,
        expiresAt: startedAt + duration * MIN,
        durationMinutes: duration,
        status: 'ended',
        endedAt: startedAt + duration * MIN,
      };
      sessions.push(session);

      enrolled.forEach((studentId) => {
        const present = rand() > 0.16;
        if (present) {
          const verifiedAt = startedAt + Math.floor(rand() * (duration - 2) * MIN) + 30_000;
          addRecord(studentId, session, 'present', verifiedAt, session.verificationMode);
        } else {
          addRecord(studentId, session, 'absent', session.expiresAt, 'manual', 'No check-in recorded');
        }
      });
    }
  });

  // --- the pre-seeded ACTIVE live session ---------------------------------
  const liveStart = now - 3 * MIN;
  const liveSession: Session = {
    id: DEMO_LIVE_SESSION_ID,
    courseId: 'crs_cs201',
    instructorId: DEMO_INSTRUCTOR_ID,
    sessionToken: 'K7M2QF',
    verificationMode: 'qr_token',
    startedAt: liveStart,
    expiresAt: liveStart + 12 * MIN,
    durationMinutes: 12,
    status: 'active',
  };
  sessions.push(liveSession);

  // A handful of students already checked in to the live session.
  ['STU-1003', 'STU-1006', 'STU-1011', 'STU-1015'].forEach((sid, i) => {
    const studentId = students.find((s) => s.studentId === sid)!.id;
    addRecord(
      studentId,
      liveSession,
      'present',
      liveStart + (i + 1) * 45_000,
      'qr_token',
      'Dynamic QR / token verified',
    );
  });

  // Ensure the demo student is absent from one historical CS-201 session so a
  // dispute has a real record behind it.
  const cs201Hist = sessions.filter((s) => s.courseId === 'crs_cs201' && s.status === 'ended');
  const targetSession = cs201Hist[0];
  const demoRecord = attendanceRecords.find(
    (r) => r.studentId === DEMO_STUDENT_ID && r.sessionId === targetSession.id,
  );
  if (demoRecord) {
    demoRecord.status = 'absent';
    demoRecord.method = 'manual';
    demoRecord.verificationNote = 'No check-in recorded';
    demoRecord.verifiedAt = targetSession.expiresAt;
  }

  // --- audit trail --------------------------------------------------------
  const pushAudit = (
    partial: Omit<AuditLog, 'id' | 'timestamp'> & { timestamp?: number },
  ): AuditLog => {
    const log: AuditLog = {
      ...partial,
      id: `aud_${auditLogs.length + 1}`,
      timestamp: partial.timestamp ?? now,
    };
    auditLogs.push(log);
    return log;
  };

  pushAudit({
    actorId: DEMO_INSTRUCTOR_ID,
    actorName: instructor.name,
    actorRole: 'instructor',
    action: 'session_created',
    targetType: 'session',
    targetId: liveSession.id,
    detail: 'Launched live session for CS-201 (Dynamic QR/Token, 12 min).',
    timestamp: liveStart,
  });
  pushAudit({
    actorId: DEMO_STUDENT_ID,
    actorName: 'Alex Rivera',
    actorRole: 'student',
    action: 'attendance_verified',
    targetType: 'attendance',
    targetId: liveSession.id,
    detail: 'Verified via Dynamic QR/Token for CS-201.',
    timestamp: liveStart + MIN,
  });
  const overrideRecord = attendanceRecords.find(
    (r) => r.sessionId === cs201Hist[1]?.id && r.status === 'absent',
  );
  if (overrideRecord) {
    const st = students.find((s) => s.id === overrideRecord.studentId);
    pushAudit({
      actorId: DEMO_INSTRUCTOR_ID,
      actorName: instructor.name,
      actorRole: 'instructor',
      action: 'manual_override',
      targetType: 'attendance',
      targetId: overrideRecord.id,
      reason: 'Student provided authorized medical note.',
      detail: `Manually set ${st?.name ?? 'student'} to Present in CS-201.`,
      timestamp: now - 6 * DAY,
    });
  }

  // --- disputes -----------------------------------------------------------
  const disputes: CorrectionDispute[] = [
    {
      id: 'dsp_1',
      studentId: DEMO_STUDENT_ID,
      studentName: 'Alex Rivera',
      sessionId: targetSession.id,
      courseId: 'crs_cs201',
      attendanceRecordId: demoRecord?.id,
      message:
        'I was present for this lecture but my device failed to load the QR code. The instructor saw me in the room — please review.',
      requestedStatus: 'present',
      status: 'pending',
      createdAt: now - 2 * DAY,
    },
    {
      id: 'dsp_2',
      studentId: studentIds[1],
      studentName: 'Priya Sharma',
      sessionId: cs201Hist[2]?.id ?? targetSession.id,
      courseId: 'crs_cs201',
      message: 'My check-in did not register even though I completed the verification step.',
      requestedStatus: 'present',
      status: 'pending',
      createdAt: now - 20 * 60 * MIN,
    },
  ];

  return {
    version: DB_VERSION,
    profiles: [instructor, ...students],
    courses,
    sessions,
    attendanceRecords,
    auditLogs,
    disputes,
    currentUserId: null,
  };
}
