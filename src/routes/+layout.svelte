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
<svelte:body>
<script type="text/javascript">
	atOptions = {
		'key' : '7f02d3d1538392262cb890a68d186302',
		'format' : 'iframe',
		'height' : 250,
		'width' : 300,
		'params' : {}
	};
</script>
<script type="text/javascript" src="//www.highperformanceformat.com/7f02d3d1538392262cb890a68d186302/invoke.js"></script>
</svelte:body>
<main class="responsive max">
 <slot></slot>
</main>
 
