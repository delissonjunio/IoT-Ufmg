<template>
  <div>
    <template v-if="!base">
      {{ nodeId }} parent={{ parentId }}, hops={{ hops }} temperature={{ temperature }}, luminosity={{ luminosity }}
    </template>
    <template v-else>
      BASE
    </template>
    <template v-if="children.length">
      <div>
        Filhos:
        <ul>
          <li v-for="node in children" :key="node.nodeId">
            <rfid-mote :nodeId="node.nodeId" :parentId="node.parentId" :hops="node.hops" :temperature="node.temperature" :luminosity="node.luminosity" :children="node.children"></rfid-mote>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<script>
export default {
  name: 'RfidMote',
  props: {
    nodeId: [Number, String],
    parentId: Number,
    hops: Number,
    temperature: Number,
    luminosity: Number,
    children: [Array, Object],
    base: { type: Boolean, default: false }
  }
}
</script>

<style scoped>

</style>
