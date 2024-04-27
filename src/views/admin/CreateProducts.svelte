<script>
  // core components
  import CardTable from "components/Cards/CardTable.svelte";
  import CardSettings from "components/Cards/CardSettings.svelte";
  export let location;
</script>

<div>
  <div class="flex flex-wrap mt-">
    <div class="w-full mb-12 px-4">
      <CardTable />
    </div>
    <div class="w-full mb-12 px-4">
      <CardSettings />
    </div>

  </div>
</div>
