<!-- App.svelte -->
<script>
  import { Router, Route } from "svelte-routing";
  
    // Admin Layout
  import Admin from "./layouts/Admin.svelte";
  
  import App from "./App.svelte";
  
  
    export let url = "";
  </script>
  
  <Router url="{url}">
   <!-- admin layout -->
   <Route path="admin/*admin" component="{Admin}" />
    <Route path="/" component="{App}" />
  </Router>
  