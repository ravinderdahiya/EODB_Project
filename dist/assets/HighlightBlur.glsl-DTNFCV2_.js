import{i as e}from"./vec2f64-COkHOen-.js";import{n as t}from"./glsl-CZeEFwwf.js";import{t as n}from"./Texture2DDrawUniform-OaDj7g3n.js";import{t as r}from"./ShaderBuilder-BD7C14Uw.js";import{t as i}from"./NoParameters-B4f79CN4.js";import{t as a}from"./HighlightCellGridScreenSpacePass.glsl-B52VZ5K7.js";import{t as o}from"./Float2DrawUniform-CGiSLB_B.js";var s=class extends i{constructor(){super(...arguments),this.blurSize=e()}};function c(){let e=new r;return e.include(a),e.outputs.add(`fragHighlight`,`vec2`,0),e.fragment.uniforms.add(new o(`blurSize`,e=>e.blurSize),new n(`blurInput`,e=>e.blurInput)).main.add(t`vec2 highlightTextureSize = vec2(textureSize(blurInput,0));
vec2 center = texture(blurInput, sUV).rg;
if (vOutlinePossible == 0.0) {
fragHighlight = center;
} else {
vec2 sum = center * 0.204164;
sum += texture(blurInput, sUV + blurSize * 1.407333).rg * 0.304005;
sum += texture(blurInput, sUV - blurSize * 1.407333).rg * 0.304005;
sum += texture(blurInput, sUV + blurSize * 3.294215).rg * 0.093913;
sum += texture(blurInput, sUV - blurSize * 3.294215).rg * 0.093913;
fragHighlight = sum;
}`),e}var l=Object.freeze(Object.defineProperty({__proto__:null,HighlightBlurDrawParameters:s,build:c},Symbol.toStringTag,{value:`Module`}));export{c as n,s as r,l as t};