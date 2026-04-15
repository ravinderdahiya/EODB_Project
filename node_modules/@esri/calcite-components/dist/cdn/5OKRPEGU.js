/* COPYRIGHT Esri - https://js.arcgis.com/5.0/LICENSE.txt */
import{F as c,h as s}from"./G7AHLVJ5.js";var i={textMatch:"text-match"};function o(t){return t.charAt(0).toUpperCase()+t.slice(1)}function n({text:t,pattern:r}){if(!r||!t)return t;let a=t.split(r);return a.length>1&&(a[1]=s`<mark class=${c(i.textMatch)}>${a[1]}</mark>`),a}export{o as a,n as b};
