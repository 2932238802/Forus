<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { usePassphrase } from '~/composables/usePassphrase'

const entered = ref(false)
const showCurtain = ref(false)
const mounted = ref(false)

const { unlocked, refresh } = usePassphrase()

// 桌面端（≥768px）不折叠、用宫格
const isDesktop = useMediaQuery('(min-width: 768px)')

onMounted(async () => {
  // 向服务端确认是否已解锁（校验 HttpOnly 签名 Cookie）
  await refresh()
  entered.value = unlocked.value
  showCurtain.value = !unlocked.value
  mounted.value = true
})

function onOpened() {
  entered.value = true
}
</script>

<template>
  <div>
    <!-- 封面：仅未解锁时显示 -->
    <CurtainIntro v-if="mounted && showCurtain" @opened="onOpened" />

    <!-- 主页内容 -->
    <div class="transition-all duration-1000" :class="entered ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'">
      <NavBar />

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
