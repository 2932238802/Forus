<script setup lang="ts">
import { ref } from 'vue'

const entered = ref(false)
function onOpened() {
  entered.value = true
}
</script>

<template>
  <div>
    <!-- 进入封面：窗帘 + 阳光 -->
    <CurtainIntro @opened="onOpened" />

    <!-- 主界面：单屏 Bento 宫格，不滚动 -->
    <div
      class="relative h-screen w-screen overflow-hidden transition-all duration-1000"
      :class="entered ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'"
    >
      <!-- 背景柔光 + 右上角阳光 -->
      <div class="pointer-events-none absolute inset-0 -z-10">
        <div class="absolute inset-0 bg-gradient-to-br from-white via-mist to-white" />
        <div
          class="absolute right-0 top-0 h-[60vh] w-[55vw] opacity-50"
          style="background: radial-gradient(circle at 100% 0%, rgba(254,243,199,0.5) 0%, rgba(186,230,253,0.18) 40%, transparent 70%)"
        />
      </div>

      <!-- 宫格容器 -->
      <div class="grid h-full w-full gap-4 p-4 sm:gap-5 sm:p-6
                  grid-cols-1 grid-rows-[auto_auto_1fr]
                  md:grid-cols-3 md:grid-rows-2">
        <!-- 左上：Forus + 在一起天数 -->
        <div class="glass-card overflow-hidden p-6 md:col-span-1 md:row-span-1">
          <TogetherCard />
        </div>

        <!-- 右上：时间线 -->
        <div class="glass-card overflow-hidden p-6 md:col-span-2 md:row-span-1">
          <ClientOnly>
            <TimelineCompact />
            <template #fallback><div class="text-sm text-slate-300">加载中…</div></template>
          </ClientOnly>
        </div>

        <!-- 左下：留言墙 -->
        <div class="glass-card overflow-hidden p-6 md:col-span-1 md:row-span-1">
          <ClientOnly>
            <NoteWall />
            <template #fallback><div class="text-sm text-slate-300">加载中…</div></template>
          </ClientOnly>
        </div>

        <!-- 右下：图片墙 -->
        <div class="glass-card overflow-hidden p-6 md:col-span-2 md:row-span-1">
          <ClientOnly>
            <MediaWall />
            <template #fallback><div class="text-sm text-slate-300">加载中…</div></template>
          </ClientOnly>
        </div>
      </div>
    </div>
  </div>
</template>
