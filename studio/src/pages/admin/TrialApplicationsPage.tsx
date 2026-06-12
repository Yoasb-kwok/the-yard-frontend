import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { formatDateTime, formatMobileForDisplay } from '../../lib/utils';
import { buildTrialConfirmedEmailPatch } from '../../lib/trialConfirmedEmailPayload';
import { api } from '../../lib/api';
import { BookOpen, ChevronDown, ChevronRight, Filter, Pencil, Plus } from 'lucide-react';
import { TablePaginationBar, useTablePagination } from '../../components/TablePagination';

export interface TrialApplication {
  id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone?: string;
  /** 用戶於試堂申請時填的居住地區 key（例如 centralWestern） */
  residential_district?: string | null;
  trial_class: string;
  course_code?: string | null;
  branch?: string | null;
  preferred_datetime?: string;
  /** 用戶可選：pending | confirmed | cancelled；後端可能仍回傳舊狀態僅供顯示 */
  status: 'pending' | 'assigned' | 'cancelled' | 'could_not_assign' | 'confirmed' | 'contacted' | 'attended_trial' | 'converted';
  assigned_class_id?: string | null;
  assigned_class_name?: string | null;
  class_id?: string | null;
  trial_lesson_id?: string | null;
  assigned_lessons?: number | null;
  class_total_lessons?: number | null;
  notes?: string;
  nick_name?: string | null;
  date_of_birth?: string | null;
  sex?: boolean | null;
  parents_name?: string | null;
  has_joined_courses?: boolean | null;
  has_dance_experience?: boolean | null;
  how_did_you_hear?: string | null;
  promo_code?: string | null;
  applied_at: string;
  updated_at?: string;
  trial_date?: string;
}

/** 用戶可選的三個狀態 */
const SELECTABLE_STATUSES: TrialApplication['status'][] = ['pending', 'confirmed', 'cancelled'];

/**
 * Normalize a row from the backend into the frontend `TrialApplication` shape.
 *
 * The backend returns MySQL BIGINT / INT columns as **strings** (e.g. `id: "9"`,
 * `assigned_class_id: "1"`), and TINYINT as number (`assigned_lessons: 10`).
 * `notes` is NULL or string. This helper also tolerates legacy number ids.
 */
function normalizeTrialApplicationRow(raw: unknown): TrialApplication | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const idRaw = o.id;
  const id =
    typeof idRaw === 'number'
      ? String(idRaw)
      : typeof idRaw === 'string' && idRaw.trim() !== ''
        ? idRaw
        : null;
  if (!id) return null;

  const toStr = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));
  const toOptStr = (v: unknown): string | null => {
    if (v == null) return null;
    const s = typeof v === 'string' ? v : String(v);
    return s.trim() === '' ? null : s;
  };
  const toOptNum = (v: unknown): number | null => {
    if (v == null || v === '') return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const toOptBool = (v: unknown): boolean | null => {
    if (v == null || v === '') return null;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    const s = String(v).trim().toLowerCase();
    if (!s) return null;
    if (['1', 'true', 'yes', 'y'].includes(s)) return true;
    if (['0', 'false', 'no', 'n'].includes(s)) return false;
    return null;
  };

  const rawStatus = toStr(o.status) as TrialApplication['status'];

  return {
    id,
    applicant_name: toStr(o.applicant_name ?? o.full_name),
    applicant_email: toStr(o.applicant_email ?? o.email),
    applicant_phone: toOptStr(o.applicant_phone ?? o.contact_number ?? o.mobile) ?? undefined,
    residential_district: toOptStr(o.residential_district),
    trial_class: toStr(
      o.trial_class ?? o.class_name ?? o.trialClassName ?? o.requested_trial_class_name ?? o.preferred_trial_class_name,
    ),
    course_code: toOptStr(
      o.course_code ??
      o.program_code ??
      o.programCode ??
      o.courseCode ??
      o.preferred_program ??
      o.preferredProgram ??
      o.class_code
    ),
    branch: toOptStr(
      o.branch ??
      o.location ??
      o.preferred_location ??
      o.preferredLocation ??
      o.branch_name ??
      o.branchName ??
      o.campus ??
      o.campus_name ??
      o.campusName ??
      o.branch_id ??
      o.branchId
    ),
    preferred_datetime: toOptStr(o.preferred_datetime) ?? undefined,
    status: rawStatus || 'pending',
    assigned_class_id: toOptStr(o.assigned_class_id),
    assigned_class_name: toOptStr(o.assigned_class_name),
    class_id: toOptStr(o.class_id ?? o.requested_class_id ?? o.preferred_class_id ?? o.lesson_id),
    trial_lesson_id: toOptStr(o.trial_lesson_id ?? o.trialLessonId),
    assigned_lessons: toOptNum(o.assigned_lessons),
    class_total_lessons: toOptNum(o.class_total_lessons),
    notes: toStr(o.notes),
    nick_name: toOptStr(o.nick_name ?? o.nickName),
    date_of_birth: toOptStr(o.date_of_birth ?? o.dateOfBirth),
    sex: toOptBool(o.sex),
    parents_name: toOptStr(o.parents_name ?? o.parentsName),
    has_joined_courses: toOptBool(o.has_joined_courses ?? o.hasJoinedCourses),
    has_dance_experience: toOptBool(o.has_dance_experience ?? o.hasDanceExperience),
    how_did_you_hear: toOptStr(o.how_did_you_hear ?? o.howDidYouHear),
    promo_code: toOptStr(o.promo_code ?? o.promoCode),
    applied_at: toStr(o.applied_at ?? o.created_at),
    updated_at: toOptStr(o.updated_at) ?? undefined,
    trial_date: toOptStr(o.trial_date) ?? undefined,
  };
}

/** 後端可能回傳舊狀態，編輯時映射為可選狀態之一（列表顯示仍用原 status） */
function toSelectableStatus(s: TrialApplication['status']): (typeof SELECTABLE_STATUSES)[number] {
  if (SELECTABLE_STATUSES.includes(s as any)) return s as (typeof SELECTABLE_STATUSES)[number];
  if (['assigned', 'contacted', 'attended_trial', 'converted'].includes(s)) return 'confirmed';
  return 'pending';
}

const TRIAL_BRANCH_LOCATIONS = ['sanpokong', 'causewaybay', 'fotan', 'sheungshui'] as const;
type BranchFilter = 'all' | (typeof TRIAL_BRANCH_LOCATIONS)[number];

export default function TrialApplicationsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<TrialApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TrialApplication['status'] | 'all'>('all');
  const [editStatus, setEditStatus] = useState<Record<string, TrialApplication['status']>>({});
  const [editNotes, setEditNotes] = useState<Record<string, string>>({});
  const [branchFilter, setBranchFilter] = useState<BranchFilter>('all');
  const [savingStatuses, setSavingStatuses] = useState(false);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null);
  const [openNoteEditorId, setOpenNoteEditorId] = useState<string | null>(null);
  const [noteEditorDraft, setNoteEditorDraft] = useState('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [classCodeCandidates, setClassCodeCandidates] = useState<
    Array<{ id: string; code: string; name: string; location: string }>
  >([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!openStatusMenuId) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target instanceof Element && target.closest('[data-status-menu-root="true"]')) {
        return;
      }
      setOpenStatusMenuId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openStatusMenuId]);

  const getLocale = () => (i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US');
  const formatDateOnly = (value: string): string => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat(getLocale(), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  };
  const getBranchLabel = (branch: string | null | undefined): string => {
    if (!branch) return '—';
    const key = `home.locations.${branch}`;
    const translated = t(key);
    return translated !== key ? translated : branch;
  };

  const changedRowIds = useMemo(() => {
    return applications
      .filter((a) => {
        const current = toSelectableStatus(a.status);
        const draft = toSelectableStatus(editStatus[a.id] ?? a.status);
        const currentNote = String(a.notes ?? '').trim();
        const draftNote = String(editNotes[a.id] ?? a.notes ?? '').trim();
        return current !== draft || currentNote !== draftNote;
      })
      .map((a) => a.id);
  }, [applications, editStatus, editNotes]);
  const classCodeById = useMemo(() => {
    const map = new Map<string, string>();
    classCodeCandidates.forEach((row) => {
      if (row.id && row.code) map.set(String(row.id), row.code);
    });
    return map;
  }, [classCodeCandidates]);
  const classCodeByName = useMemo(() => {
    const map = new Map<string, string>();
    classCodeCandidates.forEach((row) => {
      const name = String(row.name ?? '').trim().toLowerCase();
      if (!name || !row.code) return;
      if (!map.has(name)) map.set(name, row.code);
    });
    return map;
  }, [classCodeCandidates]);
  const classLocationById = useMemo(() => {
    const map = new Map<string, string>();
    classCodeCandidates.forEach((row) => {
      if (row.id && row.location) map.set(String(row.id), row.location);
    });
    return map;
  }, [classCodeCandidates]);
  const classLocationByName = useMemo(() => {
    const map = new Map<string, string>();
    classCodeCandidates.forEach((row) => {
      const name = String(row.name ?? '').trim().toLowerCase();
      if (!name || !row.location) return;
      if (!map.has(name)) map.set(name, row.location);
    });
    return map;
  }, [classCodeCandidates]);

  const filtered = useMemo(() => {
    const resolveApplicationBranch = (a: TrialApplication): string | null => {
      const direct = String(a.branch ?? '').trim();
      if (direct) return direct;
      const classId = a.assigned_class_id ?? a.class_id;
      if (classId != null) {
        const fromClass = classLocationById.get(String(classId));
        if (fromClass) return fromClass;
      }
      const className = String(a.assigned_class_name ?? '').trim().toLowerCase();
      if (className) {
        const fromName = classLocationByName.get(className);
        if (fromName) return fromName;
      }
      return null;
    };
    return applications.filter((a) => {
      const normalizedStatus = toSelectableStatus(a.status);
      if (branchFilter !== 'all') {
        const branch = resolveApplicationBranch(a);
        if (branch !== branchFilter) return false;
      }
      if (statusFilter !== 'all' && normalizedStatus !== statusFilter) return false;
      return true;
    });
  }, [applications, branchFilter, statusFilter, classLocationById, classLocationByName]);

  const noteEditorApplication = useMemo(
    () => applications.find((app) => app.id === openNoteEditorId) ?? null,
    [applications, openNoteEditorId]
  );

  const {
    page: trialPage,
    setPage: setTrialPage,
    totalPages: trialTotalPages,
    pageSize: trialPageSize,
    totalItems: trialTotalItems,
    paginatedItems: paginatedTrial,
    startIndex: trialListStart,
  } = useTablePagination(filtered, undefined, [branchFilter, statusFilter]);

  useEffect(() => {
    loadApplications();
    loadClassCodeCandidates();
  }, []);

  async function loadApplications() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.get<unknown[]>('/admin/trial-applications');
      const rawList = res.success && Array.isArray(res.data) ? res.data : [];
      const normalizedList: TrialApplication[] = rawList
        .map((r) => normalizeTrialApplicationRow(r))
        .filter((r): r is TrialApplication => r !== null);
      // Guard against duplicated backend rows (e.g. SQL join duplication) by id.
      const seen = new Set<string>();
      const list = normalizedList.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
      setApplications(list);
      const initialStatus: Record<string, TrialApplication['status']> = {};
      const initialNotes: Record<string, string> = {};
      list.forEach((a) => {
        initialStatus[a.id] = toSelectableStatus(a.status);
        initialNotes[a.id] = String(a.notes ?? '');
      });
      setEditStatus(initialStatus);
      setEditNotes(initialNotes);
    } catch {
      setApplications([]);
      setLoadError(t('admin.trialApplications.loadError', '未能載入試堂申請，請檢查後端服務或稍後重試。'));
    } finally {
      setLoading(false);
    }
  }

  async function loadClassCodeCandidates() {
    try {
      const endpoints = ['/admin/classes', '/classes'];
      let rows: any[] = [];
      for (const endpoint of endpoints) {
        try {
          const response = await api.get<any[]>(endpoint);
          if (response.success && Array.isArray(response.data) && response.data.length > 0) {
            rows = response.data;
            break;
          }
        } catch {
          // Try next endpoint.
        }
      }
      if (rows.length === 0) return;
      const next = rows
        .map((row) => {
          const id = String(row?.id ?? '').trim();
          const code = String(row?.class_code ?? row?.program_code ?? row?.programCode ?? row?.course_code ?? '').trim();
          const name = String(row?.name ?? row?.class_name ?? '').trim();
          const location = String(row?.location ?? row?.branch ?? row?.preferred_location ?? row?.preferredLocation ?? '').trim();
          return { id, code, name, location };
        })
        .filter((row) => (row.code.length > 0 || row.location.length > 0) && (row.id.length > 0 || row.name.length > 0));
      setClassCodeCandidates(next);
    } catch {
      // Non-blocking enhancement only.
    }
  }

  function getStatusLabel(s: TrialApplication['status']) {
    const normalized = toSelectableStatus(s);
    return t(`admin.trialApplications.status.${normalized}`);
  }

  function getStatusButtonClasses(s: TrialApplication['status']): string {
    const normalized = toSelectableStatus(s);
    if (normalized === 'pending') return 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200';
    if (normalized === 'confirmed') return 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200';
    return 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200';
  }

  function getDisplayCourseCode(app: TrialApplication): string {
    const explicit = String(app.course_code ?? '').trim();
    if (explicit) return explicit;

    const idCandidates = [app.assigned_class_id, app.class_id, app.trial_lesson_id]
      .map((v) => String(v ?? '').trim())
      .filter(Boolean);
    for (const id of idCandidates) {
      const code = classCodeById.get(id);
      if (code) return code;
    }

    const nameCandidates = [app.assigned_class_name, app.trial_class]
      .map((v) => String(v ?? '').trim().toLowerCase())
      .filter(Boolean);
    for (const name of nameCandidates) {
      const code = classCodeByName.get(name);
      if (code) return code;
    }

    const text = `${app.assigned_class_name ?? ''} ${app.trial_class ?? ''}`.toUpperCase();
    const token = text.match(/\b[A-Z]{2,}(?:-[A-Z0-9]+)?\b/)?.[0]?.trim();
    if (token) return token;

    return '—';
  }

  function getDisplayBranch(app: TrialApplication): string {
    const explicitBranch = String(app.branch ?? '').trim();
    if (explicitBranch) return getBranchLabel(explicitBranch);

    const idCandidates = [app.assigned_class_id, app.class_id, app.trial_lesson_id]
      .map((v) => String(v ?? '').trim())
      .filter(Boolean);
    for (const id of idCandidates) {
      const location = classLocationById.get(id);
      if (location) return getBranchLabel(location);
    }

    const nameCandidates = [app.assigned_class_name, app.trial_class]
      .map((v) => String(v ?? '').trim().toLowerCase())
      .filter(Boolean);
    for (const name of nameCandidates) {
      const location = classLocationByName.get(name);
      if (location) return getBranchLabel(location);
    }

    return '—';
  }

  function resolveApplicationBranchKey(app: TrialApplication): string | null {
    const direct = String(app.branch ?? '').trim();
    if (direct) return direct;
    const classId = app.assigned_class_id ?? app.class_id;
    if (classId != null) {
      const fromClass = classLocationById.get(String(classId));
      if (fromClass) return fromClass;
    }
    const className = String(app.assigned_class_name ?? '').trim().toLowerCase();
    if (className) {
      const fromName = classLocationByName.get(className);
      if (fromName) return fromName;
    }
    return null;
  }

  function getTrialClassDatetimeDisplay(app: TrialApplication): string {
    const iso = app.preferred_datetime ?? app.trial_date;
    if (!iso) return '—';
    return formatDateTime(iso, getLocale());
  }

  function getDistrictLabel(districtKey: string | null | undefined): string {
    const value = String(districtKey ?? '').trim();
    if (!value) return '—';
    const key = `districts.${value}`;
    const translated = t(key);
    return translated !== key ? translated : value;
  }
  function getBooleanLabel(value: boolean | null | undefined): string {
    if (value == null) return '—';
    return value ? t('common.yes', { defaultValue: '是' }) : t('common.no', { defaultValue: '否' });
  }

  function getHowDidYouHearLabel(value: string | null | undefined): string {
    const key = String(value ?? '').trim();
    if (!key) return '—';
    const i18nKey = `trial.howDidYouHearOptions.${key}`;
    const translated = t(i18nKey, { defaultValue: '' });
    return translated || key;
  }

  function getSexLabel(value: boolean | null | undefined): string {
    if (value == null) return '—';
    return value ? t('profile.male', { defaultValue: '男' }) : t('profile.female', { defaultValue: '女' });
  }

  function openNoteEditor(app: TrialApplication) {
    setOpenNoteEditorId(app.id);
    setNoteEditorDraft(String(editNotes[app.id] ?? app.notes ?? ''));
  }

  function closeNoteEditor() {
    setOpenNoteEditorId(null);
    setNoteEditorDraft('');
  }

  function applyNoteEditor() {
    if (!openNoteEditorId) return;
    setEditNotes((prev) => ({ ...prev, [openNoteEditorId]: noteEditorDraft }));
    closeNoteEditor();
  }

  async function persistTrialApplicationUpdate(
    id: string,
    opts?: { statusOverride?: TrialApplication['status']; notesOverride?: string },
  ): Promise<{ row: TrialApplication; statusChanged: boolean } | null> {
    const app = applications.find((a) => a.id === id);
    if (!app) return null;

    const previousStatus = toSelectableStatus(app.status);
    const status = toSelectableStatus(opts?.statusOverride ?? editStatus[id] ?? app.status);
    const notes = String(opts?.notesOverride ?? editNotes[id] ?? app.notes ?? '').trim();
    const payload: Record<string, unknown> = { status, notes, language: i18n.language || 'zh-TW' };
    if (status === 'confirmed' && previousStatus !== 'confirmed') {
      const emailExtras = buildTrialConfirmedEmailPatch(app, {
        language: i18n.language || 'zh-TW',
        branchKey: resolveApplicationBranchKey(app),
        branchLabel: getDisplayBranch(app),
        courseCode: getDisplayCourseCode(app),
        classDatetimeFormatted: getTrialClassDatetimeDisplay(app),
      });
      if (emailExtras) Object.assign(payload, emailExtras);
    }

    const res = await api.patch<Record<string, unknown>>(`/admin/trial-applications/${id}`, payload);
    if (!res.success) throw new Error(res.msg || 'Update failed');

    const serverRow = normalizeTrialApplicationRow(res.data);
    const row =
      serverRow ??
      ({
        ...app,
        status,
        notes,
        updated_at: new Date().toISOString(),
      } as TrialApplication);

    return { row, statusChanged: previousStatus !== status };
  }

  function applyPersistedTrialRow(id: string, row: TrialApplication) {
    setApplications((prev) => prev.map((a) => (a.id === id ? row : a)));
    setEditStatus((prev) => ({ ...prev, [id]: toSelectableStatus(row.status) }));
    setEditNotes((prev) => ({ ...prev, [id]: String(row.notes ?? '') }));
  }

  async function handleStatusSelect(app: TrialApplication, nextStatus: TrialApplication['status']) {
    const normalizedNext = toSelectableStatus(nextStatus);
    const normalizedCurrent = toSelectableStatus(app.status);
    if (normalizedNext === normalizedCurrent || savingRowId === app.id || savingStatuses) {
      setOpenStatusMenuId(null);
      return;
    }

    setEditStatus((prev) => ({ ...prev, [app.id]: normalizedNext }));
    setOpenStatusMenuId(null);
    setSavingRowId(app.id);
    setSaveSuccessMessage(null);
    try {
      const result = await persistTrialApplicationUpdate(app.id, { statusOverride: normalizedNext });
      if (!result) return;
      applyPersistedTrialRow(app.id, result.row);
      if (result.statusChanged) {
        setSaveSuccessMessage(
          t('admin.trialApplications.statusSaved', {
            defaultValue: '狀態已更新，學生帳戶及電郵通知將同步更新。',
          }),
        );
        window.setTimeout(() => setSaveSuccessMessage(null), 3000);
      }
    } catch (err) {
      setEditStatus((prev) => ({ ...prev, [app.id]: normalizedCurrent }));
      console.error('Failed to save trial application status', err);
      const msg = err instanceof Error ? err.message : t('common.error', 'Something went wrong.');
      alert(t('admin.trialApplications.saveFailed', 'Save failed: {{msg}}', { msg }));
    } finally {
      setSavingRowId(null);
    }
  }

  /** 一次儲存 table 內所有改動（備注；狀態已在選取時即時儲存） */
  async function saveAllStatuses() {
    const noteOnlyRowIds = changedRowIds.filter((id) => {
      const app = applications.find((a) => a.id === id);
      if (!app) return false;
      const current = toSelectableStatus(app.status);
      const draft = toSelectableStatus(editStatus[id] ?? app.status);
      const currentNote = String(app.notes ?? '').trim();
      const draftNote = String(editNotes[id] ?? app.notes ?? '').trim();
      return current === draft && currentNote !== draftNote;
    });
    if (noteOnlyRowIds.length === 0 || savingStatuses) return;
    setSavingStatuses(true);
    setSaveSuccessMessage(null);
    try {
      const updates = await Promise.all(
        noteOnlyRowIds.map(async (id) => {
          const result = await persistTrialApplicationUpdate(id);
          if (!result) return { id, row: null as TrialApplication | null };
          return { id, row: result.row };
        })
      );

      updates.forEach(({ id, row }) => {
        if (row) applyPersistedTrialRow(id, row);
      });
      setOpenNoteEditorId(null);
      setSaveSuccessMessage(
        t('common.saved', { defaultValue: '已儲存' }),
      );
      window.setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to save trial application notes', err);
      const msg = err instanceof Error ? err.message : t('common.error', 'Something went wrong.');
      alert(t('admin.trialApplications.saveFailed', 'Save failed: {{msg}}', { msg }));
    } finally {
      setSavingStatuses(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            {t('admin.trialApplications.title')}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => navigate('/admin/trial-applications/new')}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark"
            >
              <Plus className="h-4 w-4" />
              {t('admin.trialApplications.add', { defaultValue: '新增試堂申請' })}
            </button>
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value as BranchFilter)}
              className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
              aria-label={t('admin.trialApplications.filterBranch', '分店')}
            >
              <option value="all">{t('admin.trialApplications.filterAllBranches', '全部分店')}</option>
              {TRIAL_BRANCH_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {getBranchLabel(loc)}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TrialApplication['status'] | 'all')}
              className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
            >
              <option value="all">{t('admin.trialApplications.filterAllStatus', '全部狀態')}</option>
              {SELECTABLE_STATUSES.map((s) => (
                <option key={s} value={s}>{getStatusLabel(s)}</option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-gray-600 text-sm">
          {t('admin.trialApplications.description')}
        </p>
        {loadError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {loadError}
          </div>
        )}
        {saveSuccessMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {saveSuccessMessage}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">{t('admin.trialApplications.noApplications')}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.trialApplications.applicant', '姓名')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.trialApplications.phone', '聯絡電話')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.trialApplications.trialClass', '課程名稱')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.trialApplications.courseCode', '課程代碼')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.trialApplications.courseDateTime', '課程日期及時間')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.trialApplications.branch', '分店')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.trialApplications.appliedAt')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.trialApplications.notes', '備注')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.trialApplications.statusLabel')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('admin.trialApplications.moreInfo', { defaultValue: '更多資訊' })}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedTrial.flatMap((app, rowIndex) => {
                    const rowKey = `trial-row-${trialListStart + rowIndex}-${String(app.id)}`;
                    const detailRowKey = `${rowKey}-details`;
                    const isExpanded = expandedRowId === app.id;
                    const rows: JSX.Element[] = [
                      <tr key={rowKey} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{app.applicant_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{formatMobileForDisplay(app.applicant_phone, '—')}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{app.trial_class}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{getDisplayCourseCode(app)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{app.preferred_datetime ? formatDateTime(app.preferred_datetime, getLocale()) : (app.trial_date ? formatDateTime(app.trial_date, getLocale()) : '—')}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{getDisplayBranch(app)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDateTime(app.applied_at, getLocale())}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {String(editNotes[app.id] ?? app.notes ?? '').trim() ? (
                            <div className="flex items-center gap-2">
                              <p className="max-w-[12rem] break-words leading-5">
                                {String(editNotes[app.id] ?? app.notes ?? '').trim()}
                              </p>
                              <button
                                type="button"
                                onClick={() => openNoteEditor(app)}
                                aria-label={t('admin.trialApplications.editNote', { defaultValue: '編輯備注' })}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary text-white hover:bg-primary-dark"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openNoteEditor(app)}
                              aria-label={t('admin.trialApplications.editNote', { defaultValue: '編輯備注' })}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white hover:bg-primary-dark"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative inline-block" data-status-menu-root="true">
                            <button
                              type="button"
                              disabled={savingRowId === app.id}
                              onClick={() => setOpenStatusMenuId((prev) => (prev === app.id ? null : app.id))}
                              className={`inline-flex min-w-[5.75rem] items-center justify-center rounded-md border px-2 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${getStatusButtonClasses(
                                editStatus[app.id] ?? app.status
                              )}`}
                            >
                              {savingRowId === app.id ? '...' : getStatusLabel(editStatus[app.id] ?? app.status)}
                            </button>
                            {openStatusMenuId === app.id && (
                              <div className="absolute left-0 z-20 mt-2 w-36 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                                <div className="space-y-1">
                                  {SELECTABLE_STATUSES.map((s) => {
                                    const selected = toSelectableStatus(editStatus[app.id] ?? app.status) === s;
                                    return (
                                      <button
                                        key={s}
                                        type="button"
                                        onClick={() => handleStatusSelect(app, s)}
                                        className={`w-full rounded-md border px-2.5 py-1.5 text-left text-sm font-medium transition-colors ${
                                          selected ? 'ring-2 ring-primary ring-offset-1' : ''
                                        } ${getStatusButtonClasses(s)}`}
                                      >
                                        {getStatusLabel(s)}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => setExpandedRowId((prev) => (prev === app.id ? null : app.id))}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                            aria-label={t('admin.trialApplications.moreInfo', { defaultValue: '更多資訊' })}
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </td>
                      </tr>,
                    ];
                    if (isExpanded) {
                      rows.push(
                        <tr key={detailRowKey} className="bg-gray-50">
                          <td colSpan={10} className="px-4 py-4">
                            <div className="rounded-lg border border-gray-200 bg-white p-4">
                              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                                {t('admin.trialApplications.formDetails', { defaultValue: '試堂表單資料' })}
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                <div><span className="text-gray-500">{t('admin.trialApplications.applicant', '姓名')}：</span><span className="text-gray-900">{app.applicant_name || '—'}</span></div>
                                <div><span className="text-gray-500">{t('admin.trialApplications.phone', '聯絡電話')}：</span><span className="text-gray-900">{formatMobileForDisplay(app.applicant_phone, '—')}</span></div>
                                <div><span className="text-gray-500">{t('trial.email', { defaultValue: '電郵' })}：</span><span className="text-gray-900">{app.applicant_email || '—'}</span></div>
                                <div><span className="text-gray-500">{t('trial.nickName', { defaultValue: '暱稱' })}：</span><span className="text-gray-900">{app.nick_name || '—'}</span></div>
                                <div><span className="text-gray-500">{t('trial.dateOfBirth', { defaultValue: '出生日期' })}：</span><span className="text-gray-900">{app.date_of_birth ? formatDateOnly(app.date_of_birth) : '—'}</span></div>
                                <div><span className="text-gray-500">{t('trial.sex', { defaultValue: '性別' })}：</span><span className="text-gray-900">{getSexLabel(app.sex)}</span></div>
                                <div><span className="text-gray-500">{t('trial.parentsName', { defaultValue: '家長姓名' })}：</span><span className="text-gray-900">{app.parents_name || '—'}</span></div>
                                <div><span className="text-gray-500">{t('trial.residentialDistrict', { defaultValue: '居住地區' })}：</span><span className="text-gray-900">{getDistrictLabel(app.residential_district)}</span></div>
                                <div><span className="text-gray-500">{t('trial.hasJoinedCourses', { defaultValue: '是否參加過常規/暑期課程' })}：</span><span className="text-gray-900">{getBooleanLabel(app.has_joined_courses)}</span></div>
                                <div><span className="text-gray-500">{t('trial.hasDanceExperience', { defaultValue: '是否有舞蹈經驗' })}：</span><span className="text-gray-900">{getBooleanLabel(app.has_dance_experience)}</span></div>
                                <div><span className="text-gray-500">{t('trial.howDidYouHear', { defaultValue: '如何得知我們' })}：</span><span className="text-gray-900">{getHowDidYouHearLabel(app.how_did_you_hear)}</span></div>
                                <div><span className="text-gray-500">{t('trial.promoCode', { defaultValue: '優惠碼' })}：</span><span className="text-gray-900">{app.promo_code || '—'}</span></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    return rows;
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-200 px-4 py-3">
              <button
                type="button"
                disabled={
                  savingStatuses ||
                  changedRowIds.filter((id) => {
                    const app = applications.find((a) => a.id === id);
                    if (!app) return false;
                    const current = toSelectableStatus(app.status);
                    const draft = toSelectableStatus(editStatus[id] ?? app.status);
                    const currentNote = String(app.notes ?? '').trim();
                    const draftNote = String(editNotes[id] ?? app.notes ?? '').trim();
                    return current === draft && currentNote !== draftNote;
                  }).length === 0
                }
                onClick={saveAllStatuses}
                className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50"
              >
                {savingStatuses ? '...' : t('common.save')}
              </button>
            </div>
            <TablePaginationBar
              page={trialPage}
              totalPages={trialTotalPages}
              totalItems={trialTotalItems}
              pageSize={trialPageSize}
              onPageChange={setTrialPage}
            />
          </div>
        )}
      </div>
        {openNoteEditorId && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"
            onClick={closeNoteEditor}
          >
            <div
              className="w-full max-w-lg rounded-xl bg-white p-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {t('admin.trialApplications.notes', '備注')}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {noteEditorApplication?.applicant_name || '—'}
                  </p>
                </div>
              </div>
              <textarea
                value={noteEditorDraft}
                onChange={(e) => setNoteEditorDraft(e.target.value)}
                rows={6}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary"
                placeholder={t('admin.trialApplications.notesPlaceholder', { defaultValue: '輸入備注...' })}
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeNoteEditor}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t('common.cancel', { defaultValue: '取消' })}
                </button>
                <button
                  type="button"
                  onClick={applyNoteEditor}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark"
                >
                  {t('common.apply', { defaultValue: '套用' })}
                </button>
              </div>
            </div>
          </div>
        )}
    </Layout>
  );
}
