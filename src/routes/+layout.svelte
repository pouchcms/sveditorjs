<script>
import {onMount}  from "svelte";
import {DEV} from "esm-env";
 // import eruda from "eruda";
      
  
 onMount(async ()=>{
 
 
if(DEV === true){
  let eruda = await import("eruda");
  
let el = document.createElement('div');
document.body.appendChild(el);
eruda.init({
    container: el,
});  
} 
 }) 

  </script>
<main class="responsive max">
 <slot></slot>
</main>
 