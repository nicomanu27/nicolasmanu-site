const WHATSAPP_NUMBER = "573503462481";
  function waLink(msg) { return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`; }
  document.getElementById('footerWhatsapp').href = waLink("Hola Nicolás, vi tu página y me gustaría conversar sobre tus servicios, gracias!");

  function formatMoneda(el) {
    let val = el.value.replace(/\./g, '').replace(/[^0-9]/g, '');
    if (val === '') { el.value = ''; return; }
    el.value = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(parseInt(val));
  }
  function formatEntero(el) {
    el.value = el.value.replace(/[^0-9]/g, '');
  }
  function formatDecimal(el) {
    el.value = el.value.replace(/[^0-9.,]/g, '').replace(',', '.');
  }
  function parseMoneda(id) {
    return parseFloat(document.getElementById(id).value.replace(/\./g, '').replace(/,/g, '').trim());
  }
  function parseNum(id) {
    return parseFloat(document.getElementById(id).value.replace(',', '.').trim());
  }
  function formatNum(n) { return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n); }

  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('visible');
    setTimeout(() => t.classList.remove('visible'), 3200);
  }

  let ultimaAmortizacion = [];

  function toggleTabla() {
    const wrap = document.getElementById('tablaWrap');
    const btn = document.getElementById('btnToggleTabla');
    const abierta = wrap.classList.toggle('visible');
    btn.textContent = abierta ? 'Ocultar tabla ↑' : 'Ver tabla completa ↓';
  }

  function diagnostico(cobertura, saldoDisponible, cuota) {
    const margen = saldoDisponible - cuota;
    if (cobertura < 1) {
      return `Con un flujo de caja disponible de $${formatNum(saldoDisponible)} al mes, no alcanza a cubrir la cuota de $${formatNum(cuota)}. Antes de tomar este crédito vale la pena revisar el monto, el plazo, o de dónde sale ese faltante.`;
    } else if (cobertura < 1.5) {
      return `El flujo de caja cubre la cuota, pero el margen es ajustado: quedan $${formatNum(margen)} libres cada mes después de pagarla. Cualquier mes flojo puede complicar las cosas.`;
    } else {
      return `El flujo de caja cubre la cuota con margen saludable: quedan $${formatNum(margen)} libres cada mes después de pagarla.`;
    }
  }

  function calcular() {
    const monto = parseMoneda('monto');
    const plazo = parseInt(document.getElementById('plazo').value);
    const tasaEA = parseNum('tasa');
    const ingresos = parseMoneda('ingresos');
    const salidas = parseMoneda('salidas');

    if (!monto || !plazo || !tasaEA || !ingresos || isNaN(salidas)) {
      showToast('Completa todos los campos para calcular.');
      return;
    }
    if (plazo <= 0 || monto <= 0) {
      showToast('El monto y el plazo deben ser mayores a cero.');
      return;
    }

    const rMensual = Math.pow(1 + tasaEA / 100, 1 / 12) - 1;
    let cuota;
    if (rMensual === 0) {
      cuota = monto / plazo;
    } else {
      cuota = monto * rMensual * Math.pow(1 + rMensual, plazo) / (Math.pow(1 + rMensual, plazo) - 1);
    }

    let saldo = monto;
    const filas = [];
    for (let mes = 1; mes <= plazo; mes++) {
      const interes = saldo * rMensual;
      let abono = cuota - interes;
      saldo = saldo - abono;
      if (mes === plazo || saldo < 1) saldo = 0;
      filas.push({ mes, cuota, interes, abono, saldo });
    }
    ultimaAmortizacion = filas;

    const totalPagar = cuota * plazo;
    const totalIntereses = totalPagar - monto;
    const saldoDisponible = ingresos - salidas;
    const cobertura = saldoDisponible / cuota;

    document.getElementById('cuota').textContent = '$' + formatNum(cuota);
    document.getElementById('tasaMensualLabel').textContent = 'Tasa mensual equivalente: ' + (rMensual * 100).toFixed(2) + '%';
    document.getElementById('totalPagar').textContent = '$' + formatNum(totalPagar);
    document.getElementById('totalIntereses').textContent = '$' + formatNum(totalIntereses);
    document.getElementById('saldoDisponible').textContent = '$' + formatNum(saldoDisponible);
    document.getElementById('cobertura').textContent = cobertura.toFixed(1) + 'x';

    const primera = filas[0];
    const ultima = filas[filas.length - 1];
    document.getElementById('amortResumen').innerHTML =
      `Mes 1: interés <b>$${formatNum(primera.interes)}</b>, abono a capital <b>$${formatNum(primera.abono)}</b>.<br>` +
      `Mes ${plazo}: interés <b>$${formatNum(ultima.interes)}</b>, abono a capital <b>$${formatNum(ultima.abono)}</b>.`;

    const tbody = document.getElementById('amortBody');
    tbody.innerHTML = filas.map(f =>
      `<tr><td>${f.mes}</td><td>$${formatNum(f.cuota)}</td><td>$${formatNum(f.interes)}</td><td>$${formatNum(f.abono)}</td><td>$${formatNum(f.saldo)}</td></tr>`
    ).join('');
    document.getElementById('tablaWrap').classList.remove('visible');
    document.getElementById('btnToggleTabla').textContent = 'Ver tabla completa ↓';

    document.getElementById('diagText').textContent = diagnostico(cobertura, saldoDisponible, cuota);
    document.getElementById('diagWhatsapp').href = waLink(
      `Hola Nicolás, estoy evaluando un crédito de $${formatNum(monto)} a ${plazo} meses (cuota de $${formatNum(cuota)}), con ingresos de $${formatNum(ingresos)} y salidas de $${formatNum(salidas)} al mes. Me gustaría verlo con más profundidad.`
    );

    const results = document.getElementById('results');
    results.classList.add('visible');
    setTimeout(() => results.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  function resetear() {
    ['monto', 'plazo', 'tasa', 'ingresos', 'salidas'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('results').classList.remove('visible');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.addEventListener('keydown', e => { if (e.key === 'Enter') calcular(); });

// Listeners (movidos acá porque el CSP bloquea los atributos onclick/oninput inline)
document.getElementById('monto').addEventListener('input', function () { formatMoneda(this); });
document.getElementById('plazo').addEventListener('input', function () { formatEntero(this); });
document.getElementById('tasa').addEventListener('input', function () { formatDecimal(this); });
document.getElementById('ingresos').addEventListener('input', function () { formatMoneda(this); });
document.getElementById('salidas').addEventListener('input', function () { formatMoneda(this); });
document.getElementById('btnCalcular').addEventListener('click', calcular);
document.getElementById('btnToggleTabla').addEventListener('click', toggleTabla);
document.getElementById('btnReset').addEventListener('click', resetear);
