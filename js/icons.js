(function(g){
const paths={
home:'<path d="m3 10 9-7 9 7v11H3V10M9 21V12h6v9"/>',
chart:'<path d="M4 3v17h17M7 15l4-5 4 3 5-7"/>',
network:'<circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="12" cy="19" r="2.5"/><path d="M7.5 6h9M6.4 8.2l4.2 8.6m6.9-8.6-4.1 8.6"/>',
shield:'<path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6l8-3zM8 12l3 3 5-6"/>',
heart:'<path d="M12 20 4.5 12.5C-2 6 7 0 12 7c5-7 14-1 7.5 5.5L12 20z"/>',
layers:'<path d="m3 7 9-4 9 4-9 4-9-4zm0 5 9 4 9-4M3 17l9 4 9-4"/>',

arrow:'<path d="M4 12h15M13 5l7 7-7 7"/>',back:'<path d="M20 12H5m6-7-7 7 7 7"/>',
check:'<path d="m5 12 4 4L19 6"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',
menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
book:'<path d="M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2v16"/>',
beaker:'<path d="M9 3v6L3 19a1 1 0 0 0 1 2h16a1 1 0 0 0 1-2L15 9V3M7 3h10M7 14h10"/>',
grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
bulb:'<path d="M9 18h6M9 21h6M8 15C2 9 6 3 12 3s10 6 4 12l-1 3H9z"/>',
sound:'<path d="m11 4-6 5H2v6h3l6 5V4M15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
reset:'<path d="M3 10a9 9 0 1 1 1 7M3 3v7h7"/>',
target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
people:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4M16 4a3 3 0 0 1 0 6m2 4c3 1 3 4 3 7"/>',
chair:'<path d="M6 13V4h12v9M4 13h16v4H4zM6 17v4m12-4v4"/>',
person:'<circle cx="12" cy="5" r="3"/><path d="M6 21v-6a6 6 0 0 1 12 0v6M9 17v4m6-4v4"/>',
play:'<path d="m8 4 13 8-13 8z"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
spark:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>',
external:'<path d="M13 3h8v8M21 3l-12 12M10 3H4v17h17v-6"/>',
chevron:'<path d="m9 5 7 7-7 7"/>',down:'<path d="m5 9 7 7 7-7"/>',up:'<path d="m5 15 7-7 7 7"/>',
info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v1"/>',
download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
};
g.icon=(name,cls="")=>`<svg class="icon ${cls}" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.spark}</svg>`;
})(globalThis);