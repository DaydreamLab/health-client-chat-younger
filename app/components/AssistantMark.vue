<template>
  <span
    class="assistant-mark"
    :class="`is-${state}`"
    aria-hidden="true"
  >
    <svg
      class="assistant-mark__svg"
      viewBox="0 0 32 32"
      fill="none"
    >
      <circle
        class="ear ear-l"
        cx="5.6"
        cy="18"
        r="1.45"
      />
      <circle
        class="ear ear-r"
        cx="26.4"
        cy="18"
        r="1.45"
      />
      <path
        class="stem"
        d="M16 10.6V6.1"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linecap="round"
      />
      <circle
        class="spark"
        cx="16"
        cy="4.5"
        r="1.75"
      />
      <rect
        class="head"
        x="7"
        y="10.6"
        width="18"
        height="15"
        rx="6.2"
      />
      <g class="face">
        <ellipse
          class="eye eye-l"
          cx="12.15"
          cy="16.7"
          rx="1.65"
          ry="2"
        />
        <ellipse
          class="eye eye-r"
          cx="19.85"
          cy="16.7"
          rx="1.65"
          ry="2"
        />
        <path
          class="mouth"
          d="M13.1 20.7q2.9 1.85 5.8 0"
        />
      </g>
      <g class="dots">
        <g class="spin">
          <circle
            class="dot"
            cx="16"
            cy="13.15"
            r="1.5"
          />
          <circle
            class="dot"
            cx="20.7"
            cy="21.05"
            r="1.5"
          />
          <circle
            class="dot"
            cx="11.3"
            cy="21.05"
            r="1.5"
          />
        </g>
      </g>
    </svg>
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  state?: 'idle' | 'thinking' | 'speaking'
}>(), {
  state: 'idle'
})
</script>

<style scoped>
.assistant-mark {
  display: inline-flex;
  width: 2.6rem;
  height: 2.6rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: var(--ui-bg-elevated);
  color: var(--ui-primary);
}

.assistant-mark__svg {
  width: 2.6rem;
  height: 2.6rem;
  overflow: visible;
}

.ear,
.spark,
.head {
  fill: currentColor;
}

.dot {
  fill: var(--ui-bg-elevated);
}

.eye {
  fill: var(--ui-bg-elevated);
}

.mouth {
  fill: none;
  stroke: var(--ui-bg-elevated);
  stroke-width: 1.45;
  stroke-linecap: round;
}

.face,
.dots {
  transition: opacity 160ms ease;
}

.dots {
  opacity: 0;
}

.spark,
.eye,
.mouth,
.dot,
.spin {
  transform-box: fill-box;
  transform-origin: center;
}

.spark {
  animation: assistant-spark 2.6s ease-in-out infinite;
}

.is-idle .assistant-mark__svg,
.is-speaking .assistant-mark__svg {
  animation: assistant-breathe 3.4s ease-in-out infinite;
}

.is-idle .eye {
  animation: assistant-blink 5.4s ease-in-out infinite;
}

.is-idle .eye-r {
  animation-delay: 70ms;
}

.is-thinking {
  animation: assistant-halo 1.35s ease-in-out infinite;
}

.is-thinking .face {
  opacity: 0;
}

.is-thinking .dots {
  opacity: 1;
}

.is-thinking .spark {
  animation-duration: 0.7s;
}

.is-thinking .spin {
  animation: assistant-orbit 1.05s linear infinite;
}

.is-thinking .dot:nth-child(1) {
  animation: assistant-dot 1.05s ease-in-out infinite;
}

.is-thinking .dot:nth-child(2) {
  animation: assistant-dot 1.05s ease-in-out infinite;
  animation-delay: -0.35s;
}

.is-thinking .dot:nth-child(3) {
  animation: assistant-dot 1.05s ease-in-out infinite;
  animation-delay: -0.7s;
}

.is-speaking .mouth {
  animation: assistant-talk 0.38s ease-in-out infinite;
}

.is-speaking .eye {
  animation: assistant-listen 0.76s ease-in-out infinite;
}

.is-speaking .eye-r {
  animation-delay: 80ms;
}

@keyframes assistant-breathe {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-0.5px);
  }
}

@keyframes assistant-blink {
  0%,
  42%,
  50%,
  100% {
    transform: scaleY(1);
  }

  46% {
    transform: scaleY(0.12);
  }
}

@keyframes assistant-spark {
  0%,
  100% {
    opacity: 0.45;
    transform: scale(0.82);
  }

  50% {
    opacity: 1;
    transform: scale(1.18);
  }
}

@keyframes assistant-halo {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 0%, transparent);
  }

  50% {
    box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 28%, transparent);
  }
}

@keyframes assistant-orbit {
  to {
    transform: rotate(360deg);
  }
}

@keyframes assistant-dot {
  0%,
  100% {
    opacity: 0.4;
    transform: scale(0.62);
  }

  50% {
    opacity: 1;
    transform: scale(1.28);
  }
}

@keyframes assistant-talk {
  0%,
  100% {
    transform: scaleX(0.42) scaleY(0.85);
  }

  35% {
    transform: scaleX(1) scaleY(1.2);
  }

  68% {
    transform: scaleX(0.68) scaleY(0.95);
  }
}

@keyframes assistant-listen {
  0%,
  100% {
    transform: scaleY(1);
  }

  50% {
    transform: scaleY(0.72);
  }
}

@media (prefers-reduced-motion: reduce) {
  .assistant-mark,
  .assistant-mark * {
    animation: none !important;
  }

  .is-thinking .face {
    opacity: 1;
  }

  .is-thinking .dots {
    opacity: 0;
  }
}
</style>
