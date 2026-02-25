/**
 * Teacher / instructor profile (老師簡介) for display on calendar, trial, token package, etc.
 * Look up by instructor name (e.g. from class.instructor).
 */
export interface InstructorProfile {
  name: string;
  /** Short intro / bio */
  intro: string;
  /** Awards & achievements (e.g. 香港芭蕾舞學會金獎) */
  awards: string[];
  /** Years of dance experience (舞齡) */
  years_dancing: number;
  /** Teaching experience in years (教學經驗) */
  teaching_experience: number;
  /** Dance school / academy graduated from (畢業院校) */
  dance_school: string;
  /** Optional: icon key for display (e.g. ballet, hiphop, jazz). Used on public instructors page. */
  icon?: string;
  /** Optional: background image URL for the instructor card. */
  background_image?: string;
  /** Optional: avatar/headshot image URL. When set, used instead of text-initials avatar. */
  avatar_url?: string;
}

/** 10 example teachers for demo; keyed by display name for lookup. */
export const EXAMPLE_INSTRUCTOR_PROFILES: InstructorProfile[] = [
  {
    name: '李老師',
    intro: '專注兒童芭蕾與形體訓練，善於用故事引導小朋友投入課堂。',
    awards: ['香港芭蕾舞學會等級試金獎', '亞洲青少年芭蕾大賽銀獎'],
    years_dancing: 18,
    teaching_experience: 8,
    dance_school: '香港演藝學院舞蹈學院',
    icon: 'ballet',
    background_image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&q=80',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&q=80',
  },
  {
    name: '陳老師',
    intro: '街舞與 Hip Hop 出身，多次擔任大型演出編舞，注重節奏感與表現力。',
    awards: ['HKDSA 街舞大賽冠軍', '全港中學街舞比賽最佳編舞'],
    years_dancing: 15,
    teaching_experience: 6,
    dance_school: '香港專業進修學校舞蹈系',
    icon: 'hiphop',
    background_image: 'https://images.unsplash.com/photo-1557672172-671e2a69f690?w=600&q=80',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&q=80',
  },
  {
    name: '王老師',
    intro: '幼兒律動與親子舞蹈導師，持有幼兒教育證書，課堂氣氛輕鬆愉快。',
    awards: ['香港兒童舞蹈節優秀導師', '親子律動課程設計獎'],
    years_dancing: 12,
    teaching_experience: 7,
    dance_school: '香港教育大學（幼兒教育）',
    icon: 'baby',
    background_image: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=600&q=80',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&q=80',
  },
  {
    name: '張老師',
    intro: '爵士舞與現代舞雙修，舞台經驗豐富，擅長將流行元素融入課堂。',
    awards: ['香港爵士舞公開賽亞軍', '校際舞蹈節現代舞優異獎'],
    years_dancing: 14,
    teaching_experience: 5,
    dance_school: '香港演藝學院現代舞系',
    icon: 'jazz',
    background_image: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=600&q=80',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&q=80',
  },
  {
    name: '黃老師',
    intro: '中國舞與民族民間舞專業，曾隨團赴內地交流，重視基本功與身韻。',
    awards: ['香港學校舞蹈節中國舞金獎導師', '新苗盃中國舞組別冠軍'],
    years_dancing: 20,
    teaching_experience: 10,
    dance_school: '北京舞蹈學院中國舞系',
    icon: 'chinese',
    background_image: 'https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?w=600&q=80',
    avatar_url: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=400&fit=crop&q=80',
  },
  {
    name: '劉老師',
    intro: '拉丁舞與標準舞專項，考獲 IDTA 教師資格，適合想考級或表演的學生。',
    awards: ['IDTA 拉丁舞教師資格', '香港體育舞蹈公開賽拉丁組季軍'],
    years_dancing: 16,
    teaching_experience: 9,
    dance_school: '英國 IDTA 認證教師',
    icon: 'latin',
    background_image: 'https://images.unsplash.com/photo-1547153760-18fc949bc80b?w=600&q=80',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&q=80',
  },
  {
    name: '林老師',
    intro: 'K-Pop 與流行舞導師，熟悉偶像舞碼與編排，課堂節奏明快。',
    awards: ['K-Pop Cover 舞蹈比賽冠軍', '校際流行舞最佳表現獎'],
    years_dancing: 10,
    teaching_experience: 4,
    dance_school: '韓國首爾舞蹈進修',
    icon: 'kpop',
    background_image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&q=80',
  },
  {
    name: '何老師',
    intro: '古典芭蕾與性格舞，曾任職業舞團舞者，對技巧與藝術表現要求嚴格。',
    awards: ['RAD 高級證書', '香港芭蕾舞團前團員'],
    years_dancing: 22,
    teaching_experience: 12,
    dance_school: '英國皇家舞蹈學院 (RAD)',
    icon: 'classic-ballet',
    background_image: 'https://images.unsplash.com/photo-1551969014-7d2c4cddf0b6?w=600&q=80',
    avatar_url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&q=80',
  },
  {
    name: '麥老師',
    intro: 'Breaking 與霹靂舞專長，參與多項街頭與比賽評審，鼓勵學生發揮創意。',
    awards: ['Red Bull BC One 香港賽區評審', '全港霹靂舞大賽冠軍'],
    years_dancing: 13,
    teaching_experience: 5,
    dance_school: '本地 Crew 及海外進修',
    icon: 'breaking',
    background_image: 'https://images.unsplash.com/photo-1557672172-671e2a69f690?w=600&q=80',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&q=80',
  },
  {
    name: '趙老師',
    intro: '中國舞與古典舞身韻導師，兼教成人形體班，注重氣息與線條美感。',
    awards: ['香港舞蹈團前演員', '香港學校舞蹈節多屆金獎導師'],
    years_dancing: 19,
    teaching_experience: 11,
    dance_school: '廣東舞蹈學校中國舞系',
    icon: 'classical',
    background_image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80',
    avatar_url: 'https://images.unsplash.com/photo-1545167622-3a6ac756afa4?w=400&h=400&fit=crop&q=80',
  },
];

const profileByName = new Map<string, InstructorProfile>(
  EXAMPLE_INSTRUCTOR_PROFILES.map((p) => [p.name, p])
);

const STORAGE_KEY = 'the_yard_instructor_profiles';

function getStoredProfiles(): Record<string, InstructorProfile> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, InstructorProfile>;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function setStoredProfile(name: string, profile: InstructorProfile): void {
  const trimmed = (name || '').trim();
  if (!trimmed) return;
  const all = getStoredProfiles();
  all[trimmed] = { ...profile, name: trimmed };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('Failed to save instructor profile to localStorage', e);
  }
}

/** Get instructor profile by name. Prefers admin-saved profile (localStorage), then example set. */
export function getInstructorProfile(instructorName: string): InstructorProfile | undefined {
  const trimmed = (instructorName || '').trim();
  if (!trimmed) return undefined;
  const stored = getStoredProfiles()[trimmed];
  if (stored) return stored;
  return profileByName.get(trimmed) ?? undefined;
}

/** Save instructor profile (e.g. from Admin 導師 edit). Used for demo; backend can persist later. */
export function saveInstructorProfile(name: string, profile: InstructorProfile): void {
  setStoredProfile(name, profile);
}
