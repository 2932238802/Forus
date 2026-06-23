<script setup lang="ts">
import { ref } from 'vue'
import { siteConfig } from '~/data/site'
import { useNotes } from '~/composables/useNotes'

const { notes, addNote, removeNote } = useNotes()

const author = ref(siteConfig.npy)
const text = ref('')

function submit() {
  if (!text.value.trim()) return
  addNote(author.value, text.value)
  text.value = ''
}
</script>

<template>
  <div class="flex h-full flex-col">
    <h2 class="shrink-0 text-sm font-medium tracking-wide text-slate-400">留言墙</h2>

    <div class="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
      <div
        v-for="n in notes"
        :key="n.id"
        class="group relative rounded-xl border border-white/10 bg-white/5 px-3 py-2"
      >
        <p class="text-sm leading-relaxed text-slate-200">{{ n.text }}</p>
        <span class="mt-1 block text-[11px] tracking-wide text-slate-500">{{ n.author }}</span>
        <button
          class="absolute right-2 top-2 text-slate-600 opacity-0 transition hover:text-rose-400 group-hover:opacity-100"
          title="删除"
          @click="removeNote(n.id)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
            <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
          </svg>
        </button>
      </div>
      <p v-if="!notes.length" class="pt-6 text-center text-xs text-slate-600">还没有留言，写下第一句话</p>
    </div>

    <form class="mt-3 shrink-0 space-y-2" @submit.prevent="submit">
      <div class="flex gap-1.5 text-xs">
        <button
          v-for="name in [siteConfig.you, siteConfig.npy]"
          :key="name"
          type="button"
          class="rounded-full px-2.5 py-1 transition"
          :class="author === name ? 'bg-sky-500 text-white' : 'bg-white/5 text-slate-400'"
          @click="author = name"
        >
          {{ name }}
        </button>
      </div>
      <div class="flex gap-2">
        <input
          v-model="text"
          type="text"
          placeholder="写一句话…"
          class="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
        />
        <button
          type="submit"
          class="shrink-0 rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-400 active:scale-95"
        >
          发送
        </button>
      </div>
    </form>
  </div>
</template>
