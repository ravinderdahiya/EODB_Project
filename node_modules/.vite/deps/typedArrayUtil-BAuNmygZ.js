//#region node_modules/@arcgis/core/core/compilerUtils.js
function n$1(n) {
	return () => n;
}
function r$2(n) {
	return n;
}
//#endregion
//#region node_modules/@arcgis/core/core/RandomLCG.js
var t$1 = class t$1 {
	static {
		this._m = 2147483647;
	}
	static {
		this._a = 48271;
	}
	static {
		this._c = 0;
	}
	constructor(t = 1) {
		this._seed = t;
	}
	set seed(e) {
		this._seed = e ?? Math.random() * t$1._m;
	}
	getInt() {
		return this._seed = (t$1._a * this._seed + t$1._c) % t$1._m, this._seed;
	}
	getFloat() {
		return this.getInt() / (t$1._m - 1);
	}
	getIntRange(t, e) {
		return Math.round(this.getFloatRange(t, e));
	}
	getFloatRange(e, s) {
		const a = s - e;
		return e + this.getInt() / t$1._m * a;
	}
};
//#endregion
//#region node_modules/@arcgis/core/core/arrayUtils.js
var e$1 = 1.5, r$1 = 1 / e$1, l$1 = .5;
function o$1(n) {
	return n;
}
function f$1(n, t = o$1) {
	if (!n || 0 === n.length) return;
	let e = n[0], r = t(e);
	for (let l = 1; l < n.length; ++l) {
		const u = n[l], o = Number(t(u));
		o > r && (r = o, e = u);
	}
	return e;
}
function i$1(n, t = o$1) {
	return f$1(n, (n) => -t(n));
}
function c$1(n, t) {
	return t ? n.filter((n, e, r) => r.findIndex(t.bind(null, n)) === e) : Array.from(new Set(n));
}
function s$1(n, t, e, r, l, u, o) {
	if (null == n && null == r) return !0;
	t = Math.max(0, t), l = Math.max(0, l), e = Math.max(0, e < 0 ? (n?.length ?? 0) + e : e), u = Math.max(0, u < 0 ? (r?.length ?? 0) + u : u);
	const f = e - t;
	if (null == n || null == r || f !== u - l) return !1;
	if (o) {
		for (let i = 0; i < f; i++) if (!o(n[t + i], r[l + i])) return !1;
	} else for (let i = 0; i < f; i++) if (n[t + i] !== r[l + i]) return !1;
	return !0;
}
function h(n, t, e) {
	return s$1(n, 0, n?.length ?? 0, t, 0, t?.length ?? 0, e);
}
function a$1() {
	return (n, t) => {
		if (null == n && null == t) return !0;
		if (null == n || null == t || n.length !== t.length) return !1;
		for (let e = 0; e < n.length; e++) if (n[e] !== t[e]) return !1;
		return !0;
	};
}
function d$1(n, t, e) {
	let r, l;
	return e ? (r = t.filter((t) => !n.some((n) => e(n, t))), l = n.filter((n) => !t.some((t) => e(t, n)))) : (r = t.filter((t) => !n.includes(t)), l = n.filter((n) => !t.includes(n))), {
		added: r,
		removed: l
	};
}
function p$1(n) {
	return n && "number" == typeof n.length;
}
function M(n, t) {
	const e = n.length;
	if (0 === e) return [];
	const r = [];
	for (let l = 0; l < e; l += t) r.push(n.slice(l, l + t));
	return r;
}
var y$1 = class {
	constructor() {
		this.last = 0;
	}
};
var A$1 = new y$1();
function b$1(n, t, e, r) {
	r = r || A$1;
	const l = Math.max(0, r.last - 10);
	for (let o = l; o < e; ++o) if (n[o] === t) return r.last = o, o;
	const u = Math.min(l, e);
	for (let o = 0; o < u; ++o) if (n[o] === t) return r.last = o, o;
	return -1;
}
function S(t, e, r, l) {
	const u = r ?? t.length, o = b$1(t, r$2(e), u, l);
	if (-1 !== o) return t[o] = t[u - 1], r ?? t.pop(), e;
}
var j = /* @__PURE__ */ new Set();
function v(n, t, e = n.length, r = t.length, l, u) {
	if (0 === r || 0 === e) return e;
	j.clear();
	for (let f = 0; f < r; ++f) j.add(t[f]);
	l = l || A$1;
	const o = Math.max(0, l.last - 10);
	for (let f = o; f < e; ++f) if (j.has(n[f]) && (u?.push(n[f]), j.delete(n[f]), n[f] = n[e - 1], --e, --f, 0 === j.size || 0 === e)) return j.clear(), e;
	for (let f = 0; f < o; ++f) if (j.has(n[f]) && (u?.push(n[f]), j.delete(n[f]), n[f] = n[e - 1], --e, --f, 0 === j.size || 0 === e)) return j.clear(), e;
	return j.clear(), e;
}
function z(n, t) {
	let e = 0;
	for (let r = 0; r < n.length; ++r) {
		const l = n[r];
		t(l, r) && (n[e] = l, e++);
	}
	return n.length = e, n;
}
function I$1(n, t, e) {
	const r = n.length;
	if (t >= r) return n.slice();
	const l = C(e), u = /* @__PURE__ */ new Set(), o = [];
	for (; o.length < t;) {
		const t = Math.floor(l() * r);
		u.has(t) || (u.add(t), o.push(n[t]));
	}
	return o;
}
function C(n) {
	return n ? (F$1.seed = n, () => F$1.getFloat()) : Math.random;
}
var F$1 = new t$1();
function G(n, t) {
	if (!n) return n;
	const e = C(t);
	for (let r = n.length - 1; r > 0; r--) {
		const t = Math.floor(e() * (r + 1)), l = n[r];
		n[r] = n[t], n[t] = l;
	}
	return n;
}
function L(n, t) {
	const e = n.indexOf(t);
	return -1 !== e ? (n.splice(e, 1), t) : null;
}
function N(n, t) {
	return null != n;
}
function O(n, ...t) {
	for (const e of t) null != e && n.push(e);
	return n.length;
}
function U$1(n) {
	return Array.isArray(n);
}
var q = [];
//#endregion
//#region node_modules/@arcgis/core/core/typedArrayUtil.js
function n(n) {
	return n instanceof ArrayBuffer;
}
function r(n) {
	return "Int8Array" === n?.constructor?.name;
}
function t(n) {
	return "Uint8Array" === n?.constructor?.name;
}
function u(n) {
	return "Uint8ClampedArray" === n?.constructor?.name;
}
function o(n) {
	return "Int16Array" === n?.constructor?.name;
}
function c(n) {
	return "Uint16Array" === n?.constructor?.name;
}
function e(n) {
	return "Int32Array" === n?.constructor?.name;
}
function a(n) {
	return "Uint32Array" === n?.constructor?.name;
}
function i(n) {
	return "Float16Array" === n?.constructor?.name;
}
function f(n) {
	return "Float32Array" === n?.constructor?.name;
}
function s(n) {
	return "Float64Array" === n?.constructor?.name;
}
function m(n) {
	return "buffer" in n;
}
var y = 1024;
function A(n) {
	return s(n) || f(n) || e(n) || o(n) || r(n);
}
function l(n) {
	return s(n) || f(n);
}
function U(n) {
	return s(n) ? 179769e303 : i(n) ? 65504 : f(n) ? 3402823e32 : a(n) ? 4294967295 : c(n) ? 65535 : t(n) || u(n) ? 255 : e(n) ? 2147483647 : o(n) ? 32767 : r(n) ? 127 : 256;
}
var F = -32768, I = -2147483648;
function d(n) {
	return n;
}
//#endregion
export { b$1 as A, s$1 as B, L as C, S as D, O as E, i$1 as F, n$1 as G, y$1 as H, l$1 as I, r$2 as K, p$1 as L, d$1 as M, e$1 as N, U$1 as O, h as P, q as R, I$1 as S, N as T, z as U, v as V, t$1 as W, t as _, a, C as b, e as c, l as d, m as f, s as g, r as h, U as i, c$1 as j, a$1 as k, f as l, o as m, F as n, c as o, n as p, I as r, d as s, A as t, i as u, u as v, M as w, G as x, y, r$1 as z };

//# sourceMappingURL=typedArrayUtil-BAuNmygZ.js.map