<script setup lang="ts">
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import NotFound from './NotFound.vue'

const { Layout } = DefaultTheme
const { page } = useData()
</script>

<template>
  <Layout>
    <template #not-found>
      <NotFound v-if="page.isNotFound" />
    </template>
  </Layout>
</template>
