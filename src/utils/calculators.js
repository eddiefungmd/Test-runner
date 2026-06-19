export const CALCULATORS = [
  {
    id: 'anion_gap',
    name: 'Anion Gap',
    formula: 'Na⁺ − (Cl⁻ + HCO₃⁻)',
    normalRange: '8–12 mEq/L (uncorrected)',
    fields: [
      { id: 'na', label: 'Sodium (Na⁺)', unit: 'mEq/L', placeholder: '140' },
      { id: 'cl', label: 'Chloride (Cl⁻)', unit: 'mEq/L', placeholder: '104' },
      { id: 'hco3', label: 'Bicarbonate (HCO₃⁻)', unit: 'mEq/L', placeholder: '24' },
      { id: 'albumin', label: 'Albumin (for correction)', unit: 'g/dL', placeholder: '4.0', optional: true },
    ],
    calculate(v) {
      const ag = v.na - v.cl - v.hco3;
      const corrected = v.albumin != null ? ag + 2.5 * (4.0 - v.albumin) : null;
      const lines = [`Anion Gap = ${ag.toFixed(1)} mEq/L`];
      if (corrected != null) lines.push(`Corrected AG (for albumin) = ${corrected.toFixed(1)} mEq/L`);
      return lines.join('\n');
    },
  },
  {
    id: 'corrected_ca',
    name: 'Corrected Calcium',
    formula: 'Ca + 0.8 × (4.0 − Albumin)',
    normalRange: 'Corrected Ca 8.5–10.5 mg/dL',
    fields: [
      { id: 'ca', label: 'Measured Calcium', unit: 'mg/dL', placeholder: '7.8' },
      { id: 'albumin', label: 'Albumin', unit: 'g/dL', placeholder: '2.5' },
    ],
    calculate(v) {
      const result = v.ca + 0.8 * (4.0 - v.albumin);
      return `Corrected Calcium = ${result.toFixed(2)} mg/dL`;
    },
  },
  {
    id: 'cockcroft_gault',
    name: 'CrCl (Cockcroft-Gault)',
    formula: '(140 − Age) × Weight / (72 × Cr) × [0.85 if female]',
    normalRange: 'Normal: >90 mL/min',
    fields: [
      { id: 'age', label: 'Age', unit: 'years', placeholder: '60' },
      { id: 'weight', label: 'Weight', unit: 'kg', placeholder: '70' },
      { id: 'cr', label: 'Creatinine', unit: 'mg/dL', placeholder: '1.2' },
      { id: 'female', label: 'Female?', unit: '', type: 'boolean', placeholder: '' },
    ],
    calculate(v) {
      const sex = v.female ? 0.85 : 1.0;
      const crcl = ((140 - v.age) * v.weight) / (72 * v.cr) * sex;
      let ckd = '';
      if (crcl >= 90) ckd = 'CKD G1 (if structural damage)';
      else if (crcl >= 60) ckd = 'CKD G2';
      else if (crcl >= 30) ckd = 'CKD G3';
      else if (crcl >= 15) ckd = 'CKD G4';
      else ckd = 'CKD G5 (kidney failure)';
      return `CrCl = ${crcl.toFixed(1)} mL/min\n${ckd}`;
    },
  },
  {
    id: 'fena',
    name: 'FENa',
    formula: '(Urine Na × Plasma Cr) / (Plasma Na × Urine Cr) × 100',
    normalRange: '<1% pre-renal | >2% intrinsic renal',
    fields: [
      { id: 'u_na', label: 'Urine Na', unit: 'mEq/L', placeholder: '20' },
      { id: 'p_na', label: 'Plasma Na', unit: 'mEq/L', placeholder: '140' },
      { id: 'u_cr', label: 'Urine Creatinine', unit: 'mg/dL', placeholder: '60' },
      { id: 'p_cr', label: 'Plasma Creatinine', unit: 'mg/dL', placeholder: '2.0' },
    ],
    calculate(v) {
      const fena = (v.u_na * v.p_cr) / (v.p_na * v.u_cr) * 100;
      let interp = '';
      if (fena < 1) interp = 'Pre-renal AKI (or hepatorenal syndrome)';
      else if (fena < 2) interp = 'Borderline';
      else interp = 'Intrinsic renal AKI (e.g., ATN)';
      return `FENa = ${fena.toFixed(2)}%\n${interp}`;
    },
  },
  {
    id: 'aa_gradient',
    name: 'A-a Gradient',
    formula: 'PAO₂ − PaO₂  |  PAO₂ = FiO₂(Patm − PH₂O) − PaCO₂/RQ',
    normalRange: 'Normal: Age/4 + 4 mmHg (or <10-15 on room air)',
    fields: [
      { id: 'fio2', label: 'FiO₂', unit: '', placeholder: '0.21' },
      { id: 'paco2', label: 'PaCO₂', unit: 'mm Hg', placeholder: '40' },
      { id: 'pao2', label: 'PaO₂ (arterial)', unit: 'mm Hg', placeholder: '95' },
      { id: 'age', label: 'Age', unit: 'years', placeholder: '30', optional: true },
      { id: 'patm', label: 'Patm', unit: 'mm Hg', placeholder: '760', optional: true },
    ],
    calculate(v) {
      const patm = v.patm || 760;
      const pao2_alveolar = v.fio2 * (patm - 47) - v.paco2 / 0.8;
      const gradient = pao2_alveolar - v.pao2;
      const normal = v.age ? (v.age / 4 + 4).toFixed(1) : '10–15';
      return `PAO₂ (alveolar) = ${pao2_alveolar.toFixed(1)} mm Hg\nA-a gradient = ${gradient.toFixed(1)} mm Hg\nExpected normal: ${normal} mm Hg`;
    },
  },
  {
    id: 'cha2ds2',
    name: 'CHA₂DS₂-VASc',
    formula: 'CHF+HT+Age≥75(×2)+DM+Stroke(×2)+Vasc Dz+Age65-74+Sex(F)',
    normalRange: '0 = low | 1 (M) = consider | ≥2 = anticoagulate',
    fields: [
      { id: 'chf', label: 'CHF / LV dysfunction', unit: '', type: 'boolean' },
      { id: 'htn', label: 'Hypertension', unit: '', type: 'boolean' },
      { id: 'age75', label: 'Age ≥ 75', unit: '', type: 'boolean' },
      { id: 'dm', label: 'Diabetes mellitus', unit: '', type: 'boolean' },
      { id: 'stroke', label: 'Stroke / TIA / thromboembolism', unit: '', type: 'boolean' },
      { id: 'vasc', label: 'Vascular disease (prior MI, PAD, aortic plaque)', unit: '', type: 'boolean' },
      { id: 'age65', label: 'Age 65–74', unit: '', type: 'boolean' },
      { id: 'female', label: 'Female sex', unit: '', type: 'boolean' },
    ],
    calculate(v) {
      const score = (v.chf ? 1 : 0) + (v.htn ? 1 : 0) + (v.age75 ? 2 : 0) +
        (v.dm ? 1 : 0) + (v.stroke ? 2 : 0) + (v.vasc ? 1 : 0) +
        (v.age65 ? 1 : 0) + (v.female ? 1 : 0);
      let rec = '';
      if (score === 0) rec = 'Low risk — no anticoagulation';
      else if (score === 1 && !v.female) rec = 'Consider anticoagulation';
      else rec = 'Anticoagulation recommended';
      return `CHA₂DS₂-VASc = ${score}\n${rec}`;
    },
  },
  {
    id: 'meld_na',
    name: 'MELD-Na',
    formula: 'MELD + 1.32(137−Na) − [0.033×MELD×(137−Na)]',
    normalRange: 'Higher = worse prognosis in cirrhosis',
    fields: [
      { id: 'cr', label: 'Creatinine', unit: 'mg/dL', placeholder: '1.0' },
      { id: 'bili', label: 'Total bilirubin', unit: 'mg/dL', placeholder: '1.0' },
      { id: 'inr', label: 'INR', unit: '', placeholder: '1.1' },
      { id: 'na', label: 'Sodium', unit: 'mEq/L', placeholder: '137' },
    ],
    calculate(v) {
      const cr = Math.min(Math.max(v.cr, 1.0), 4.0);
      const bili = Math.max(v.bili, 1.0);
      const inr = Math.max(v.inr, 1.0);
      const meld = 3.78 * Math.log(bili) + 11.2 * Math.log(inr) + 9.57 * Math.log(cr) + 6.43;
      const na_c = Math.min(Math.max(v.na, 125), 137);
      const meld_na = meld + 1.32 * (137 - na_c) - 0.033 * meld * (137 - na_c);
      return `MELD = ${meld.toFixed(1)}\nMELD-Na = ${meld_na.toFixed(1)}`;
    },
  },
  {
    id: 'winters',
    name: "Winter's Formula",
    formula: 'Expected PaCO₂ = 1.5×HCO₃⁻ + 8 (±2)',
    normalRange: 'If measured PaCO₂ > expected → concurrent resp. acidosis',
    fields: [
      { id: 'hco3', label: 'HCO₃⁻ (measured)', unit: 'mEq/L', placeholder: '14' },
      { id: 'paco2', label: 'PaCO₂ (measured)', unit: 'mm Hg', placeholder: '30', optional: true },
    ],
    calculate(v) {
      const expected = 1.5 * v.hco3 + 8;
      const lines = [`Expected PaCO₂ = ${expected.toFixed(1)} (±2) mm Hg`, `Range: ${(expected - 2).toFixed(1)} – ${(expected + 2).toFixed(1)} mm Hg`];
      if (v.paco2 != null) {
        if (v.paco2 > expected + 2) lines.push('Measured > expected → concurrent RESPIRATORY ACIDOSIS');
        else if (v.paco2 < expected - 2) lines.push('Measured < expected → concurrent RESPIRATORY ALKALOSIS');
        else lines.push('Appropriate respiratory compensation');
      }
      return lines.join('\n');
    },
  },
  {
    id: 'bmi',
    name: 'BMI',
    formula: 'Weight (kg) / Height (m)²',
    normalRange: '<18.5 underweight | 18.5–24.9 normal | 25–29.9 overweight | ≥30 obese',
    fields: [
      { id: 'weight', label: 'Weight', unit: 'kg', placeholder: '70' },
      { id: 'height', label: 'Height', unit: 'cm', placeholder: '170' },
    ],
    calculate(v) {
      const h = v.height / 100;
      const bmi = v.weight / (h * h);
      let cat = '';
      if (bmi < 18.5) cat = 'Underweight';
      else if (bmi < 25) cat = 'Normal weight';
      else if (bmi < 30) cat = 'Overweight';
      else if (bmi < 35) cat = 'Obese Class I';
      else if (bmi < 40) cat = 'Obese Class II';
      else cat = 'Obese Class III (morbid)';
      return `BMI = ${bmi.toFixed(1)} kg/m²\n${cat}`;
    },
  },
];
