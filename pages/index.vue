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

    <!-- 主界面：可滚动，三块默认折叠 -->
    <div
      class="relative min-h-screen w-screen transition-all duration-1000"
      :class="entered ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'"
    >
      <!-- 背景：暗色夜空 + Canvas 流星雨 -->
      <div class="pointer-events-none fixed inset-0 -z-10">
        <div class="absolute inset-0 night-bg" />
        <ClientOnly>
          <MeteorCanvas />
        </ClientOnly>
        <div
          class="absolute right-0 top-0 h-[55vh] w-[50vw] opacity-30"
          style="background: radial-gradient(circle at 100% 0%, rgba(125,211,252,0.25) 0%, rgba(56,189,248,0.08) 40%, transparent 70%)"
        />
      </div>

      <!-- 内容：居中单列 -->
      <div class="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 sm:p-6">
        <!-- 顶部：Forus + 在一起天数（不折叠） -->
        <div class="night-card p-6">
          <TogetherCard />
        </div>

        <!-- 时间线（默认折叠） -->
        <div class="night-card p-5">
          <ClientOnly>
            <FoldCard title="时间线">
              <div class="max-h-[50vh] overflow-y-auto">
                <TimelineCompact />
              </div>
            </FoldCard>
            <template #fallback><div class="text-sm text-slate-500">时间线</div></template>
          </ClientOnly>
        </div>

        <!-- 留言墙（默认折叠） -->
        <div class="night-card p-5">
          <ClientOnly>
            <FoldCard title="留言墙">
              <div class="h-[55vh]">
                <NoteWall />
              </div>
            </FoldCard>
            <template #fallback><div class="text-sm text-slate-500">留言墙</div></template>
          </ClientOnly>
        </div>

        <!-- 图片墙（默认折叠） -->
        <div class="night-card p-5">
          <ClientOnly>
            <FoldCard title="图片墙">
              <div class="max-h-[60vh] overflow-y-auto">
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
