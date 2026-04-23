/**
 * Mock API router — pattern-matches (method, path) and returns the same
 * `{ success, data, ... }` envelope the real backend does.
 *
 * Unmatched requests fall through to `{ success: true, data: [] }` so the
 * UI never crashes; add a handler if you see a page looking blank in demo.
 */

import {
  getDb,
  mutate,
  nextId,
  nextNumId,
  appendAudit,
  type DemoUser,
  type DemoClass,
  type DemoTrialApplication,
  type DemoOrder,
  type DemoUserToken,
  type DemoNews,
  type DemoInstructor,
  type DemoEnrollment,
  type DemoTokenPackage,
  type DemoTag,
  type DemoTagType,
  type DemoCoupon,
  type DemoHoliday,
  type DemoClassNotice,
  type DemoSimpleContent,
} from './db';

export interface MockRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string; // without query string, without /api prefix
  query: Record<string, string>;
  body: unknown;
  token: string | null;
}

export interface MockResponse {
  success: boolean;
  data?: unknown;
  msg?: string;
  token?: string;
  user?: unknown;
  profile?: unknown;
}

// ------------------------------------------------------------------ Helpers

const DELAY_MS = 120; // small delay so UI loading states look right

function wait(): Promise<void> {
  return new Promise((r) => setTimeout(r, DELAY_MS));
}

function ok(data: unknown = undefined, extra: Partial<MockResponse> = {}): MockResponse {
  return { success: true, ...(data !== undefined ? { data } : {}), ...extra };
}

function err(msg: string): MockResponse {
  return { success: false, msg };
}

function parseUserFromToken(token: string | null): DemoUser | null {
  if (!token) return null;
  const db = getDb();
  // Token format: `demo_<userId>_<ts>`
  const m = token.match(/^demo_([a-zA-Z0-9_]+)_/);
  if (m) {
    const u = db.users.find((x) => x.id === m[1]);
    if (u) return u;
  }
  // Also accept legacy sheet_<userId>_<ts> used by AuthContext fallback
  const m2 = token.match(/^sheet_([a-zA-Z0-9_]+)_/);
  if (m2) {
    const u = db.users.find((x) => x.id === m2[1]);
    if (u) return u;
  }
  return null;
}

function profileFromUser(u: DemoUser) {
  return {
    id: u.id,
    full_name: u.name,
    role: u.role === 'admin' ? 'admin' : 'student',
    mobile: u.mobile ?? null,
    id_first_four: u.id_first_four ?? null,
    student_id: u.student_id ?? null,
    nick_name: u.nick_name ?? null,
    date_of_birth: u.date_of_birth ?? null,
    sex: u.sex ?? null,
    parents_name: u.parents_name ?? null,
    contact_number: u.contact_number ?? u.mobile ?? null,
    residential_district: u.residential_district ?? null,
    has_joined_courses: u.has_joined_courses ?? null,
    level: u.level ?? null,
  };
}

function classWithStats(c: DemoClass) {
  const db = getDb();
  const enrolled = db.enrollments.filter(
    (e) => e.class_id === c.id && e.status !== 'cancelled',
  ).length;
  return { ...c, enrolled_count: enrolled || c.enrolled_count };
}

// ---------------------------------------------------------- Route matchers

function matches(pattern: string, path: string): Record<string, string> | null {
  const pParts = pattern.split('/').filter(Boolean);
  const vParts = path.split('/').filter(Boolean);
  if (pParts.length !== vParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pParts.length; i += 1) {
    if (pParts[i].startsWith(':')) {
      params[pParts[i].slice(1)] = decodeURIComponent(vParts[i]);
    } else if (pParts[i] !== vParts[i]) {
      return null;
    }
  }
  return params;
}

// --------------------------------------------------------------- Dispatch

export async function dispatch(req: MockRequest): Promise<MockResponse> {
  await wait();
  const { method, path, body, query } = req;
  const actor = parseUserFromToken(req.token);

  // =================================================================
  //                              AUTH
  // =================================================================
  if (method === 'POST' && (path === '/user/login' || path === '/auth/login')) {
    const b = body as { loginIdentifier?: string; email?: string; password?: string };
    const id = (b?.loginIdentifier || b?.email || '').trim().toLowerCase();
    const pw = b?.password || '';
    const db = getDb();
    const u = db.users.find(
      (x) => x.email.toLowerCase() === id || x.mobile === id || x.student_id === id,
    );
    if (!u || u.password !== pw) return err('Invalid Email or Password.');
    const token = `demo_${u.id}_${Date.now()}`;
    return ok(undefined, {
      token,
      user: {
        ID: u.id,
        id: u.id,
        username: u.email.split('@')[0],
        name: u.name,
        email: u.email,
        mobile: u.mobile,
        role: u.role,
        id_first_four: u.id_first_four,
        student_id: u.student_id,
      },
      msg: 'Logged In',
    });
  }

  if (method === 'POST' && (path === '/user/register' || path === '/auth/register')) {
    const b = body as {
      email?: string;
      password?: string;
      fullName?: string;
      idLastFour?: string;
      countryCode?: string;
      mobile?: string;
    };
    const email = (b.email || '').trim();
    if (!email || !b.password) return err('Email and password required.');
    const db = getDb();
    if (db.users.some((x) => x.email.toLowerCase() === email.toLowerCase())) {
      return err('Email already exists.');
    }
    const id = nextId('user');
    const u: DemoUser = {
      id,
      email,
      password: b.password,
      name: b.fullName || email.split('@')[0],
      role: 'student',
      mobile: b.mobile,
      country_code: b.countryCode || '852',
      id_last_four: b.idLastFour,
      id_first_four: b.idLastFour,
      student_id: `std${100000 + Math.floor(Math.random() * 899999)}`,
      created_at: new Date().toISOString(),
    };
    mutate((d) => {
      d.users.push(u);
    });
    const token = `demo_${u.id}_${Date.now()}`;
    return ok(undefined, {
      token,
      user: { ID: u.id, id: u.id, email: u.email, name: u.name },
      profile: profileFromUser(u),
      msg: 'Registered',
    });
  }

  if (method === 'GET' && path === '/auth/me') {
    if (!actor) return err('Unauthorized');
    return ok(undefined, {
      user: {
        ID: actor.id,
        id: actor.id,
        username: actor.email.split('@')[0],
        name: actor.name,
        email: actor.email,
        role: actor.role,
        mobile: actor.mobile,
      },
      profile: profileFromUser(actor),
    });
  }

  if (method === 'POST' && path === '/user/forgot-password') {
    const b = body as { email?: string; mobile?: string; countryCode?: string };
    const target = b.email ?? `${b.countryCode ?? ''}${b.mobile ?? ''}`;
    if (!target) return err('Email or mobile required.');
    mutate((d) => {
      d.otps[target] = '123456';
    });
    return ok(undefined, { msg: 'OTP sent. Demo OTP is 123456.' });
  }
  if (method === 'POST' && path === '/user/verify-otp') {
    const b = body as { email?: string; otp?: string };
    if (b.otp !== '123456') return err('Invalid or expired OTP.');
    return ok({ tempToken: 'demo_temp' }, { msg: 'Verified.' });
  }
  if (method === 'POST' && path === '/user/reset-password') {
    return ok(undefined, { msg: 'Password reset successfully.' });
  }
  if (method === 'POST' && path === '/user/change-password') {
    return ok(undefined, { msg: 'Password updated.' });
  }
  if (
    method === 'POST' &&
    (path === '/user/send-verify-email' ||
      path === '/user/send-verify-mobile' ||
      path === '/user/confirm-email' ||
      path === '/user/confirm-mobile')
  ) {
    return ok(undefined, { msg: 'OK. Demo OTP is 123456.' });
  }

  // =================================================================
  //                            PUBLIC
  // =================================================================
  if (method === 'GET' && path === '/news') {
    const db = getDb();
    const lang = query.lang;
    const limit = query.limit ? Number(query.limit) : undefined;
    let list = db.news.filter((n) => n.is_active !== false).slice();
    list.sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''));
    if (limit) list = list.slice(0, limit);
    const mapped = list.map((n) => ({
      id: n.id,
      title: pickLang(n, 'title', lang),
      content: pickLang(n, 'content', lang),
      image_url: n.image_url,
      published_at: n.published_at,
      show_as_popup: n.show_as_popup ?? false,
    }));
    return ok(mapped);
  }
  const newsDetail = matches('/news/:id', path);
  if (method === 'GET' && newsDetail) {
    const db = getDb();
    const n = db.news.find((x) => String(x.id) === newsDetail.id);
    if (!n) return err('Not found');
    return ok({
      id: n.id,
      title: pickLang(n, 'title', query.lang),
      content: pickLang(n, 'content', query.lang),
      image_url: n.image_url,
      published_at: n.published_at,
    });
  }

  if (method === 'GET' && path === '/token-packages') {
    const db = getDb();
    return ok(db.tokenPackages.filter((p) => p.is_active));
  }

  if (method === 'POST' && path === '/coupons/validate') {
    const b = body as { code?: string; subtotal?: number };
    const db = getDb();
    const code = (b.code || '').trim().toUpperCase();
    const coupon = db.coupons.find((c) => c.code === code && c.is_active);
    if (!coupon) return err('Invalid or expired coupon.');
    if (coupon.min_subtotal && (b.subtotal || 0) < coupon.min_subtotal) {
      return err(`Minimum subtotal HK$${coupon.min_subtotal} required.`);
    }
    return ok({
      id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
    });
  }

  if (method === 'POST' && path === '/orders') {
    return createOrder(req);
  }

  if (method === 'GET' && path === '/classes') {
    const db = getDb();
    let list = db.classes.map(classWithStats);
    if (query.location) list = list.filter((c) => c.location === query.location);
    if (query.level) list = list.filter((c) => c.level === query.level);
    if (query.from) list = list.filter((c) => c.start_time >= query.from);
    if (query.to) list = list.filter((c) => c.start_time <= query.to);
    return ok(list);
  }

  if (method === 'GET' && (path === '/about' || path === '/home/about')) {
    const db = getDb();
    return ok(db.homeAbout);
  }
  if (method === 'GET' && path === '/contact') {
    const db = getDb();
    return ok({ settings: db.contactSettings, branches: db.contactBranches });
  }
  if (method === 'GET' && path === '/faq') {
    const db = getDb();
    return ok({
      settings: db.faqSettings,
      items: db.faqItems.filter((i) => i.is_active).sort((a, b) => a.display_order - b.display_order),
    });
  }
  if (method === 'GET' && path === '/terms') {
    return ok(getDb().terms);
  }
  if (method === 'GET' && path === '/privacy') {
    return ok(getDb().privacy);
  }
  if (method === 'POST' && path === '/trial-applications') {
    return createTrialApplication(req);
  }

  // =================================================================
  //                          STUDENT
  // =================================================================
  if (method === 'GET' && (path === '/student/tokens' || path === '/user-tokens')) {
    if (!actor) return ok([]);
    const db = getDb();
    const list = db.userTokens.filter((t) => t.user_id === actor.id && t.is_active);
    return ok(list);
  }
  if (method === 'GET' && path === '/orders/me') {
    if (!actor) return ok([]);
    const db = getDb();
    return ok(db.orders.filter((o) => o.user_id === actor.id));
  }
  if (method === 'GET' && (path === '/student/schedule' || path === '/my/schedule')) {
    if (!actor) return ok([]);
    const db = getDb();
    const enrollments = db.enrollments.filter((e) => e.user_id === actor.id);
    const classes = enrollments
      .map((e) => {
        const c = db.classes.find((x) => x.id === e.class_id);
        if (!c) return null;
        return { ...c, enrollment: e };
      })
      .filter(Boolean);
    return ok(classes);
  }
  if (method === 'GET' && path === '/student/notifications') {
    if (!actor) return ok([]);
    const db = getDb();
    return ok(db.notifications.filter((n) => n.user_id === actor.id));
  }
  if (method === 'POST' && path === '/student/sick-leave-request') {
    const b = body as { enrollmentId?: string; reason?: string };
    if (!actor) return err('Unauthorized');
    mutate((d) => {
      d.sickLeaveRequests.unshift({
        id: nextId('sick'),
        user_id: actor.id,
        user_name: actor.name,
        enrollment_id: b.enrollmentId || '',
        reason: b.reason || '',
        status: 'pending',
        created_at: new Date().toISOString(),
      });
    });
    return ok({ msg: 'Sick leave request submitted' });
  }
  if (method === 'POST' && path === '/student/extension-request') {
    const b = body as { enrollmentId?: string; reason?: string };
    if (!actor) return err('Unauthorized');
    mutate((d) => {
      d.extensionRequests.unshift({
        id: nextId('ext'),
        user_id: actor.id,
        user_name: actor.name,
        enrollment_id: b.enrollmentId || '',
        reason: b.reason || '',
        status: 'pending',
        created_at: new Date().toISOString(),
      });
    });
    return ok({ msg: 'Extension request submitted' });
  }

  // =================================================================
  //                         PAYMENT (mock)
  // =================================================================
  if (method === 'POST' && path === '/payment/checkout-session') {
    const b = body as { package_id?: string };
    const db = getDb();
    const pkg = db.tokenPackages.find((p) => p.id === b.package_id);
    if (!pkg) return err('Package not found');
    if (!actor) return err('Unauthorized');
    const orderId = nextId('ord');
    const sessionId = nextId('sess');
    const purchased = new Date().toISOString();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + pkg.validity_days);
    mutate((d) => {
      d.orders.unshift({
        id: orderId,
        user_id: actor.id,
        user_email: actor.email,
        user_name: actor.name,
        package_id: pkg.id,
        package_name: pkg.name,
        quantity: 1,
        subtotal: pkg.price,
        discount: 0,
        total: pkg.price,
        payment_method: 'card',
        payment_status: 'paid',
        stripe_session_id: sessionId,
        created_at: purchased,
        paid_at: purchased,
      });
      d.userTokens.push({
        id: nextId('ut'),
        user_id: actor.id,
        package_id: pkg.id,
        package_name: pkg.name,
        tokens: pkg.token_count,
        balance: pkg.token_count,
        expires_at: expiresAt.toISOString(),
        purchased_at: purchased,
        order_id: orderId,
        is_active: true,
      });
    });
    // Return a fake URL that points at our own success page so browser just navigates
    return ok({
      url: `${typeof window !== 'undefined' ? window.location.origin : ''}/payment/success?session_id=${sessionId}&order_id=${orderId}`,
      session_id: sessionId,
      order_id: orderId,
    });
  }
  if (method === 'GET' && path === '/payment/order-status') {
    const db = getDb();
    const sid = query.session_id;
    const oid = query.order_id;
    const order = db.orders.find((o) => o.stripe_session_id === sid || o.id === oid);
    if (!order) return ok({ status: 'unknown' });
    return ok({ status: order.payment_status, order });
  }

  // =================================================================
  //                           ADMIN CRUD
  // =================================================================

  // Dashboard stats
  if (method === 'GET' && path === '/admin/dashboard-stats') {
    const db = getDb();
    const totalRevenue = db.orders.filter((o) => o.payment_status === 'paid').reduce((s, o) => s + o.total, 0);
    const totalUsers = db.users.filter((u) => u.role === 'student').length;
    const lowTokenStudents = db.userTokens.filter((t) => t.is_active && t.balance <= 3).length;
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    const expiringStudents = db.userTokens.filter(
      (t) => t.is_active && new Date(t.expires_at) < soon,
    ).length;
    const upcomingClasses = db.classes
      .filter((c) => new Date(c.start_time) > new Date())
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .slice(0, 5)
      .map(classWithStats);
    return ok({
      totalRevenue,
      totalUsers,
      expiringStudents,
      lowTokenStudents,
      upcomingClasses,
      todayClassCount: db.classes.filter((c) =>
        c.start_time.startsWith(new Date().toISOString().split('T')[0]),
      ).length,
    });
  }

  // ---- Users
  if (method === 'GET' && path === '/admin/users') {
    const db = getDb();
    return ok(
      db.users
        .filter((u) => u.role !== 'admin')
        .map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          student_id: u.student_id,
          mobile: u.mobile,
          role: u.role,
          country_code: u.country_code,
          date_of_birth: u.date_of_birth,
          level: u.level,
          has_joined_courses: u.has_joined_courses,
          created_at: u.created_at,
        })),
    );
  }
  const adminUserId = matches('/admin/users/:id', path);
  if (method === 'PATCH' && adminUserId) {
    const patch = body as Partial<DemoUser>;
    const updated = mutate((d) => {
      const u = d.users.find((x) => x.id === adminUserId.id);
      if (!u) return null;
      Object.assign(u, patch);
      return u;
    });
    if (!updated) return err('User not found');
    return ok(updated);
  }

  // ---- User tokens admin
  const utAdminId = matches('/admin/user-tokens/:id', path);
  if (method === 'PATCH' && utAdminId) {
    const patch = body as Partial<DemoUserToken>;
    const updated = mutate((d) => {
      const t = d.userTokens.find((x) => x.id === utAdminId.id);
      if (!t) return null;
      Object.assign(t, patch);
      return t;
    });
    if (!updated) return err('Token record not found');
    return ok(updated);
  }

  // ---- Classes
  if (method === 'GET' && (path === '/admin/classes' || path === '/admin/classes?demo=1')) {
    const db = getDb();
    return ok(db.classes.map(classWithStats));
  }
  const adminClassId = matches('/admin/classes/:id', path);
  if (method === 'GET' && adminClassId) {
    const db = getDb();
    const c = db.classes.find((x) => x.id === adminClassId.id);
    if (!c) return err('Class not found');
    return ok(classWithStats(c));
  }
  if (method === 'POST' && path === '/admin/classes') {
    const patch = body as Partial<DemoClass>;
    const id = nextId('cls');
    const now = new Date();
    const created: DemoClass = {
      id,
      name: patch.name || 'New class',
      instructor: patch.instructor || '',
      start_time: patch.start_time || now.toISOString(),
      end_time: patch.end_time || now.toISOString(),
      location: patch.location || 'sanpokong',
      program_code: patch.program_code || 'NEW',
      level: patch.level || 'entry',
      age_tag: patch.age_tag || '10-12',
      capacity: patch.capacity || 12,
      enrolled_count: 0,
      weekday: patch.weekday ?? now.getDay(),
      total_lessons: patch.total_lessons || 16,
      ...patch,
      is_active: true,
    };
    mutate((d) => {
      d.classes.push(created);
    });
    appendAudit(actor?.name || 'admin', 'create', 'class', created.id, created.name);
    return ok(created);
  }
  if (method === 'PATCH' && adminClassId) {
    const patch = body as Partial<DemoClass>;
    const updated = mutate((d) => {
      const c = d.classes.find((x) => x.id === adminClassId.id);
      if (!c) return null;
      Object.assign(c, patch);
      return c;
    });
    if (!updated) return err('Class not found');
    appendAudit(actor?.name || 'admin', 'update', 'class', updated.id, updated.name);
    return ok(updated);
  }
  if (method === 'DELETE' && adminClassId) {
    mutate((d) => {
      d.classes = d.classes.filter((c) => c.id !== adminClassId.id);
    });
    return ok({ deleted: true });
  }

  const classEnrollments = matches('/admin/classes/:id/enrollments', path);
  if (method === 'GET' && classEnrollments) {
    const db = getDb();
    const list = db.enrollments
      .filter((e) => e.class_id === classEnrollments.id)
      .map((e) => {
        const u = db.users.find((x) => x.id === e.user_id);
        return { ...e, student_name: u?.name ?? e.student_name };
      });
    return ok(list);
  }
  const adminEnrollmentId = matches('/admin/class-enrollments/:id', path);
  if (method === 'PATCH' && adminEnrollmentId) {
    const patch = body as Partial<DemoEnrollment>;
    const updated = mutate((d) => {
      const e = d.enrollments.find((x) => x.id === adminEnrollmentId.id);
      if (!e) return null;
      Object.assign(e, patch);
      return e;
    });
    if (!updated) return err('Enrollment not found');
    return ok(updated);
  }

  // ---- Trial applications
  if (method === 'GET' && path === '/admin/trial-applications') {
    const db = getDb();
    return ok(db.trialApplications);
  }
  const adminTrialId = matches('/admin/trial-applications/:id', path);
  if (method === 'PATCH' && adminTrialId) {
    const patch = body as Partial<DemoTrialApplication>;
    const updated = mutate((d) => {
      const t = d.trialApplications.find((x) => x.id === adminTrialId.id);
      if (!t) return null;
      if (patch.assigned_class_id) {
        const c = d.classes.find((x) => x.id === patch.assigned_class_id);
        if (c) patch.assigned_class_name = c.name;
      }
      Object.assign(t, patch);
      return t;
    });
    if (!updated) return err('Trial application not found');
    return ok(updated);
  }

  // ---- Instructors
  if (
    method === 'GET' &&
    (path === '/admin/instructors' || path === '/instructors' || path === '/admin/instructors?demo=1')
  ) {
    const db = getDb();
    return ok(db.instructors);
  }
  const adminInstructorId = matches('/admin/instructors/:id', path);
  if (method === 'POST' && path === '/admin/instructors') {
    const patch = body as Partial<DemoInstructor>;
    const created: DemoInstructor = {
      id: nextId('inst'),
      name: patch.name || 'New instructor',
      ...patch,
      is_active: patch.is_active ?? true,
    } as DemoInstructor;
    mutate((d) => {
      d.instructors.push(created);
    });
    return ok(created);
  }
  if (method === 'PATCH' && adminInstructorId) {
    const patch = body as Partial<DemoInstructor>;
    const updated = mutate((d) => {
      const i = d.instructors.find((x) => x.id === adminInstructorId.id);
      if (!i) return null;
      Object.assign(i, patch);
      return i;
    });
    if (!updated) return err('Instructor not found');
    return ok(updated);
  }
  if (method === 'DELETE' && adminInstructorId) {
    mutate((d) => {
      d.instructors = d.instructors.filter((i) => i.id !== adminInstructorId.id);
    });
    return ok({ deleted: true });
  }

  // ---- Token packages admin
  if (method === 'GET' && path === '/admin/token-packages') {
    const db = getDb();
    return ok(db.tokenPackages);
  }
  if (method === 'POST' && path === '/admin/token-packages') {
    const patch = body as Partial<DemoTokenPackage>;
    const created: DemoTokenPackage = {
      id: nextId('pkg'),
      name: patch.name || 'New package',
      description: patch.description || '',
      token_count: patch.token_count || 1,
      price: patch.price || 0,
      validity_days: patch.validity_days || 90,
      is_active: patch.is_active ?? true,
      display_order: patch.display_order,
    };
    mutate((d) => {
      d.tokenPackages.push(created);
    });
    return ok(created);
  }
  const adminPkgId = matches('/admin/token-packages/:id', path);
  if (method === 'PATCH' && adminPkgId) {
    const patch = body as Partial<DemoTokenPackage>;
    const updated = mutate((d) => {
      const p = d.tokenPackages.find((x) => x.id === adminPkgId.id);
      if (!p) return null;
      Object.assign(p, patch);
      return p;
    });
    if (!updated) return err('Package not found');
    return ok(updated);
  }
  if (method === 'DELETE' && adminPkgId) {
    mutate((d) => {
      d.tokenPackages = d.tokenPackages.filter((p) => p.id !== adminPkgId.id);
    });
    return ok({ deleted: true });
  }

  // ---- News
  if (method === 'GET' && path === '/admin/news') {
    const db = getDb();
    return ok(db.news);
  }
  if (method === 'POST' && path === '/admin/news') {
    const patch = body as Partial<DemoNews>;
    const created: DemoNews = {
      id: nextId('news'),
      title: patch.title || 'Untitled',
      content: patch.content || '',
      image_url: patch.image_url ?? null,
      published_at: patch.published_at || new Date().toISOString(),
      ...patch,
      is_active: patch.is_active ?? true,
    } as DemoNews;
    mutate((d) => {
      d.news.unshift(created);
    });
    return ok(created);
  }
  const adminNewsId = matches('/admin/news/:id', path);
  if (method === 'PATCH' && adminNewsId) {
    const patch = body as Partial<DemoNews>;
    const updated = mutate((d) => {
      const n = d.news.find((x) => String(x.id) === adminNewsId.id);
      if (!n) return null;
      Object.assign(n, patch);
      return n;
    });
    if (!updated) return err('News not found');
    return ok(updated);
  }
  if (method === 'DELETE' && adminNewsId) {
    mutate((d) => {
      d.news = d.news.filter((n) => String(n.id) !== adminNewsId.id);
    });
    return ok({ deleted: true });
  }

  // ---- Coupons
  if (method === 'GET' && (path === '/admin/coupons' || path.startsWith('/admin/coupons'))) {
    const db = getDb();
    return ok(db.coupons);
  }
  if (method === 'POST' && path === '/admin/coupons') {
    const patch = body as Partial<DemoCoupon>;
    const created: DemoCoupon = {
      id: nextId('coup'),
      code: (patch.code || `CODE${Math.random().toString(36).slice(2, 6).toUpperCase()}`).toUpperCase(),
      discount_type: patch.discount_type || 'percentage',
      discount_value: patch.discount_value || 10,
      valid_from: patch.valid_from || null,
      valid_until: patch.valid_until || null,
      quantity: patch.quantity ?? null,
      is_active: patch.is_active ?? true,
      created_at: new Date().toISOString(),
    };
    mutate((d) => {
      d.coupons.push(created);
    });
    return ok(created);
  }
  const adminCouponId = matches('/admin/coupons/:id', path);
  if (method === 'PATCH' && adminCouponId) {
    const patch = body as Partial<DemoCoupon>;
    const updated = mutate((d) => {
      const c = d.coupons.find((x) => x.id === adminCouponId.id);
      if (!c) return null;
      Object.assign(c, patch);
      return c;
    });
    if (!updated) return err('Coupon not found');
    return ok(updated);
  }
  if (method === 'DELETE' && adminCouponId) {
    mutate((d) => {
      d.coupons = d.coupons.filter((c) => c.id !== adminCouponId.id);
    });
    return ok({ deleted: true });
  }

  // ---- Holidays
  if (
    method === 'GET' &&
    (path === '/admin/holidays' || path === 'admin/holidays')
  ) {
    return ok(getDb().holidays);
  }
  if (method === 'POST' && (path === '/admin/holidays' || path === 'admin/holidays')) {
    const patch = body as Partial<DemoHoliday>;
    const created: DemoHoliday = {
      id: nextId('hol'),
      name: patch.name || 'New holiday',
      date: patch.date || new Date().toISOString().split('T')[0],
      is_active: patch.is_active ?? true,
      remark: patch.remark,
    };
    mutate((d) => {
      d.holidays.push(created);
    });
    return ok(created);
  }
  const adminHolidayId = matches('/admin/holidays/:id', path) || matches('admin/holidays/:id', path);
  if (method === 'PATCH' && adminHolidayId) {
    const patch = body as Partial<DemoHoliday>;
    const updated = mutate((d) => {
      const h = d.holidays.find((x) => x.id === adminHolidayId.id);
      if (!h) return null;
      Object.assign(h, patch);
      return h;
    });
    if (!updated) return err('Holiday not found');
    return ok(updated);
  }
  if (method === 'DELETE' && adminHolidayId) {
    mutate((d) => {
      d.holidays = d.holidays.filter((h) => h.id !== adminHolidayId.id);
    });
    return ok({ deleted: true });
  }

  // ---- Class notices
  if (method === 'GET' && path === '/admin/class-notices') {
    return ok(getDb().classNotices);
  }
  if (method === 'POST' && path === '/admin/class-notices') {
    const patch = body as Partial<DemoClassNotice>;
    const created: DemoClassNotice = {
      id: nextId('not'),
      title: patch.title || 'New notice',
      content: patch.content || '',
      priority: patch.priority || 'info',
      start_date: patch.start_date || new Date().toISOString(),
      end_date: patch.end_date || new Date().toISOString(),
      is_active: patch.is_active ?? true,
      created_at: new Date().toISOString(),
      ...patch,
    } as DemoClassNotice;
    mutate((d) => {
      d.classNotices.unshift(created);
    });
    return ok(created);
  }
  const adminNoticeId = matches('/admin/class-notices/:id', path);
  if (method === 'PATCH' && adminNoticeId) {
    const patch = body as Partial<DemoClassNotice>;
    const updated = mutate((d) => {
      const n = d.classNotices.find((x) => x.id === adminNoticeId.id);
      if (!n) return null;
      Object.assign(n, patch);
      return n;
    });
    if (!updated) return err('Notice not found');
    return ok(updated);
  }
  if (method === 'DELETE' && adminNoticeId) {
    mutate((d) => {
      d.classNotices = d.classNotices.filter((n) => n.id !== adminNoticeId.id);
    });
    return ok({ deleted: true });
  }

  // ---- Contact CMS
  if (method === 'GET' && path === '/admin/contact/settings') {
    const db = getDb();
    return ok({ settings: db.contactSettings, branches: db.contactBranches });
  }
  if (method === 'PATCH' && path === '/admin/contact/settings') {
    const patch = body as Record<string, unknown>;
    mutate((d) => {
      Object.assign(d.contactSettings, patch);
    });
    return ok(getDb().contactSettings);
  }
  if (method === 'POST' && path === '/admin/contact/branches') {
    const patch = body as Record<string, any>;
    const id = nextNumId();
    const created = { id, name: 'New branch', address: '', ...patch };
    mutate((d) => {
      d.contactBranches.push(created);
    });
    return ok(created);
  }
  const contactBranchId = matches('/admin/contact/branches/:id', path);
  if (method === 'PATCH' && contactBranchId) {
    const updated = mutate((d) => {
      const b = d.contactBranches.find((x) => String(x.id) === contactBranchId.id);
      if (!b) return null;
      Object.assign(b, body as object);
      return b;
    });
    if (!updated) return err('Branch not found');
    return ok(updated);
  }
  if (method === 'DELETE' && contactBranchId) {
    mutate((d) => {
      d.contactBranches = d.contactBranches.filter(
        (b) => String(b.id) !== contactBranchId.id,
      );
    });
    return ok({ deleted: true });
  }
  if (method === 'POST' && path === '/admin/contact/branches/reorder') {
    const b = body as { order?: Array<string | number> };
    mutate((d) => {
      if (Array.isArray(b.order)) {
        b.order.forEach((id, idx) => {
          const br = d.contactBranches.find((x) => String(x.id) === String(id));
          if (br) br.order_no = idx;
        });
      }
    });
    return ok({ reordered: true });
  }

  // ---- FAQ CMS
  if (method === 'GET' && path === '/admin/faq/settings') {
    const db = getDb();
    return ok({ settings: db.faqSettings, items: db.faqItems });
  }
  if (method === 'PATCH' && path === '/admin/faq/settings') {
    mutate((d) => {
      Object.assign(d.faqSettings, body as object);
    });
    return ok(getDb().faqSettings);
  }
  if (method === 'POST' && path === '/admin/faq/items') {
    const id = nextNumId();
    const item = {
      id,
      question: 'New question',
      answer_html: '',
      display_order: getDb().faqItems.length,
      is_active: true,
      ...(body as object),
    };
    mutate((d) => {
      d.faqItems.push(item);
    });
    return ok(item);
  }
  const adminFaqItemId = matches('/admin/faq/items/:id', path);
  if (method === 'PATCH' && adminFaqItemId) {
    const updated = mutate((d) => {
      const it = d.faqItems.find((x) => String(x.id) === adminFaqItemId.id);
      if (!it) return null;
      Object.assign(it, body as object);
      return it;
    });
    if (!updated) return err('FAQ item not found');
    return ok(updated);
  }
  if (method === 'DELETE' && adminFaqItemId) {
    mutate((d) => {
      d.faqItems = d.faqItems.filter((i) => String(i.id) !== adminFaqItemId.id);
    });
    return ok({ deleted: true });
  }
  if (method === 'POST' && path === '/admin/faq/items/reorder') {
    const b = body as { order?: Array<string | number> };
    mutate((d) => {
      if (Array.isArray(b.order)) {
        b.order.forEach((id, idx) => {
          const it = d.faqItems.find((x) => String(x.id) === String(id));
          if (it) it.display_order = idx;
        });
      }
    });
    return ok({ reordered: true });
  }

  // ---- Terms / Privacy (PATCH /admin/terms etc)
  if (method === 'GET' && (path === '/admin/terms' || path === '/admin/privacy')) {
    const db = getDb();
    return ok(path === '/admin/terms' ? db.terms : db.privacy);
  }
  if (method === 'PATCH' && (path === '/admin/terms' || path === '/admin/privacy')) {
    const key = path === '/admin/terms' ? 'terms' : 'privacy';
    const updated = mutate((d) => {
      Object.assign(d[key] as DemoSimpleContent, body as object, {
        updated_at: new Date().toISOString(),
      });
      return d[key];
    });
    return ok(updated);
  }

  // ---- Site content (key-value CMS)
  const siteKey = matches('/admin/site-content/:key', path);
  if (method === 'GET' && siteKey) {
    const db = getDb();
    return ok(db.siteContent[siteKey.key] ?? {});
  }
  if (method === 'PATCH' && siteKey) {
    mutate((d) => {
      d.siteContent[siteKey.key] = { ...(body as object) };
    });
    return ok(getDb().siteContent[siteKey.key]);
  }
  const siteKeyPublic = matches('/site-content/:key', path);
  if (method === 'GET' && siteKeyPublic) {
    const db = getDb();
    return ok(db.siteContent[siteKeyPublic.key] ?? {});
  }

  // ---- Tags + Tag types
  if (
    method === 'GET' &&
    (path === '/tag-types' || path === '/admin/tag-types')
  ) {
    return ok(getDb().tagTypes);
  }
  if (method === 'POST' && path === '/admin/tag-types') {
    const patch = body as Partial<DemoTagType>;
    const id = nextNumId();
    const t: DemoTagType = {
      id,
      code: patch.code || `custom_${id}`,
      label_zh_tw: patch.label_zh_tw,
      label_zh_cn: patch.label_zh_cn,
      label_en: patch.label_en,
      display_order: patch.display_order ?? getDb().tagTypes.length,
      is_active: patch.is_active ?? true,
      is_system: false,
    };
    mutate((d) => {
      d.tagTypes.push(t);
    });
    return ok(t);
  }
  const adminTagTypeId = matches('/admin/tag-types/:id', path);
  if (method === 'PATCH' && adminTagTypeId) {
    const updated = mutate((d) => {
      const t = d.tagTypes.find((x) => String(x.id) === adminTagTypeId.id);
      if (!t) return null;
      const prev = t.code;
      Object.assign(t, body as object);
      if (typeof (body as DemoTagType).code === 'string' && (body as DemoTagType).code !== prev) {
        d.tags.forEach((tg) => {
          if (tg.type === prev) tg.type = (body as DemoTagType).code!;
        });
      }
      return t;
    });
    if (!updated) return err('Tag type not found');
    return ok(updated);
  }
  if (method === 'DELETE' && adminTagTypeId) {
    const db = getDb();
    const t = db.tagTypes.find((x) => String(x.id) === adminTagTypeId.id);
    if (!t) return err('Tag type not found');
    if (t.is_system) return err('Cannot delete a system tag type');
    const hasTags = db.tags.some((x) => x.type === t.code);
    if (hasTags) return err(`Tag type has ${db.tags.filter((x) => x.type === t.code).length} tags; delete tags first`);
    mutate((d) => {
      d.tagTypes = d.tagTypes.filter((x) => String(x.id) !== adminTagTypeId.id);
    });
    return ok({ deleted: true });
  }
  if (method === 'POST' && path === '/admin/tag-types/reorder') {
    const b = body as { order?: Array<string | number> };
    mutate((d) => {
      if (Array.isArray(b.order)) {
        b.order.forEach((id, idx) => {
          const tt = d.tagTypes.find((x) => String(x.id) === String(id));
          if (tt) tt.display_order = idx;
        });
      }
    });
    return ok({ reordered: true });
  }

  if (method === 'GET' && (path === '/tags' || path === '/admin/tags')) {
    const db = getDb();
    const list = query.type ? db.tags.filter((t) => t.type === query.type) : db.tags;
    return ok(list);
  }
  if (method === 'POST' && path === '/admin/tags') {
    const patch = body as Partial<DemoTag>;
    const db = getDb();
    if (patch.type && !db.tagTypes.some((tt) => tt.code === patch.type)) {
      return err('Unknown tag type');
    }
    const id = nextNumId();
    const t: DemoTag = {
      id,
      type: patch.type || 'level',
      code: patch.code || `custom_${id}`,
      label_zh_tw: patch.label_zh_tw,
      label_zh_cn: patch.label_zh_cn,
      label_en: patch.label_en,
      display_order: patch.display_order ?? db.tags.length,
      is_active: patch.is_active ?? true,
    };
    mutate((d) => {
      d.tags.push(t);
    });
    return ok(t);
  }
  const adminTagId = matches('/admin/tags/:id', path);
  if (method === 'PATCH' && adminTagId) {
    const updated = mutate((d) => {
      const t = d.tags.find((x) => String(x.id) === adminTagId.id);
      if (!t) return null;
      Object.assign(t, body as object);
      return t;
    });
    if (!updated) return err('Tag not found');
    return ok(updated);
  }
  if (method === 'DELETE' && adminTagId) {
    mutate((d) => {
      d.tags = d.tags.filter((x) => String(x.id) !== adminTagId.id);
    });
    return ok({ deleted: true });
  }
  if (method === 'POST' && path === '/admin/tags/reorder') {
    const b = body as { order?: Array<string | number> };
    mutate((d) => {
      if (Array.isArray(b.order)) {
        b.order.forEach((id, idx) => {
          const tg = d.tags.find((x) => String(x.id) === String(id));
          if (tg) tg.display_order = idx;
        });
      }
    });
    return ok({ reordered: true });
  }

  // ---- Orders admin
  if (method === 'GET' && (path === '/admin/orders' || path === 'admin/orders')) {
    const db = getDb();
    let list = db.orders.slice();
    if (query.user_id) list = list.filter((o) => o.user_id === query.user_id);
    return ok(list);
  }
  const adminOrderId = matches('/admin/orders/:id', path);
  if (method === 'GET' && adminOrderId) {
    const db = getDb();
    const o = db.orders.find((x) => x.id === adminOrderId.id);
    if (!o) return err('Order not found');
    return ok(o);
  }

  // ---- Refund records
  if (
    method === 'POST' &&
    (path === '/admin/refund-records' || path === 'admin/refund-records')
  ) {
    const patch = body as Partial<DemoOrder>;
    const created = {
      id: nextId('ref'),
      user_id: (patch as any).user_id || 'user_001',
      amount: (patch as any).amount || 0,
      reason: (patch as any).reason || '',
      status: 'pending' as const,
      created_at: new Date().toISOString(),
      ...(patch as object),
    };
    mutate((d) => {
      d.refundRecords.unshift(created as any);
    });
    return ok(created);
  }
  if (method === 'GET' && (path === '/admin/refund-records' || path === 'admin/refund-records')) {
    return ok(getDb().refundRecords);
  }

  // ---- Pending applications (extension / sick leave)
  if (method === 'GET' && path === '/admin/extension-requests') {
    return ok(getDb().extensionRequests);
  }
  const adminExtId = matches('/admin/extension-requests/:id', path);
  if (method === 'PATCH' && adminExtId) {
    const updated = mutate((d) => {
      const r = d.extensionRequests.find((x) => x.id === adminExtId.id);
      if (!r) return null;
      Object.assign(r, body as object);
      return r;
    });
    if (!updated) return err('Request not found');
    return ok(updated);
  }
  if (method === 'GET' && path === '/admin/sick-leave-requests') {
    return ok(getDb().sickLeaveRequests);
  }
  const adminSickId = matches('/admin/sick-leave-requests/:id', path);
  if (method === 'PATCH' && adminSickId) {
    const updated = mutate((d) => {
      const r = d.sickLeaveRequests.find((x) => x.id === adminSickId.id);
      if (!r) return null;
      Object.assign(r, body as object);
      return r;
    });
    if (!updated) return err('Request not found');
    return ok(updated);
  }

  // ---- Audit log
  if (method === 'GET' && (path === '/admin/audit-log' || path.startsWith('/admin/audit-log'))) {
    return ok(getDb().auditLog);
  }

  // =================================================================
  //                    ADMIN ANALYTICS DASHBOARDS
  // =================================================================
  if (method === 'GET' && path === '/admin/financial') {
    return ok(computeFinancial());
  }
  if (method === 'GET' && path === '/admin/funnel') {
    return ok(computeFunnel());
  }
  if (method === 'GET' && path === '/admin/class-health') {
    return ok(computeClassHealth());
  }
  if (method === 'GET' && path === '/admin/attendance-anomaly') {
    return ok(computeAttendanceAnomaly());
  }
  if (method === 'GET' && path === '/admin/renewal-churn') {
    return ok(computeRenewalChurn());
  }
  if (method === 'GET' && path === '/admin/instructor-performance') {
    return ok(computeInstructorPerformance());
  }
  if (method === 'GET' && path.startsWith('/admin/reports')) {
    return ok(computeReports());
  }

  // =================================================================
  //                         FALLBACK
  // =================================================================
  // Safe default: empty list / no-op. Prevents blank pages in demo.
  if (method === 'GET') return ok([]);
  return ok({ noop: true });
}

// ------------------------------------------------------------ Aux helpers

function pickLang(obj: Record<string, any>, field: string, lang?: string): string {
  const map: Record<string, string> = {
    'zh-TW': 'zh_tw',
    'zh-CN': 'zh_cn',
    en: 'en',
  };
  const suffix = lang ? map[lang] : undefined;
  if (suffix) {
    const v = obj[`${field}_${suffix}`];
    if (typeof v === 'string' && v) return v;
  }
  return String(obj[field] ?? '');
}

function createOrder(req: MockRequest): MockResponse {
  const actor = parseUserFromToken(req.token);
  const b = req.body as { package_id?: string; coupon_id?: string | null; referral_code?: string | null; payment_method?: string; payment_slip_url?: string | null };
  const db = getDb();
  const pkg = db.tokenPackages.find((p) => p.id === b.package_id);
  if (!pkg) return err('Package not found');
  const discount = 0;
  const total = pkg.price - discount;
  const created: DemoOrder = {
    id: nextId('ord'),
    user_id: actor?.id || 'guest',
    user_email: actor?.email,
    user_name: actor?.name,
    package_id: pkg.id,
    package_name: pkg.name,
    quantity: 1,
    subtotal: pkg.price,
    discount,
    total,
    coupon_id: b.coupon_id ?? null,
    referral_code: b.referral_code ?? null,
    payment_method: b.payment_method || 'fps',
    payment_status: b.payment_slip_url ? 'pending' : 'pending',
    payment_slip_url: b.payment_slip_url ?? null,
    created_at: new Date().toISOString(),
  };
  mutate((d) => {
    d.orders.unshift(created);
  });
  return ok(created);
}

function createTrialApplication(req: MockRequest): MockResponse {
  const b = req.body as Partial<DemoTrialApplication>;
  if (!b.email || !b.student_name) return err('Missing fields');
  const db = getDb();
  // auto-create user if not exists (mimics TRIAL_SIGNUP_EMAIL_SPEC)
  let u = db.users.find((x) => x.email.toLowerCase() === b.email!.toLowerCase());
  if (!u) {
    u = {
      id: nextId('user'),
      email: b.email,
      password: 'demo1234',
      name: b.student_name,
      role: 'student',
      mobile: b.mobile,
      country_code: b.country_code ?? '852',
      student_id: `std${100000 + Math.floor(Math.random() * 899999)}`,
      date_of_birth: b.date_of_birth,
      created_at: new Date().toISOString(),
    };
    mutate((d) => {
      d.users.push(u!);
    });
  }
  const created: DemoTrialApplication = {
    id: nextId('trial'),
    student_name: b.student_name!,
    email: b.email!,
    mobile: b.mobile || '',
    country_code: b.country_code,
    date_of_birth: b.date_of_birth,
    preferred_date: b.preferred_date || new Date().toISOString(),
    preferred_location: b.preferred_location,
    preferred_program: b.preferred_program,
    status: 'pending',
    user_id: u.id,
    created_at: new Date().toISOString(),
  };
  mutate((d) => {
    d.trialApplications.unshift(created);
  });
  return ok({ ...created, temp_password: 'demo1234', user_id: u.id });
}

// ------------------------------------------------------- Dashboard calcs

function computeFinancial() {
  const db = getDb();
  const paidOrders = db.orders.filter((o) => o.payment_status === 'paid');
  const totalRevenue = paidOrders.reduce((s, o) => s + o.total, 0);
  const byPackage: Record<string, { name: string; revenue: number; count: number }> = {};
  for (const o of paidOrders) {
    const key = o.package_id;
    if (!byPackage[key]) byPackage[key] = { name: o.package_name || key, revenue: 0, count: 0 };
    byPackage[key].revenue += o.total;
    byPackage[key].count += 1;
  }
  const byPaymentMethod: Record<string, number> = {};
  for (const o of paidOrders) {
    byPaymentMethod[o.payment_method] = (byPaymentMethod[o.payment_method] || 0) + o.total;
  }
  // monthly trend
  const monthly: Record<string, number> = {};
  for (const o of paidOrders) {
    const ym = (o.paid_at || o.created_at).substring(0, 7);
    monthly[ym] = (monthly[ym] || 0) + o.total;
  }
  return {
    totalRevenue,
    orderCount: paidOrders.length,
    revenueByPackage: Object.values(byPackage),
    revenueByPaymentMethod: Object.entries(byPaymentMethod).map(([method, amount]) => ({ method, amount })),
    monthlyRevenue: Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount })),
  };
}

function computeFunnel() {
  const db = getDb();
  const trials = db.trialApplications;
  const attended = trials.filter((t) => t.status === 'attended' || t.status === 'converted' || t.status === 'assigned');
  const converted = trials.filter((t) => t.status === 'converted');
  return {
    stages: [
      { stage: 'trial_applied', count: trials.length, label: '試堂申請' },
      { stage: 'trial_attended', count: attended.length, label: '已試堂' },
      { stage: 'converted', count: converted.length, label: '轉化成功' },
    ],
    conversionRate: trials.length ? (converted.length / trials.length) * 100 : 0,
    recentConverts: converted.slice(0, 10),
  };
}

function computeClassHealth() {
  const db = getDb();
  const healths = db.classes.slice(0, 12).map((c) => {
    const enrollments = db.enrollments.filter((e) => e.class_id === c.id);
    const attended = enrollments.filter((e) => e.status === 'attended').length;
    const attendanceRate = enrollments.length ? (attended / enrollments.length) * 100 : 0;
    const fillRate = c.capacity ? ((c.enrolled_count || enrollments.length) / c.capacity) * 100 : 0;
    return {
      class_id: c.id,
      class_name: c.name,
      program_code: c.program_code,
      instructor: c.instructor,
      capacity: c.capacity,
      enrolled_count: c.enrolled_count,
      fill_rate: fillRate,
      attendance_rate: 80 + Math.random() * 18,
      at_risk: fillRate < 50 || attendanceRate < 60,
    };
  });
  return {
    classes: healths,
    summary: {
      avgAttendance: healths.reduce((s, h) => s + h.attendance_rate, 0) / (healths.length || 1),
      avgFillRate: healths.reduce((s, h) => s + h.fill_rate, 0) / (healths.length || 1),
      atRiskCount: healths.filter((h) => h.at_risk).length,
    },
  };
}

function computeAttendanceAnomaly() {
  const db = getDb();
  const students = db.users.filter((u) => u.role === 'student').map((u) => ({
    user_id: u.id,
    name: u.name,
    email: u.email,
    absences_last_30_days: Math.floor(Math.random() * 3),
    consecutive_absences: Math.random() > 0.85 ? 2 : 0,
    attendance_rate: 70 + Math.random() * 30,
  }));
  const flagged = students.filter((s) => s.consecutive_absences >= 2 || s.attendance_rate < 60);
  return {
    students,
    flagged,
    summary: {
      overallAttendance: students.reduce((s, x) => s + x.attendance_rate, 0) / (students.length || 1),
      flaggedCount: flagged.length,
    },
  };
}

function computeRenewalChurn() {
  const db = getDb();
  const activeTokens = db.userTokens.filter((t) => t.is_active);
  const expiringSoon = activeTokens.filter((t) => {
    const diff = new Date(t.expires_at).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 3600 * 1000;
  });
  return {
    activeStudents: activeTokens.length,
    expiringSoon: expiringSoon.length,
    churnRate: 12.5,
    renewalRate: 78.3,
    monthly: Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return {
        month: d.toISOString().substring(0, 7),
        renewed: 4 + Math.floor(Math.random() * 6),
        churned: 1 + Math.floor(Math.random() * 3),
      };
    }),
  };
}

function computeInstructorPerformance() {
  const db = getDb();
  return db.instructors.map((i) => {
    const classes = db.classes.filter((c) => c.instructor_id === i.id);
    const totalEnrollments = classes.reduce((s, c) => s + c.enrolled_count, 0);
    return {
      instructor_id: i.id,
      name: i.name,
      class_count: classes.length,
      total_students: totalEnrollments,
      avg_rating: Number((4.2 + Math.random() * 0.7).toFixed(2)),
      retention_rate: Number((75 + Math.random() * 20).toFixed(1)),
    };
  });
}

function computeReports() {
  const db = getDb();
  return {
    totalRevenue: db.orders.filter((o) => o.payment_status === 'paid').reduce((s, o) => s + o.total, 0),
    totalUsers: db.users.filter((u) => u.role === 'student').length,
    totalClasses: db.classes.length,
    totalInstructors: db.instructors.length,
    activeTokenPackages: db.userTokens.filter((t) => t.is_active).length,
  };
}
