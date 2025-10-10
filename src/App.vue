<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>

<style>
/* Primary color variables */
:root {
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
}

.bg-primary-50 {
  background-color: var(--color-primary-50);
}

.bg-primary-100 {
  background-color: var(--color-primary-100);
}

.bg-primary-500 {
  background-color: var(--color-primary-500);
}

.bg-primary-600 {
  background-color: var(--color-primary-600);
}

.text-primary-400 {
  color: #60a5fa;
}

.text-primary-500 {
  color: var(--color-primary-500);
}

.text-primary-600 {
  color: var(--color-primary-600);
}

.text-primary-700 {
  color: var(--color-primary-700);
}

.ring-primary-500 {
  --tw-ring-color: var(--color-primary-500);
}

.border-primary-500 {
  border-color: var(--color-primary-500);
}

/* Custom thin scrollbars */
* {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

*::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

*::-webkit-scrollbar-track {
  background: transparent;
}

*::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 3px;
  border: none;
}

*::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}

/* Dark mode scrollbars */
.dark *::-webkit-scrollbar-thumb {
  background-color: #4b5563;
}

.dark *::-webkit-scrollbar-thumb:hover {
  background-color: #6b7280;
}

.dark * {
  scrollbar-color: #4b5563 transparent;
}
</style>
