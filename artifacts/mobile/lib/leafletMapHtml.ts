import type { MapLocation } from "@/lib/mapLocations";

export type LeafletMapLocation = Omit<MapLocation, "lat" | "lng"> & { lat: number; lng: number };

function safeJson(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** Self-contained Leaflet document for either a native WebView or a web iframe. */
export function createLeafletMapHtml(
  locations: LeafletMapLocation[],
  selectedKey: string | undefined,
  isDark: boolean,
  host: "native" | "web"
) {
  const data = safeJson({ locations, selectedKey: selectedKey ?? null });
  const background = isDark ? "#172033" : "#eef3fa";
  const emit = host === "native"
    ? "window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(message));"
    : "window.parent.postMessage({source:'pulse-leaflet',message:message},'*');";
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{width:100%;height:100%;margin:0;background:${background}}.leaflet-popup-content{margin:10px 12px;font:13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.name{font-weight:700;color:#202937}.meta{color:#526275;margin-top:3px}.open{border:0;background:#315d93;color:#fff;border-radius:6px;padding:7px 9px;margin-top:8px;font-weight:600}.leaflet-control-attribution{font-size:10px}</style></head><body><div id="map"></div><script id="map-data" type="application/json">${data}</script><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>(function(){var data=JSON.parse(document.getElementById('map-data').textContent);var map=L.map('map',{zoomControl:true}).setView([9.03,38.75],12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);var markers=[];function send(message){${emit}}function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}data.locations.forEach(function(location){var color=location.kind==='institute'?'#D97706':(location.available?'#059669':'#64748B');var icon=L.divIcon({className:'',html:'<div style="width:28px;height:28px;border-radius:14px;background:'+color+';border:2px solid #fff;box-shadow:0 2px 5px #555;display:flex;align-items:center;justify-content:center;color:#fff;font:bold 15px sans-serif">'+(location.kind==='institute'?'H':'P')+'</div>',iconSize:[28,28],iconAnchor:[14,14]});var marker=L.marker([location.lat,location.lng],{icon:icon}).addTo(map);marker.bindPopup('<div class="name">'+esc(location.name)+'</div><div class="meta">'+esc(location.subtitle||(location.kind==='institute'?'Health Institute':'Healthcare Provider'))+' · '+esc(location.city||'Location')+'</div><button class="open" data-key="'+esc(location.kind+':'+location.id)+'">View details</button>');marker.on('click',function(){send({type:'select',key:location.kind+':'+location.id});});markers.push({location:location,marker:marker});});map.on('popupopen',function(e){var button=e.popup.getElement().querySelector('.open');if(button)button.addEventListener('click',function(){send({type:'open',key:button.getAttribute('data-key')});});});var target=markers.filter(function(x){return x.location.kind+':'+x.location.id===data.selectedKey;})[0];if(target){map.setView([target.location.lat,target.location.lng],15);target.marker.openPopup();}else if(markers.length===1){map.setView(markers[0].marker.getLatLng(),14);}else if(markers.length>1){map.fitBounds(L.featureGroup(markers.map(function(x){return x.marker;})).getBounds(),{padding:[28,28],maxZoom:14});}}());</script></body></html>`;
}