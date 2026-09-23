<script setup lang="ts">
definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const localePath = useLocalePath()

await navigateTo(localePath('/chat'), { replace: true })
</script>
