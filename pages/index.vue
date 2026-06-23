<script setup lang="ts">
import { ref, onMounted } from 'vue'

const entered = ref(false)       // 主界面是否显示
const showCurtain = ref(false)   // 是否需要显示窗帘封面
const mounted = ref(false)

onMounted(() => {
  // 已解锁过（本设备记住）→ 刷新后直接进主界面，不再显示窗帘
  const unlocked = (() => {
    try {
      return localStorage.getItem('forus_unlocked') === '1'
    } catch {
      return false
    }
  })()

  if (unlocked) {
    entered.value = true
    showCurtain.value = false
  } else {
    showCurtain.value = true
  }
  mounted.value = true
})

function onOpened() {
  entered.value = true
}
</script>

<template>
  <div>
    <!-- 进入封面：仅未解锁时显示 -->
    <CurtainIntro v-if="mounted && showCurtain" @opened="onOpened" />

    <!-- 主界面：单屏 Bento 宫格，不滚动 -->
    <div
      class="relative h-screen w-screen overflow-hidden transition-all duration-1000"
      :class="entered ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'"
    >
      <!-- 背景：暗色调 + 流星 -->
      <div class="pointer-events-none absolute inset-0 -z-10">
        <div class="absolute inset-0 night-bg" />
        <!-- 星空 -->
        <div class="stars absolute inset-0" />
        <!-- 流星 -->
        <div class="meteor-sky absolute inset-0 overflow-hidden">
          <span class="meteor" style="--top: 8%; --left: 70%; --delay: 0s; --dur: 4.5s" />
          <span class="meteor" style="--top: 18%; --left: 88%; --delay: 2.5s; --dur: 5.5s" />
          <span class="meteor" style="--top: 4%; --left: 45%; --delay: 6s; --dur: 5s" />
          <span class="meteor" style="--top: 30%; --left: 95%; --delay: 9s; --dur: 6s" />
        </div>
        <!-- 右上角柔光 -->
        <div
          class="absolute right-0 top-0 h-[55vh] w-[50vw] opacity-30"
          style="background: radial-gradient(circle at 100% 0%, rgba(125,211,252,0.25) 0%, rgba(56,189,248,0.08) 40%, transparent 70%)"
        />
      </div>

      <!-- 宫格容器 -->
      <div class="grid h-full w-full gap-4 p-4 sm:gap-5 sm:p-6
                  grid-cols-1 grid-rows-[auto_auto_1fr]
                  md:grid-cols-3 md:grid-rows-2">
        <div class="night-card overflow-hidden p-6 md:col-span-1 md:row-span-1">
          <TogetherCard />
        </div>

        <div class="night-card overflow-hidden p-6 md:col-span-2 md:row-span-1">
          <ClientOnly>
            <TimelineCompact />
            <template #fallback><div class="text-sm text-slate-500">加载中…</div></template>
          </ClientOnly>
        </div>

        <div class="night-card overflow-hidden p-6 md:col-span-1 md:row-span-1">
          <ClientOnly>
            <NoteWall />
            <template #fallback><div class="text-sm text-slate-500">加载中…</div></template>
          </ClientOnly>
        </div>

        <div class="night-card overflow-hidden p-6 md:col-span-2 md:row-span-1">
          <ClientOnly>
            <MediaWall />
            <template #fallback><div class="text-sm text-slate-500">加载中…</div></template>
          </ClientOnly>
        </div>
      </div>
    </div>
  </div>
</template>
