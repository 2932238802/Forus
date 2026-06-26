<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { usePassphrase } from '~/composables/usePassphrase'
import { todayCelebration, type Celebration } from '~/utils/date'

const entered = ref(false)
const showCurtain = ref(false)
const mounted = ref(false)

const { unlocked, refresh } = usePassphrase()

// 桌面端（≥768px）不折叠、用宫格
const isDesktop = useMediaQuery('(min-width: 768px)')

// 纪念日彩蛋
const celebration = ref<Celebration | null>(null)
const CELE_KEY = 'forus_celebrated' // localStorage 记录当天已放过的 todayKey

function maybeCelebrate() {
  const c = todayCelebration()
  if (!c) return
  // 当天只自动触发一次（避免刷新重放）
  let already = ''
  try {
    already = localStorage.getItem(CELE_KEY) || ''
  } catch {
    /* ignore */
  }
  if (already === c.todayKey) return
  celebration.value = c
}

function onCelebrationDone() {
  if (celebration.value) {
    try {
      localStorage.setItem(CELE_KEY, celebration.value.todayKey)
    } catch {
      /* ignore */
    }
  }
  celebration.value = null
}

onMounted(async () => {
  // 向服务端确认是否已解锁（校验 HttpOnly 签名 Cookie）
  await refresh()
  entered.value = unlocked.value
  showCurtain.value = !unlocked.value
  mounted.value = true
  // 已解锁的（老设备直接进）立即检测彩蛋
  if (entered.value) maybeCelebrate()
})

function onOpened() {
  entered.value = true
  // 刚通过封面进入，也检测彩蛋
  maybeCelebrate()
}
</script>

<template>
  <div>
    <!-- 封面：仅未解锁时显示 -->
    <CurtainIntro v-if="mounted && showCurtain" @opened="onOpened" />

    <!-- 主页内容 -->
    <div class="transition-all duration-1000" :class="entered ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'">
      <NavBar />

      <!-- 想你了：进入后检测对方在你不在时的「想你」 -->
      <ClientOnly>
        <PokeAlert :active="entered" />
      </ClientOnly>

      <!-- 专属小猫（仅在野可见） -->
      <CatChat />

      <!-- 纪念日彩蛋：特殊日子自动撒花 -->
      <ClientOnly>
        <Celebration
          v-if="celebration"
          :celebration="celebration"
          @done="onCelebrationDone"
        />
      </ClientOnly>

      <div
        class="mx-auto flex w-full max-w-[1600px] flex-col gap-4 p-4 sm:p-6
               md:grid md:grid-cols-3 md:gap-5"
      >
        <!-- 在一起天数 -->
        <div class="night-card p-6 md:col-span-1">
          <TogetherCard />
        </div>

        <!-- 时间线 -->
        <div class="night-card p-5 md:col-span-2">
          <ClientOnly>
            <FoldCard title="时间线" :force-open="isDesktop">
              <div class="overflow-y-auto" :class="isDesktop ? 'max-h-[40vh]' : 'max-h-[50vh]'">
                <TimelineCompact />
              </div>
            </FoldCard>
            <template #fallback><div class="text-sm text-slate-500">时间线</div></template>
          </ClientOnly>
        </div>

        <!-- 留言墙 -->
        <div class="night-card p-5 md:col-span-1">
          <ClientOnly>
            <FoldCard title="留言墙" :force-open="isDesktop">
              <div :class="isDesktop ? 'h-[50vh]' : 'h-[55vh]'">
                <NoteWall />
              </div>
            </FoldCard>
            <template #fallback><div class="text-sm text-slate-500">留言墙</div></template>
          </ClientOnly>
        </div>

        <!-- 图片墙 -->
        <div class="night-card p-5 md:col-span-2">
          <ClientOnly>
            <FoldCard title="图片墙" :force-open="isDesktop">
              <div class="overflow-y-auto" :class="isDesktop ? 'max-h-[50vh]' : 'max-h-[60vh]'">
                <MediaWall />
              </div>
            </FoldCard>
            <template #fallback><div class="text-sm text-slate-500">图片墙</div></template>
          </ClientOnly>
        </div>
      </div>
    </div>
  </div>
</template>
