<script>
  import { Router, Route } from "svelte-routing";
  // components for this layout
  import AdminNavbar from "components/Navbars/AdminNavbar.svelte";
  import Sidebar from "components/Sidebar/Sidebar.svelte";
  //import FooterAdmin from "components/Footers/FooterAdmin.svelte";
  // pages for this layout
  import Buyproduct from "views/admin/Buyproduct.svelte";
  import CreateProducts from "views/admin/CreateProducts.svelte";
  import ListPurchasedProducts from "views/admin/ListPurchasedProducts.svelte";
  export let location;
</script>

<div>
  <Sidebar location={location}/>
  <div class="relative md:ml-64 bg-blueGray-100">
    <div class="relative bg-red-500 md:pt-32 pb-32 pt-12">
    </div>
    <AdminNavbar />
    <div class="px-4 md:px-10 mx-auto w-full -m-24">
      <Router url="admin">
        <Route path="Buyproduct" component="{Buyproduct}" />
        <Route path="CreateProducts" component="{CreateProducts}" />
        <Route path="ListPurchasedProducts" component="{ListPurchasedProducts}" />
      </Router>
    </div>
  </div>
</div>