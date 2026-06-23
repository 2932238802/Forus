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

    <!-- 主界面：手机端可滚动垂直堆叠 / 桌面端固定一屏 Bento -->
    <div
      class="relative min-h-screen w-screen transition-all duration-1000 md:h-screen md:overflow-hidden"
      :class="entered ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'"
    >
      <!-- 背景：暗色夜空 + Canvas 流星雨 -->
      <div class="pointer-events-none fixed inset-0 -z-10">
        <div class="absolute inset-0 night-bg" />
        <!-- Canvas 流星雨（含星空） -->
        <ClientOnly>
          <MeteorCanvas />
        </ClientOnly>
        <!-- 右上角柔光 -->
        <div
          class="absolute right-0 top-0 h-[55vh] w-[50vw] opacity-30"
          style="background: radial-gradient(circle at 100% 0%, rgba(125,211,252,0.25) 0%, rgba(56,189,248,0.08) 40%, transparent 70%)"
        />
      </div>

      <!-- 宫格容器 -->
      <div
        class="flex w-full flex-col gap-4 p-4 sm:gap-5 sm:p-6
               md:grid md:h-full md:grid-cols-3 md:grid-rows-2"
      >
        <!-- 左上：Forus + 在一起天数 -->
        <div class="night-card min-h-[180px] overflow-hidden p-6 md:col-span-1 md:row-span-1 md:min-h-0">
          <TogetherCard />
        </div>

        <!-- 右上：时间线 -->
        <div class="night-card min-h-[240px] overflow-hidden p-6 md:col-span-2 md:row-span-1 md:min-h-0">
          <ClientOnly>
            <TimelineCompact />
            <template #fallback><div class="text-sm text-slate-500">加载中…</div></template>
          </ClientOnly>
        </div>

        <!-- 左下：留言墙 -->
        <div class="night-card min-h-[320px] overflow-hidden p-6 md:col-span-1 md:row-span-1 md:min-h-0">
          <ClientOnly>
            <NoteWall />
            <template #fallback><div class="text-sm text-slate-500">加载中…</div></template>
          </ClientOnly>
        </div>

        <!-- 右下：图片墙 -->
        <div class="night-card min-h-[360px] overflow-hidden p-6 md:col-span-2 md:row-span-1 md:min-h-0">
          <ClientOnly>
            <MediaWall />
            <template #fallback><div class="text-sm text-slate-500">加载中…</div></template>
          </ClientOnly>
        </div>
      </div>
    </div>
  </div>
</template>
