<!-- App.svelte -->
<script>
  import { Router, Route } from "svelte-routing";

  // Admin Layout
  import Admin from "./layouts/Admin.svelte";
  // Auth Layout
 // import Auth from "./layouts/Auth.svelte";

  // No Layout Pages
 // import Index from "./views/Index.svelte";
  //import Landing from "./views/Landing.svelte";
  //import Profile from "./views/Profile.svelte";
 // import Login from "./views/auth/Login.svelte";
 import Login from "./views/Login.svelte";


  export let url = "";
</script>

<Router url="{url}">
 <!-- admin layout -->
 <Route path="admin/*admin" component="{Admin}" />
  <Route path="/" component="{Login}" />
</Router>
