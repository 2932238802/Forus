<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useIdentity } from '~/composables/useIdentity'
import { usePokes, type Poke } from '~/composables/usePokes'

// 当 entered 为 true（已进入主页）时才检测，避免封面阶段就弹
const props = defineProps<{ active: boolean }>()

const { identityKey, nameOf, load: loadIdentity } = useIdentity()
const { fetchUnseen, markSeen } = usePokes()

const pokes = ref<Poke[]>([])
const show = ref(false)

function fmt(at: number) {
  const d = new Date(at)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return sameDay ? `今天 ${hm}` : `${d.getMonth() + 1}/${d.getDate()} ${hm}`
}

async function check() {
  loadIdentity()
  const me = identityKey.value
  if (!me) return
  const list = await fetchUnseen(me)
  if (list.length) {
    pokes.value = list
    show.value = true
  }
}

async function close() {
  show.value = false
  // 标记全部已读
  await markSeen(pokes.value.map((p) => p.id))
  pokes.value = []
}

onMounted(() => {
  if (props.active) check()
})

// active 由封面解锁后变 true 时再检测
watch(
  () => props.active,
  (v) => {
    if (v) check()
  },
)
</script>

<template>
  <Teleport to="body">
    <Transition name="poke-fade">
      <div
        v-if="show"
        class="fixed inset-0 z-[300] flex items-center justify-center p-6"
        @click.self="close"
      >
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div class="relative w-full max-w-sm rounded-3xl border border-rose-400/30 bg-slate-900/95 p-7 text-center shadow-2xl">
          <div class="text-5xl">💗</div>
          <p class="mt-4 text-base font-medium text-slate-100">
            <template v-if="pokes.length === 1">
              {{ nameOf(pokes[0].whoFrom) }} 想你了
            </template>
            <template v-else>
              {{ nameOf(pokes[0].whoFrom) }} 想你了 {{ pokes.length }} 次
            </template>
          </p>
          <p class="mt-1.5 text-xs tracking-wide text-rose-200/70">
            {{ pokes.length === 1 ? fmt(pokes[0].at) : `最近一次 ${fmt(pokes[pokes.length - 1].at)}` }}
          </p>

          <p class="mt-5 text-xs leading-relaxed text-slate-400">
            在你不在的时候，{{ nameOf(pokes[0].whoFrom) }} 悄悄想起了你 🥺
          </p>

          <button
            class="mt-6 w-full rounded-2xl bg-rose-500/90 py-3 text-sm font-medium text-white transition hover:bg-rose-400 active:scale-95"
            @click="close"
          >
            我也想你 💕
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.poke-fade-enter-active,
.poke-fade-leave-active {
  transition: opacity 0.4s ease;
}
.poke-fade-enter-from,
.poke-fade-leave-to {
  opacity: 0;
}
</style>
