<!-- App.vue -->
<template>
  <div id="app">
    <ChatBot />
  </div>
</template>

<script>
import ChatBot from '@/components/ChatBot.vue';

export default {
  name: 'App',
  components: {
    ChatBot,
  },
};
</script>

<style>
/* Add your global styles here if needed */
</style>
