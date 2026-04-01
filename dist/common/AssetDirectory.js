"use strict";var o=Object.defineProperty;var d=Object.getOwnPropertyDescriptor;var l=Object.getOwnPropertyNames;var c=Object.prototype.hasOwnProperty;var m=(e,t)=>{for(var i in t)o(e,i,{get:t[i],enumerable:!0})},u=(e,t,i,s)=>{if(t&&typeof t=="object"||typeof t=="function")for(let n of l(t))!c.call(e,n)&&n!==i&&o(e,n,{get:()=>t[n],enumerable:!(s=d(t,n))||s.enumerable});return e};var p=e=>u(o({},"__esModule",{value:!0}),e);var x={};m(x,{$:()=>h,close:()=>y,ready:()=>$,template:()=>f,update:()=>g});module.exports=p(x);var r=require("fs"),a=require("path"),h={code:"#code",section:"#section"},f=`
<ui-section id="section" header="\u8D44\u6E90\u76EE\u5F55\u8BF4\u660E" :expanded="true" style="transform: translateY(-38px);" expand>
    <ui-code id="code"></ui-code>
</ui-section>
`;function g(e,t){this.assetList=e,this.metaList=t,e.length===0?this.$.code.innerHTML="":this.$.code.innerHTML=e.filter(i=>{let s=(0,a.join)(i.file,`.${i.name}.md`);return(0,r.existsSync)(s)}).map(i=>{let s=(0,a.join)(i.file,`.${i.name}.md`),n=(0,r.readFileSync)(s,"utf-8");return e.length>1?`${i.url}:
 ${n}`:n}).join(`
`)||"",this.$.code.innerHTML===""?this.$.section.hidden=!0:this.$.section.hidden=!1}function $(){}function y(){}0&&(module.exports={$,close,ready,template,update});
