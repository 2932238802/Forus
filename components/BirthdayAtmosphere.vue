<script setup lang="ts">
/**
 * 仅在在野生日当天显示的全站装饰。
 * 这个组件不接收点击事件，也不遮挡页面：所有视觉元素都 pointer-events-none。
 */
</script>

<template>
  <div class="birthday-atmosphere" aria-hidden="true">
    <div class="birthday-glow" />

    <div class="balloon balloon-one"><i /></div>
    <div class="balloon balloon-two"><i /></div>
    <div class="balloon balloon-three"><i /></div>
    <div class="balloon balloon-four"><i /></div>

    <span class="confetti confetti-one" />
    <span class="confetti confetti-two" />
    <span class="confetti confetti-three" />
    <span class="confetti confetti-four" />
    <span class="confetti confetti-five" />
    <span class="confetti confetti-six" />
  </div>
</template>

<style scoped>
.birthday-atmosphere {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.birthday-glow {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 8% 14%, rgba(251, 113, 133, 0.16), transparent 24%),
    radial-gradient(circle at 92% 18%, rgba(251, 191, 36, 0.13), transparent 25%),
    radial-gradient(circle at 50% 100%, rgba(244, 114, 182, 0.09), transparent 34%);
}

.balloon {
  position: absolute;
  width: 52px;
  height: 66px;
  border-radius: 50% 50% 48% 48%;
  opacity: 0.7;
  box-shadow: inset -10px -9px 14px rgba(0, 0, 0, 0.13), inset 8px 7px 12px rgba(255, 255, 255, 0.25);
  animation: float 7s ease-in-out infinite;
}
.balloon::after {
  content: '';
  position: absolute;
  left: 22px;
  bottom: -7px;
  width: 9px;
  height: 9px;
  transform: rotate(45deg);
  background: inherit;
}
.balloon i {
  position: absolute;
  left: 26px;
  top: 69px;
  height: 70px;
  border-left: 1px solid rgba(255, 255, 255, 0.38);
}
.balloon-one { top: 10%; left: 3%; background: #fb7185; transform: scale(0.78); }
.balloon-two { top: 19%; right: 5%; background: #fbbf24; animation-delay: -2.3s; transform: scale(0.92); }
.balloon-three { bottom: 6%; left: 9%; background: #a78bfa; animation-delay: -4.6s; transform: scale(0.64); }
.balloon-four { bottom: 14%; right: 7%; background: #f472b6; animation-delay: -1.1s; transform: scale(0.7); }

.confetti {
  position: absolute;
  width: 7px;
  height: 13px;
  border-radius: 2px;
  opacity: 0.65;
  animation: confetti-fall 10s linear infinite;
}
.confetti-one { top: -4%; left: 18%; background: #fbbf24; animation-delay: -1s; }
.confetti-two { top: -11%; left: 34%; background: #fb7185; animation-delay: -5.2s; }
.confetti-three { top: -7%; left: 61%; background: #7dd3fc; animation-delay: -3.8s; }
.confetti-four { top: -15%; left: 78%; background: #f472b6; animation-delay: -7.4s; }
.confetti-five { top: -8%; left: 90%; background: #34d399; animation-delay: -2.1s; }
.confetti-six { top: -12%; left: 47%; background: #fde68a; animation-delay: -8.5s; }

@keyframes float {
  0%, 100% { margin-top: 0; }
  50% { margin-top: -18px; }
}
@keyframes confetti-fall {
  0% { transform: translate3d(0, -10vh, 0) rotate(0deg); }
  100% { transform: translate3d(8vw, 116vh, 0) rotate(720deg); }
}

@media (max-width: 640px) {
  .balloon { opacity: 0.42; transform: scale(0.55); }
  .balloon-one { left: -4%; }
  .balloon-two { right: -5%; }
  .balloon-three, .balloon-four { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .balloon, .confetti { animation: none; }
}
</style>
