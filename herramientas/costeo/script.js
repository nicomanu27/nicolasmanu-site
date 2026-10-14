(function () {
  'use strict';

  var STORAGE_KEY = 'costeo_v1';
  var WHATSAPP_NUMBER = '573503462481';
  var IMPO = 1.08;
  var FACTOR = { kg: 1000, g: 1, litro: 1000, ml: 1, unidad: 1 };
  var UNIDADES = ['kg', 'g', 'litro', 'ml', 'unidad'];
  var USADA = { kg: ['g', 'kg'], g: ['g'], litro: ['ml', 'litro'], ml: ['ml'], unidad: ['unidad'] };
  var SEM_TEXTO = { verde: 'Verde · Saludable', amarillo: 'Amarillo · En alerta', rojo: 'Rojo · Muy alto' };

  var state = null;
  var deleteTimer = null;

  /* ---------- utilidades ---------- */
  function $(id) { return document.getElementById(id); }
  function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function agrupar(intStr) { return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function money(n) { return (n < 0 ? '-$' : '$') + agrupar(String(Math.round(Math.abs(n)))); }
  function pct(n, dec) { return n.toFixed(dec == null ? 1 : dec).replace('.', ',') + '%'; }
  function numCorto(n) { return String(Math.round(n * 10) / 10).replace('.', ','); }

  function parseMoney(s) {
    var d = String(s || '').replace(/\D/g, '');
    return d ? parseInt(d, 10) : 0;
  }
  // En g y ml, "1.000" se entiende como mil (separador de miles); en el resto, el punto es decimal.
  function parseQty(s, unit) {
    s = String(s || '').trim();
    if ((unit === 'g' || unit === 'ml') && /^\d{1,3}(\.\d{3})+$/.test(s)) {
      return parseInt(s.replace(/\./g, ''), 10);
    }
    var v = parseFloat(s.replace(',', '.'));
    return isFinite(v) && v > 0 ? v : 0;
  }
  function sanitizeDecimal(v) {
    v = v.replace(/[^0-9.,]/g, '');
    var m = v.search(/[.,]/);
    if (m === -1) return v.slice(0, 7);
    var head = v.slice(0, m + 1);
    var tail = v.slice(m + 1).replace(/[.,]/g, '');
    return (head + tail.slice(0, 3)).slice(0, 10);
  }
  function formatMoneyInput(el) {
    var raw = el.value;
    var caret = el.selectionStart == null ? raw.length : el.selectionStart;
    var digitsBefore = raw.slice(0, caret).replace(/\D/g, '').length;
    var digits = raw.replace(/\D/g, '').slice(0, 12).replace(/^0+(?=\d)/, '');
    var formatted = digits ? agrupar(digits) : '';
    el.value = formatted;
    var pos = 0, count = 0;
    while (pos < formatted.length && count < digitsBefore) {
      if (/\d/.test(formatted[pos])) count++;
      pos++;
    }
    try { el.setSelectionRange(pos, pos); } catch (e) { /* algunos navegadores no lo permiten */ }
  }
  function limpiarInput(el) {
    var kind = el.dataset.kind;
    if (el.tagName !== 'INPUT' || el.type === 'checkbox') return;
    if (kind === 'money') formatMoneyInput(el);
    else if (kind === 'int') el.value = el.value.replace(/\D/g, '').slice(0, 4);
    else if (kind === 'qty' || kind === 'pct') el.value = sanitizeDecimal(el.value);
  }

  /* ---------- modelo ---------- */
  function nuevoIng() {
    return { id: uid(), nombre: '', precio: '', cantCompra: '', unidadCompra: 'kg', cantUsada: '', unidadUsada: 'g', merma: '' };
  }
  function ing(nombre, precio, cantCompra, unidadCompra, cantUsada, unidadUsada, merma) {
    return { id: uid(), nombre: nombre, precio: precio, cantCompra: cantCompra, unidadCompra: unidadCompra, cantUsada: cantUsada, unidadUsada: unidadUsada, merma: merma };
  }
  function nuevoPlato() {
    return { id: uid(), demo: false, nombre: '', porciones: '', precio: '', impo: false, comision: '', objetivo: '30', ingredientes: [nuevoIng()] };
  }
  function crearDemo() {
    return {
      id: uid(), demo: true, nombre: 'Hamburguesa con papas', porciones: '4', precio: '24.000',
      impo: false, comision: '', objetivo: '30',
      ingredientes: [
        ing('Carne molida de res', '24.000', '1', 'kg', '600', 'g', ''),
        ing('Pan de hamburguesa', '11.000', '6', 'unidad', '4', 'unidad', ''),
        ing('Queso cheddar tajado', '18.000', '500', 'g', '120', 'g', ''),
        ing('Tocineta', '28.000', '1', 'kg', '120', 'g', ''),
        ing('Tomate', '4.500', '1', 'kg', '200', 'g', '10'),
        ing('Lechuga', '3.500', '1', 'unidad', '0,5', 'unidad', '20'),
        ing('Papa para freír', '2.800', '1', 'kg', '800', 'g', '20'),
        ing('Aceite para freír', '14.000', '3', 'litro', '300', 'ml', ''),
        ing('Salsas (mayonesa y ketchup)', '9.000', '1', 'kg', '150', 'g', '')
      ]
    };
  }
  function normalizarPlato(d) {
    if (!d || typeof d.id !== 'string' || !Array.isArray(d.ingredientes)) return null;
    var base = nuevoPlato();
    var out = {
      id: d.id, demo: !!d.demo,
      nombre: String(d.nombre || '').slice(0, 40), porciones: String(d.porciones || ''), precio: String(d.precio || ''),
      impo: !!d.impo, comision: String(d.comision || ''), objetivo: d.objetivo == null ? base.objetivo : String(d.objetivo),
      ingredientes: []
    };
    d.ingredientes.forEach(function (i) {
      if (!i || typeof i.id !== 'string') return;
      var uc = FACTOR[i.unidadCompra] ? i.unidadCompra : 'kg';
      var uu = USADA[uc].indexOf(i.unidadUsada) !== -1 ? i.unidadUsada : USADA[uc][0];
      out.ingredientes.push({
        id: i.id, nombre: String(i.nombre || '').slice(0, 40), precio: String(i.precio || ''), cantCompra: String(i.cantCompra || ''),
        unidadCompra: uc, cantUsada: String(i.cantUsada || ''), unidadUsada: uu, merma: String(i.merma || '')
      });
    });
    return out;
  }
  function cargar() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && Array.isArray(s.dishes)) {
          var dishes = s.dishes.map(normalizarPlato).filter(Boolean);
          if (dishes.length) {
            var activo = dishes.some(function (d) { return d.id === s.activeId; }) ? s.activeId : dishes[0].id;
            return { dishes: dishes, activeId: activo, sortBy: s.sortBy === 'pesos' ? 'pesos' : 'pct' };
          }
        }
      }
    } catch (e) { /* sin almacenamiento: se usa el ejemplo */ }
    var demo = crearDemo();
    return { dishes: [demo], activeId: demo.id, sortBy: 'pct' };
  }
  function guardar() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* modo privado o bloqueado */ }
  }
  function activo() {
    for (var i = 0; i < state.dishes.length; i++) if (state.dishes[i].id === state.activeId) return state.dishes[i];
    return state.dishes[0];
  }

  /* ---------- cálculos ---------- */
  function costoIngrediente(i) {
    var precio = parseMoney(i.precio);
    var cantC = parseQty(i.cantCompra, i.unidadCompra);
    var cantU = parseQty(i.cantUsada, i.unidadUsada);
    if (!(precio > 0 && cantC > 0 && cantU > 0)) return 0;
    var baseC = cantC * FACTOR[i.unidadCompra];
    var baseU = cantU * FACTOR[i.unidadUsada];
    var merma = Math.min(Math.max(parseQty(i.merma, 'pct'), 0), 90);
    return (precio / baseC) * baseU / (1 - merma / 100);
  }
  function calcular(d) {
    var costoTotal = d.ingredientes.reduce(function (s, i) { return s + costoIngrediente(i); }, 0);
    var porciones = parseQty(d.porciones, 'int');
    var precio = parseMoney(d.precio);
    if (!(costoTotal > 0 && porciones > 0 && precio > 0)) return null;

    var costoPorcion = costoTotal / porciones;
    var precioNeto = d.impo ? precio / IMPO : precio;
    var fc = costoPorcion / precioNeto * 100;
    var margen = precioNeto - costoPorcion;
    var margenPct = margen / precioNeto * 100;

    var objRaw = parseQty(d.objetivo, 'pct');
    var objetivo = objRaw >= 5 && objRaw <= 90 ? objRaw : 30;
    var netoSug = costoPorcion / (objetivo / 100);
    var cartaSug = Math.ceil((d.impo ? netoSug * IMPO : netoSug) / 100) * 100;

    var fcRed = Math.round(fc * 10) / 10;
    var sem = fcRed <= 30 ? 'verde' : fcRed <= 35 ? 'amarillo' : 'rojo';

    var comision = Math.min(parseQty(d.comision, 'pct'), 60);
    var app = null;
    if (comision > 0) {
      var comisionPesos = precio * comision / 100;
      var margenApp = precioNeto - comisionPesos - costoPorcion;
      app = { comision: comision, comisionPesos: comisionPesos, margenApp: margenApp, margenAppPct: margenApp / precioNeto * 100 };
    }
    return {
      costoTotal: costoTotal, porciones: porciones, precio: precio, precioNeto: precioNeto, costoPorcion: costoPorcion,
      fc: fc, margen: margen, margenPct: margenPct, objetivo: objetivo, cartaSug: cartaSug, sem: sem, app: app
    };
  }

  /* ---------- render: platos ---------- */
  function nombreDe(d) { return (d.nombre || 'Plato sin nombre'); }

  function renderChips() {
    var html = state.dishes.map(function (d) {
      var r = calcular(d);
      var dot = '<i class="dot' + (r ? ' sem-' + r.sem : '') + '"></i>';
      var etiqueta = nombreDe(d) + (d.demo ? ' · ejemplo' : '');
      var on = d.id === state.activeId;
      return '<button type="button" class="chip' + (on ? ' active' : '') + '" data-dish="' + esc(d.id) + '" aria-pressed="' + on + '">' +
        dot + '<span class="chip-text">' + esc(etiqueta) + '</span></button>';
    }).join('');
    $('chips').innerHTML = html + '<button type="button" class="chip chip-add" data-action="new-dish">+ Nuevo plato</button>';
  }

  function renderDemoBanner() {
    $('demoBanner').hidden = !state.dishes.some(function (d) { return d.demo; });
  }

  function llenarFormulario() {
    var d = activo();
    $('fNombre').value = d.nombre;
    $('fPorciones').value = d.porciones;
    $('fPrecio').value = d.precio;
    $('fComision').value = d.comision;
    $('fObjetivo').value = d.objetivo;
    $('fImpo').checked = !!d.impo;
    resetearEliminar();
  }

  /* ---------- render: ingredientes ---------- */
  function opciones(arr, sel) {
    return arr.map(function (u) { return '<option value="' + u + '"' + (u === sel ? ' selected' : '') + '>' + u + '</option>'; }).join('');
  }
  function ingHTML(i, idx) {
    return '<div class="ing" data-ing="' + esc(i.id) + '">' +
      '<div class="ing-head">' +
        '<input class="ing-nombre" type="text" data-f="nombre" maxlength="40" placeholder="Ingrediente (ej. Tomate)" aria-label="Nombre del ingrediente ' + (idx + 1) + '" value="' + esc(i.nombre) + '" autocomplete="off">' +
        '<button type="button" class="ing-remove" data-action="remove-ing" aria-label="Quitar ingrediente ' + (idx + 1) + '">×</button>' +
      '</div>' +
      '<div class="ing-block">' +
        '<span class="ing-block-label">Lo que compras</span>' +
        '<div class="grid-3">' +
          '<label class="mini"><span>Precio</span><div class="input-wrap"><span class="unit prefix">$</span><input type="text" data-f="precio" data-kind="money" inputmode="numeric" placeholder="18.000" value="' + esc(i.precio) + '" autocomplete="off"></div></label>' +
          '<label class="mini"><span>Cantidad</span><div class="input-wrap"><input type="text" data-f="cantCompra" data-kind="qty" inputmode="decimal" placeholder="1" value="' + esc(i.cantCompra) + '" autocomplete="off"></div></label>' +
          '<label class="mini"><span>Unidad</span><div class="input-wrap"><select data-f="unidadCompra">' + opciones(UNIDADES, i.unidadCompra) + '</select></div></label>' +
        '</div>' +
      '</div>' +
      '<div class="ing-block">' +
        '<span class="ing-block-label">Lo que usas en la receta</span>' +
        '<div class="grid-3">' +
          '<label class="mini"><span>Cantidad</span><div class="input-wrap"><input type="text" data-f="cantUsada" data-kind="qty" inputmode="decimal" placeholder="250" value="' + esc(i.cantUsada) + '" autocomplete="off"></div></label>' +
          '<label class="mini"><span>Unidad</span><div class="input-wrap"><select data-f="unidadUsada">' + opciones(USADA[i.unidadCompra], i.unidadUsada) + '</select></div></label>' +
          '<label class="mini"><span>Merma</span><div class="input-wrap"><input type="text" data-f="merma" data-kind="pct" inputmode="decimal" placeholder="0" value="' + esc(i.merma) + '" autocomplete="off"><span class="unit suffix">%</span></div></label>' +
        '</div>' +
      '</div>' +
      '<div class="ing-cost">Costo en la receta: <b data-cost>$0</b></div>' +
    '</div>';
  }
  function renderIngredientes() {
    var d = activo();
    if (!d.ingredientes.length) {
      $('ingList').innerHTML = '<div class="empty">Aún no hay ingredientes. Agrega el primero para empezar a costear este plato.</div>';
      return;
    }
    $('ingList').innerHTML = d.ingredientes.map(ingHTML).join('');
    actualizarCostos();
  }
  function actualizarCostos() {
    var d = activo();
    var nodos = $('ingList').querySelectorAll('.ing');
    for (var k = 0; k < nodos.length; k++) {
      var i = null;
      for (var j = 0; j < d.ingredientes.length; j++) if (d.ingredientes[j].id === nodos[k].dataset.ing) i = d.ingredientes[j];
      var cell = nodos[k].querySelector('[data-cost]');
      if (i && cell) cell.textContent = money(costoIngrediente(i));
    }
  }

  /* ---------- render: resultados ---------- */
  function renderResultados() {
    var d = activo();
    var r = calcular(d);
    var box = $('resultados');
    if (!r) {
      box.innerHTML = '<div class="empty">Completa el precio de venta, las porciones y al menos un ingrediente (con su precio, la cantidad que compras y la que usas) para ver los resultados de este plato.</div>';
      return;
    }
    var cents = Math.round(r.fc);
    var margenCents = 100 - cents;
    var perdiendo = r.margen < 0;

    var fraseFc = r.fc >= 100
      ? 'Los ingredientes cuestan más de lo que cobras: pierdes ' + money(-r.margen) + ' por cada porción vendida.'
      : 'De cada $100 que vendes de este plato, $' + cents + ' se van solo en ingredientes.';
    var veredicto = {
      verde: 'Buen plato: los ingredientes pesan poco y te dejan espacio para cubrir arriendo, nómina y ganancia.',
      amarillo: 'En alerta: todavía deja margen, pero una alza en el precio de los ingredientes lo pone en rojo.',
      rojo: 'Este plato se está comiendo tu plata. Revisa el precio, el tamaño de la porción o el costo de los ingredientes.'
    }[r.sem];

    var h = '';
    h += '<div class="hero-card sem-' + r.sem + '">' +
      '<div class="res-label">Food cost</div>' +
      '<div class="hero-row"><div class="res-value">' + pct(r.fc) + '</div>' +
      '<span class="sem-pill"><i class="dot"></i>' + SEM_TEXTO[r.sem] + '</span></div>' +
      '<p class="hero-sentence">' + fraseFc + '</p>' +
      (d.impo ? '<p class="hero-note">Calculado sobre ' + money(r.precioNeto) + ', tu precio sin impoconsumo.</p>' : '') +
      '<div class="split"><span class="split-food" data-w="' + Math.min(r.fc, 100).toFixed(2) + '"></span><span class="split-margin" data-w="' + Math.max(100 - r.fc, 0).toFixed(2) + '"></span></div>' +
      '<div class="split-legend"><span>Ingredientes ' + pct(Math.min(r.fc, 100)) + '</span><span>Te queda ' + pct(Math.max(100 - r.fc, 0)) + '</span></div>' +
      '<p class="verdict">' + veredicto + '</p>' +
      '<p class="legend-sem">Verde: hasta 30% · Amarillo: 30% a 35% · Rojo: más de 35%</p>' +
    '</div>';

    var fraseMargen = perdiendo
      ? 'Pierdes ' + money(-r.margen) + ' por cada porción vendida, y todavía falta pagar arriendo y nómina.'
      : 'De cada $100 que vendes de este plato, te quedan $' + margenCents + ' para cubrir arriendo, nómina y ganancia.';
    h += '<div class="res-row"><div class="res-row-text"><div class="res-label-dark">Margen bruto</div><p class="res-note-dark">' + fraseMargen + '</p></div>' +
      '<div class="res-row-value">' + money(r.margen) + '<small>' + pct(r.margenPct) + ' por porción</small></div></div>';

    h += '<div class="res-row"><div class="res-row-text"><div class="res-label-dark">Costo por porción</div>' +
      '<p class="res-note-dark">Cada plato que sale de tu cocina te cuesta ' + money(r.costoPorcion) + ' solo en ingredientes.</p></div>' +
      '<div class="res-row-value">' + money(r.costoPorcion) + '</div></div>';

    h += '<div class="res-row"><div class="res-row-text"><div class="res-label-dark">Costo total de la receta</div>' +
      '<p class="res-note-dark">Es lo que gastas en ingredientes para cocinar ' + numCorto(r.porciones) + (r.porciones === 1 ? ' porción' : ' porciones') + '.</p></div>' +
      '<div class="res-row-value">' + money(r.costoTotal) + '</div></div>';

    var yaAlto = r.precio >= r.cartaSug;
    h += '<div class="sug-card"><div class="sug-top"><div class="sug-label">Precio sugerido en carta</div><div class="sug-value">' + money(r.cartaSug) + '</div></div>' +
      '<p class="sug-note">' + (yaAlto
        ? 'Tu precio actual (' + money(r.precio) + ') ya está por encima de lo que necesitas para que los ingredientes pesen ' + numCorto(r.objetivo) + '%. Puedes mantenerlo.'
        : 'Para que los ingredientes pesen solo ' + numCorto(r.objetivo) + '% (tu objetivo), este plato debería venderse en ' + money(r.cartaSug) + (d.impo ? ', con el impoconsumo incluido' : '') + '. Hoy lo vendes en ' + money(r.precio) + '.') +
      '</p></div>';

    if (r.app) {
      var a = r.app;
      var neg = a.margenApp <= 0;
      var fraseApp = neg
        ? 'Ojo: por app este plato te hace perder plata. La comisión (' + money(a.comisionPesos) + ') y los ingredientes superan lo que te queda del precio.'
        : 'Por domicilio la app se queda con ' + money(a.comisionPesos) + ' de cada plato. De cada $100 que vendes, te quedan $' + Math.round(a.margenAppPct) + ' (en el local te quedan $' + margenCents + ').';
      h += '<div class="app-card' + (neg ? ' neg' : '') + '">' +
        '<div class="res-row-text"><div class="res-label-dark">Margen real por app (' + numCorto(a.comision) + '% de comisión)</div>' +
        '<p class="res-note-dark">' + fraseApp + '</p></div>' +
        '<div class="res-row-value">' + money(a.margenApp) + '<small>' + pct(a.margenAppPct) + ' por porción</small></div></div>';
    }
    box.innerHTML = h;
    aplicarAnchos(box);
  }

  function aplicarAnchos(root) {
    var segs = root.querySelectorAll('[data-w]');
    for (var k = 0; k < segs.length; k++) segs[k].style.flexBasis = segs[k].getAttribute('data-w') + '%';
  }

  /* ---------- render: comparación ---------- */
  function renderComparacion() {
    var box = $('comparacion');
    var todos = state.dishes.map(function (d) { return { d: d, r: calcular(d) }; });
    var completos = todos.filter(function (x) { return x.r; });
    var pendientes = todos.length - completos.length;
    if (!completos.length) {
      box.innerHTML = '<div class="empty">Cuando completes un plato, aparecerá aquí. Crea varios para ver cuáles te dejan más plata y cuáles menos.</div>';
      return;
    }
    var porPesos = state.sortBy === 'pesos';
    var orden = completos.slice().sort(function (a, b) { return porPesos ? b.r.margen - a.r.margen : b.r.margenPct - a.r.margenPct; });

    var filas = orden.map(function (x) {
      return '<tr><td><span class="t-plato"><i class="dot sem-' + x.r.sem + '"></i><span>' + esc(nombreDe(x.d) + (x.d.demo ? ' (ejemplo)' : '')) + '</span></span></td>' +
        '<td>' + pct(x.r.fc) + '</td><td>' + money(x.r.margen) + '</td><td>' + pct(x.r.margenPct) + '</td></tr>';
    }).join('');

    var h = '<div class="cmp-box"><div class="cmp-top"><span class="cmp-title">Ordenados de mayor a menor margen</span>' +
      '<span class="seg"><button type="button" data-sort="pct" class="' + (porPesos ? '' : 'on') + '">Por %</button>' +
      '<button type="button" data-sort="pesos" class="' + (porPesos ? 'on' : '') + '">Por $</button></span></div>' +
      '<div class="table-wrap"><table class="cmp"><thead><tr><th>Plato</th><th>Food cost</th><th>Margen $</th><th>Margen %</th></tr></thead><tbody>' + filas + '</tbody></table></div>';

    if (completos.length >= 2) {
      var porPct = completos.slice().sort(function (a, b) { return b.r.margenPct - a.r.margenPct; });
      var mejor = porPct[0], peor = porPct[porPct.length - 1];
      h += '<div class="cmp-insights"><p>Más rentable: <b>' + esc(nombreDe(mejor.d)) + '</b>. De cada $100 que vendes, te quedan $' + (100 - Math.round(mejor.r.fc)) + '.</p>' +
        '<p>El que más se come tu margen: <b>' + esc(nombreDe(peor.d)) + '</b>, con un food cost de ' + pct(peor.r.fc) + '.</p></div>';
    } else {
      h += '<div class="cmp-insights"><p>Crea otro plato con el botón "+ Nuevo plato" para compararlos aquí.</p></div>';
    }
    if (pendientes > 0) {
      h += '<div class="cmp-insights"><p>' + pendientes + (pendientes === 1 ? ' plato sin completar no aparece' : ' platos sin completar no aparecen') + ' en esta tabla.</p></div>';
    }
    box.innerHTML = h + '</div>';
  }

  /* ---------- conversión ---------- */
  function actualizarCTA() {
    var completos = state.dishes.filter(function (d) { return !d.demo; })
      .map(function (d) { return { d: d, r: calcular(d) }; })
      .filter(function (x) { return x.r; });
    var msg;
    if (!completos.length) {
      msg = 'Hola Nicolás, usé tu calculadora de costeo y me gustaría revisar el margen de mis platos.';
    } else {
      var peor = completos.reduce(function (a, b) { return b.r.fc > a.r.fc ? b : a; });
      var detalle = '"' + nombreDe(peor.d) + '" tiene un food cost de ' + pct(peor.r.fc) + ' y un margen de ' + pct(peor.r.margenPct) + '.';
      msg = completos.length === 1
        ? 'Hola Nicolás, usé tu calculadora de costeo. Mi plato ' + detalle + ' Me gustaría que revisemos juntos el margen de mis platos.'
        : 'Hola Nicolás, usé tu calculadora de costeo con ' + completos.length + ' platos. El que peor me salió: ' + detalle + ' Me gustaría que revisemos juntos el margen de mis platos.';
    }
    $('ctaWhatsapp').href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg);
  }

  /* ---------- refresco ---------- */
  function refrescar() {
    guardar();
    renderChips();
    renderResultados();
    renderComparacion();
    actualizarCostos();
    actualizarCTA();
  }
  function renderTodo() {
    guardar();
    renderChips();
    renderDemoBanner();
    llenarFormulario();
    renderIngredientes();
    renderResultados();
    renderComparacion();
    actualizarCTA();
  }

  /* ---------- acciones ---------- */
  function resetearEliminar() {
    clearTimeout(deleteTimer);
    deleteTimer = null;
    $('btnEliminar').textContent = 'Eliminar este plato';
  }
  function eliminarPlato() {
    var d = activo();
    var idx = state.dishes.indexOf(d);
    state.dishes.splice(idx, 1);
    if (!state.dishes.length) state.dishes.push(nuevoPlato());
    state.activeId = state.dishes[Math.max(0, idx - 1)].id;
    renderTodo();
  }
  function borrarDemo() {
    state.dishes = state.dishes.filter(function (d) { return !d.demo; });
    if (!state.dishes.length) state.dishes.push(nuevoPlato());
    state.activeId = state.dishes[0].id;
    renderTodo();
    $('fNombre').focus();
  }
  function agregarPlato() {
    var d = nuevoPlato();
    state.dishes.push(d);
    state.activeId = d.id;
    renderTodo();
    $('fNombre').focus();
  }
  function agregarIngrediente() {
    var d = activo();
    d.ingredientes.push(nuevoIng());
    guardar();
    renderIngredientes();
    renderResultados();
    var nodos = $('ingList').querySelectorAll('.ing');
    var ultimo = nodos[nodos.length - 1];
    if (ultimo) ultimo.querySelector('[data-f="nombre"]').focus();
  }
  function buscarIng(el) {
    var tarjeta = el.closest('.ing');
    if (!tarjeta) return null;
    var d = activo();
    for (var k = 0; k < d.ingredientes.length; k++) if (d.ingredientes[k].id === tarjeta.dataset.ing) return d.ingredientes[k];
    return null;
  }

  /* ---------- eventos ---------- */
  function onCampoPlato(e) {
    var el = e.target;
    var campo = el.dataset.field;
    if (!campo) return;
    var d = activo();
    limpiarInput(el);
    var valor = el.type === 'checkbox' ? el.checked : el.value;
    if (campo === 'nombre' && d.demo && valor !== d.nombre) {
      d.demo = false;
      renderDemoBanner();
    }
    d[campo] = valor;
    refrescar();
  }
  function onIngInput(e) {
    var el = e.target;
    var campo = el.dataset.f;
    if (!campo || el.tagName === 'SELECT') return;
    var i = buscarIng(el);
    if (!i) return;
    limpiarInput(el);
    i[campo] = el.value;
    refrescar();
  }
  function onIngChange(e) {
    var el = e.target;
    if (el.tagName !== 'SELECT') return;
    var i = buscarIng(el);
    if (!i) return;
    var campo = el.dataset.f;
    i[campo] = el.value;
    if (campo === 'unidadCompra') {
      var opts = USADA[i.unidadCompra];
      if (opts.indexOf(i.unidadUsada) === -1) i.unidadUsada = opts[0];
      var selUsada = el.closest('.ing').querySelector('[data-f="unidadUsada"]');
      selUsada.innerHTML = opciones(opts, i.unidadUsada);
    }
    refrescar();
  }
  function onIngClick(e) {
    var btn = e.target.closest('[data-action="remove-ing"]');
    if (!btn) return;
    var i = buscarIng(btn);
    if (!i) return;
    var d = activo();
    d.ingredientes.splice(d.ingredientes.indexOf(i), 1);
    guardar();
    renderIngredientes();
    refrescar();
  }
  function onChipsClick(e) {
    var nuevo = e.target.closest('[data-action="new-dish"]');
    if (nuevo) { agregarPlato(); return; }
    var chip = e.target.closest('[data-dish]');
    if (!chip || chip.dataset.dish === state.activeId) return;
    state.activeId = chip.dataset.dish;
    renderTodo();
  }
  function onEliminarClick() {
    if (deleteTimer) { eliminarPlato(); return; }
    $('btnEliminar').textContent = 'Toca otra vez para confirmar';
    deleteTimer = setTimeout(resetearEliminar, 3500);
  }
  function onComparacionClick(e) {
    var b = e.target.closest('[data-sort]');
    if (!b) return;
    state.sortBy = b.dataset.sort === 'pesos' ? 'pesos' : 'pct';
    guardar();
    renderComparacion();
  }

  function init() {
    state = cargar();
    var campos = document.querySelectorAll('[data-field]');
    for (var k = 0; k < campos.length; k++) {
      campos[k].addEventListener(campos[k].type === 'checkbox' ? 'change' : 'input', onCampoPlato);
    }
    $('ingList').addEventListener('input', onIngInput);
    $('ingList').addEventListener('change', onIngChange);
    $('ingList').addEventListener('click', onIngClick);
    $('chips').addEventListener('click', onChipsClick);
    $('btnAddIng').addEventListener('click', agregarIngrediente);
    $('btnEliminar').addEventListener('click', onEliminarClick);
    $('btnBorrarDemo').addEventListener('click', borrarDemo);
    $('comparacion').addEventListener('click', onComparacionClick);
    renderTodo();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
