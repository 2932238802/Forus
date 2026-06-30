<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCalendar } from '~/composables/useCalendar'
import { useWeather } from '~/composables/useWeather'
import { Solar } from 'lunar-javascript'

definePageMeta({ middleware: 'unlocked' })

const { byDate, setMark } = useCalendar()
const { weather, loading: weatherLoading, fetchWeather } = useWeather()

const WEEK = ['日', '一', '二', '三', '四', '五', '六']

const today = new Date()
const todayStr = ymd(today.getFullYear(), today.getMonth(), today.getDate())

const year = ref(today.getFullYear())
const month = ref(today.getMonth())
const dir = ref<'next' | 'prev'>('next')

// 当前选中的日期（默认今天）
const selected = ref(todayStr)

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function ymd(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

const cells = computed(() => {
  const first = new Date(year.value, month.value, 1)
  const startWeekday = first.getDay()
  const daysInMonth = new Date(year.value, month.value + 1, 0).getDate()
  const arr: ({ day: number; date: string } | null)[] = []
  for (let i = 0; i < startWeekday; i++) arr.push(null)
  for (let d = 1; d <= daysInMonth; d++) arr.push({ day: d, date: ymd(year.value, month.value, d) })
  return arr
})

const monthLabel = computed(() => `${year.value} 年 ${month.value + 1} 月`)

function prevMonth() {
  dir.value = 'prev'
  if (month.value === 0) { month.value = 11; year.value-- } else month.value--
}
function nextMonth() {
  dir.value = 'next'
  if (month.value === 11) { month.value = 0; year.value++ } else month.value++
}
function goToday() {
  dir.value = 'next'
  year.value = today.getFullYear()
  month.value = today.getMonth()
  selected.value = todayStr
}

// 选中某天（若不在当前月，切换月份）
function selectDate(date: string) {
  const [y, m] = date.split('-').map(Number)
  if (y !== year.value || m - 1 !== month.value) {
    dir.value = new Date(date) > new Date(year.value, month.value, 1) ? 'next' : 'prev'
    year.value = y
    month.value = m - 1
  }
  selected.value = date
}

// 键盘 ↑↓←→ 移动选中
function onKey(e: KeyboardEvent) {
  if (showEditor.value) return
  const map: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
  if (!(e.key in map)) return
  e.preventDefault()
  const d = new Date(selected.value + 'T00:00:00')
  d.setDate(d.getDate() + map[e.key])
  selectDate(ymd(d.getFullYear(), d.getMonth(), d.getDate()))
}

// ===== 选中日的详情 =====
const selSolar = computed(() => {
  const [y, m, d] = selected.value.split('-').map(Number)
  return Solar.fromYmd(y, m, d)
})
const selLunar = computed(() => selSolar.value.getLunar())
const lunarText = computed(() => `${selLunar.value.getMonthInChinese()}月${selLunar.value.getDayInChinese()}`)
const ganzhi = computed(() => `${selLunar.value.getYearInGanZhi()}年 ${selLunar.value.getMonthInGanZhi()}月 ${selLunar.value.getDayInGanZhi()}日`)
const yi = computed(() => selLunar.value.getDayYi().slice(0, 6))
const ji = computed(() => selLunar.value.getDayJi().slice(0, 6))
const weekday = computed(() => '星期' + WEEK[new Date(selected.value + 'T00:00:00').getDay()])
const selMark = computed(() => byDate(selected.value))
const isSelToday = computed(() => selected.value === todayStr)

function prettyDate(s: string) {
  const [y, m, d] = s.split('-')
  return `${y}.${m}.${d}`
}

// ===== 备注编辑 =====
const showEditor = ref(false)
const editText = ref('')
const saving = ref(false)
function openEdit() {
  editText.value = selMark.value?.text || ''
  showEditor.value = true
}
async function save() {
  saving.value = true
  try {
    await setMark(selected.value, editText.value)
    showEditor.value = false
  } catch (err: any) {
    alert('保存失败：' + (err?.message || err))
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  fetchWeather()
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div>
    <NavBar />
    <div class="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <div class="grid gap-4 md:grid-cols-[1fr_320px]">
        <!-- 左：月历 -->
        <div class="night-card p-6">
          <div class="flex items-center justify-between">
            <h1 class="text-lg font-medium tracking-wide text-slate-100">Calendar</h1>
            <button class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 transition hover:bg-white/10" @click="goToday">今天</button>
          </div>

          <div class="mt-4 flex items-center justify-between">
            <button class="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-slate-100" @click="prevMonth">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5"><path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </button>
            <span class="text-sm font-medium tabular-nums tracking-wide text-slate-200">{{ monthLabel }}</span>
            <button class="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-slate-100" @click="nextMonth">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5"><path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </button>
          </div>

          <div class="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] text-slate-500">
            <span v-for="w in WEEK" :key="w">{{ w }}</span>
          </div>

          <div class="relative mt-1 overflow-hidden">
            <Transition :name="dir === 'next' ? 'slide-next' : 'slide-prev'" mode="out-in">
              <div :key="`${year}-${month}`" class="grid grid-cols-7 gap-1">
                <template v-for="(c, i) in cells" :key="i">
                  <div v-if="!c" class="aspect-square" />
                  <button
                    v-else
                    class="group relative flex aspect-square items-center justify-center rounded-xl border text-sm transition-colors duration-150"
                    :class="[
                      selected === c.date
                        ? 'border-sky-400 bg-sky-500/25 font-medium text-white ring-1 ring-sky-400/50'
                        : c.date === todayStr
                          ? 'border-sky-400/40 bg-sky-500/10 text-sky-200'
                          : 'border-transparent text-slate-300 hover:bg-white/5',
                    ]"
                    @click="selectDate(c.date)"
                  >
                    <span class="tabular-nums">{{ c.day }}</span>
                    <span v-if="byDate(c.date)" class="absolute bottom-1 h-1 w-1 rounded-full bg-rose-400" />
                  </button>
                </template>
              </div>
            </Transition>
          </div>

          <p class="mt-4 text-center text-[10px] text-slate-600">提示：可用键盘 ↑ ↓ ← → 切换选中的日子</p>
        </div>

        <!-- 右：选中日详情 -->
        <div class="night-card flex flex-col p-5">
          <!-- 日期标题 -->
          <div>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-light tabular-nums text-gradient">{{ Number(selected.split('-')[2]) }}</span>
              <span class="text-sm text-slate-400">{{ prettyDate(selected) }}</span>
              <span v-if="isSelToday" class="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] text-sky-300">今天</span>
            </div>
            <p class="mt-1 text-xs text-slate-500">{{ weekday }} · 农历{{ lunarText }}</p>
            <p class="mt-0.5 text-[11px] text-slate-600">{{ ganzhi }}</p>
          </div>

          <!-- 天气（仅今天显示实时天气） -->
          <div v-if="isSelToday" class="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
            <p class="mb-1 text-[11px] text-slate-500">今日天气</p>
            <div v-if="weatherLoading" class="text-xs text-slate-500">定位获取中…</div>
            <div v-else-if="weather" class="flex items-center gap-3">
              <span class="text-3xl">{{ weather.emoji }}</span>
              <div>
                <p class="text-sm text-slate-200">{{ weather.temp }}°C · {{ weather.desc }}</p>
                <p class="text-[11px] text-slate-500">{{ weather.city }} · 湿度{{ weather.humidity }}% · 风{{ weather.wind }}km/h</p>
              </div>
            </div>
            <div v-else class="text-xs text-slate-600">天气获取失败（可能未允许定位）</div>
          </div>

          <!-- 黄历宜忌 -->
          <div class="mt-4 grid grid-cols-2 gap-2">
            <div class="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
              <p class="mb-1.5 text-[11px] font-medium text-emerald-300">宜</p>
              <p class="text-xs leading-relaxed text-slate-300">{{ yi.length ? yi.join('、') : '诸事不宜' }}</p>
            </div>
            <div class="rounded-xl border border-rose-400/20 bg-rose-400/5 p-3">
              <p class="mb-1.5 text-[11px] font-medium text-rose-300">忌</p>
              <p class="text-xs leading-relaxed text-slate-300">{{ ji.length ? ji.join('、') : '百无禁忌' }}</p>
            </div>
          </div>

          <!-- 备注 -->
          <div class="mt-4 flex-1">
            <div class="mb-1.5 flex items-center justify-between">
              <p class="text-[11px] text-slate-500">这天的备注</p>
              <button class="text-[11px] text-sky-300 transition hover:text-sky-200" @click="openEdit">
                {{ selMark ? '编辑' : '+ 添加' }}
              </button>
            </div>
            <div v-if="selMark" class="rounded-xl border border-rose-400/20 bg-rose-500/5 p-3 text-sm leading-relaxed text-slate-200">
              {{ selMark.text }}
            </div>
            <div v-else class="rounded-xl border border-dashed border-white/10 p-3 text-xs text-slate-600">
              这天还没有备注
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 备注编辑弹窗 -->
    <Teleport to="body">
      <div v-if="showEditor" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showEditor = false" />
        <div class="relative w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
          <h3 class="text-base font-semibold text-slate-100">{{ prettyDate(selected) }}</h3>
          <p class="mt-1 text-xs text-slate-500">给这一天写点备注吧（留空则清除）</p>
          <textarea
            v-model="editText"
            rows="4"
            maxlength="200"
            placeholder="这天发生了什么…"
            class="mt-3 w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm leading-relaxed text-slate-100 outline-none focus:border-sky-400"
          />
          <div class="mt-4 flex justify-end gap-2">
            <button class="rounded-full px-4 py-2 text-sm text-slate-400 hover:bg-white/5" @click="showEditor = false">取消</button>
            <button :disabled="saving" class="rounded-full bg-sky-500 px-5 py-2 text-sm font-medium text-white hover:bg-sky-400 active:scale-95 disabled:opacity-50" @click="save">
              {{ saving ? '保存中…' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* 翻月滑动动画（更顺滑） */
.slide-next-enter-active,
.slide-prev-enter-active {
  transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}
.slide-next-leave-active,
.slide-prev-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
  position: absolute;
  inset: 0;
}
.slide-next-enter-from { opacity: 0; transform: translateX(40px); }
.slide-next-leave-to { opacity: 0; transform: translateX(-30px); }
.slide-prev-enter-from { opacity: 0; transform: translateX(-40px); }
.slide-prev-leave-to { opacity: 0; transform: translateX(30px); }
</style>
