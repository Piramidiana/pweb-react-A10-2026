# Aku Mw Magang

Praktikum Pemrograman Web Modul 5: aplikasi React untuk mengelola proses lamaran magang (Eksplorasi Lowongan, War Room Lamaran, Offer Comparator).

Stack: React 19, TypeScript (`strict`, tanpa `any`), Vite (template `react-ts`), CSS bebas. Dilarang memakai Redux, Zustand, TanStack Query, React Hook Form, atau Formik. Semua state, fetch, form, timer, dan storage memakai React Hooks dan custom hooks buatan sendiri.

## Menjalankan

```sh
npm ci
npm run dev
```

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Menjalankan aplikasi |
| `npm run typecheck` | `tsc --noEmit` untuk kode aplikasi |
| `npm run lint` | oxlint |
| `npm test` | Tes fungsi murni di `src/utils` |
| `npm run build` | Typecheck dan build produksi |

Syarat sebelum merge ke `main`: `npm run typecheck`, `npm test`, dan `npm run build` lolos.

## Pondasi yang sudah ada

Semua fitur memakai bagian ini. **Jangan menulis ulang logikanya di komponen; panggil fungsinya.**

| Lokasi | Isi |
| --- | --- |
| `src/types/` | `Application`, `ApplicationStatus`, `WorkMode`, `ChecklistItem`, `ActivityLog`, `JobListing`, `TransitionData`, `SkillMatch`, `OfferScore`, `OfferComparison` |
| `src/utils/stateMachine.ts` | `TRANSITIONS`, `getNextStatuses`, `canTransition`, `isFinalStatus`, `validateTransitionData` |
| `src/utils/skillMatch.ts` | `calculateSkillMatch`, `getMatchTone`, `hasSkill`, `normalizeSkill` |
| `src/utils/applications.ts` | `isDuplicateApplication`, `parseSkillList` |
| `src/utils/ghosting.ts` | `isGhostingRisk`, `shiftLastUpdated` (tombol Simulasi +15 Hari) |
| `src/utils/interviewClash.ts` | `findInterviewClashes` (panggil dengan seluruh data, bukan yang terfilter) |
| `src/utils/offerScore.ts` | `scoreOffer`, `compareOffers`, `WORK_MODE_SCORE` |
| `src/utils/stats.ts` | `calculateStats` untuk 5 kartu dashboard (derived state) |
| `src/hooks/` | `useLocalStorage<T>`, `useDebounce<T>` |
| `src/services/jobService.ts` | `fetchJobs(source, signal)` untuk Remotive (`"live"`) dan `public/magang-fallback.json` (`"fallback"`) |
| `public/magang-fallback.json` | 15 lowongan **sementara**. Ganti dengan berkas resmi dari asisten bila sudah ada |

Contoh pemakaian:

```ts
import { calculateSkillMatch, getNextStatuses, isGhostingRisk } from "../utils"
import { useDebounce, useLocalStorage } from "../hooks"
import { fetchJobs } from "../services"
```

## Pembagian tugas

| Anggota | Bagian |
| --- | --- |
| Piramidiana | Pondasi (types, utils, hooks, service), koordinasi, review PR, integrasi, README, cek `tsc` dan build |
| Viko | Fitur 1, 2, 5, 6 |
| RayhanFa | Fitur 3, 4, 7 |

Daftar fitur: 1 Profil Skill dan Eksplorasi Lowongan, 2 Form Tambah Lamaran, 3 War Room Pipeline, 4 Detail Lamaran (state machine, checklist, log), 5 Interview Prep Timer, 6 Undo Delete dan Local Storage, 7 Dashboard dan Offer Comparator.

## Aturan kerja tim

1. Satu fitur satu branch dari `main`: `feat/fitur-1`, `feat/fitur-2`, dan seterusnya.
2. Commit kecil dengan format `feat(modul-5): ...`, `fix(modul-5): ...`, atau `docs(modul-5): ...`.
3. Buka Pull Request ke `main`, minta review satu anggota lain, lalu merge. Jangan push langsung ke `main`.
4. Sebelum PR, jalankan `npm run typecheck`, `npm test`, dan `npm run build`.
5. Jika perlu mengubah `src/types` atau `src/utils`, kabari grup dulu karena semua fitur bergantung pada bagian itu.
6. Update state selalu immutable (spread, `map`, `filter`). Dilarang `.push()` atau mengubah properti objek state secara langsung.
7. Setiap anggota harus bisa menjelaskan kode miliknya, termasuk bagian yang dibantu AI, saat demo dan mini live-coding.

## Jadwal

| Tanggal | Target |
| --- | --- |
| Sabtu 21 Nov | Pondasi di `main` |
| 22 sampai 25 Nov | Fitur dikerjakan lewat PR |
| Kamis 26 Nov malam | Freeze fitur, uji 10 testcase di soal |
| Jumat 27 Nov | Cadangan waktu dan pengumpulan sebelum 23:59 |
| 28 sampai 29 Nov | Latihan demo |
| Mulai 30 Nov | Demo offline |
