//import * as cheerio from "cheerio";
import {BROWSER} from "esm-env";

async function genTr(row,id){
  let generated ={
    rows:[],
    cols:[]
  };
  let colss;
  row.forEach((cols,i)=>{
    let tr = document.createElement("tr");
    tr.setAttribute("index",`${i}`);
    
   generated.rows.push(tr);
   colss=cols
colss.forEach((col,i)=>{
     let td = document.createElement("td");
     td.setAttribute("index",`${i}`)
     td.innerHTML=`${col}`;
     generated.cols.push(col);
   })
  })
  //
  let trs = generated.rows;
  let tcol = generated.cols;
  let table = document.createElement("table");
  table.setAttribute("id",`${id}`);
  let th = document.createElement("thead");
  table.append(th)
  let tb = document.createElement("tbody");
  //table.append(tb)

  let trow = document.createElement("tr");
  
  
    for(let td in tcol){
      let t = document.createElement("td");
      t.innerHTML=`${tcol[td]}`;
      t.setAttribute("index",`${td}`);  
      
     trow.append(t); 
     tb.append(trow); 
     table.append(tb)
  
    }
  return table;
}

async function onBrowser(blocks){
  let article = document.createElement("article");
  article.classList.add("article");  
  
blocks.forEach((el,i)=>{
        switch(el.type){
         case "paragraph":
           if(el.data.text.length > 0){
          let p = document.createElement("p");
          p.classList.add("paragraph");
          
          p.innerHTML=`${el.data.text}`;
          p.setAttribute("id",`${el.id}`);
           article.append(p)
           }
           break;  
          case "code":
            let codedata = el.data.code;
            let mode = el.data.mode;
            let pre = document.createElement("pre");
            if(codedata.length > 0){
              let code = document.createElement("code");
              code.innerText=`${codedata}`;
              pre.setAttribute("id",`${el.id}`);
              code.setAttribute("language",`${mode}`);
              code.classList.add(`language-${mode.trim()}`);
              pre.append(code);
              article.append(pre)
            
            }
            break;  
          case "list":
           let items = el.data.items;
           let style = el.data.style;
           
           if(items.length > 0){
             if(style === "ordered"){
             let li = document.createElement("li");
               let ol = document.createElement("ol");
               ol.classList.add("list");
               ol.classList.add("ordered")
               ol.setAttribute("id",`${el.id}`);
               items.forEach((item,i)=>{
               li.innerHTML = `li 1`
               li.setAttribute("index",`${i}`)
                 ol.append(li);
                 article.append(ol)
               })
               
             }else{
               //unodered
           let li = document.createElement("li");
        let ul = document.createElement("ul");
               ul.classList.add("list");
               ul.classList.add("unordered")
               ol.setAttribute("id",`${el.id}`);
               items.forEach((item,i)=>{
               li.innerHTML = `li 1`
               li.setAttribute("index",`${i}`)
                 ul.append(li);
                 article.append(ul)
               })
             }
           }
          
            break;
        case "header":
          let level =el.data.level;
          
          if(el.data.text.length > 0){
            if(level === 1){
              let h1 = document.createElement("h1");
              h1.classList.add("heading");
              h1.setAttribute("id",`${el.id}`)
              h1.innerHTML=`${el.data.text}`;
              article.append(h1)
            }
         if(level === 2){
              let h2 = document.createElement("h2");
              h2.classList.add("heading2");
              h2.setAttribute("id",`${el.id}`)
              h2.innerHTML=`${el.data.text}`;
              article.append(h2)
            }
         if(level === 3){
              let h3 = document.createElement("h3");
              h3.classList.add("heading3");
              h3.setAttribute("id",`${el.id}`)
              h3.innerHTML=`${el.data.text}`;
              article.append(h3)
            }
         if(level === 4){
              let h4 = document.createElement("h4");
              h4.classList.add("heading4");
              h4.setAttribute("id",`${el.id}`)
              h4.innerHTML=`${el.data.text}`;
              article.append(h4)
            }
         if(level === 5){
              let h5 = document.createElement("h5");
              h5.classList.add("heading5");
              h5.setAttribute("id",`${el.id}`)
              h5.innerHTML=`${el.data.text}`;
              article.append(h5)
            }
         if(level === 6){
              let h6 = document.createElement("h6");
              h6.classList.add("heading6");
              h6.setAttribute("id",`${el.id}`)
              h6.innerHTML=`${el.data.text}`;
              article.append(h6)
            }
          }
          break;
        case "embed":
          if(el.data.embed.length >0){
            let embed = document.createElement("embed");
            embed.setAttribute("id",`${el.id}`);
            embed.setAttribute("src",`${el.data.embed}`);
            embed.setAttribute("height",`${el.data.height}`);
            embed.setAttribute("width",`${el.data.width}`);
            embed.setAttribute("caption",`${el.data.caption}`);
            article.append(embed)
          }
          break;
        case "image":
          console.log(el)
          break;
        case "table":
          if(el.data){
            if(el.data.content.length > 0){
              let content = el.data.content;
              let table = genTr(content,el.id).then(t=>{
          
                article.append(t);
              })
             .catch(err=>{
               //
               console.log("failed to load table");
             })
           
              
             } 
            
            
          }
          break;
        case "quote":
          let qdata = el.data;
         if(el.data.text.length > 0){
          let q = document.createElement("bloquote");
          q.innerHTML= `${qdata.text}`;
          q.setAttribute("id",`${el.id}`);
          q.setAttribute("caption",`${qdata.caption}`)
        article.append(q)
         }  
          
          break;
        case "raw":
        if(el.data.length > 0){
          let div = document.createElement("div");
          div.innerHTML=`${
            el.data.html
          }`;
          div.setAttribute("id",`${el.id}`);
          article.append(div);
        }
          break;
          case "link":
            console.log()
        break;
        }
      } )
      return article
        
}
async function onNode(blocks){
  
}
async function genHtml(data){
  if(data){
    if(data.blocks){
      let blocks = data.blocks;
      if(BROWSER === true){
      let html =  await onBrowser(blocks)
      return html;
      }else{
        onNode(blocks)
      }
      
    }else{
      return{
        isError:true,
        msg:"invalid editorjs saved data object"
      }
    }
  }
}
export {genHtml}