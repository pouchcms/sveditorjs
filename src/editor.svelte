<script  > 

    import EditorJS from '@editorjs/editorjs'; 
    import Header from '@editorjs/header'; 
    import List from '@editorjs/list'; 
        import Quote from '@editorjs/quote';  
    import editorjsCodeflask from '@calumk/editorjs-codeflask';
        import Embed from '@editorjs/embed';
    import ImageTool from '@editorjs/image';
    import LinkTool from '@editorjs/link';
    import RawTool from '@editorjs/raw';
    import SimpleImage from '@editorjs/simple-image';
    import EditorJSStyle from 'editorjs-style';
    import Table from 'editorjs-table';
    import Marker from '@editorjs/marker';
    import Underline from '@editorjs/underline';
    import Tooltip from 'editorjs-tooltip';
    import InlineCode from '@editorjs/inline-code';
    import Hyperlink from 'editorjs-hyperlink';;
     

    
        //data
     export let data = 'hi' ;
     export let url ; 

    const editor = new EditorJS({ 
      /** 
       * Id of Element that should contain the Editor 
       */ 
      holder: 'editorjs', 
        data:data, 
        placeholder: 'Let`s write an awesome story!',
        
    
      /** 
       * Available Tools list. 
       * Pass Tool's class or Settings object for each Tool you want to use 
       */ 
      tools: { 
        tooltip: {
      class: Tooltip,
      config: {
        location: 'left',
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
             code : editorjsCodeflask,
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
         image: {
          class: ImageTool,
          config: {
            endpoints: {
              byFile: url, // Your backend file uploader endpoint
              byUrl: url, // Your endpoint that provides uploading by Url
            }
          }
        },
             linkTool: {
          class: LinkTool,
          config: {
            endpoint: 'http://localhost:8008/fetchUrl', // Your backend endpoint for url data fetching,
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
    },
      }, 
    })


//export editor instance
   export {editor}
    </script>
    <div class='e-row '>
    <div id='editorjs' >
      
    </div>
    </div>
    <style>

  
    .e-row{
        display: contents;
        box-shadow: rgba(0, 0, 0, 0.06) 0px 2px 4px 0px inset;
    }
    
    #editorjs{
            min-width:200px;
            min-height:200px;
            max-width: 700px;
          
            padding: 0 1.5em 0 1.5em;
            margin: auto;
            display: contents;
    }


    </style>
    
    