<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCalendar } from '~/composables/useCalendar'

definePageMeta({ middleware: 'unlocked' })

const { byDate, setMark } = useCalendar()

const WEEK = ['日', '一', '二', '三', '四', '五', '六']

const today = new Date()
const todayStr = ymd(today.getFullYear(), today.getMonth(), today.getDate())

// 当前显示的年月
const year = ref(today.getFullYear())
const month = ref(today.getMonth()) // 0-11

// 翻月动画方向：next 向左滑，prev 向右滑
const dir = ref<'next' | 'prev'>('next')

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function ymd(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

// 生成当前月的格子（含前置空白对齐星期）
const cells = computed(() => {
  const first = new Date(year.value, month.value, 1)
  const startWeekday = first.getDay() // 0=周日
  const daysInMonth = new Date(year.value, month.value + 1, 0).getDate()
  const arr: ({ day: number; date: string } | null)[] = []
  for (let i = 0; i < startWeekday; i++) arr.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    arr.push({ day: d, date: ymd(year.value, month.value, d) })
  }
  return arr
})

const monthLabel = computed(() => `${year.value} 年 ${month.value + 1} 月`)

function prevMonth() {
  dir.value = 'prev'
  if (month.value === 0) {
    month.value = 11
    year.value--
  } else {
    month.value--
  }
}
function nextMonth() {
  dir.value = 'next'
  if (month.value === 11) {
    month.value = 0
    year.value++
  } else {
    month.value++
  }
}
function goToday() {
  dir.value = 'next'
  year.value = today.getFullYear()
  month.value = today.getMonth()
}

// ---- 编辑某天备注 ----
const showEditor = ref(false)
const editDate = ref('')
const editText = ref('')
const saving = ref(false)

function openDay(date: string) {
  editDate.value = date
  editText.value = byDate(date)?.text || ''
  showEditor.value = true
}
async function save() {
  saving.value = true
  try {
    await setMark(editDate.value, editText.value)
    showEditor.value = false
  } catch (err: any) {
    alert('保存失败：' + (err?.message || err))
  } finally {
    saving.value = false
  }
}

function prettyDate(s: string) {
  const [y, m, d] = s.split('-')
  return `${y}.${m}.${d}`
}
</script>

<template>
  <div>
    <NavBar />
    <div class="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <div class="night-card p-6">
        <!-- 头部：年月 + 翻页 -->
        <div class="flex items-center justify-between">
          <h1 class="text-lg font-medium tracking-wide text-slate-100">日历</h1>
          <button
            class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 transition hover:bg-white/10"
            @click="goToday"
          >
            今天
          </button>
        </div>

        <div class="mt-4 flex items-center justify-between">
          <button
            class="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
            @click="prevMonth"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5"><path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
          <span class="text-sm font-medium tabular-nums tracking-wide text-slate-200">{{ monthLabel }}</span>
          <button
            class="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
            @click="nextMonth"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5"><path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
        </div>

        <!-- 星期表头 -->
        <div class="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] text-slate-500">
          <span v-for="w in WEEK" :key="w">{{ w }}</span>
        </div>

        <!-- 月历网格（翻月动画） -->
        <div class="relative mt-1 overflow-hidden">
          <Transition :name="dir === 'next' ? 'slide-next' : 'slide-prev'" mode="out-in">
            <div :key="`${year}-${month}`" class="grid grid-cols-7 gap-1">
              <template v-for="(c, i) in cells" :key="i">
                <div v-if="!c" class="aspect-square" />
                <button
                  v-else
                  class="group relative flex aspect-square flex-col items-center justify-center rounded-xl border text-sm transition"
                  :class="[
                    c.date === todayStr
                      ? 'border-sky-400/60 bg-sky-500/15 text-sky-200'
                      : byDate(c.date)
                        ? 'border-rose-400/40 bg-rose-500/10 text-rose-100'
                        : 'border-transparent text-slate-300 hover:bg-white/5',
                  ]"
                  @click="openDay(c.date)"
                >
                  <span class="tabular-nums">{{ c.day }}</span>
                  <!-- 有备注：小圆点 -->
                  <span
                    v-if="byDate(c.date)"
                    class="absolute bottom-1 h-1 w-1 rounded-full bg-rose-400"
                  />
                </button>
              </template>
            </div>
          </Transition>
        </div>

        <!-- 本月备注列表 -->
        <div class="mt-5 border-t border-white/10 pt-4">
          <p class="mb-2 text-xs text-slate-500">本月的备注</p>
          <ul class="space-y-1.5">
            <li
              v-for="c in cells.filter((x) => x && byDate(x.date))"
              :key="c!.date"
              class="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-white/5"
              @click="openDay(c!.date)"
            >
              <span class="shrink-0 tabular-nums text-rose-300">{{ c!.day }}日</span>
              <span class="flex-1 break-words text-slate-300">{{ byDate(c!.date)?.text }}</span>
            </li>
            <li v-if="!cells.some((x) => x && byDate(x.date))" class="px-2 text-xs text-slate-600">
              这个月还没有备注，点某一天写点什么吧～
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 某天编辑弹窗 -->
    <Teleport to="body">
      <div v-if="showEditor" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showEditor = false" />
        <div class="relative w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
          <h3 class="text-base font-semibold text-slate-100">{{ prettyDate(editDate) }}</h3>
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
            <button
              :disabled="saving"
              class="rounded-full bg-sky-500 px-5 py-2 text-sm font-medium text-white hover:bg-sky-400 active:scale-95 disabled:opacity-50"
              @click="save"
            >
              {{ saving ? '保存中…' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* 翻月滑动动画 */
.slide-next-enter-active,
.slide-next-leave-active,
.slide-prev-enter-active,
.slide-prev-leave-active {
  transition: all 0.28s ease;
}
.slide-next-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.slide-next-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
.slide-prev-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}
.slide-prev-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
