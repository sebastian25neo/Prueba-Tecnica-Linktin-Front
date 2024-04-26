<!-- App.svelte -->
<script>
import { Router, Route } from "svelte-routing";

  // Admin Layout
import Admin from "./layouts/Admin.svelte";

import Index from "./views/index.svelte";


  export let url = "";
</script>

<Router url="{url}">
 <!-- admin layout -->
 <Route path="admin/*admin" component="{Admin}" />
  <Route path="/" component="{Index}" />
</Router>
