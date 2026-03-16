# Upcoming Frontend Changes

Record of client requests and planned frontend work. Update after each meeting or when new requests come in.

---

## How to use

- **Request** — What the client asked for (short title + optional detail).
- **Priority** — `High` / `Medium` / `Low` (or TBD).
- **Status** — `Requested` → `Planned` → `In progress` → `Done` (or `Deferred` / `Rejected`).
- **Notes** — Page/feature, acceptance criteria, or follow-up.

---

## Change log

| # | Request | Priority | Status | Notes / Page |
|---|--------|----------|--------|--------------|
| 1 | *(example: 試堂申請表加「備用電話」欄位)* | Medium | Requested | Trial application form |
| 2 | Google Calendar–style course calendar: time-grid week view, many classes per day and overlapping (e.g. 3 at same time), weekly + monthly display | High | Done | Public 課程表 CalendarPage: week = time grid 8:00–22:00, overlapping events side-by-side; month shows up to 3 per day; **correction:** interface like Google Calendar, show less data on grid (title + time only; details in modal). Day view = single-column time grid. |
| 3 | | | | |

*(Add rows as you receive new requests.)*

---

## Meeting notes (optional)

**Date:** 2026-03-03
**Attendees:**  
**Summary:**  
**Action items:**  

---

**Last updated:** 2026-03-03

**First** (calendar implemented – see Change log #2)  
一日好多堂，甚至同時間的課堂有三堂；一週的顯示方式或一月的顯示方式 → **UX improvements (2026-03):**  
- Default to **週 (week)** view and **today**; view tabs order: 月 | 週 | 日 so 週/月 are primary.  
- **Month view:** show up to 4 classes per day (was 3), “+N more” uses i18n (更多).  
- **Week view:** when a day has overlapping (same-time) classes, show “→” hint (同時間多堂可向右捲動).  
- **Single location filter** in one toolbar for all views (no repeated filter block per view).  
- Removed hardcoded Feb 2026; calendar opens on current date.
**Second**
regular 跟 level
暑假 就跟歲數編排
只看暑期班或恆常班或短期課程或其他 sorting
inactivate/activate period course
search bar for 試堂，好似揀product甘 suggest 試堂， 地區/課程類別（level）/級別入面的時間/日子/style 自定義 試堂flow
**Third**
最新消息 thumbnail 細少少，最新消息/試堂/login
pop up window advertisement 可以禁link去第二度

課程介紹 level點升
舞種介紹 >> 預約試堂
level介紹 >> 預約試堂

**fourth**
private link pay extra fee
token extend time


phpadmin pw:Theyard2026