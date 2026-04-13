/* COPYRIGHT Esri - https://js.arcgis.com/5.0/LICENSE.txt */
import{b as n}from"./QUTTHRH3.js";var s=()=>n((a,o)=>{let e=new Set;return o.onDisconnected(()=>{e.forEach(r=>r.cancel())}),{add:r=>{[r].flat().forEach(c=>e.add(c))},resources:e}});export{s as a};
