<script setup lang="ts">
// 所有页面共享的布局：流星夜空背景 + 主题切换器
</script>

<template>
  <div class="relative min-h-screen w-screen">
    <!-- 背景：主题夜空 + Canvas 流星雨（含鼠标彗星尾） -->
    <div class="pointer-events-none fixed inset-0 -z-10">
      <div class="absolute inset-0 night-bg" />
      <ClientOnly>
        <MeteorCanvas :interactive="true" />
      </ClientOnly>
      <div
        class="absolute right-0 top-0 h-[55vh] w-[50vw] opacity-30"
        style="background: radial-gradient(circle at 100% 0%, rgba(var(--glow-a),0.25) 0%, rgba(var(--glow-a),0.08) 40%, transparent 70%)"
      />
    </div>

    <!-- 主题切换器 -->
    <ClientOnly>
      <ThemeSwitcher />
    </ClientOnly>

    <!-- 页面内容 -->
    <slot />
  </div>
</template>
