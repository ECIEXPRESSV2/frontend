// Mapa 3D del campus (ECIExpress) usado como selector de ubicación de tiendas.
//
// Se renderiza dentro de un <iframe srcDoc={...}> en LocationPickerModal. Al hacer
// click en un edificio emite un postMessage `campus-select` con el nombre del bloque
// hacia la ventana padre, que lo usa como valor de "ubicación".
//
// Este es un mapa inicial: más adelante se enriquecerá con indicadores de las tiendas
// existentes y texturas en los edificios, pero la lógica de selección se mantiene.

export const campusMapHtml = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<title>Mapa 3D del campus - ECIExpress</title>
<link href="https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.min.css" rel="stylesheet" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.min.js"></script>
<style>
  :root{
    --ink:#1b2230; --paper:#f4f1ea; --amarillo:#F5C13D;
    --rojo:#e23b3b; --linea:#d9d4c7;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%}
  body{font-family:"Segoe UI",system-ui,-apple-system,sans-serif;background:var(--paper);overflow:hidden}
  #map{position:absolute;inset:0}

  .barra{position:absolute;top:0;left:0;right:0;z-index:5;
    padding:14px 18px;display:flex;align-items:center;gap:12px;
    background:linear-gradient(180deg,rgba(27,34,48,.92),rgba(27,34,48,0));
    color:#fff;pointer-events:none}
  .marca{display:flex;align-items:center;gap:10px}
  .logo{width:34px;height:34px;border-radius:9px;background:var(--ink);
    display:grid;place-items:center;border:2px solid var(--amarillo)}
  .logo svg{width:20px;height:20px}
  .titulo{font-weight:700;font-size:16px;letter-spacing:.2px}
  .sub{font-size:12px;opacity:.8;font-weight:400}

  .panel{position:absolute;left:14px;bottom:14px;z-index:6;
    width:min(330px,calc(100% - 28px));
    background:#fff;border-radius:16px;padding:18px 18px 16px;
    box-shadow:0 14px 40px rgba(20,24,40,.22);
    border-left:6px solid var(--amarillo);
    transform:translateY(140%);transition:transform .28s cubic-bezier(.2,.8,.2,1)}
  .panel.activo{transform:translateY(0)}
  .panel .etq{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;
    color:#8a8a93;font-weight:700}
  .panel .nombre{font-size:24px;font-weight:800;color:var(--ink);margin:3px 0 8px;line-height:1.1}
  .panel .meta{display:flex;gap:18px;margin-top:6px;align-items:center}
  .panel .meta div span{display:block}
  .panel .meta .k{font-size:11px;color:#8a8a93;text-transform:uppercase;letter-spacing:.6px}
  .panel .meta .v{font-size:16px;font-weight:700;color:var(--ink)}
  .usar{margin-top:14px;width:100%;border:none;cursor:pointer;
    background:var(--amarillo);color:#1b2230;font-weight:700;font-size:14px;
    padding:11px;border-radius:11px}
  .usar:active{transform:scale(.98)}
  .cerrar{position:absolute;top:12px;right:12px;width:28px;height:28px;border:none;
    background:#f0ede4;border-radius:8px;cursor:pointer;color:#6b6b73;font-size:16px}

  .pista{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:4;
    background:rgba(27,34,48,.86);color:#fff;padding:12px 18px;border-radius:30px;
    font-size:14px;display:flex;align-items:center;gap:8px;pointer-events:none;
    transition:opacity .4s}
  .pista b{color:var(--amarillo)}

  .creditos{position:absolute;right:8px;bottom:6px;z-index:3;font-size:10px;color:#9a958a}
  .maplibregl-ctrl-group{border-radius:10px!important}
</style>
</head>
<body>
<div id="map"></div>

<div class="barra">
  <div class="marca">
    <div class="logo">
      <svg viewBox="0 0 24 24" fill="none"><path d="M3 5l7 7-7 7" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 5l7 7-7 7" stroke="#F5C13D" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div>
      <div class="titulo">Campus en 3D <span class="sub">Escuela Colombiana de Ingenieria</span></div>
    </div>
  </div>
</div>

<div class="pista" id="pista">Toca un edificio para elegir <b>&nbsp;la ubicacion</b></div>

<div class="panel" id="panel">
  <button class="cerrar" id="cerrar">&times;</button>
  <div class="etq" id="p-tipo">Bloque academico</div>
  <div class="nombre" id="p-nombre">Bloque A</div>
  <div class="meta">
    <div><span class="k">Pisos</span><span class="v" id="p-pisos">3</span></div>
  </div>
  <button class="usar" id="usar">Usar esta ubicacion</button>
</div>

<div class="creditos">Datos: OpenStreetMap (ODbL)</div>

<script>
const CAMPUS = {"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {"name": "Bloque C", "tipo": "Bloque academico", "levels": 3, "height": 9.600000000000001}, "geometry": {"type": "Polygon", "coordinates": [[[-74.0427149, 4.7822542], [-74.0427834, 4.7821648], [-74.0427383, 4.782132], [-74.0427577, 4.782106], [-74.0426541, 4.7820386], [-74.0426345, 4.7820659], [-74.0426165, 4.782052], [-74.0425983, 4.7820379], [-74.0426158, 4.7820125], [-74.042601, 4.7819844], [-74.0425661, 4.7819791], [-74.0425515, 4.7819999], [-74.0425474, 4.7820058], [-74.0425164, 4.7819862], [-74.042486, 4.7820336], [-74.0424182, 4.78199], [-74.0423767, 4.7820538], [-74.0422712, 4.7819865], [-74.0422502, 4.7820175], [-74.0422153, 4.7819937], [-74.0421704, 4.7820611], [-74.0421493, 4.7820928], [-74.042259, 4.7821635], [-74.0422047, 4.7822441], [-74.0421101, 4.7821821], [-74.0420906, 4.7822119], [-74.0420768, 4.7822059], [-74.0420619, 4.7822049], [-74.0420506, 4.7822096], [-74.0420418, 4.7822183], [-74.0420371, 4.7822323], [-74.0420391, 4.7822464], [-74.0420464, 4.7822569], [-74.0420552, 4.7822673], [-74.0420418, 4.7822884], [-74.0421048, 4.7823292], [-74.0420699, 4.7823853], [-74.0421316, 4.7824214], [-74.0421008, 4.7824776], [-74.0422319, 4.7825651], [-74.0423119, 4.7826185], [-74.0424078, 4.7825101], [-74.042217, 4.7823781], [-74.0422383, 4.7823413], [-74.0424447, 4.7824718], [-74.0424897, 4.7825003], [-74.0425373, 4.7824906], [-74.0425676, 4.7824845], [-74.0425986, 4.7824439], [-74.0427014, 4.7825164], [-74.0427325, 4.7824722], [-74.0427506, 4.7824773], [-74.0427687, 4.7824789], [-74.042787, 4.7824757], [-74.0428035, 4.7824655], [-74.0428095, 4.7824464], [-74.0428075, 4.7824281], [-74.0427983, 4.7824111], [-74.0427838, 4.7823959], [-74.0428008, 4.7823706], [-74.0425541, 4.7822143], [-74.0425796, 4.7821729], [-74.0427149, 4.7822542]]]}}, {"type": "Feature", "properties": {"name": "Bloque A", "tipo": "Bloque academico", "levels": 3, "height": 9.600000000000001}, "geometry": {"type": "Polygon", "coordinates": [[[-74.0423219, 4.7827179], [-74.0423369, 4.782789], [-74.0423674, 4.7829337], [-74.0426105, 4.7828833], [-74.0426679, 4.7828715], [-74.0427185, 4.7828618], [-74.0430423, 4.7827924], [-74.0430237, 4.782704], [-74.0430212, 4.782692], [-74.0430157, 4.7826661], [-74.04299, 4.7826715], [-74.04298, 4.7826736], [-74.0429612, 4.7825842], [-74.0427162, 4.7826355], [-74.0426756, 4.782644], [-74.0426158, 4.7826565], [-74.042555, 4.7826692], [-74.0423219, 4.7827179]]]}}, {"type": "Feature", "properties": {"name": "Bloque B", "tipo": "Bloque academico", "levels": 2, "height": 6.4}, "geometry": {"type": "Polygon", "coordinates": [[[-74.0430882, 4.7828524], [-74.0427326, 4.7829249], [-74.0426856, 4.7829343], [-74.0426232, 4.7829467], [-74.042418, 4.7829879], [-74.0424227, 4.7830108], [-74.0424269, 4.7830317], [-74.0424138, 4.7830344], [-74.0423968, 4.7830378], [-74.0424046, 4.7830761], [-74.0424398, 4.783069], [-74.0424519, 4.7831281], [-74.0427074, 4.7830765], [-74.0427324, 4.7830714], [-74.0427437, 4.7830688], [-74.0428315, 4.7830511], [-74.0428467, 4.783048], [-74.0428604, 4.7830453], [-74.0431169, 4.7829936], [-74.0430882, 4.7828524]]]}}, {"type": "Feature", "properties": {"name": "Bloque G", "tipo": "Bloque academico", "levels": 2, "height": 6.4}, "geometry": {"type": "Polygon", "coordinates": [[[-74.0424698, 4.7833644], [-74.0428769, 4.7836273], [-74.0429696, 4.7834848], [-74.042938, 4.7834644], [-74.0429169, 4.7834508], [-74.0428958, 4.7834372], [-74.0425625, 4.7832219], [-74.0425206, 4.7832862], [-74.0425122, 4.7832987], [-74.0425016, 4.7833146], [-74.0424943, 4.7833261], [-74.0424698, 4.7833644]]]}}, {"type": "Feature", "properties": {"name": "Bloque D", "tipo": "Bloque academico", "levels": 3, "height": 9.600000000000001}, "geometry": {"type": "Polygon", "coordinates": [[[-74.0434277, 4.7830029], [-74.0434067, 4.7830277], [-74.0433812, 4.7830194], [-74.0433569, 4.7830303], [-74.0433536, 4.7830515], [-74.0433699, 4.7830706], [-74.0433439, 4.7831125], [-74.0435452, 4.7832367], [-74.043593, 4.7834125], [-74.0437591, 4.7833676], [-74.0437044, 4.7831664], [-74.0436254, 4.7831158], [-74.0436011, 4.7831003], [-74.0435748, 4.7830834], [-74.0434277, 4.7830029]]]}}, {"type": "Feature", "properties": {"name": "Bloque F", "tipo": "Bloque academico", "levels": 3, "height": 9.600000000000001}, "geometry": {"type": "Polygon", "coordinates": [[[-74.043716, 4.7838286], [-74.0437498, 4.783608], [-74.0435218, 4.7835733], [-74.0430943, 4.7835083], [-74.0430588, 4.7835029], [-74.043025, 4.7837236], [-74.0430617, 4.7837292], [-74.0436504, 4.7838186], [-74.043716, 4.7838286]]]}}, {"type": "Feature", "properties": {"name": "Bloque I", "tipo": "Bloque academico", "levels": 3, "height": 9.600000000000001}, "geometry": {"type": "Polygon", "coordinates": [[[-74.0446359, 4.7820277], [-74.044649, 4.7819245], [-74.0446546, 4.7818809], [-74.0446807, 4.7816759], [-74.0446915, 4.7815908], [-74.0441128, 4.7815176], [-74.0440572, 4.7819546], [-74.0441879, 4.7819711], [-74.0442176, 4.7819749], [-74.0442449, 4.7819783], [-74.044386, 4.7819962], [-74.044411, 4.7819992], [-74.0444438, 4.7820035], [-74.0446359, 4.7820277]]]}}, {"type": "Feature", "properties": {"name": "Bloque H", "tipo": "Bloque academico", "levels": 3, "height": 9.600000000000001}, "geometry": {"type": "Polygon", "coordinates": [[[-74.0447355, 4.7817613], [-74.0449385, 4.7817915], [-74.0449673, 4.7817957], [-74.0449526, 4.7818943], [-74.0450629, 4.7819107], [-74.0451178, 4.7819188], [-74.0451666, 4.7815923], [-74.0450172, 4.7815702], [-74.0450078, 4.781633], [-74.0447601, 4.7815964], [-74.0447481, 4.781677], [-74.0447355, 4.7817613]]]}}, {"type": "Feature", "properties": {"name": "Bloque E", "tipo": "Bloque academico", "levels": 3, "height": 9.600000000000001}, "geometry": {"type": "Polygon", "coordinates": [[[-74.0438151, 4.7822055], [-74.0437565, 4.7821965], [-74.0434247, 4.7821434], [-74.0434129, 4.7822334], [-74.0434091, 4.7822613], [-74.0434056, 4.7822892], [-74.0436405, 4.7823182], [-74.043625, 4.7823866], [-74.0436055, 4.7824642], [-74.0435775, 4.7825409], [-74.0435443, 4.7826123], [-74.0435111, 4.7826728], [-74.0435066, 4.7826811], [-74.0435028, 4.782687], [-74.0434636, 4.7827481], [-74.0435897, 4.7828375], [-74.0436284, 4.7827758], [-74.0436374, 4.7827615], [-74.0436798, 4.7826821], [-74.043716, 4.7825999], [-74.0437451, 4.7825178], [-74.0437672, 4.782433], [-74.0437875, 4.7823492], [-74.0438027, 4.7822714], [-74.0438042, 4.7822635], [-74.0438151, 4.7822055]]]}}, {"type": "Feature", "properties": {"name": "Laboratorios L2", "tipo": "Laboratorios", "levels": 2, "height": 6.4}, "geometry": {"type": "Polygon", "coordinates": [[[-74.044932, 4.7839122], [-74.044948, 4.783805], [-74.0447361, 4.7837734], [-74.0447254, 4.7837718], [-74.0447146, 4.7837702], [-74.0444957, 4.7837376], [-74.0444796, 4.7838447], [-74.044932, 4.7839122]]]}}, {"type": "Feature", "properties": {"name": "Laboratorios L3", "tipo": "Laboratorios", "levels": 2, "height": 6.4}, "geometry": {"type": "Polygon", "coordinates": [[[-74.0456753, 4.7838179], [-74.0456838, 4.7837595], [-74.0455546, 4.7837408], [-74.0454263, 4.7837223], [-74.0454178, 4.7837806], [-74.0456753, 4.7838179]]]}}, {"type": "Feature", "properties": {"name": "Laboratorios L1", "tipo": "Laboratorios", "levels": 2, "height": 6.4}, "geometry": {"type": "Polygon", "coordinates": [[[-74.0449876, 4.7837379], [-74.0449968, 4.783682], [-74.0449729, 4.7836781], [-74.0449764, 4.7836566], [-74.0449525, 4.7836527], [-74.0449588, 4.7836144], [-74.0446193, 4.7835591], [-74.0446222, 4.7835413], [-74.0443271, 4.783493], [-74.0443247, 4.7835102], [-74.0438758, 4.7834376], [-74.0438536, 4.7835754], [-74.0443021, 4.7836468], [-74.0442987, 4.7836651], [-74.0445938, 4.7837134], [-74.0445971, 4.7836947], [-74.0449358, 4.7837498], [-74.044939, 4.78373], [-74.0449876, 4.7837379]]]}}, {"type": "Feature", "properties": {"name": "Centro de Estudios Astronomicos", "tipo": "Servicio del campus", "levels": 1, "height": 3.2}, "geometry": {"type": "Polygon", "coordinates": [[[-74.0450954, 4.783575], [-74.0451073, 4.7835127], [-74.0450474, 4.7835012], [-74.0450368, 4.7835565], [-74.0450354, 4.7835636], [-74.0450954, 4.783575]]]}}, {"type": "Feature", "properties": {"name": "Centro de reflexion", "tipo": "Servicio del campus", "levels": 1, "height": 3.2}, "geometry": {"type": "Polygon", "coordinates": [[[-74.0444568, 4.7830112], [-74.0444077, 4.7829346], [-74.0443749, 4.7829555], [-74.0444239, 4.7830321], [-74.0444437, 4.7830196], [-74.0444568, 4.7830112]]]}}, {"type": "Feature", "properties": {"name": "Hacienda El Otono", "tipo": "Edificio historico", "levels": 2, "height": 6.4}, "geometry": {"type": "Polygon", "coordinates": [[[-74.0455545, 4.7841217], [-74.045569, 4.7840356], [-74.04533, 4.7839956], [-74.0452923, 4.7842191], [-74.0453892, 4.7842353], [-74.0454124, 4.7840979], [-74.0455545, 4.7841217]]]}}, {"type": "Feature", "properties": {"name": "Coliseo El Otono", "tipo": "Instalacion deportiva", "levels": 2, "height": 6.4}, "geometry": {"type": "Polygon", "coordinates": [[[-74.0464723, 4.7834952], [-74.0465112, 4.7832325], [-74.0465143, 4.7832114], [-74.0465867, 4.7832206], [-74.0466329, 4.7829313], [-74.0462349, 4.782872], [-74.0461644, 4.7828615], [-74.0461215, 4.7831442], [-74.0461659, 4.783151], [-74.0461619, 4.7831782], [-74.0461603, 4.783189], [-74.0461225, 4.7834423], [-74.0464723, 4.7834952]]]}}, {"type": "Feature", "properties": {"name": "Centro de entretenimiento", "tipo": "Servicio del campus", "levels": 1, "height": 3.2}, "geometry": {"type": "Polygon", "coordinates": [[[-74.0430245, 4.7823388], [-74.0429944, 4.7822157], [-74.0429294, 4.7822315], [-74.042945, 4.7822951], [-74.0429595, 4.7823546], [-74.0430245, 4.7823388]]]}}, {"type": "Feature", "properties": {"name": "El Rincon de Tolkien", "tipo": "Biblioteca / sala", "levels": 1, "height": 3.2}, "geometry": {"type": "Polygon", "coordinates": [[[-74.043267, 4.7829069], [-74.0432805, 4.7829777], [-74.0433566, 4.7829633], [-74.0433432, 4.7828926], [-74.043267, 4.7829069]]]}}, {"type": "Feature", "properties": {"name": "Dialimentos", "tipo": "Cafeteria", "levels": 1, "height": 3.2}, "geometry": {"type": "Polygon", "coordinates": [[[-74.0445348, 4.7833621], [-74.0446941, 4.7835144], [-74.0447779, 4.7835242], [-74.0447931, 4.7833942], [-74.0446825, 4.7833841], [-74.0446898, 4.7831709], [-74.0447166, 4.7831471], [-74.0446556, 4.7830637], [-74.0445765, 4.7831235], [-74.0446088, 4.7831594], [-74.044493, 4.783147], [-74.0444833, 4.7832387], [-74.0445525, 4.7832458], [-74.0445262, 4.7832829], [-74.0445695, 4.7833209], [-74.0445348, 4.7833621]]]}}, {"type": "Feature", "properties": {"name": "Cafeteria", "tipo": "Cafeteria", "levels": 1, "height": 3.2}, "geometry": {"type": "Polygon", "coordinates": [[[-74.0439581, 4.7831914], [-74.0439648, 4.7832288], [-74.0439244, 4.783281], [-74.0440742, 4.7833961], [-74.0441071, 4.7833536], [-74.0441738, 4.7833518], [-74.0441717, 4.7832723], [-74.0442216, 4.7832114], [-74.0440538, 4.7830747], [-74.0439781, 4.783167], [-74.0439581, 4.7831914]]]}}, {"type": "Feature", "properties": {"name": "Kiosko 1", "tipo": "Punto de comida", "levels": 1, "height": 3.2}, "geometry": {"type": "Polygon", "coordinates": [[[-74.0440026, 4.7829518], [-74.0440377, 4.7829102], [-74.0439663, 4.7828502], [-74.0439314, 4.7828918], [-74.0440026, 4.7829518]]]}}, {"type": "Feature", "properties": {"name": "Kiosko K3", "tipo": "Punto de comida", "levels": 1, "height": 3.2}, "geometry": {"type": "Polygon", "coordinates": [[[-74.0458603, 4.7838525], [-74.0458692, 4.783789], [-74.0458042, 4.7837799], [-74.0457953, 4.7838434], [-74.0458603, 4.7838525]]]}}]};
const CENTER = [-74.043725, 4.782866];

const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: 'OpenStreetMap'
      }
    },
    layers: [
      { id: 'fondo', type: 'background', paint: { 'background-color': '#e9e6dd' } },
      { id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-opacity': 0.55, 'raster-saturation': -0.4 } }
    ]
  },
  center: CENTER,
  zoom: 16.7,
  pitch: 58,
  bearing: -18,
  maxPitch: 75
});

map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

let seleccionado = null;
let nombreSel = null;

map.on('load', () => {
  map.addSource('campus', { type: 'geojson', data: CAMPUS, promoteId: 'name' });

  map.addLayer({
    id: 'edificios',
    type: 'fill-extrusion',
    source: 'campus',
    paint: {
      'fill-extrusion-color': [
        'case',
        ['boolean', ['feature-state', 'sel'], false], '#e23b3b',
        '#3b4252'
      ],
      'fill-extrusion-height': ['get', 'height'],
      'fill-extrusion-base': 0,
      'fill-extrusion-opacity': 0.92
    }
  });

  map.addLayer({
    id: 'edificios-borde',
    type: 'line',
    source: 'campus',
    paint: { 'line-color': '#F5C13D', 'line-width': 1.2, 'line-opacity': 0.5 }
  });

  map.on('click', 'edificios', (e) => {
    const f = e.features[0];
    if (seleccionado !== null) {
      map.setFeatureState({ source: 'campus', id: seleccionado }, { sel: false });
    }
    seleccionado = f.id;
    nombreSel = f.properties.name;
    map.setFeatureState({ source: 'campus', id: seleccionado }, { sel: true });

    document.getElementById('p-nombre').textContent = f.properties.name;
    document.getElementById('p-tipo').textContent = f.properties.tipo;
    document.getElementById('p-pisos').textContent = f.properties.levels;
    document.getElementById('panel').classList.add('activo');
    document.getElementById('pista').style.opacity = '0';

    window.parent.postMessage({ type: 'campus-select', name: f.properties.name, tipo: f.properties.tipo }, '*');
  });

  map.on('mouseenter', 'edificios', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'edificios', () => { map.getCanvas().style.cursor = ''; });
});

document.getElementById('usar').onclick = () => {
  if (nombreSel) {
    window.parent.postMessage({ type: 'campus-confirm', name: nombreSel }, '*');
  }
};

document.getElementById('cerrar').onclick = () => {
  if (seleccionado !== null) {
    map.setFeatureState({ source: 'campus', id: seleccionado }, { sel: false });
    seleccionado = null;
    nombreSel = null;
  }
  document.getElementById('panel').classList.remove('activo');
};
</script>
</body>
</html>`;
