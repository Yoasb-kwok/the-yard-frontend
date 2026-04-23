/**
 * Demo mock database — localStorage-backed in-memory store.
 *
 * All writes persist under localStorage key `demo_db_v1` so that page reloads
 * keep the state. Call `resetDemoDb()` (exposed via DemoBanner) to wipe and
 * re-seed.
 */

import { buildSeed } from './seed';

const STORAGE_KEY = 'demo_db_v1';

export interface DemoUser {
  id: string;
  email: string;
  password: string; // plain-text for demo only
  name: string;
  role: 'admin' | 'student' | 'instructor';
  mobile?: string;
  country_code?: string;
  id_first_four?: string;
  id_last_four?: string;
  student_id?: string;
  nick_name?: string | null;
  date_of_birth?: string | null;
  sex?: boolean | null;
  parents_name?: string | null;
  contact_number?: string | null;
  residential_district?: string | null;
  has_joined_courses?: boolean | null;
  level?: string | null;
  must_change_password?: boolean;
  created_at: string;
}

export interface DemoInstructor {
  id: string;
  name: string;
  bio?: string;
  bio_zh_tw?: string;
  bio_zh_cn?: string;
  bio_en?: string;
  specialty?: string;
  image_url?: string | null;
  photo_url?: string | null;
  is_active: boolean;
  display_order?: number;
}

export interface DemoClass {
  id: string;
  name: string;
  name_zh_tw?: string;
  name_zh_cn?: string;
  name_en?: string;
  instructor: string;
  instructor_id?: string;
  substitute_instructor_id?: string | null;
  start_time: string;
  end_time: string;
  location: string;
  program_code: string;
  level: string;
  age_tag: string;
  category?: string;
  capacity: number;
  enrolled_count: number;
  weekday: number;
  total_lessons: number;
  token_cost?: number;
  allow_trial?: boolean;
  description?: string;
  image_url?: string | null;
  is_active?: boolean;
  lesson_number?: number;
  is_internal?: boolean;
  is_cancelled?: boolean;
}

export interface DemoEnrollment {
  id: string;
  class_id: string;
  user_id: string;
  student_name?: string;
  status: 'enrolled' | 'attended' | 'absent' | 'cancelled' | 'sick' | 'makeup';
  check_in_time?: string | null;
  check_out_time?: string | null;
  notes?: string | null;
  lessons_used?: number;
  lessons_remaining?: number;
  makeup_remaining?: number;
  created_at: string;
}

export interface DemoTrialApplication {
  id: string;
  student_name: string;
  email: string;
  mobile: string;
  country_code?: string;
  date_of_birth?: string;
  preferred_date: string;
  preferred_location?: string;
  preferred_program?: string;
  assigned_class_id?: string | null;
  assigned_class_name?: string | null;
  assigned_lessons?: number | null;
  status: 'pending' | 'contacted' | 'assigned' | 'attended' | 'converted' | 'cancelled';
  notes?: string | null;
  user_id?: string | null;
  created_at: string;
}

export interface DemoTokenPackage {
  id: string;
  name: string;
  description: string;
  token_count: number;
  price: number;
  validity_days: number;
  is_active: boolean;
  display_order?: number;
}

export interface DemoOrder {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  package_id: string;
  package_name?: string;
  quantity: number;
  subtotal: number;
  discount: number;
  total: number;
  coupon_id?: string | null;
  coupon_code?: string | null;
  referral_code?: string | null;
  payment_method: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  payment_slip_url?: string | null;
  stripe_session_id?: string | null;
  created_at: string;
  paid_at?: string | null;
}

export interface DemoUserToken {
  id: string;
  user_id: string;
  package_id: string;
  package_name?: string;
  tokens: number;
  balance: number;
  expires_at: string;
  purchased_at: string;
  order_id?: string;
  is_active: boolean;
}

export interface DemoNews {
  id: string;
  title: string;
  title_zh_tw?: string;
  title_zh_cn?: string;
  title_en?: string;
  content: string;
  content_zh_tw?: string;
  content_zh_cn?: string;
  content_en?: string;
  image_url: string | null;
  published_at: string;
  show_as_popup?: boolean;
  is_active?: boolean;
}

export interface DemoCoupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  valid_from: string | null;
  valid_until: string | null;
  quantity: number | null;
  used_count?: number;
  min_subtotal?: number;
  is_active: boolean;
  created_at: string;
}

export interface DemoHoliday {
  id: string;
  name: string;
  date: string;
  is_active: boolean;
  remark?: string;
}

export interface DemoClassNotice {
  id: string;
  title: string;
  content: string;
  priority: 'info' | 'warning' | 'critical';
  start_date: string;
  end_date: string;
  image_url?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DemoContactBranch {
  id: string | number;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  map_url?: string;
  order_no?: number;
}

export interface DemoContactSettings {
  title?: string;
  title_zh_tw?: string;
  title_zh_cn?: string;
  title_en?: string;
  intro_html?: string;
  intro_zh_tw?: string;
  intro_zh_cn?: string;
  intro_en?: string;
  image_url?: string | null;
}

export interface DemoFaqItem {
  id: string | number;
  question: string;
  question_zh_tw?: string;
  question_zh_cn?: string;
  question_en?: string;
  answer_html: string;
  answer_zh_tw?: string;
  answer_zh_cn?: string;
  answer_en?: string;
  display_order: number;
  is_active: boolean;
}

export interface DemoFaqSettings {
  title?: string;
  title_zh_tw?: string;
  title_zh_cn?: string;
  title_en?: string;
  intro_html?: string;
  intro_zh_tw?: string;
  intro_zh_cn?: string;
  intro_en?: string;
}

export interface DemoTagType {
  id: number;
  code: string;
  label_zh_tw?: string;
  label_zh_cn?: string;
  label_en?: string;
  display_order: number;
  is_active: boolean;
  is_system: boolean;
}

export interface DemoTag {
  id: number;
  type: string;
  code: string;
  label_zh_tw?: string;
  label_zh_cn?: string;
  label_en?: string;
  display_order: number;
  is_active: boolean;
}

export interface DemoRefundRecord {
  id: string;
  user_id: string;
  user_name?: string;
  enrollment_id?: string;
  class_id?: string;
  class_name?: string;
  amount: number;
  tokens?: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'refunded';
  created_at: string;
}

export interface DemoExtensionRequest {
  id: string;
  user_id: string;
  user_name?: string;
  enrollment_id: string;
  class_name?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  created_at: string;
}

export interface DemoSickLeaveRequest {
  id: string;
  user_id: string;
  user_name?: string;
  enrollment_id: string;
  class_name?: string;
  class_date?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  created_at: string;
}

export interface DemoAuditEntry {
  id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: string;
  created_at: string;
}

export interface DemoNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  is_read: boolean;
  link?: string | null;
  created_at: string;
}

export interface DemoSimpleContent {
  title?: string;
  title_zh_tw?: string;
  title_zh_cn?: string;
  title_en?: string;
  content_html?: string;
  content_zh_tw?: string;
  content_zh_cn?: string;
  content_en?: string;
  updated_at?: string;
}

export interface DemoHomeAbout {
  title?: string;
  subtitle?: string;
  image_url?: string;
  blocks?: Array<{ id: string; heading?: string; body_html?: string; image_url?: string | null }>;
  [k: string]: unknown;
}

export interface DemoDb {
  version: number;
  users: DemoUser[];
  otps: Record<string, string>; // email -> otp
  instructors: DemoInstructor[];
  classes: DemoClass[];
  enrollments: DemoEnrollment[];
  trialApplications: DemoTrialApplication[];
  tokenPackages: DemoTokenPackage[];
  orders: DemoOrder[];
  userTokens: DemoUserToken[];
  news: DemoNews[];
  coupons: DemoCoupon[];
  holidays: DemoHoliday[];
  classNotices: DemoClassNotice[];
  contactSettings: DemoContactSettings;
  contactBranches: DemoContactBranch[];
  faqSettings: DemoFaqSettings;
  faqItems: DemoFaqItem[];
  tagTypes: DemoTagType[];
  tags: DemoTag[];
  terms: DemoSimpleContent;
  privacy: DemoSimpleContent;
  siteContent: Record<string, DemoSimpleContent | DemoHomeAbout | unknown>;
  homeAbout: DemoHomeAbout;
  refundRecords: DemoRefundRecord[];
  extensionRequests: DemoExtensionRequest[];
  sickLeaveRequests: DemoSickLeaveRequest[];
  auditLog: DemoAuditEntry[];
  notifications: DemoNotification[];
}

let cached: DemoDb | null = null;

export function getDb(): DemoDb {
  if (cached) return cached;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as DemoDb;
      if (parsed && typeof parsed === 'object' && parsed.version === 1) {
        cached = parsed;
        return cached;
      }
    }
  } catch {
    // corrupted, fall back to seed
  }
  cached = buildSeed();
  persist();
  return cached;
}

export function persist(): void {
  if (!cached) return;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
    }
  } catch {
    // quota exceeded or unavailable
  }
}

export function resetDb(): void {
  cached = buildSeed();
  persist();
}

/** Mutate helper — keeps code terse inside handlers. */
export function mutate<T>(fn: (db: DemoDb) => T): T {
  const db = getDb();
  const result = fn(db);
  persist();
  return result;
}

let idCounter = Date.now();
export function nextId(prefix = 'id'): string {
  idCounter += 1;
  return `${prefix}_${idCounter.toString(36)}`;
}
export function nextNumId(): number {
  idCounter += 1;
  return idCounter;
}

export function appendAudit(
  actorName: string,
  action: string,
  entityType: string,
  entityId: string,
  details?: string,
): void {
  mutate((db) => {
    db.auditLog.unshift({
      id: nextId('audit'),
      actor_id: 'admin_demo',
      actor_name: actorName,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      created_at: new Date().toISOString(),
    });
    if (db.auditLog.length > 200) db.auditLog.length = 200;
  });
}
