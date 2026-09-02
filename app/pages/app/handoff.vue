<script setup lang="ts">
definePageMeta({
  layout: 'member',
  middleware: 'auth'
})

const localePath = useLocalePath()

await navigateTo(localePath('/chat'), { replace: true })
</script>
