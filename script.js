
document.getElementById("puissance").addEventListener("input", () => {
  const puissance = parseFloat(document.getElementById("puissance").value);
  let rachat = "-";
  if (!isNaN(puissance)) {
    if (puissance <= 3) rachat = 0.1788;
    else if (puissance <= 9) rachat = 0.1788;
    else if (puissance <= 36) rachat = 0.0706;
  }
  document.getElementById("rachatDisplay").value = (typeof rachat === 'number') ? rachat.toFixed(4) : rachat;
});

document.getElementById("calculateIrrButton").addEventListener("click", async () => {
  const lat = parseFloat(document.getElementById("latitude").value);
  const lon = parseFloat(document.getElementById("longitude").value);
  if (isNaN(lat) || isNaN(lon)) {
    alert("Veuillez entrer des coordonnées valides");
    return;
  }

  const orientation = parseFloat(document.getElementById("orientationIrr").value);
  const facture = parseFloat(document.getElementById("facture").value) || 0;
  const tarif = parseFloat(document.getElementById("tarif").value) || 0.206;
  const puissance = parseFloat(document.getElementById("puissance").value);
  const haussekwh = (parseFloat(document.getElementById("haussekwh").value) || 5) / 100;
  const ratioautoconso = (parseFloat(document.getElementById("ratioautoconso").value) || 80) / 100;
  const ratiorevente = 1 - ratioautoconso;
  document.getElementById("ratiorevente").value = (ratiorevente * 100).toFixed(1);

  const fr = n => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  const facturean = facture * 12;
  const facturean10 = facturean * Math.pow(1 + haussekwh, 10);
  const facturean20 = facturean * Math.pow(1 + haussekwh, 20);
  document.getElementById("facturean").textContent = fr(facturean);
  document.getElementById("facturean10").textContent = fr(facturean10);
  document.getElementById("facturean20").textContent = fr(facturean20);

  const angle = 28;
  const url = `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?outputformat=basic&lat=${lat}&lon=${lon}&raddatabase=PVGIS-SARAH2&peakpower=1&loss=10&pvtechchoice=crystSi&angle=${angle}&aspect=${orientation}&usehorizon=1`;
  const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;

  try {
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error("Erreur API PVGIS");
    const text = await res.text();
    const lines = text.split("\n");
    let productible = null;
    for (let line of lines) {
      if (line.includes("Year")) {
        const parts = line.trim().split(/\s+/);
        productible = parseFloat(parts[1]);
        break;
      }
    }
      if (!isFinite(productible)) throw new Error("Productible non trouvé");

    const prod = productible * puissance;
    let rachat = 0;
    if (puissance <= 3) rachat = 0.1788;
    else if (puissance <= 9) rachat = 0.1788;
    else if (puissance <= 36) rachat = 0.0706;

    let prime = 0;
    if (puissance <= 3) prime = 1780;
    else if (puissance <= 9) prime = 1080;
    else if (puissance <= 36) prime = 810;
    const totalprime = prime * puissance;

    const consokwh = (facture * 12) / tarif;
    const autoconsokwh = prod * ratioautoconso;
    const reventekwh = prod * ratiorevente;
    const kwh10ans = tarif * Math.pow(1 + haussekwh, 10);
    const facture10ans = facture * Math.pow(1 + haussekwh, 10);

    const factotal20anssanspv = facturean * (Math.pow(1 + haussekwh, 20) - 1) / haussekwh;
    const economies20ans = autoconsokwh * tarif * (Math.pow(1 + haussekwh, 20) - 1) / haussekwh;
    const reventetotal20ans = reventekwh * rachat * 20;
    const ecototal20ans = economies20ans + reventetotal20ans;
    const factotal20ansavecpv = factotal20anssanspv - ecototal20ans;

    // 🔢 Production mensuelle (extraite du texte PVGIS)
    const moisNoms = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
    const prodMensuelle = [];

    for (let line of lines) {
      const parts = line.trim().split(/\s+/);
      if (/^\d+\s/.test(line) && parts.length >= 3) {
        const mois = parseInt(parts[0]);
        const e_m = parseFloat(parts[2]);
        if (!isNaN(e_m)) {
          prodMensuelle.push({ mois, kWh: e_m * puissance });
        }
      }
    }

    const tbody = document.querySelector("#prodMensuelleTable tbody");
    tbody.innerHTML = "";
    prodMensuelle.forEach(p => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${moisNoms[p.mois - 1]}</td><td>${fr(p.kWh)}</td>`;
      tbody.appendChild(row);
    });

    const economiemensuelle = (autoconsokwh / 12) * tarif;
    const reventemensuelle = (reventekwh / 12) * rachat;

    document.getElementById("productible").textContent = fr(productible);
    document.getElementById("prod").textContent = fr(prod);
    document.getElementById("prime").textContent = fr(prime);
    document.getElementById("totalprime").textContent = fr(totalprime);
    document.getElementById("consokwh").textContent = fr(consokwh);
    document.getElementById("autoconsokwh").textContent = fr(autoconsokwh);
    document.getElementById("reventekwh").textContent = fr(reventekwh);
    document.getElementById("kwh10ans").textContent = fr(kwh10ans);
    document.getElementById("facture10ans").textContent = fr(facture10ans);
    document.getElementById("rachatDisplay").value = rachat.toFixed(4);
    document.getElementById("economiemensuelle").textContent = fr(economiemensuelle);
    document.getElementById("reventemensuelle").textContent = fr(reventemensuelle);
    document.getElementById("facturean").textContent = fr(facturean);
    document.getElementById("facturean10").textContent = fr(facturean10);
    document.getElementById("facturean20").textContent = fr(facturean20);
    document.getElementById("factotal20anssanspv").textContent = fr(factotal20anssanspv);
    document.getElementById("reventetotal20ans").textContent = fr(reventetotal20ans);
    document.getElementById("ecototal20ans").textContent = fr(ecototal20ans);
    document.getElementById("factotal20ansavecpv").textContent = fr(factotal20ansavecpv);

  } catch (e) {
    alert("Erreur lors du calcul. Vérifiez les données ou la connexion.");
    console.error(e);
  }
});
