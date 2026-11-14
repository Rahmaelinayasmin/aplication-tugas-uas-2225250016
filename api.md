# API — MaWiYas

Aplikasi berjalan **offline**, sehingga "API" utamanya adalah **kontrak modul internal** (TypeScript) antar-lapisan, **format konten JSON**, **format ekspor data penelitian**, dan **REST opsional** untuk sinkronisasi di masa depan.

---

## 1. Probability core — `src/domain/probability`

```ts
// fraction.ts
export interface Fraction {
  readonly num: number;   // pembilang (bilangan bulat)
  readonly den: number;   // penyebut (> 0)
}
export function frac(num: number, den: number): Fraction;          // tidak otomatis disederhanakan
export function simplify(f: Fraction): Fraction;                   // 4/12 → 1/3
export function equals(a: Fraction, b: Fraction): boolean;         // 4/12 == 1/3 → true
export function compare(a: Fraction, b: Fraction): -1 | 0 | 1;
export function toDecimal(f: Fraction, digits?: number): string;   // "0,375" (koma desimal Indonesia)
export function isValidProbability(f: Fraction): boolean;          // 0 ≤ f ≤ 1

// sampleSpace.ts
export type Outcome = string | number | readonly (string | number)[];
export interface SampleSpace<T extends Outcome> {
  id: string;                 // "coin1", "dice2", "deck52", ...
  label: string;              // "Dua dadu dilempar bersamaan"
  outcomes: readonly T[];
}
export const SPACES: {
  coin(n: 1 | 2 | 3): SampleSpace<string[]>;          // ["A","G"] ...
  dice(n: 1 | 2, sides?: 4 | 6 | 8 | 12 | 20): SampleSpace<number[]>;
  deck52(): SampleSpace<Card>;
  bag(contents: Record<string, number>): SampleSpace<string>; // {merah:5, kuning:3, hijau:2}
  spinner(sectors: SpinnerSector[]): SampleSpace<string>;
};

// events.ts
export interface ProbEvent<T extends Outcome> {
  id: string;
  label: string;                         // "mata dadu prima ganjil"
  test: (o: T) => boolean;
}
export function count<T extends Outcome>(s: SampleSpace<T>, e: ProbEvent<T>): number;   // n(A)
export function probability<T extends Outcome>(s: SampleSpace<T>, e: ProbEvent<T>): Fraction;

// rng.ts — keacakan kriptografis
export function randomInt(maxExclusive: number): number;     // crypto.getRandomValues, tanpa bias modulo
export function randomFloat(): number;

// simulate.ts — mode cepat tanpa fisika
export interface SimulationResult<T extends Outcome> {
  trials: number;
  outcomes: T[];                       // dibatasi 1000 terakhir untuk tampilan
  counts: Map<string, number>;
  eventCount?: number;
  relativeFrequency?: number[];        // deret untuk grafik
}
export function simulate<T extends Outcome>(
  space: SampleSpace<T>, trials: number, event?: ProbEvent<T>,
  weights?: number[]                  // untuk spinner/tutup botol (tidak sama kemungkinan)
): SimulationResult<T>;
```

## 2. 3D engine — `src/engine3d`

```ts
export type QualityTier = 'hemat' | 'sedang' | 'tinggi';
export type ThrowableKind = 'coin' | 'die' | 'bottleCap';
export type CoinStyle = 'emasBintang' | 'perakDaun' | 'perunggu' | 'jumbo';
export type DieStyle  = 'klasik' | 'jeli' | 'kayu' | 'angka';

export interface StageOptions {
  canvas: HTMLCanvasElement;
  tier: QualityTier;
  focusMode: boolean;        // rumput diam, tanpa suara
  reducedMotion: boolean;    // hasil langsung tanpa animasi lempar
}

export interface Stage {
  setScene(scene: 'lapangan' | 'meja' | 'kamus'): void;
  setQuality(tier: QualityTier): void;
  setFocusMode(on: boolean): void;
  dispose(): void;
}

export interface ThrowRequest {
  kind: ThrowableKind;
  count: 1 | 2 | 3;
  style?: CoinStyle | DieStyle;
  colors?: string[];          // dua dadu berbeda warna
}
export interface ThrowResult {
  values: (number | 'A' | 'G' | 'telentang' | 'telungkup')[];
  durationMs: number;
  rethrown: boolean;          // true jika sempat didorong ulang karena miring
}
export function throwObjects(stage: Stage, req: ThrowRequest): Promise<ThrowResult>;

export function drawCard(stage: Stage, opts?: { shuffle?: boolean }): Promise<Card>;
export function spin(stage: Stage, sectors: SpinnerSector[], swipeVelocity: number): Promise<string>;
export function drawFromBag(stage: Stage, contents: Record<string, number>,
                            opts?: { replace: boolean }): Promise<string>;
export function drawCoupon(stage: Stage, box: 'A' | 'B'): Promise<'merah' | 'biru'>;

// Kamus Konteks
export function showDeckLayout(stage: Stage, highlight?: { suit?: Suit; rank?: Rank }): void;

export interface Card { suit: Suit; rank: Rank; color: 'merah' | 'hitam' }
export type Suit = 'sekop' | 'keriting' | 'hati' | 'wajik';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
```

Semua fungsi `Promise` selesai ketika benda diam dan hasil terbaca. Bila `reducedMotion` aktif, hasil diacak lewat `rng.ts` lalu benda ditaruh langsung pada posisi hasil.

## 3. Learning engines — `src/domain/learning`

```ts
export type Indicator = 'reasoning' | 'formulating' | 'employing' | 'interpreting';

// ===== Format konten soal (JSON, divalidasi zod) =====
export interface Item {
  id: string;                       // "ML-R-01"
  indicator: Indicator;
  title: string;                    // "Permainan Undian"
  stem: string;                     // teks soal; kata kunci ditandai [[kata]]
  context?: GlossaryRef[];          // tautan kamus: "kartu-remi"
  visual?: { scene: string; params: Record<string, unknown> };
  steps: Step[];
  isTestItem: boolean;              // butir pre/posttest → tidak pernah muncul di latihan
}
export interface Step {
  no: number;                       // Tahap 1..n
  prompt: string;                   // "Berapa banyak kupon di Kotak A?"
  maxScore: number;                 // sesuai kisi-kisi
  check:
    | { type: 'exact'; answer: string | number }
    | { type: 'fraction'; answer: [number, number]; requireSimplified?: boolean }
    | { type: 'set'; answer: (string | number)[] }
    | { type: 'choice'; options: string[]; correct: number }
    | { type: 'reason'; rubric: RubricLevel[] };   // dinilai kata kunci + manual
  hints: [string, string, string];  // level 1 pemantik, 2 terarah, 3 contoh sejenis
  dependsOn?: number[];             // untuk error-carried-forward
}
export interface RubricLevel { score: number; descriptor: string; keywords?: string[] }

// ===== Scoring =====
export interface StepResult { no: number; score: number; max: number; answer: unknown; ecf: boolean }
export interface ItemResult { itemId: string; steps: StepResult[]; total: number; max: number }
export function scoreStep(step: Step, answer: unknown, priorAnswers: Map<number, unknown>): StepResult;
export function scoreItem(item: Item, answers: Map<number, unknown>): ItemResult;

// ===== Hint =====
export interface HintState { wrongCount: number; levelShown: 0 | 1 | 2 | 3 }
export interface HintDecision { show: boolean; level: 1 | 2 | 3; trigger: 'auto' | 'manual' }
export function onWrongAnswer(s: HintState, mastery: number): HintDecision;  // auto setelah 2× (atau 3× bila mastery ≥ 0.8)
export function onHintRequest(s: HintState, mastery: number): HintDecision;
export function masteryOf(studentCode: string, indicator: Indicator): Promise<number>; // 0..1

// ===== Path & diagnostik =====
export function diagnosticResult(answers: unknown[]): { score: number; needRemedial: boolean };
export function nextUnit(studentCode: string): Promise<UnitId>;
```

### Contoh konten (soal kisi-kisi no. 1)
```json
{
  "id": "ML-R-01",
  "indicator": "reasoning",
  "title": "Permainan Undian",
  "stem": "Kotak A berisi 3 kupon [[merah]] dan 5 kupon biru. Kotak B berisi 4 kupon [[merah]] dan 8 kupon biru. Kamu dapat hadiah jika mengambil kupon [[merah]]. Kotak mana yang [[sebaiknya dipilih]]?",
  "visual": { "scene": "couponBoxes", "params": { "A": { "merah": 3, "biru": 5 }, "B": { "merah": 4, "biru": 8 } } },
  "isTestItem": false,
  "steps": [
    { "no": 1, "prompt": "Kejadian apa yang kamu harapkan?", "maxScore": 1,
      "check": { "type": "choice", "options": ["Terambil kupon merah", "Terambil kupon biru"], "correct": 0 },
      "hints": ["Hadiah didapat kalau kupon apa yang terambil?", "Lihat kalimat terakhir yang distabilo.", "Contoh: kalau hadiah untuk bola hijau, kejadiannya 'terambil bola hijau'."] },
    { "no": 2, "prompt": "Peluang terambil kupon merah dari Kotak A?", "maxScore": 2,
      "check": { "type": "fraction", "answer": [3, 8] },
      "hints": ["Coba sebutkan dulu berapa n(S) di Kotak A.", "n(S) = semua kupon di Kotak A = 3 + 5.", "Contoh: 2 merah dan 3 biru → P(merah) = 2/5."] }
  ]
}
```

## 4. Repository & ekspor — `src/data`

```ts
export interface StudentRepo {
  login(code: string, classCode: string): Promise<Student>;   // /^S\d{2,3}$/
  current(): Student | null;
}
export interface AttemptRepo {
  save(r: ItemResult & { studentCode: string; durationMs: number; hintsUsed: number }): Promise<void>;
  byStudent(code: string): Promise<Attempt[]>;
}
export interface EventLog {
  hint(e: HintEvent): Promise<void>;
  simulation(e: SimulationEvent): Promise<void>;
  survey(e: SurveyEvent): Promise<void>;
}
export function exportData(opts: {
  format: 'csv' | 'json';
  scope: 'all' | { classCode: string };
  include: ('attempts' | 'hints' | 'simulations' | 'surveys')[];
}): Promise<{ fileUri: string }>;   // lalu dibagikan via Share sheet
```

### Format ekspor CSV — `attempts.csv`
```
student_code,class_code,mode,item_id,indicator,step_no,step_score,step_max,ecf,item_total,item_max,duration_ms,hints_used,app_version,timestamp
S01,8A,posttest,ML-R-01,reasoning,2,2,2,false,6,6,48211,0,0.3.0,2026-12-01T08:15:02+07:00
```

### Format ekspor CSV — `hints.csv`
```
student_code,item_id,step_no,level,trigger,timestamp
S01,ML-E-03,1,1,auto,2026-12-01T08:20:11+07:00
```

## 5. REST — MaWiYas Server (Python/FastAPI, sudah diimplementasikan di `server/`)

Hanya dibangun jika wawancara menunjukkan sekolah punya internet stabil dan peneliti membutuhkan pengumpulan otomatis. Semua payload hanya berisi kode, tanpa nama.

| Metode | Endpoint | Isi | Respon |
|---|---|---|---|
| `POST` | `/v1/devices/register` | `{ classCode, enrollKey }` | `{ deviceToken }` |
| `POST` | `/v1/sync/attempts` | `Attempt[]` (batch ≤ 200) | `{ accepted, duplicates }` |
| `POST` | `/v1/sync/events` | `HintEvent[] \| SimulationEvent[] \| SurveyEvent[]` | `{ accepted }` |
| `GET` | `/v1/content/version` | — | `{ version, url }` (pembaruan bank soal) |
| `GET` | `/v1/classes/{classCode}/summary` | header `Authorization: Bearer <teacherToken>` | ringkasan per kode siswa |

Ketentuan: HTTPS wajib; idempoten dengan `clientId` (UUID per baris); antre di IndexedDB saat offline, kirim saat online; kode respons standar (`400` validasi, `401` token, `409` duplikat, `429` batas laju).
