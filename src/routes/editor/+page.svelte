<script>
  import Editor ,{genHtml} from "$lib/index.js";  
  let modes = {
          'js': 'JavaScript',
          'py': 'Python',
          'go': 'Go',
          'cpp': 'C++',
          'cs': 'C#',
          'md': 'Markdown',
        }
    let data = {};
    let urls = {}
 async function handleChange(ev){
    console.log(ev.detail) 
    let editor = ev.detail.editor;
    editor.save().then(async (savedData)=>{
      // do something with data
      console.log(window.current_sveditor); 
    // use helper to gen html
    let html = await genHtml(savedData);  
    console.log(html);
    }).catch((err)=>{console.log(err)})
  }
</script>
<Editor data={data} urls={urls} modes={modes} top="true" aside="true" on:editor_ready={(ev)=>{console.log("ready",ev.detail)}} on:editor_change ={(ev)=>{handleChange(ev)}} >
  <svelte:fragment slot="top" >
<button data-ui="#menu" class="circle fill small  small-elevate ">
 <span class=""> 
  <i class="medium-divider"></i>
 <i class="medium-divider"></i>
 <i class="medium-divider"></i>
 </span>

  <menu id="menu" class="no-wrap right">
    <a href="/">home</a>
    <a href="/editor">editor</a>
    <a href="/docs">docs</a>
  </menu>
</button>
<p>
  put some buttons here
</p>
  </svelte:fragment>
  <svelte:fragment slot="aside" >
    <a class="circle small responsive small-elevate">
      user
    </a>
    <p>
      put some here
    </p>
  </svelte:fragment>
</Editor>

 