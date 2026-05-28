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
  type DemoProfile,
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
  type DemoNotification,
  type DemoExtensionRequest,
  type DemoSickLeaveRequest,
} from './db';
import { normalizeClassHealthPayload } from '../adminReportData';

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
  profiles?: unknown;
  requirePasswordChange?: boolean;
  // Extra fields used by specific endpoints (trial signup, etc.).
  [key: string]: unknown;
}

// ------------------------------------------------------------------ Helpers

const DELAY_MS = 120; // small delay so UI loading states look right

function wait(): Promise<void> {
  return new Promise((r) => setTimeout(r, DELAY_MS));
}

function ok(data: unknown = undefined, extra: Partial<MockResponse> = {}): MockResponse {
  return { success: true, ...(data !== undefined ? { data } : {}), ...extra };
}

function err(msg: string, code?: string): MockResponse {
  return code ? { success: false, msg, code } : { success: false, msg };
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

function profileFromDemoProfile(p: DemoProfile) {
  return {
    id: p.id,
    full_name: p.full_name,
    role: 'student' as const,
    mobile: p.mobile ?? p.contact_number ?? null,
    id_first_four: p.id_first_four ?? null,
    student_id: p.student_id ?? null,
    nick_name: p.nick_name ?? null,
    date_of_birth: p.date_of_birth ?? null,
    sex: p.sex ?? null,
    parents_name: p.parents_name ?? null,
    contact_number: p.contact_number ?? null,
    residential_district: p.residential_district ?? null,
    has_joined_courses: null,
    level: p.level ?? null,
    profile_kind: p.profile_kind,
  };
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
    profile_kind: 'student' as const,
  };
}

function demoProfileToApiRow(p: DemoProfile) {
  return {
    id: p.id,
    user_id: p.user_id,
    profile_kind: p.profile_kind,
    full_name: p.full_name,
    student_id: p.student_id ?? null,
    nick_name: p.nick_name ?? null,
    date_of_birth: p.date_of_birth ?? null,
    sex: p.sex ?? null,
    parents_name: p.parents_name ?? null,
    contact_number: p.contact_number ?? null,
    residential_district: p.residential_district ?? null,
    level: p.level ?? null,
    mobile: p.mobile ?? null,
    id_first_four: p.id_first_four ?? null,
    id_last_four: p.id_last_four ?? null,
  };
}

function parseStudentIdSequence(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const m = value.trim().toLowerCase().match(/^yayakid(\d+)$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function getNextStudentId(users: DemoUser[]): string {
  const maxSeq = users.reduce((max, u) => {
    const seq = parseStudentIdSequence(u.student_id);
    return seq != null && seq > max ? seq : max;
  }, 0);
  return `yayakid${maxSeq + 1}`;
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
      nickName?: string | null;
      nick_name?: string | null;
      dateOfBirth?: string | null;
      date_of_birth?: string | null;
      sex?: boolean | null;
      parentsName?: string | null;
      parents_name?: string | null;
      contactNumber?: string | null;
      contact_number?: string | null;
      residentialDistrict?: string | null;
      residential_district?: string | null;
      hasJoinedCourses?: boolean | null;
      has_joined_courses?: boolean | null;
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
      student_id: getNextStudentId(db.users),
      nick_name: b.nick_name ?? b.nickName ?? null,
      date_of_birth: b.date_of_birth ?? b.dateOfBirth ?? null,
      sex: b.sex ?? null,
      parents_name: b.parents_name ?? b.parentsName ?? null,
      contact_number: b.contact_number ?? b.contactNumber ?? b.mobile ?? null,
      residential_district: b.residential_district ?? b.residentialDistrict ?? null,
      has_joined_courses: b.has_joined_courses ?? b.hasJoinedCourses ?? null,
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
    const userPayload = {
      ID: actor.id,
      id: actor.id,
      username: actor.email.split('@')[0],
      name: actor.name,
      email: actor.email,
      role: actor.role,
      mobile: actor.mobile,
    };
    const db = getDb();
    const accountProfiles = db.profiles.filter((p) => p.user_id === actor.id);
    const profs =
      accountProfiles.length > 0
        ? accountProfiles
            .filter((p) => p.profile_kind === 'student')
            .map(profileFromDemoProfile)
        : [profileFromUser(actor)];
    const primary = profs[0] ?? profileFromUser(actor);
    return {
      success: true,
      data: {
        user: userPayload,
        profiles: profs.length > 0 ? profs : [primary],
        requirePasswordChange: false,
      },
      user: userPayload,
      profiles: profs.length > 0 ? profs : [primary],
      profile: primary,
      requirePasswordChange: false,
    } as MockResponse;
  }

  // Health check — AuthContext pings this on startup; returning a stable
  // serverId prevents it from logging the user out on page refresh.
  if (method === 'GET' && path === '/health') {
    return ok({ ok: true, serverId: 'demo-server-v1' });
  }

  if (method === 'POST' && path === '/user/forgot-password') {
    const b = body as { email?: string; mobile?: string; countryCode?: string };
    const email = (b.email ?? '').toString().trim().toLowerCase();
    const mobileRaw = `${b.countryCode ?? ''}${b.mobile ?? ''}`.trim();
    const target = email || mobileRaw;
    if (!target) return err('Email or mobile required.');
    const db = getDb();
    const exists = email
      ? db.users.some((u) => String(u.email ?? '').trim().toLowerCase() === email)
      : db.users.some((u) => {
          const m = String(u.mobile ?? '').trim();
          if (!m) return false;
          return m === mobileRaw || mobileRaw.endsWith(m);
        });
    if (!exists) return err('User not found.');
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

  if (method === 'GET' && path === '/about') {
    const db = getDb();
    const stored = (db.siteContent['home-about'] ?? db.siteContent['about']) as
      | Record<string, unknown>
      | undefined;
    const title = typeof stored?.title === 'string' ? stored.title : '關於我們';
    if (typeof stored?.content === 'string') {
      return ok({ title, content: stored.content });
    }
    const fromHomeAbout = db.homeAbout;
    const blocks = Array.isArray(fromHomeAbout.blocks)
      ? fromHomeAbout.blocks.map((b, i) => ({
          id:
            typeof (b as Record<string, unknown>).id === 'string'
              ? ((b as Record<string, unknown>).id as string)
              : `block_${i + 1}`,
          image_url:
            typeof (b as Record<string, unknown>).image_url === 'string'
              ? ((b as Record<string, unknown>).image_url as string)
              : null,
          body_html:
            typeof (b as Record<string, unknown>).body_html === 'string'
              ? ((b as Record<string, unknown>).body_html as string)
              : '<p></p>',
          body_html_zh_tw:
            typeof (b as Record<string, unknown>).body_html === 'string'
              ? ((b as Record<string, unknown>).body_html as string)
              : '<p></p>',
          body_html_zh_cn: '',
          body_html_en: '',
          layout: i % 2 === 0 ? 'split-image-left' : 'split-image-right',
        }))
      : [];
    const content = JSON.stringify({ schemaVersion: 1, blocks });
    return ok({ title, content });
  }
  if (method === 'GET' && path === '/home/about') {
    const db = getDb();
    return ok(db.homeAbout);
  }
  if (method === 'GET' && path === '/contact') {
    const db = getDb();
    return ok({
      ...db.contactSettings,
      intro:
        (db.contactSettings as Record<string, unknown>).intro ??
        (db.contactSettings as Record<string, unknown>).intro_html ??
        '',
      settings: db.contactSettings,
      branches: db.contactBranches,
    });
  }
  if (method === 'GET' && path === '/faq') {
    const db = getDb();
    return ok({
      ...db.faqSettings,
      intro:
        (db.faqSettings as Record<string, unknown>).intro ??
        (db.faqSettings as Record<string, unknown>).intro_html ??
        '',
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
  if (
    method === 'POST' &&
    (path === '/trial-applications' || path === '/trial-application')
  ) {
    return createTrialApplication(req);
  }

  // =================================================================
  //                          STUDENT
  // =================================================================
  if (method === 'GET' && (path === '/student/tokens' || path === '/user-tokens')) {
    if (!actor) return ok([]);
    const db = getDb();
    const list = db.userTokens
      .filter((t) => t.user_id === actor.id && t.is_active)
      .map((t) => ({
        id: t.id,
        remaining_tokens: t.balance,
        total_tokens: t.tokens,
        expiry_date: t.expires_at,
        balance: t.balance,
        tokens: t.tokens,
        expires_at: t.expires_at,
        package_name: t.package_name,
      }));
    return ok(list);
  }
  if (
    method === 'GET' &&
    (path === '/student/token-usage' ||
      path === '/student/token-transactions' ||
      path === '/user-token-transactions')
  ) {
    if (!actor) return ok([]);
    const db = getDb();
    const items: Array<{
      id: string;
      date: string;
      class_name: string;
      change: number;
      created_at: string;
    }> = [];

    for (const o of db.orders.filter((x) => x.user_id === actor.id && x.payment_status === 'paid')) {
      const pkg = db.tokenPackages.find((p) => p.id === o.package_id);
      const count = (pkg?.token_count ?? 0) * (o.quantity || 1);
      if (count <= 0) continue;
      items.push({
        id: `ord-${o.id}`,
        date: o.paid_at || o.created_at,
        created_at: o.paid_at || o.created_at,
        class_name: o.package_name || pkg?.name || '代幣套票購買',
        change: count,
      });
    }

    for (const e of db.enrollments.filter((x) => x.user_id === actor.id)) {
      const charged = Number(e.tokens_charged ?? 0);
      if (charged <= 0) continue;
      const c = db.classes.find((x) => x.id === e.class_id);
      items.push({
        id: `enr-${e.id}`,
        date: e.created_at || c?.start_time || new Date().toISOString(),
        created_at: e.created_at,
        class_name: c?.name ?? '課程報名',
        change: -charged,
      });
    }

    for (const r of db.refundRecords.filter((x) => x.user_id === actor.id)) {
      const refunded = Number(r.tokens ?? r.amount ?? 0);
      if (refunded <= 0) continue;
      items.push({
        id: `ref-${r.id}`,
        date: r.created_at,
        created_at: r.created_at,
        class_name: r.class_name ? `${r.class_name}（退代幣）` : '退代幣',
        change: refunded,
      });
    }

    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return ok(items);
  }
  if (
    method === 'GET' &&
    (path === '/student/token-refunds' ||
      path === '/student/refund-records' ||
      path === '/refunds/me')
  ) {
    if (!actor) return ok([]);
    const db = getDb();
    const refunds = db.refundRecords
      .filter((x) => x.user_id === actor.id)
      .map((r) => {
        const tokensRefunded = Number(r.tokens ?? 0);
        return {
          id: r.id,
          refunded_at: r.created_at,
          created_at: r.created_at,
          class_name: r.class_name,
          remarks: r.reason,
          tokens_refunded: tokensRefunded > 0 ? tokensRefunded : undefined,
          kind: 'refund',
        };
      })
      .filter((r) => (r.tokens_refunded ?? 0) > 0);
    return ok(refunds);
  }
  if (method === 'POST' && path === '/class-enrollments') {
    if (!actor) return err('Unauthorized', 'UNAUTHORIZED');
    const raw = (body ?? {}) as Record<string, unknown>;
    const classId = String(raw.class_id ?? raw.classId ?? '').trim();
    const lessonCount = Math.max(1, Math.floor(Number(raw.lesson_count ?? 1) || 1));
    if (!classId) return err('Missing class_id');

    const result = mutate((d) => {
      const cls = d.classes.find((c) => String(c.id) === classId);
      if (!cls) return { error: 'CLASS_NOT_FOUND' as const };
      if (cls.is_cancelled) return { error: 'CLASS_CANCELLED' as const };
      if (new Date(cls.start_time) < new Date()) return { error: 'CLASS_PAST' as const };
      if ((cls.enrolled_count ?? 0) >= (cls.capacity ?? 0)) return { error: 'CLASS_FULL' as const };

      const duplicate = d.enrollments.find(
        (e) => e.user_id === actor.id && e.class_id === cls.id && e.status === 'enrolled',
      );
      if (duplicate) return { error: 'ALREADY_ENROLLED' as const };

      const perLesson = Math.max(1, Number(cls.token_cost) || 1);
      const tokensRequired = lessonCount * perLesson;

      const packs = d.userTokens
        .filter(
          (t) =>
            t.user_id === actor.id &&
            t.is_active &&
            t.balance > 0 &&
            new Date(t.expires_at).getTime() > Date.now(),
        )
        .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());

      const totalBalance = packs.reduce((s, p) => s + p.balance, 0);
      if (totalBalance < tokensRequired) {
        return { error: 'INSUFFICIENT_TOKENS' as const, required: tokensRequired, balance: totalBalance };
      }

      let remaining = tokensRequired;
      let primaryTokenId: string | null = null;
      for (const pack of packs) {
        if (remaining <= 0) break;
        const take = Math.min(pack.balance, remaining);
        pack.balance -= take;
        remaining -= take;
        if (!primaryTokenId) primaryTokenId = pack.id;
      }

      const enrollment: DemoEnrollment = {
        id: nextId('enr'),
        class_id: cls.id,
        user_id: actor.id,
        user_token_id: primaryTokenId,
        tokens_charged: tokensRequired,
        student_name: actor.name,
        status: 'enrolled',
        lessons_used: 0,
        lessons_remaining: lessonCount,
        created_at: new Date().toISOString(),
      };
      d.enrollments.push(enrollment);
      cls.enrolled_count = (cls.enrolled_count ?? 0) + 1;
      return { enrollment, tokens_charged: tokensRequired, remaining_balance: totalBalance - tokensRequired };
    });

    if (!result) return err('Enrollment failed');
    if ('error' in result) {
      if (result.error === 'INSUFFICIENT_TOKENS') {
        return err(
          `Insufficient tokens. Required: ${result.required}, available: ${result.balance}.`,
          'INSUFFICIENT_TOKENS',
        );
      }
      if (result.error === 'CLASS_NOT_FOUND') return err('Class not found');
      if (result.error === 'CLASS_FULL') return err('Class is full');
      if (result.error === 'CLASS_PAST') return err('Cannot enroll in a past class');
      if (result.error === 'CLASS_CANCELLED') return err('Class is cancelled');
      if (result.error === 'ALREADY_ENROLLED') return err('Already enrolled in this class');
      return err('Enrollment failed');
    }
    return ok({
      ...result.enrollment,
      tokens_charged: result.tokens_charged,
      remaining_tokens: result.remaining_balance,
    });
  }
  function enrolledLessonSlotsForRow(e: DemoEnrollment, c: DemoClass): number {
    const used = Number(e.lessons_used ?? 0);
    const remaining = Number(e.lessons_remaining);
    if (Number.isFinite(remaining) && remaining >= 0) {
      const booked = remaining + used;
      if (booked > 0) return Math.floor(booked);
    }
    const charged = Number(e.tokens_charged ?? 0);
    const per = Math.max(1, Number(c.token_cost) || 1);
    if (charged > 0) return Math.max(1, Math.round(charged / per));
    return Math.max(1, Number(c.total_lessons) || 1);
  }

  if (method === 'GET' && path === '/class-enrollments/me') {
    if (!actor) return ok([]);
    const db = getDb();
    const list = db.enrollments
      .filter((e) => e.user_id === actor.id)
      .map((e) => {
        const c = db.classes.find((x) => x.id === e.class_id);
        if (!c) return null;
        const enrolledSlots = enrolledLessonSlotsForRow(e, c);
        return {
          id: e.id,
          status: e.status,
          user_id: e.user_id,
          user_token_id: e.user_token_id ?? null,
          tokens_charged: e.tokens_charged ?? null,
          lessons_remaining: e.lessons_remaining ?? null,
          lessons_used: e.lessons_used ?? 0,
          created_at: e.created_at,
          class: {
            name: c.name,
            instructor: c.instructor,
            start_time: c.start_time,
            end_time: c.end_time,
            program_code: c.program_code,
            location: c.location,
            token_cost: c.token_cost ?? 1,
          },
          attended_lessons: e.lessons_used ?? 0,
          course_total_lessons: c.total_lessons,
          total_lessons: enrolledSlots,
        };
      })
      .filter(Boolean);
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
    const actorProfiles = db.profiles.filter((p) => p.user_id === actor.id);
    const actorStudentProfiles = actorProfiles.filter((p) => p.profile_kind === 'student');
    const profileIdByName = new Map(actorStudentProfiles.map((p) => [p.full_name, p.id]));
    const rows = db.notifications
      .filter((n) => n.user_id === actor.id)
      .map((n) => {
          const row = n as DemoNotification & {
            type?: string;
            titleKey?: string;
            messageKey?: string;
            className?: string;
            dateTimeStr?: string;
            studentName?: string;
            profile_id?: string;
            student_profile_id?: string;
            scope?: string;
            target?: string;
          };
          const inferredProfileId =
            row.profile_id ??
            row.student_profile_id ??
            (row.studentName ? profileIdByName.get(row.studentName) : undefined);
          if (row.type && row.titleKey) {
            return {
              id: row.id,
              type: row.type,
              titleKey: row.titleKey,
              messageKey: row.messageKey,
              className: row.className,
              dateTimeStr: row.dateTimeStr,
              studentName: row.studentName ?? actor.name,
              profile_id: inferredProfileId,
              scope: row.scope,
              target: row.target,
              date: row.created_at,
            };
          }
          return {
            id: row.id,
            type: 'other',
            title: row.title,
            message: row.body,
            profile_id: inferredProfileId,
            scope: row.scope,
            target: row.target,
            date: row.created_at,
          };
        });
    const globalMassMessage = {
      id: `global-msg-${actor.id}`,
      type: 'class_announcement_global',
      title: '中心公告',
      message: '本中心最新安排與通知會在此顯示（全體學員）。',
      scope: 'global',
      target: 'all_students',
      date: new Date().toISOString(),
    };
    return ok([globalMassMessage, ...rows]);
  }
  if (method === 'GET' && path === '/student/upcoming-classes') {
    if (!actor) return ok([]);
    const db = getDb();
    const list = db.enrollments
      .filter((e) => e.user_id === actor.id)
      .map((e) => {
        const c = db.classes.find((x) => x.id === e.class_id);
        if (!c) return null;
        const sick = db.sickLeaveRequests.find(
          (r) => r.enrollment_id === e.id && r.user_id === actor.id,
        );
        const ext = db.extensionRequests.find(
          (r) => r.enrollment_id === e.id && r.user_id === actor.id,
        );
        const enrolledSlots = enrolledLessonSlotsForRow(e, c);
        return {
          id: e.id,
          status: e.status,
          user_id: e.user_id,
          user_name: e.student_name ?? actor.name,
          tokens_charged: e.tokens_charged ?? null,
          lessons_remaining: e.lessons_remaining ?? null,
          lessons_used: e.lessons_used ?? 0,
          class: {
            name: c.name,
            instructor: c.instructor,
            start_time: c.start_time,
            end_time: c.end_time,
            program_code: c.program_code,
            location: c.location,
            token_cost: c.token_cost ?? 1,
          },
          attended_lessons: e.lessons_used ?? 0,
          course_total_lessons: c.total_lessons,
          total_lessons: enrolledSlots,
          leave_requests: sick
            ? [
                {
                  lesson_index: 0,
                  leave_type: 'sick' as const,
                  status: sick.status,
                },
              ]
            : [],
          extension_application: ext
            ? { status: ext.status, rejection_reason: ext.rejection_reason ?? undefined }
            : undefined,
          sick_leave_application: sick
            ? { status: sick.status, rejection_reason: sick.rejection_reason ?? undefined }
            : undefined,
        };
      })
      .filter(Boolean);
    return ok(list);
  }
  if (method === 'GET' && path === '/student/application-requests') {
    if (!actor) return ok([]);
    const db = getDb();
    const rows = [
      ...db.extensionRequests
        .filter((r) => r.user_id === actor.id)
        .map((r) => {
          const enrollment = db.enrollments.find((e) => e.id === r.enrollment_id);
          return {
            id: r.id,
            kind: 'extension' as const,
            status: r.status,
            class_name: r.class_name,
            created_at: r.created_at,
            user_name: r.user_name ?? actor.name,
            user_id: enrollment?.user_id ?? r.user_id,
          };
        }),
      ...db.sickLeaveRequests
        .filter((r) => r.user_id === actor.id)
        .map((r) => {
          const enrollment = db.enrollments.find((e) => e.id === r.enrollment_id);
          return {
            id: r.id,
            kind: 'sick_leave' as const,
            status: r.status,
            class_name: r.class_name,
            class_date: r.class_date,
            created_at: r.created_at,
            user_name: r.user_name ?? actor.name,
            user_id: enrollment?.user_id ?? r.user_id,
          };
        }),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return ok(rows);
  }
  if (method === 'GET' && path === '/student/trial-applications') {
    if (!actor) return ok([]);
    const db = getDb();
    const mine = db.trialApplications.filter(
      (t) => t.user_id === actor.id || t.email.toLowerCase() === actor.email.toLowerCase(),
    );
    return ok(
      mine.map((t) => {
        const cls = t.assigned_class_id
          ? db.classes.find((c) => String(c.id) === String(t.assigned_class_id))
          : null;
        const displayStatus =
          t.status === 'assigned' ||
          t.status === 'contacted' ||
          t.status === 'attended' ||
          t.status === 'converted'
            ? t.status === 'converted'
              ? 'converted'
              : 'confirmed'
            : t.status;
        return {
          id: t.id,
          class_name:
            t.assigned_class_name || cls?.name || t.requested_trial_class_name || t.preferred_program || '試堂申請',
          status: displayStatus,
          applied_date: t.created_at,
          assigned_class_name: t.assigned_class_name ?? cls?.name ?? null,
        };
      }),
    );
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
  function demoOrderToPaymentRow(db: ReturnType<typeof getDb>, order: DemoOrder) {
    const pkg = db.tokenPackages.find((p) => p.id === order.package_id);
    const tokenCount = (pkg?.token_count ?? 0) * (order.quantity || 1);
    return {
      id: Number(String(order.id).replace(/\D/g, '')) || 0,
      order_id: order.id,
      package_id: Number(order.package_id) || 0,
      total: order.total,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      token_count: tokenCount,
      stripe_checkout_session_id: order.stripe_session_id ?? undefined,
      stripe_checkout_payment_status:
        order.payment_status === 'paid' ? 'paid' : order.stripe_session_id ? 'paid' : null,
      created_at: order.created_at,
    };
  }

  function creditTokensForPaidOrder(
    d: ReturnType<typeof getDb>,
    order: DemoOrder,
    actorUser: DemoUser,
  ) {
    if (order.payment_status !== 'paid') return;
    if (d.userTokens.some((t) => t.order_id === order.id)) return;
    const pkg = d.tokenPackages.find((p) => p.id === order.package_id);
    if (!pkg) return;
    const purchased = order.paid_at || new Date().toISOString();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + pkg.validity_days);
    const qty = order.quantity || 1;
    d.userTokens.push({
      id: nextId('ut'),
      user_id: actorUser.id,
      package_id: pkg.id,
      package_name: pkg.name,
      tokens: pkg.token_count * qty,
      balance: pkg.token_count * qty,
      expires_at: expiresAt.toISOString(),
      purchased_at: purchased,
      order_id: order.id,
      is_active: true,
    });
  }

  if (method === 'POST' && path === '/payment/checkout-session') {
    const b = body as {
      package_id?: string | number;
      return_origin?: string;
      success_url?: string;
      cancel_url?: string;
    };
    const db = getDb();
    const pkgId = String(b.package_id ?? '');
    const pkg = db.tokenPackages.find((p) => p.id === pkgId || String(p.id) === pkgId);
    if (!pkg) return err('Package not found');
    if (!actor) return err('Unauthorized');
    const orderId = nextId('ord');
    const sessionId = nextId('sess');
    const createdAt = new Date().toISOString();
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
        payment_status: 'pending',
        stripe_session_id: sessionId,
        created_at: createdAt,
        paid_at: null,
      });
    });
    const origin =
      (b.return_origin || '').replace(/\/$/, '') ||
      (typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : '');
    const successTemplate =
      b.success_url ||
      `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    const demoSuccessUrl = successTemplate.replace(/\{CHECKOUT_SESSION_ID\}/gi, sessionId);
    // Simulates Stripe redirect; tokens credited on confirm-session (like production card flow).
    return ok({
      url: demoSuccessUrl,
      session_id: sessionId,
      order_id: orderId,
      success_url: demoSuccessUrl,
      cancel_url: b.cancel_url || `${origin}/payment/cancel`,
    });
  }

  if (method === 'POST' && path === '/payment/confirm-session') {
    const b = body as { session_id?: string };
    if (!actor) return err('Unauthorized');
    const sid = (b.session_id || '').trim();
    if (!sid) return err('session_id required');
    const db = getDb();
    const order = db.orders.find((o) => o.stripe_session_id === sid && o.user_id === actor.id);
    if (!order) return err('Order not found');
    if (order.payment_method !== 'card' && order.payment_status === 'pending') {
      return err('Only card checkout can be confirmed here; FPS/cash await admin.');
    }
    const paidAt = new Date().toISOString();
    mutate((d) => {
      const o = d.orders.find((x) => x.id === order.id);
      if (!o) return;
      o.payment_status = 'paid';
      o.paid_at = o.paid_at || paidAt;
      creditTokensForPaidOrder(d, o, actor);
    });
    const updated = getDb().orders.find((o) => o.id === order.id)!;
    return ok({
      status: 'paid',
      order: demoOrderToPaymentRow(getDb(), updated),
    });
  }

  if (method === 'GET' && path === '/payment/order-status') {
    const db = getDb();
    const sid = query.session_id;
    const oid = query.internal_id || query.order_id;
    const order = db.orders.find(
      (o) =>
        (sid && o.stripe_session_id === sid) ||
        (oid && (o.id === oid || String(o.id) === oid)),
    );
    if (!order) return ok({ status: 'unknown' });
    return ok({
      status: order.payment_status,
      order: demoOrderToPaymentRow(db, order),
    });
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
        .filter((u) => u.role !== 'admin' && u.role !== 'instructor')
        .map((u) => {
          const email = u.email ?? '';
          const nick = u.nick_name?.trim();
          const tokens = db.userTokens
            .filter((t) => t.user_id === u.id && t.is_active)
            .map((t) => ({
              id: t.id,
              remaining_tokens: t.balance,
              expiry_date: t.expires_at.slice(0, 10),
            }));
          const mobileDigits = (v: string | undefined) => String(v ?? '').replace(/\D/g, '');
          const uMobile = mobileDigits(u.mobile);
          const has_trial_application = db.trialApplications.some((t) => {
            if (t.user_id && t.user_id === u.id) return true;
            if (email && t.email && email.toLowerCase() === t.email.toLowerCase()) return true;
            const tMobile = mobileDigits(t.mobile);
            if (uMobile && tMobile && uMobile === tMobile) return true;
            const uName = (u.name ?? '').trim();
            const tName = (t.student_name ?? '').trim();
            if (uName && tName && uName === tName) return true;
            return false;
          });
          const accountProfiles = db.profiles
            .filter((p) => p.user_id === u.id)
            .map(demoProfileToApiRow);
          return {
            id: u.id,
            email,
            full_name: u.name,
            name: u.name,
            username: nick && nick.length > 0 ? nick : email.includes('@') ? email.split('@')[0] : email,
            student_id: u.student_id,
            mobile: u.mobile,
            role: u.role,
            id_last_four: u.id_last_four,
            country_code: u.country_code,
            date_of_birth: u.date_of_birth,
            sex: u.sex ?? null,
            level: u.level,
            parents_name: u.parents_name,
            contact_number: u.contact_number,
            residential_district: u.residential_district,
            has_joined_courses: u.has_joined_courses,
            has_trial_application,
            created_at: u.created_at,
            user_tokens: tokens,
            profiles: accountProfiles,
            student_profile_count: accountProfiles.filter((p) => p.profile_kind === 'student').length,
          };
        }),
    );
  }
  const adminUserId = matches('/admin/users/:id', path);
  if (method === 'PATCH' && adminUserId) {
    const patch = (body ?? {}) as Record<string, unknown>;
    const db = getDb();
    const existing = db.users.find((x) => x.id === adminUserId.id);
    if (!existing) return err('User not found');
    if (patch.email != null) {
      const newEmail = String(patch.email).trim().toLowerCase();
      if (!newEmail) return err('Email is required');
      if (db.users.some((x) => x.id !== existing.id && x.email.toLowerCase() === newEmail)) {
        return err('Email already in use');
      }
    }
    const loginNameAfterPatch = (() => {
      if (patch.username != null || patch.nick_name != null) {
        const un = String(patch.username ?? patch.nick_name ?? '').trim();
        if (un) {
          if (/\s/.test(un)) return { error: 'Username cannot contain spaces' as const };
          return { value: un.toLowerCase() };
        }
      }
      const em =
        patch.email != null
          ? String(patch.email).trim().toLowerCase()
          : existing.email.trim().toLowerCase();
      if (!em) return { value: '' };
      return { value: em.includes('@') ? em.split('@')[0] : em };
    })();
    if ('error' in loginNameAfterPatch) return err(loginNameAfterPatch.error);
    const demoLoginName = (u: DemoUser) => {
      const nick = (u.nick_name ?? '').trim();
      if (nick) return nick.toLowerCase();
      const em = u.email.trim().toLowerCase();
      return em.includes('@') ? em.split('@')[0] : em;
    };
    if (
      (patch.email != null || patch.username != null || patch.nick_name != null) &&
      loginNameAfterPatch.value &&
      db.users.some(
        (x) => x.id !== existing.id && demoLoginName(x) === loginNameAfterPatch.value,
      )
    ) {
      return err('Username already in use');
    }
    const updated = mutate((d) => {
      const u = d.users.find((x) => x.id === adminUserId.id);
      if (!u) return null;
      if (patch.full_name != null) u.name = String(patch.full_name).trim();
      if (patch.name != null) u.name = String(patch.name).trim();
      if (patch.mobile != null) u.mobile = String(patch.mobile).trim() || undefined;
      if (patch.id_card_last4 != null || patch.id_last_four != null) {
        u.id_last_four = String(patch.id_card_last4 ?? patch.id_last_four ?? '').trim() || undefined;
      }
      if (patch.email != null) u.email = String(patch.email).trim().toLowerCase();
      if (patch.username != null || patch.nick_name != null) {
        const un = String(patch.username ?? patch.nick_name ?? '').trim();
        u.nick_name = un || null;
      }
      if (patch.student_id != null) u.student_id = patch.student_id ? String(patch.student_id) : undefined;
      if (patch.parents_name != null) {
        u.parents_name = String(patch.parents_name).trim() || null;
      }
      if (patch.contact_number != null) {
        u.contact_number = String(patch.contact_number).trim() || null;
      }
      if (patch.residential_district !== undefined) {
        const rd = patch.residential_district;
        u.residential_district =
          rd == null || String(rd).trim() === '' ? null : String(rd).trim();
      }

      const accountProfiles = d.profiles.filter((p) => p.user_id === u.id);
      const parentProfile = accountProfiles.find((p) => p.profile_kind === 'parent');
      if (parentProfile) {
        if (patch.parents_name != null) {
          parentProfile.full_name = String(patch.parents_name).trim() || parentProfile.full_name;
          parentProfile.parents_name = String(patch.parents_name).trim() || null;
        }
        if (patch.contact_number != null) {
          parentProfile.contact_number = String(patch.contact_number).trim() || null;
        }
        if (patch.residential_district !== undefined) {
          const rd = patch.residential_district;
          parentProfile.residential_district =
            rd == null || String(rd).trim() === '' ? null : String(rd).trim();
        }
        if (patch.mobile != null) {
          parentProfile.mobile = String(patch.mobile).trim() || null;
        }
      }

      const studentRows = patch.student_profiles ?? patch.profiles;
      if (Array.isArray(studentRows)) {
        for (const row of studentRows) {
          const r = row as Record<string, unknown>;
          const profileId = r.id != null ? String(r.id) : '';
          if (!profileId) continue;
          const p = d.profiles.find((x) => x.id === profileId && x.user_id === u.id);
          if (!p || p.profile_kind === 'parent') continue;
          if (r.full_name != null) p.full_name = String(r.full_name).trim();
          if (r.date_of_birth !== undefined) {
            const dob = r.date_of_birth;
            p.date_of_birth =
              dob == null || String(dob).trim() === '' ? null : String(dob).slice(0, 10);
          }
          if (r.sex !== undefined) {
            if (r.sex === null || r.sex === '') p.sex = null;
            else if (typeof r.sex === 'boolean') p.sex = r.sex;
            else if (typeof r.sex === 'number') p.sex = r.sex !== 0;
            else {
              const s = String(r.sex).trim().toLowerCase();
              if (['1', 'true', 'yes', 'male', 'm'].includes(s)) p.sex = true;
              else if (['0', 'false', 'no', 'female', 'f'].includes(s)) p.sex = false;
              else p.sex = null;
            }
          }
          if (r.id_card_last4 != null || r.id_last_four != null) {
            const last4 = String(r.id_card_last4 ?? r.id_last_four ?? '').trim();
            p.id_last_four = last4 || null;
          }
          if (patch.parents_name != null) {
            p.parents_name = String(patch.parents_name).trim() || null;
          }
          if (patch.residential_district !== undefined) {
            const rd = patch.residential_district;
            p.residential_district =
              rd == null || String(rd).trim() === '' ? null : String(rd).trim();
          }
        }
      }

      if (patch.parents_name != null && accountProfiles.length > 0) {
        const parentName = String(patch.parents_name).trim();
        accountProfiles
          .filter((p) => p.profile_kind === 'student')
          .forEach((p) => {
            p.parents_name = parentName || null;
          });
      }

      return u;
    });
    if (!updated) return err('User not found');
    const dbAfter = getDb();
    const accountProfiles = dbAfter.profiles
      .filter((p) => p.user_id === updated.id)
      .map(demoProfileToApiRow);
    return ok({
      success: true,
      data: {
        ...updated,
        full_name: updated.name,
        profiles: accountProfiles,
        student_profile_count: accountProfiles.filter((p) => p.profile_kind === 'student').length,
      },
    });
  }
  if (method === 'DELETE' && adminUserId) {
    const removed = mutate((d) => {
      const idx = d.users.findIndex((x) => x.id === adminUserId.id);
      if (idx < 0) return null;
      const [user] = d.users.splice(idx, 1);
      if (user.role === 'admin') {
        d.users.splice(idx, 0, user);
        return null;
      }
      d.userTokens = d.userTokens.filter((t) => t.user_id !== adminUserId.id);
      d.orders = d.orders.filter((o) => o.user_id !== adminUserId.id);
      d.enrollments = d.enrollments.filter((e) => e.user_id !== adminUserId.id);
      return user;
    });
    if (!removed) return err('User not found or cannot delete this account');
    return ok({ success: true, msg: 'User deleted.' });
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
    const id = String(nextNumId());
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

  // Bulk create a recurring series (e.g. 16 weekly lessons from a first date).
  if (
    method === 'POST' &&
    (path === '/admin/classes/recurring' || path === 'admin/classes/recurring')
  ) {
    const b = (body ?? {}) as Record<string, any>;
    const firstDate = b.first_date || new Date().toISOString().split('T')[0];
    const startTime = b.start_time || '16:00';
    const endTime = b.end_time || '17:00';
    const n = Math.max(1, Math.min(52, Number(b.number_of_lessons) || 1));
    const base = new Date(`${firstDate}T${startTime}:00`);
    const end = new Date(`${firstDate}T${endTime}:00`);
    const weekday = base.getDay();
    const created: DemoClass[] = [];
    mutate((d) => {
      for (let i = 0; i < n; i++) {
        const s = new Date(base);
        s.setDate(base.getDate() + i * 7);
        const e = new Date(end);
        e.setDate(end.getDate() + i * 7);
        const id = String(nextNumId());
        const c: DemoClass = {
          id,
          name: b.name || 'New class',
          name_zh_tw: b.name_zh_tw,
          name_zh_cn: b.name_zh_cn,
          name_en: b.name_en,
          instructor: b.instructor || '',
          start_time: s.toISOString(),
          end_time: e.toISOString(),
          location: b.location || 'sanpokong',
          program_code: b.program_code || 'NEW',
          level: b.level || 'entry',
          age_tag: b.age_group || b.age_tag || '10-12',
          capacity: Number(b.capacity) || 12,
          enrolled_count: 0,
          weekday,
          total_lessons: n,
          lesson_number: i + 1,
          is_internal: b.is_internal === 1 || b.is_internal === true,
          is_cancelled: false,
          allow_trial: b.allow_trial === 1 || b.allow_trial === true,
          is_active: true,
        } as DemoClass;
        d.classes.push(c);
        created.push(c);
      }
    });
    appendAudit(actor?.name || 'admin', 'bulk_create', 'class', '', `${n} lessons`);
    // Frontend reads res.data as array.
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
  // Map internal `DemoTrialApplication` to the shape `TrialApplicationsPage`
  // expects (backend MySQL-style columns).
  function toAdminTrialRow(t: DemoTrialApplication) {
    const d = getDb();
    const cls = t.assigned_class_id
      ? d.classes.find((c) => String(c.id) === String(t.assigned_class_id))
      : null;
    const resolvedProgramCode =
      t.preferred_program || cls?.program_code || null;
    return {
      id: t.id,
      applicant_name: t.student_name,
      full_name: t.student_name,
      applicant_email: t.email,
      email: t.email,
      applicant_phone: t.mobile,
      mobile: t.mobile,
      contact_number: t.mobile,
      residential_district: null,
      trial_class:
        t.assigned_class_name ||
        cls?.name ||
        t.requested_trial_class_name ||
        t.preferred_program ||
        '',
      course_code: resolvedProgramCode,
      program_code: resolvedProgramCode,
      class_code: resolvedProgramCode,
      class_name: t.assigned_class_name || cls?.name || '',
      branch: t.preferred_location ?? cls?.location ?? null,
      preferred_datetime: t.preferred_date,
      preferred_date: t.preferred_date,
      trial_date: cls?.start_time || t.preferred_date,
      status:
        t.status === 'assigned' ||
        t.status === 'contacted' ||
        t.status === 'attended' ||
        t.status === 'converted'
          ? 'confirmed'
          : t.status,
      assigned_class_id: t.assigned_class_id ?? null,
      assigned_class_name: t.assigned_class_name ?? cls?.name ?? null,
      assigned_lessons: t.assigned_lessons ?? null,
      class_total_lessons: cls?.total_lessons ?? null,
      notes: t.notes ?? '',
      applied_at: t.created_at,
      created_at: t.created_at,
      updated_at: t.created_at,
      user_id: t.user_id ?? null,
    };
  }

  if (method === 'GET' && path === '/admin/trial-applications') {
    const db = getDb();
    return ok(db.trialApplications.map(toAdminTrialRow));
  }
  if (method === 'POST' && path === '/admin/trial-applications') {
    const raw = (body ?? {}) as Record<string, unknown>;
    const applicantName = String(raw.applicant_name ?? raw.full_name ?? raw.student_name ?? '').trim();
    const applicantPhone = String(raw.applicant_phone ?? raw.contact_number ?? raw.mobile ?? '').trim();
    const trialClass = String(
      raw.trial_class ?? raw.class_name ?? raw.trialClassName ?? raw.requested_trial_class_name ?? ''
    ).trim();
    const courseCode = String(
      raw.course_code ?? raw.class_code ?? raw.program_code ?? raw.programCode ?? raw.preferred_program ?? ''
    ).trim();
    const preferredDate = String(
      raw.preferred_datetime ?? raw.preferred_date ?? raw.trial_date ?? new Date().toISOString()
    ).trim();
    const branch = String(raw.branch ?? raw.location ?? raw.preferred_location ?? '').trim();
    const notes = String(raw.notes ?? '').trim();
    const createdAt = String(raw.applied_at ?? raw.created_at ?? new Date().toISOString()).trim();
    const classId = String(raw.class_id ?? raw.assigned_class_id ?? '').trim();
    const rawStatus = String(raw.status ?? 'pending').trim().toLowerCase();

    if (!applicantName || !applicantPhone || !trialClass) {
      return err('Missing required fields: applicant_name, applicant_phone, trial_class');
    }

    const dbStatus: DemoTrialApplication['status'] =
      rawStatus === 'cancelled'
        ? 'cancelled'
        : rawStatus === 'confirmed'
          ? 'assigned'
          : 'pending';

    const created: DemoTrialApplication = {
      id: nextId('trial'),
      student_name: applicantName,
      email: `trial_${Date.now()}@demo.local`,
      mobile: applicantPhone,
      preferred_date: preferredDate || new Date().toISOString(),
      preferred_location: branch || undefined,
      preferred_program: courseCode || trialClass,
      requested_trial_class_name: trialClass,
      assigned_class_id: classId || null,
      assigned_class_name: null,
      assigned_lessons: null,
      status: dbStatus,
      notes: notes || null,
      user_id: null,
      created_at: createdAt || new Date().toISOString(),
    };
    mutate((d) => {
      d.trialApplications.unshift(created);
    });
    return ok(toAdminTrialRow(created));
  }
  const adminTrialId = matches('/admin/trial-applications/:id', path);
  if (method === 'PATCH' && adminTrialId) {
    const rawPatch = (body ?? {}) as Record<string, unknown>;
    const patch = { ...rawPatch } as Partial<DemoTrialApplication> & {
      assigned_class_id?: unknown;
      status?: string;
    };
    const previous = getDb().trialApplications.find(
      (x) => String(x.id) === String(adminTrialId.id),
    );
    const previousSelectable =
      previous?.status === 'cancelled'
        ? 'cancelled'
        : previous?.status === 'assigned' ||
            ['contacted', 'attended', 'converted'].includes(String(previous?.status))
          ? 'confirmed'
          : 'pending';
    const nextStatus = String(patch.status ?? previous?.status ?? 'pending').toLowerCase();
    const becameConfirmed =
      nextStatus === 'confirmed' && previousSelectable !== 'confirmed';
    const sendConfirmationEmail = rawPatch.sendConfirmationEmail === true;

    const updated = mutate((d) => {
      const t = d.trialApplications.find(
        (x) => String(x.id) === String(adminTrialId.id),
      );
      if (!t) return null;
      // Frontend sends assigned_class_id as Number; compare loosely.
      if (patch.assigned_class_id != null && patch.assigned_class_id !== '') {
        const cid = String(patch.assigned_class_id);
        const c = d.classes.find((x) => String(x.id) === cid);
        if (c) {
          patch.assigned_class_id = c.id;
          patch.assigned_class_name = c.name;
        }
      } else if (patch.assigned_class_id === null) {
        patch.assigned_class_name = null;
      }
      if (nextStatus === 'confirmed') {
        t.status = 'assigned';
      } else if (nextStatus === 'cancelled') {
        t.status = 'cancelled';
      } else if (nextStatus === 'pending') {
        t.status = 'pending';
      }
      if (typeof rawPatch.notes === 'string') t.notes = rawPatch.notes;
      if (rawPatch.branch && typeof rawPatch.branch === 'string') {
        t.preferred_location = rawPatch.branch;
      }
      return t;
    });
    if (!updated) return err('Trial application not found');
    const row = toAdminTrialRow(updated);
    const confirmationEmailSent =
      becameConfirmed && sendConfirmationEmail && Boolean(String(rawPatch.applicant_email ?? row.applicant_email ?? '').trim());
    return ok(
      confirmationEmailSent ? { ...row, confirmationEmailSent: true } : row,
    );
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
  const adminHolidayPostpone =
    matches('/admin/holidays/:id/postpone', path) ||
    matches('admin/holidays/:id/postpone', path);
  if (method === 'POST' && adminHolidayPostpone) {
    // Demo: "postpone" just marks holiday as moved; we don't actually re-schedule classes.
    const patch = (body ?? {}) as { new_date?: string; note?: string };
    const updated = mutate((d) => {
      const h = d.holidays.find((x) => x.id === adminHolidayPostpone.id);
      if (!h) return null;
      if (patch.new_date) h.date = patch.new_date;
      if (patch.note) h.remark = patch.note;
      return h;
    });
    if (!updated) return err('Holiday not found');
    return ok({ holiday: updated, affected_classes: 0 });
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
  if (method === 'GET' && (path === '/admin/contact/settings' || path === '/admin/contact')) {
    const db = getDb();
    return ok({
      ...db.contactSettings,
      intro:
        (db.contactSettings as Record<string, unknown>).intro ??
        (db.contactSettings as Record<string, unknown>).intro_html ??
        '',
      settings: db.contactSettings,
      branches: db.contactBranches,
    });
  }
  if (method === 'PATCH' && (path === '/admin/contact/settings' || path === '/admin/contact')) {
    const patch = body as Record<string, unknown>;
    mutate((d) => {
      Object.assign(d.contactSettings, patch);
    });
    return ok(getDb().contactSettings);
  }
  if (method === 'GET' && path === '/admin/contact/branches') {
    const db = getDb();
    return ok(
      db.contactBranches
        .slice()
        .sort((a, b) => (a.order_no ?? 0) - (b.order_no ?? 0)),
    );
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
    const b = body as {
      order?: Array<string | number | { id?: string | number; display_order?: number }>;
    };
    mutate((d) => {
      if (Array.isArray(b.order)) {
        b.order.forEach((entry, idx) => {
          const id = typeof entry === 'object' && entry !== null ? entry.id : entry;
          const orderNo =
            typeof entry === 'object' &&
            entry !== null &&
            typeof entry.display_order === 'number'
              ? entry.display_order
              : idx;
          const br = d.contactBranches.find((x) => String(x.id) === String(id));
          if (br) br.order_no = orderNo;
        });
      }
    });
    return ok({ reordered: true });
  }

  // ---- FAQ CMS
  if (method === 'GET' && (path === '/admin/faq/settings' || path === '/admin/faq')) {
    const db = getDb();
    return ok({
      ...db.faqSettings,
      intro:
        (db.faqSettings as Record<string, unknown>).intro ??
        (db.faqSettings as Record<string, unknown>).intro_html ??
        '',
      settings: db.faqSettings,
      items: db.faqItems,
    });
  }
  if (method === 'PATCH' && (path === '/admin/faq/settings' || path === '/admin/faq')) {
    mutate((d) => {
      Object.assign(d.faqSettings, body as object);
    });
    return ok(getDb().faqSettings);
  }
  if (method === 'PATCH' && path === '/admin/about') {
    const patch = body as Record<string, unknown>;
    const title = typeof patch.title === 'string' ? patch.title : '關於我們';
    const content = typeof patch.content === 'string' ? patch.content : '';
    mutate((d) => {
      d.siteContent['home-about'] = { title, content };
    });
    return ok({ title, content, updated_at: new Date().toISOString() });
  }
  if (method === 'GET' && path === '/admin/faq/items') {
    return ok(
      getDb()
        .faqItems.slice()
        .sort((a, b) => a.display_order - b.display_order),
    );
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
  if (method === 'GET' && path === '/admin/site-content') {
    // List-all shape used by SettingsPage: [{ page_key, title, content }]
    const db = getDb();
    return ok(
      Object.entries(db.siteContent).map(([page_key, v]) => ({
        page_key,
        ...(v as object),
      })),
    );
  }
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
    mutate((d) => {
      // Cascade delete tags under this type.
      d.tags = d.tags.filter((x) => x.type !== t.code);
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

  function creditRefundedTokens(
    d: ReturnType<typeof getDb>,
    userId: string,
    enrollmentId: string,
    tokensRefunded: number,
  ) {
    const enr = d.enrollments.find((e) => String(e.id) === String(enrollmentId));
    const uid = String(userId || enr?.user_id || '');
    let pack =
      enr?.user_token_id != null
        ? d.userTokens.find((t) => t.id === enr.user_token_id)
        : undefined;
    if (!pack && uid) {
      pack = d.userTokens
        .filter((t) => t.user_id === uid && t.is_active)
        .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime())[0];
    }
    if (pack) pack.balance += tokensRefunded;
  }

  // ---- Refund records
  if (
    method === 'POST' &&
    (path === '/admin/refund-records' || path === 'admin/refund-records')
  ) {
    const patch = body as Record<string, unknown>;
    const enrollmentId = String(patch.enrollment_id ?? '');
    const tokensRefunded = Number(patch.tokens_refunded ?? 1);
    const created = {
      id: nextId('ref'),
      user_id: String(patch.user_id ?? 'user_001'),
      user_name: String(patch.user_name ?? ''),
      enrollment_id: enrollmentId || undefined,
      class_id: patch.class_id != null ? String(patch.class_id) : undefined,
      class_name: String(patch.class_name ?? ''),
      amount: Number(patch.amount ?? 0),
      tokens: tokensRefunded,
      reason: String(patch.remarks ?? patch.reason ?? ''),
      status: 'approved' as const,
      created_at: new Date().toISOString(),
      refunded_by: String(patch.refunded_by ?? 'Admin'),
      refunded_at: new Date().toISOString(),
      tokens_refunded: tokensRefunded,
      remarks: String(patch.remarks ?? patch.reason ?? ''),
    };
    mutate((d) => {
      d.refundRecords.unshift(created as (typeof d.refundRecords)[0]);
      if (enrollmentId && tokensRefunded > 0) {
        creditRefundedTokens(d, String(patch.user_id ?? ''), enrollmentId, tokensRefunded);
      }
    });
    appendAudit(
      actor?.name ?? 'Admin',
      'refund_tokens',
      'enrollment',
      enrollmentId,
      String(created.remarks),
    );
    return ok(created);
  }
  if (method === 'GET' && (path === '/admin/refund-records' || path === 'admin/refund-records')) {
    return ok(getDb().refundRecords);
  }

  // ---- Pending counts (sidebar badges)
  if (method === 'GET' && path === '/admin/pending-counts') {
    const db = getDb();
    const pendingApplications =
      db.extensionRequests.filter((r) => r.status === 'pending').length +
      db.sickLeaveRequests.filter((r) => r.status === 'pending').length;
    const pendingTrials = db.trialApplications.filter((t) => t.status === 'pending').length;
    return ok({ pendingApplications, pendingTrials });
  }

  // ---- Pending applications (extension / sick leave)
  if (method === 'GET' && path === '/admin/pending-applications') {
    const db = getDb();
    const mapPendingRow = (
      r: DemoExtensionRequest | DemoSickLeaveRequest,
      rawType: 'extension' | 'sick_leave',
      type: 'reschedule' | 'sickLeave',
    ) => {
      const enr = db.enrollments.find((e) => String(e.id) === String(r.enrollment_id));
      const cls = enr ? db.classes.find((c) => c.id === enr.class_id) : undefined;
      return {
        id: `${rawType}_${r.id}`,
        raw_type: rawType,
        raw_id: r.id,
        enrollment_id: r.enrollment_id,
        user_id: r.user_id,
        class_id: enr?.class_id ?? cls?.id,
        class_code: cls?.program_code ?? '',
        student_name: r.user_name ?? enr?.student_name ?? '',
        class_name: r.class_name ?? cls?.name ?? '',
        type,
        leave_type: rawType === 'sick_leave' ? 'sick' : undefined,
        reason: r.reason,
        document_url: null,
      };
    };
    const extensionRows = db.extensionRequests
      .filter((r) => r.status === 'pending')
      .map((r) => mapPendingRow(r, 'extension', 'reschedule'));
    const sickRows = db.sickLeaveRequests
      .filter((r) => r.status === 'pending')
      .map((r) => mapPendingRow(r, 'sick_leave', 'sickLeave'));
    return ok([...sickRows, ...extensionRows]);
  }
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
  if (method === 'GET' && (path === '/admin/funnel' || path === '/admin/conversion-funnel')) {
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
  // Accept both snake_case (admin-style payload) and camelCase (public TrialPage
  // payload) so the same endpoint works for both flows.
  const raw = (req.body ?? {}) as Record<string, any>;
  const studentName: string = raw.student_name ?? raw.fullName ?? raw.name ?? '';
  const email: string = (raw.email ?? '').toString().trim().toLowerCase();
  const mobile: string = raw.mobile ?? raw.contactNumber ?? '';
  const countryCode: string | undefined = raw.country_code ?? raw.countryCode;
  const dateOfBirth: string | undefined = raw.date_of_birth ?? raw.dateOfBirth;
  const classId: string | undefined = raw.classId ?? raw.class_id;
  const preferredDate: string =
    raw.preferred_date ?? raw.preferredDate ?? new Date().toISOString();
  const preferredLocation: string | undefined =
    raw.preferred_location ?? raw.preferredLocation;
  const programCode: string | undefined = raw.programCode ?? raw.program_code;
  const preferredProgram: string | undefined =
    raw.preferred_program ?? raw.preferredProgram ?? programCode;
  const requestedTrialClassName: string | undefined = (() => {
    const v = raw.trialClassName ?? raw.trial_class_name ?? raw.class_name;
    if (v == null) return undefined;
    const s = String(v).trim();
    return s.length > 0 ? s : undefined;
  })();
  const notes: string | undefined = raw.notes ?? raw.howDidYouHear;
  const sendConfirmationEmail = raw.sendConfirmationEmail !== false;
  const sendTemporaryPasswordEmail = raw.sendTemporaryPasswordEmail !== false;

  const generateTemporaryPassword = (length = 12): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let result = '';
    for (let i = 0; i < length; i += 1) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  };

  if (!email || !studentName) return err('Missing fields: email, fullName');

  const db = getDb();
  const existing = db.users.find((x) => x.email.toLowerCase() === email);
  const accountCreated = !existing;
  let u = existing;
  if (!u) {
    const temporaryPassword = generateTemporaryPassword(12);
    u = {
      id: nextId('user'),
      email,
      // Demo mode: mimic backend random temporary password generation.
      password: temporaryPassword,
      name: studentName,
      role: 'student',
      mobile,
      country_code: countryCode ?? '852',
      student_id: getNextStudentId(db.users),
      date_of_birth: dateOfBirth,
      must_change_password: true,
      created_at: new Date().toISOString(),
    };
    mutate((d) => {
      d.users.push(u!);
    });
  }
  const created: DemoTrialApplication = {
    id: nextId('trial'),
    student_name: studentName,
    email,
    mobile: mobile || '',
    country_code: countryCode,
    date_of_birth: dateOfBirth,
    preferred_date: preferredDate,
    preferred_location: preferredLocation,
    preferred_program: preferredProgram ?? programCode ?? classId,
    requested_trial_class_name: requestedTrialClassName,
    status: 'pending',
    user_id: u.id,
    notes: notes ?? null,
    created_at: new Date().toISOString(),
  };
  mutate((d) => {
    d.trialApplications.unshift(created);
  });
  return {
    success: true,
    applicationId: Number(created.id.replace(/\D/g, '')) || Date.now(),
    existingUser: !accountCreated,
    accountCreated,
    emailSent: accountCreated ? sendTemporaryPasswordEmail : false,
    confirmationEmailSent: sendConfirmationEmail,
    message: accountCreated
      ? '已建立新帳號；臨時密碼已寄到 email。'
      : '試堂申請已紀錄，請用你原本的帳號登入查看。',
    data: created,
  } as MockResponse;
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
    const attendance_rate = 80 + Math.random() * 18;
    return {
      class_id: c.id,
      class_name: c.name,
      program_code: c.program_code,
      instructor: c.instructor,
      capacity: c.capacity,
      enrolled_count: c.enrolled_count,
      fill_rate: fillRate,
      attendance_rate,
      at_risk: fillRate < 50 || attendanceRate < 60,
    };
  });
  return normalizeClassHealthPayload({
    classes: healths,
    lowAttendanceThreshold: 5,
  });
}

function computeAttendanceAnomaly() {
  const db = getDb();
  const lowThreshold = 80;
  const consecThreshold = 3;

  const classRows = db.classes
    .filter((c) => c.is_cancelled !== true)
    .slice(0, 24)
    .map((c) => {
      const enrollments = db.enrollments.filter((e) => String(e.class_id) === String(c.id));
      const attended = enrollments.filter((e) => e.status === 'attended').length;
      const total = enrollments.length;
      const fill = c.capacity ? (c.enrolled_count || 0) / c.capacity : 0;
      const rate =
        total > 0
          ? (attended / total) * 100
          : Math.min(96, Math.max(38, fill * 100 * (0.72 + Math.random() * 0.22)));
      return {
        classId: String(c.id),
        className: c.name,
        programCode: c.program_code,
        instructor: c.instructor,
        attendanceRate: Math.round(rate * 10) / 10,
        enrolledCount: total || c.enrolled_count || 0,
      };
    });

  const lowAttendanceRateClasses = classRows
    .filter((r) => r.attendanceRate < lowThreshold)
    .slice()
    .sort((a, b) => a.attendanceRate - b.attendanceRate);

  const overallMonthlyAttendanceRate =
    classRows.length > 0
      ? Math.round((classRows.reduce((s, r) => s + r.attendanceRate, 0) / classRows.length) * 10) / 10
      : 85;

  const studentUsers = db.users.filter((u) => u.role === 'student');
  const consecutiveAbsenceStudents: Array<{
    studentId: string;
    full_name: string;
    mobile: string;
    consecutiveAbsences: number;
    lastClassDate: string;
    className: string;
  }> = [];

  studentUsers.forEach((u, idx) => {
    const enr = db.enrollments.find((e) => e.user_id === u.id);
    const cls = enr ? db.classes.find((c) => String(c.id) === String(enr.class_id)) : null;
    const consecutiveAbsences = idx === 0 ? 4 : idx === 1 ? 3 : 0;
    if (consecutiveAbsences >= consecThreshold && cls) {
      consecutiveAbsenceStudents.push({
        studentId: u.id,
        full_name: u.name,
        mobile: u.mobile ?? '',
        consecutiveAbsences,
        lastClassDate: cls.start_time.split('T')[0] ?? '—',
        className: cls.name,
      });
    }
  });

  if (consecutiveAbsenceStudents.length === 0 && studentUsers.length > 0) {
    const u = studentUsers[0];
    const enr = db.enrollments.find((e) => e.user_id === u.id);
    const cls = enr ? db.classes.find((c) => String(c.id) === String(enr.class_id)) : db.classes[0];
    if (cls) {
      consecutiveAbsenceStudents.push({
        studentId: u.id,
        full_name: u.name,
        mobile: u.mobile ?? '',
        consecutiveAbsences: consecThreshold,
        lastClassDate: cls.start_time.split('T')[0] ?? '—',
        className: cls.name,
      });
    }
  }

  return {
    overallMonthlyAttendanceRate,
    lowAttendanceRateThreshold: lowThreshold,
    lowAttendanceRateClasses,
    consecutiveAbsenceThreshold: consecThreshold,
    consecutiveAbsenceStudents,
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
  const byInstructor = db.instructors.map((i) => {
    const classes = db.classes.filter((c) => c.instructor_id === i.id);
    const totalSessions = classes.length;
    const totalStudents = classes.reduce((s, c) => s + (c.enrolled_count || 0), 0);
    let totalHours = 0;
    for (const c of classes) {
      const ms = new Date(c.end_time).getTime() - new Date(c.start_time).getTime();
      totalHours += Math.max(0, ms / 3600000);
    }
    totalHours = Math.round(totalHours * 10) / 10;
    const avgClassSize =
      totalSessions > 0 ? Math.round((totalStudents / totalSessions) * 10) / 10 : 0;
    return {
      instructorId: i.id,
      instructor: i.name,
      totalHours,
      totalSessions,
      totalStudents,
      avgClassSize,
      avgRenewalRate: Number((75 + Math.random() * 20).toFixed(1)),
      attendanceRate: Number((80 + Math.random() * 15).toFixed(1)),
    };
  });
  return { byInstructor };
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
