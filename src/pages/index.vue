<template>
  <q-page class="q-pa-md">
    <div class="row justify-center items-center">
      <div class="col-4 text-center">
        <q-btn @click="switchMode('active')" :loading="mode === 'active'" color="primary">Escanear ativamente</q-btn>
      </div>
      <div class="col-4 text-center">
        <q-btn v-if="mode !== 'passive'" @click="switchMode('passive')" color="primary">Escanear passivamente</q-btn>
        <q-btn v-else @click="switchMode('')" color="primary">Parar de escanear</q-btn>
      </div>
      <div class="col-4 text-center">
        <q-btn @click="clearTags()" color="primary">Limpar leitura</q-btn>
      </div>
    </div>

    <div class="row q-mt-md justify-center items-center">
      <div class="col-12 text-center">
        <q-chip color="primary">
          <span v-if="mode === 'active'">Escaneando ativamente...</span>
          <span v-else-if="mode === 'passive'">Escaneando passivamente...</span>
          <span v-else>Stand-by</span>
        </q-chip>
      </div>
    </div>

    <div class="row q-mt-xl justify-center items-center">
      <div class="col-12 q-pa-sm code-panel">
        <div class="row gutter-xs wrap">
          <div class="col-4" v-for="tag in tags" :key="tag">
            <q-chip color="secondary" size="small" square>{{ tag }}</q-chip> &nbsp;
          </div>
        </div>
      </div>
    </div>

    <div class="row q-mt-sm justify-center items-center">
      <div class="col-12">
        Tempo de leitura:
        <q-slider
          v-model="readTimeout"
          :min="0"
          :max="100"
          :step="2"
          label
          snap
        />
      </div>
    </div>
  </q-page>
</template>

<style>
  .code-panel {
    min-height: calc(80vh - 48px - 36px);
    border: 2px dashed rgba(0, 16, 217, 0.59);
    font-family: 'Roboto Mono', monospaced, sans-serif;
    background-color: #f6f7ff;
  }
</style>

<script>
export default {
  data: () => ({
    mode: '',
    tags: [],
    readTimeout: 1,
    passiveIntervalId: null
  }),
  methods: {
    generateRandomTagData: function () {
      return '0.yy m | 1.yy ms | xxxx-xxxx-xxxx-xxxx'.replace(/[xy]/g, (c) => {
        let r = Math.random() * 16 | 0
        let t = Math.round(Math.random() * 9)
        let v = c === 'x' ? r : t
        return v.toString(16).toUpperCase()
      })
    },

    switchMode: function (newMode) {
      this.mode = newMode
      if (this.mode === 'passive') {
        this.passiveIntervalId = setInterval(() => {
          if (Math.random() > 0.7) {
            this.tags.push(this.generateRandomTagData())
            this.$q.notify({
              message: `Nova tag lida!`,
              timeout: 1200,
              type: 'positive'
            })
          }
        }, (Math.random() * 1000) + 1000)
      } else {
        if (this.passiveIntervalId) {
          clearInterval(this.passiveIntervalId)
          this.passiveIntervalId = null
        }
      }

      if (this.mode === 'active') {
        setTimeout(() => {
          if (Math.random() > 0.3) {
            this.tags.push(this.generateRandomTagData())
            this.mode = ''
            this.$q.notify({
              message: `Nova tag lida!`,
              timeout: 1200,
              type: 'positive'
            })
          } else {
            this.$q.notify({
              message: `Nenhuma tag encontrada`,
              timeout: 1200,
              type: 'warning'
            })
          }

          this.mode = ''
        }, (Math.random() * 500) + 500)
      }
    },

    clearTags: function () {
      this.tags = []
    }
  }
}
</script>
