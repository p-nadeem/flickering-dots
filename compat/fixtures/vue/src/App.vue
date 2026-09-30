<script setup>
import { decodeSet, encodeSet, getPreset } from 'flickering-dots';
import { defineDotsElement } from 'flickering-dots/element';

defineDotsElement();
const set = decodeSet(encodeSet(getPreset('pulse')));
</script>

<template>
  <flickering-dots :set.prop="set" state="thinking" size="48"></flickering-dots>
</template>
