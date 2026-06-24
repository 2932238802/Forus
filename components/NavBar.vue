<script setup lang="ts">
import { siteConfig } from '~/data/site'

const links = [
  { to: '/', label: '主页' },
  { to: '/memo', label: '备忘录' },
  { to: '/goals', label: '我们的目标' },
  { to: '/likes', label: '喜好兴趣' },
]
</script>

<template>
  <nav class="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-4 pt-5 sm:px-6">
    <NuxtLink to="/" class="text-xl font-light tracking-[0.2em] text-slate-100">
      {{ siteConfig.name }}
    </NuxtLink>
    <div class="flex flex-wrap gap-1.5">
      <NuxtLink
        v-for="l in links"
        :key="l.to"
        :to="l.to"
        class="rounded-full px-3 py-1.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-slate-100"
        active-class="accent-text bg-white/10"
      >
        {{ l.label }}
      </NuxtLink>
    </div>
  </nav>
</template>
