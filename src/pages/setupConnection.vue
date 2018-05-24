<template>
  <q-layout>
    <q-page-container>
      <q-page
        padding
        class="row justify-center text-center"
        style="width: 100%">
        <div class="col-12 row-bar-bottom">
          <q-icon name="wifi" class="big-icon icon-base"></q-icon>
          <p><q-chip color="primary">BASE</q-chip></p>
        </div>
        <div class="row" style="width: 100%">
          <div class="text-center col-6">
            <q-icon name="wifi" class="big-icon"></q-icon>
            <p><q-chip color="secondary">ID #1</q-chip></p>
            <q-knob
              size="4rem"
              :value="28"
              :min="0"
              :max="100"
              color="warning"
              readonly>28 ˚C</q-knob>
            <q-knob
              size="4rem"
              :value="77"
              :min="0"
              :max="100"
              color="faded"
              readonly>77% Lum</q-knob>
          </div>
          <div class="col-6">
            <q-icon name="wifi" class="big-icon"></q-icon>
            <p><q-chip color="secondary">ID #2</q-chip></p>
            <q-knob
              size="4rem"
              :value="27"
              :min="0"
              :max="100"
              color="warning"
              readonly>27 ˚C</q-knob>
            <q-knob
              size="4rem"
              :value="75"
              :min="0"
              :max="100"
              color="faded"
              readonly>75% Lum</q-knob>
          </div>
        </div>
        <div class="row" style="width: 100%">
          <div class="text-center col-3">
            <q-icon name="wifi" class="big-icon"></q-icon>
            <p><q-chip color="secondary">ID #7</q-chip></p>
            <q-knob
              size="4rem"
              :value="32"
              :min="0"
              :max="100"
              color="warning"
              readonly>32 ˚C</q-knob>
            <q-knob
              size="4rem"
              :value="11"
              :min="0"
              :max="100"
              color="faded"
              readonly>11% Lum</q-knob>
          </div>
          <div class="col-3">
            <q-icon name="wifi" class="big-icon"></q-icon>
            <p><q-chip color="secondary">ID #5</q-chip></p>
            <q-knob
              size="4rem"
              :value="33"
              :min="0"
              :max="100"
              color="warning"
              readonly>33 ˚C</q-knob>
            <q-knob
              size="4rem"
              :value="12"
              :min="0"
              :max="100"
              color="faded"
              readonly>12% Lum</q-knob>
          </div>
          <div class="col-3">
          </div>
          <div class="col-3">
            <q-icon name="wifi" class="big-icon"></q-icon>
            <p><q-chip color="secondary">ID #3</q-chip></p>
            <q-knob
              size="4rem"
              :value="28"
              :min="0"
              :max="100"
              color="warning"
              readonly>28 ˚C</q-knob>
            <q-knob
              size="4rem"
              :value="77"
              :min="0"
              :max="100"
              color="faded"
              readonly>77% Lum</q-knob>
          </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script>
export default {
}
</script>

<style>
  .big-icon {
    font-size: 5rem;
  }

  .icon-base {
    color: dodgerblue;
  }

  .row-bar-bottom::before {
    border-bottom: 5px solid #222222;
  }
</style>
