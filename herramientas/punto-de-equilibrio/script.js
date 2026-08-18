const WHATSAPP_NUMBER = "573503462481";

  function waLink(msg) {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  }
  document.getElementById('footerWhatsapp').href = waLink("Hola Nicolás, vi tu página y me gustaría conversar sobre tus servicios, gracias!");

  function formatInput(el) {
    let val = el.value.replace(/\./g, '').replace(/[^0-9]/g, '');
    if (val === '') { el.value = ''; return; }
    el.value = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(parseInt(val));
  }

  function parseInput(id) {
    const val = document.getElementById(id).value.replace(/\./g, '').replace(/,/g, '').trim();
    return parseFloat(val);
  }

  function formatNum(n) {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n);
  }

  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('visible');
    setTimeout(() => t.classList.remove('visible'), 3200);
  }

  function diagnostico(margenPct, peUnidades, peVentas) {
    let texto;
    if (margenPct < 20) {
      texto = `Con un margen de contribución de ${margenPct.toFixed(1)}%, cada venta deja poco para cubrir los costos fijos. Antes de pensar en vender más, vale la pena revisar el precio o el costo variable: con este margen, crecer en volumen no resuelve el problema de fondo.`;
    } else if (margenPct < 40) {
      texto = `Un margen de contribución de ${margenPct.toFixed(1)}% es funcional: se necesitan ${formatNum(Math.ceil(peUnidades))} unidades al mes solo para cubrir los costos fijos. Todo lo que se venda por encima de eso empieza a ser utilidad real.`;
    } else {
      texto = `Un margen de contribución de ${margenPct.toFixed(1)}% es saludable. El punto de equilibrio de ${formatNum(Math.ceil(peUnidades))} unidades debería ser alcanzable sin mucha presión, lo que deja espacio para reinvertir en crecer.`;
    }
    return texto;
  }

  function calcular() {
    const precio = parseInput('precio');
    const costoVar = parseInput('costoVar');
    const costosFijos = parseInput('costosFijos');

    if (!precio || !costoVar || !costosFijos || isNaN(precio) || isNaN(costoVar) || isNaN(costosFijos)) {
      showToast('Completa los tres campos para calcular.');
      return;
    }
    if (precio <= costoVar) {
      showToast('El precio de venta debe ser mayor al costo variable.');
      return;
    }

    const contribucionUnitaria = precio - costoVar;
    const margenContribucion = (contribucionUnitaria / precio) * 100;
    const peUnidades = costosFijos / contribucionUnitaria;
    const peVentas = peUnidades * precio;

    document.getElementById('peUnidades').textContent = formatNum(Math.ceil(peUnidades)) + ' uds';
    document.getElementById('peVentasLabel').textContent = 'En pesos: $' + formatNum(Math.ceil(peVentas));
    document.getElementById('margenPct').textContent = margenContribucion.toFixed(1) + '%';
    document.getElementById('contribucion').textContent = '$' + formatNum(contribucionUnitaria);
    document.getElementById('diagText').textContent = diagnostico(margenContribucion, peUnidades, peVentas);
    document.getElementById('diagWhatsapp').href = waLink(`Hola Nicolás, hice el cálculo de mi punto de equilibrio (margen de ${margenContribucion.toFixed(1)}%) y quiero profundizar.`);

    const results = document.getElementById('results');
    results.classList.add('visible');
    setTimeout(() => results.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  function resetear() {
    document.getElementById('precio').value = '';
    document.getElementById('costoVar').value = '';
    document.getElementById('costosFijos').value = '';
    document.getElementById('results').classList.remove('visible');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.addEventListener('keydown', e => { if (e.key === 'Enter') calcular(); });

// Listeners (movidos acá porque el CSP bloquea los atributos onclick/oninput inline)
document.getElementById('precio').addEventListener('input', function () { formatInput(this); });
document.getElementById('costoVar').addEventListener('input', function () { formatInput(this); });
document.getElementById('costosFijos').addEventListener('input', function () { formatInput(this); });
document.getElementById('btnCalcular').addEventListener('click', calcular);
document.getElementById('btnReset').addEventListener('click', resetear);
