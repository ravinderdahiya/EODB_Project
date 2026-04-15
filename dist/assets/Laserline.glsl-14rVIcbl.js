import{b as e}from"./mathUtils-JSzwRbJk.js";import{y as t}from"./vec2-ZEhECn95.js";import{s as n}from"./vec3f64-ZsvGlTgL.js";import{g as r}from"./vec4-BvJ9kaiU.js";import{i}from"./vec4f64-Es8dc9j1.js";import{i as a}from"./vec2f64-COkHOen-.js";import{O as o,_ as s,k as c,l,r as u,v as d,x as f,y as p}from"./vec3-DXY1fyTv.js";import{m,x as h}from"./plane-BU9jAJrE.js";import{n as g}from"./glsl-CZeEFwwf.js";import{t as _}from"./Float3PassUniform-Ds5PNw16.js";import{t as v}from"./FloatPassUniform-KxAVdYC6.js";import{s as y}from"./lineSegment-A8qNg0bh.js";import{t as b}from"./ShaderBuilder-BD7C14Uw.js";import{t as x}from"./Laserline.glsl-nLvEVYEz.js";import{t as S}from"./ScreenSpacePass.glsl-yMEa-8ZV.js";import{t as C}from"./Float2PassUniform-BByIwBNd.js";import{t as w}from"./Float3BindUniform-sv4UGxo1.js";import{t as T}from"./Float4PassUniform-iUfyTgdX.js";import{t as E}from"./FloatBindUniform-n4-aKqpp.js";var D=e(6);function O(e){let t=new b;t.include(S),t.include(x,e);let n=t.fragment;if(e.lineVerticalPlaneEnabled||e.heightManifoldEnabled)if(n.uniforms.add(new v(`maxPixelDistance`,(t,n)=>e.heightManifoldEnabled?2*n.camera.computeScreenPixelSizeAt(t.heightManifoldTarget):2*n.camera.computeScreenPixelSizeAt(t.lineVerticalPlaneSegment.origin))),n.code.add(g`float planeDistancePixels(vec4 plane, vec3 pos) {
float dist = dot(plane.xyz, pos) + plane.w;
float width = fwidth(dist);
dist /= min(width, maxPixelDistance);
return abs(dist);
}`),e.spherical){let e=(e,t,n)=>u(e,t.heightManifoldTarget,n.camera.viewMatrix),t=(e,t)=>u(e,[0,0,0],t.camera.viewMatrix);n.uniforms.add(new T(`heightManifoldOrigin`,(n,r)=>(e(I,n,r),t(z,r),f(z,z,I),s(L,z),L[3]=d(z),L)),new w(`globalOrigin`,e=>t(I,e)),new v(`cosSphericalAngleThreshold`,(e,t)=>1-Math.max(2,c(t.camera.eye,e.heightManifoldTarget)*t.camera.perRenderPixelRatio)/d(e.heightManifoldTarget))),n.code.add(g`float globeDistancePixels(float posInGlobalOriginLength) {
float dist = abs(posInGlobalOriginLength - heightManifoldOrigin.w);
float width = fwidth(dist);
dist /= min(width, maxPixelDistance);
return abs(dist);
}
float heightManifoldDistancePixels(vec4 heightPlane, vec3 pos) {
vec3 posInGlobalOriginNorm = normalize(globalOrigin - pos);
float cosAngle = dot(posInGlobalOriginNorm, heightManifoldOrigin.xyz);
vec3 posInGlobalOrigin = globalOrigin - pos;
float posInGlobalOriginLength = length(posInGlobalOrigin);
float sphericalDistance = globeDistancePixels(posInGlobalOriginLength);
float planarDistance = planeDistancePixels(heightPlane, pos);
return cosAngle < cosSphericalAngleThreshold ? sphericalDistance : planarDistance;
}`)}else n.code.add(g`float heightManifoldDistancePixels(vec4 heightPlane, vec3 pos) {
return planeDistancePixels(heightPlane, pos);
}`);if(e.pointDistanceEnabled&&(n.uniforms.add(new v(`maxPixelDistance`,(e,t)=>2*t.camera.computeScreenPixelSizeAt(e.pointDistanceTarget))),n.code.add(g`float sphereDistancePixels(vec4 sphere, vec3 pos) {
float dist = distance(sphere.xyz, pos) - sphere.w;
float width = fwidth(dist);
dist /= min(width, maxPixelDistance);
return abs(dist);
}`)),e.intersectsLineEnabled&&n.uniforms.add(new E(`perScreenPixelRatio`,e=>e.camera.perScreenPixelRatio)).code.add(g`float lineDistancePixels(vec3 start, vec3 dir, float radius, vec3 pos) {
float dist = length(cross(dir, pos - start)) / (length(pos) * perScreenPixelRatio);
return abs(dist) - radius;
}`),(e.lineVerticalPlaneEnabled||e.intersectsLineEnabled)&&n.code.add(g`bool pointIsWithinLine(vec3 pos, vec3 start, vec3 end) {
vec3 dir = end - start;
float t2 = dot(dir, pos - start);
float l2 = dot(dir, dir);
return t2 >= 0.0 && t2 <= l2;
}`),n.main.add(g`vec3 pos;
vec3 normal;
float angleCutoffAdjust;
float depthDiscontinuityAlpha;
if (!laserlineReconstructFromDepth(pos, normal, angleCutoffAdjust, depthDiscontinuityAlpha)) {
fragColor = vec4(0.0);
return;
}
vec4 color = vec4(0.0);`),e.heightManifoldEnabled){n.uniforms.add(new C(`angleCutoff`,e=>k(e)),new T(`heightPlane`,(e,t)=>P(e.heightManifoldTarget,e.renderCoordsHelper.worldUpAtPosition(e.heightManifoldTarget,I),t.camera.viewMatrix)));let t=e.spherical?g`normalize(globalOrigin - pos)`:g`heightPlane.xyz`;n.main.add(g`
      vec2 angleCutoffAdjusted = angleCutoff - angleCutoffAdjust;
      // Fade out laserlines on flat surfaces
      float heightManifoldAlpha = 1.0 - smoothstep(angleCutoffAdjusted.x, angleCutoffAdjusted.y, abs(dot(normal, ${t})));
      vec4 heightManifoldColor = laserlineProfile(heightManifoldDistancePixels(heightPlane, pos));
      color = max(color, heightManifoldColor * heightManifoldAlpha);`)}return e.pointDistanceEnabled&&(n.uniforms.add(new C(`angleCutoff`,e=>k(e)),new T(`pointDistanceSphere`,(e,t)=>A(e,t))),n.main.add(g`float pointDistanceSphereDistance = sphereDistancePixels(pointDistanceSphere, pos);
vec4 pointDistanceSphereColor = laserlineProfile(pointDistanceSphereDistance);
float pointDistanceSphereAlpha = 1.0 - smoothstep(angleCutoff.x, angleCutoff.y, abs(dot(normal, normalize(pos - pointDistanceSphere.xyz))));
color = max(color, pointDistanceSphereColor * pointDistanceSphereAlpha);`)),e.lineVerticalPlaneEnabled&&(n.uniforms.add(new C(`angleCutoff`,e=>k(e)),new T(`lineVerticalPlane`,(e,t)=>j(e,t)),new _(`lineVerticalStart`,(e,t)=>M(e,t)),new _(`lineVerticalEnd`,(e,t)=>N(e,t))),n.main.add(g`if (pointIsWithinLine(pos, lineVerticalStart, lineVerticalEnd)) {
float lineVerticalDistance = planeDistancePixels(lineVerticalPlane, pos);
vec4 lineVerticalColor = laserlineProfile(lineVerticalDistance);
float lineVerticalAlpha = 1.0 - smoothstep(angleCutoff.x, angleCutoff.y, abs(dot(normal, lineVerticalPlane.xyz)));
color = max(color, lineVerticalColor * lineVerticalAlpha);
}`)),e.intersectsLineEnabled&&(n.uniforms.add(new C(`angleCutoff`,e=>k(e)),new _(`intersectsLineStart`,(e,t)=>u(I,e.lineStartWorld,t.camera.viewMatrix)),new _(`intersectsLineEnd`,(e,t)=>u(I,e.lineEndWorld,t.camera.viewMatrix)),new _(`intersectsLineDirection`,(e,t)=>(o(L,e.intersectsLineSegment.vector),L[3]=0,s(I,r(L,L,t.camera.viewMatrix)))),new v(`intersectsLineRadius`,e=>e.intersectsLineRadius)),n.main.add(g`if (pointIsWithinLine(pos, intersectsLineStart, intersectsLineEnd)) {
float intersectsLineDistance = lineDistancePixels(intersectsLineStart, intersectsLineDirection, intersectsLineRadius, pos);
vec4 intersectsLineColor = laserlineProfile(intersectsLineDistance);
float intersectsLineAlpha = 1.0 - smoothstep(angleCutoff.x, angleCutoff.y, 1.0 - abs(dot(normal, intersectsLineDirection)));
color = max(color, intersectsLineColor * intersectsLineAlpha);
}`)),n.main.add(g`fragColor = laserlineOutput(color * depthDiscontinuityAlpha);`),t}function k(n){return t(F,Math.cos(n.angleCutoff),Math.cos(Math.max(0,n.angleCutoff-e(2))))}function A(e,t){return u(H,e.pointDistanceOrigin,t.camera.viewMatrix),H[3]=c(e.pointDistanceOrigin,e.pointDistanceTarget),H}function j(e,t){let n=y(e.lineVerticalPlaneSegment,.5,I),r=l(I,e.renderCoordsHelper.worldUpAtPosition(n,R),s(z,e.lineVerticalPlaneSegment.vector));return s(r,r),P(e.lineVerticalPlaneSegment.origin,r,t.camera.viewMatrix)}function M(e,t){let n=o(I,e.lineVerticalPlaneSegment.origin);return e.renderCoordsHelper.setAltitude(n,0),u(n,n,t.camera.viewMatrix)}function N(e,t){let n=p(I,e.lineVerticalPlaneSegment.origin,e.lineVerticalPlaneSegment.vector);return e.renderCoordsHelper.setAltitude(n,0),u(n,n,t.camera.viewMatrix)}function P(e,t,n){return u(B,e,n),o(L,t),L[3]=0,r(L,L,n),m(B,L,V)}var F=a(),I=n(),L=i(),R=n(),z=n(),B=n(),V=h(),H=i(),U=Object.freeze(Object.defineProperty({__proto__:null,build:O,defaultAngleCutoff:D},Symbol.toStringTag,{value:`Module`}));export{U as n,O as r,D as t};