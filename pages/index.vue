<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMediaQuery } from '@vueuse/core'

const entered = ref(false)
const showCurtain = ref(false)
const mounted = ref(false)

// 是否桌面端（≥768px）：桌面不折叠、用宫格一屏
const isDesktop = useMediaQuery('(min-width: 768px)')

onMounted(() => {
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

    <!-- 主题切换器 -->
    <ClientOnly>
      <ThemeSwitcher v-if="entered" />
    </ClientOnly>

    <!-- 主界面 -->
    <div
      class="relative w-screen transition-all duration-1000
             min-h-screen md:h-screen md:overflow-hidden"
      :class="entered ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'"
    >
      <!-- 背景：主题夜空 + Canvas 流星雨 -->
      <div class="pointer-events-none fixed inset-0 -z-10">
        <div class="absolute inset-0 night-bg" />
        <ClientOnly>
          <MeteorCanvas />
        </ClientOnly>
        <div
          class="absolute right-0 top-0 h-[55vh] w-[50vw] opacity-30"
          style="background: radial-gradient(circle at 100% 0%, rgba(var(--glow-a),0.25) 0%, rgba(var(--glow-a),0.08) 40%, transparent 70%)"
        />
      </div>

      <!-- 内容容器：手机=单列可滚动 / 桌面=Bento 一屏 -->
      <div
        class="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 sm:p-6
               md:grid md:h-full md:max-w-none md:grid-cols-3 md:grid-rows-2 md:gap-5 md:p-6"
      >
        <!-- 左上：Forus + 在一起天数 -->
        <div class="night-card p-6 md:col-span-1 md:row-span-1 md:overflow-hidden">
          <TogetherCard />
        </div>

        <!-- 右上：时间线 -->
        <div class="night-card p-5 md:col-span-2 md:row-span-1 md:overflow-hidden">
          <ClientOnly>
            <FoldCard title="时间线" :force-open="isDesktop">
              <div class="overflow-y-auto md:h-full" :class="isDesktop ? '' : 'max-h-[50vh]'">
                <TimelineCompact />
              </div>
            </FoldCard>
            <template #fallback><div class="text-sm text-slate-500">时间线</div></template>
          </ClientOnly>
        </div>

        <!-- 左下：留言墙 -->
        <div class="night-card p-5 md:col-span-1 md:row-span-1 md:overflow-hidden">
          <ClientOnly>
            <FoldCard title="留言墙" :force-open="isDesktop">
              <div :class="isDesktop ? 'h-full' : 'h-[55vh]'">
                <NoteWall />
              </div>
            </FoldCard>
            <template #fallback><div class="text-sm text-slate-500">留言墙</div></template>
          </ClientOnly>
        </div>

        <!-- 右下：图片墙 -->
        <div class="night-card p-5 md:col-span-2 md:row-span-1 md:overflow-hidden">
          <ClientOnly>
            <FoldCard title="图片墙" :force-open="isDesktop">
              <div class="overflow-y-auto md:h-full" :class="isDesktop ? '' : 'max-h-[60vh]'">
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
