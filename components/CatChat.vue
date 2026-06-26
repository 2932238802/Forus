<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { useCat } from '~/composables/useCat'
import { useIdentity } from '~/composables/useIdentity'

const { identityKey, load: loadIdentity } = useIdentity()
const { messages, thinking, send } = useCat()

onMounted(() => loadIdentity())

// 小猫可见（你和在野都能看到，方便一起逗猫）
const visible = computed(() => identityKey.value !== null)

const open = ref(false)
const input = ref('')
const listRef = ref<HTMLElement | null>(null)

function scrollBottom() {
  nextTick(() => {
    if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight
  })
}

watch(() => messages.value.length, scrollBottom)
watch(open, (v) => { if (v) scrollBottom() })

async function onSend() {
  const t = input.value
  if (!t.trim() || thinking.value) return
  input.value = ''
  await send(t)
}
</script>

<template>
  <ClientOnly>
    <div v-if="visible">
      <!-- 浮动小猫按钮（右侧中下，避开右下角其他按钮） -->
      <button
        class="fixed bottom-28 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-black/50 text-3xl shadow-lg backdrop-blur-md transition hover:scale-110 active:scale-95"
        :title="open ? '收起尚锦' : '找尚锦聊天'"
        @click="open = !open"
      >
        <span class="transition-transform" :class="open ? 'scale-90' : ''">{{ open ? '🐾' : '🐱' }}</span>
      </button>

      <!-- 对话面板 -->
      <Transition name="cat-pop">
        <div
          v-if="open"
          class="fixed bottom-44 right-5 z-50 flex h-[60vh] max-h-[520px] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur-md"
        >
          <!-- 头部 -->
          <div class="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3">
            <span class="text-xl">🐱</span>
            <div class="flex-1">
              <p class="text-sm font-medium text-slate-100">尚锦</p>
              <p class="text-[10px] text-slate-500">{{ thinking ? '正在想…' : '在的，陪着姐姐～' }}</p>
            </div>
            <button class="text-slate-500 hover:text-slate-300" @click="open = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" /></svg>
            </button>
          </div>

          <!-- 消息列表 -->
          <div ref="listRef" class="flex-1 space-y-3 overflow-y-auto p-4">
            <div v-if="!messages.length" class="pt-6 text-center text-xs text-slate-600">
              喵～ 姐姐想和尚锦说点什么吗？🐱
            </div>
            <div
              v-for="(m, i) in messages"
              :key="m.id || i"
              class="flex"
              :class="m.role === 'user' ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-relaxed"
                :class="m.role === 'user'
                  ? 'rounded-tr-sm bg-sky-500/90 text-white'
                  : 'rounded-tl-sm bg-white/10 text-slate-100'"
              >
                {{ m.content }}
              </div>
            </div>
            <div v-if="thinking" class="flex justify-start">
              <div class="rounded-2xl rounded-tl-sm bg-white/10 px-3 py-2 text-sm text-slate-400">尚锦在想… 🐾</div>
            </div>
          </div>

          <!-- 输入 -->
          <form class="flex shrink-0 gap-2 border-t border-white/10 p-3" @submit.prevent="onSend">
            <input
              v-model="input"
              type="text"
              maxlength="500"
              :disabled="thinking"
              placeholder="和尚锦说说话…"
              class="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400 disabled:opacity-50"
            />
            <button
              type="submit"
              :disabled="thinking || !input.trim()"
              class="shrink-0 rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-400 active:scale-95 disabled:opacity-50"
            >
              发送
            </button>
          </form>
        </div>
      </Transition>
    </div>
  </ClientOnly>
</template>

<style scoped>
.cat-pop-enter-active,
.cat-pop-leave-active {
  transition: all 0.25s ease;
}
.cat-pop-enter-from,
.cat-pop-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}
</style>
