<script>
import "./editor/bundle.css";
import {onMount,onDestroy,createEventDispatcher} from "svelte"; 

let urls= {} ;
let data = {};
let modes = {};
let editor = null;
let aside = false;
let top = false;
let readyDispacher = createEventDispatcher();
let changeDispacher = createEventDispatcher(); 
   
onMount(async ()=>{
  
  let {
    EditorJS, 
    Header,
    List,
    CodeTool,
    Tooltip,
    Quote,
    Marker,
    Underline,
    RawTool,
    Embed,
    ImageTool,
    InlineCode,
    Hyperlink,
    EditorJSStyle,
    Table,
    SimpleImage
    
  } = await import("./editor/index.js");   
editor = await new EditorJS({ 
      /**   
       * Id of Element that should contain the Editor 
       */ 
      holder: 'editorjs',    
      placeholder: 'Let`s write an awesome story!',
      data:data, 
     tools: {  
      tooltip: {
      class: Tooltip,
      config: {
        location: 'top',
        highlightColor: '#FFEFD5',
        underline: true,
        backgroundColor: '#154360',
        textColor: '#FDFEFE',
        //holder: 'editorId',
      }
    },
    header: {
          class: Header, 
          inlineToolbar: ['link'] 
     }, 
    list: { 
          class: List, 
          inlineToolbar: true 
    } ,
    code: {
      class: CodeTool,
      config: {
        modes: modes,
        defaultMode: 'js',
      },},  
     quote: {
          class: Quote,
          inlineToolbar: true,
          shortcut: 'CMD+SHIFT+O',
          config: {
            quotePlaceholder: 'Enter a quote',
            captionPlaceholder: 'Quote\'s author',
          },
        },
        embed: {
          class: Embed,
         inlineToolbar: true,  
          config: {
            services: {
              youtube: true,
              coub: true
            }
          }
        },
        image:{
          class: ImageTool,
          config: {
            endpoints: {
              byFile:urls.upload="", // Your backend file uploader endpoint  
              byUrl: urls.load="", // Your endpoint that provides uploading by Url
            }
          }
        },
      raw: RawTool,
      style: EditorJSStyle.StyleInlineTool,
      table: {
         class: Table,
        },
      Marker: {
          class: Marker,
          shortcut: 'CMD+SHIFT+M',
        },
    underline: Underline,
    inlineCode: {
      class: InlineCode,
      shortcut: 'CMD+SHIFT+M',
    },

    hyperlink: {
      class: Hyperlink,
      config: {
        shortcut: 'CMD+L',
        target: '_blank',
        rel: 'nofollow',
        availableTargets: ['_blank', '_self'],
        availableRels: ['author', 'noreferrer'],
        validate: false,
      }
    } 
     },//end tools
    // change function
    
   onChange: async function(api,event){
   
   changeDispacher("editor_change",{
     api:api,
     editor:editor,
     currentEvent:event
   }); 
 

   }  
})

//if editor ready
  editor.isReady.then(async ()=>{
   window.current_sveditor=editor; 
   readyDispacher("editor_ready",{
      ready:true,
      editor:editor
    })
  })
.catch((err)=>{
 readyDispacher("editor_ready",{
    ready:false
  })
})
 // change event

})
 onDestroy(async ()=>{
   
   if(editor){
    editor.destroy(); 
   }
 })
 
 // 
 let popen = false;
function togglePreview(){
  popen = !popen;
}
 export {top,aside,data,urls,modes}
</script>
<div class="editor-cont" > 
{#if top}
 <nav class="s-md editor-header">
   <slot name="top"></slot>  
 </nav>
 {/if} 
 <div class="editor-center">
   {#if aside}
 <nav class="s-t-md editor-aside">
    <slot name="aside"></slot>
  </nav>
  {/if}
  <div id="editorjs" class="editorjs">
    
  </div>
 </div>
</div>
<section  class="extra-box">
<slot name="extra">
</slot>
</section>


<style>
.s-md{
 box-shadow: 0px 5px 8px rgba(0,0,0,.8); 
 
}
.s-t-md{
 box-shadow: 5px 5px 8px rgba(0,0,0,.8); 
}
  .editor-cont{
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    overflow: hidden;
    overflow-y:auto;
    background-color: inherit;
    color: inherit;
    margin: 0;
    padding: 0;
  }


  .editor-center{
    position: relative;
    display: flex;
    width: 100%;
    height: 100%; 
    flex-shrink: 0;
    flex-wrap: no-wrap;
    margin: 0;
    padding: 0;
  }
  #editorjs{
   
   position: relative;
    min-height: 90vh;
    max-width: 75vw;
    min-width: 40vw;
    margin: 48px 53px; 
     color: inherit;
     background-color: inherit;
  }
  
  .editor-header{
    position: fixed ;
    top:0;
    left:0;
    height: 40px;
    width: 100vw;
    z-index: 50;
    background-color: inherit;
   
  }
  .editor-aside{
    position:fixed;
    top:45px;
    width: 50px;  
    height: 90vh;
    left: 0;
    background-color: inherit;
   border-radius: 8px;
   overflow-x: hidden;
   overflow-y: auto;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  flex-grow: 0;
    
  }
  
    
     
</style>