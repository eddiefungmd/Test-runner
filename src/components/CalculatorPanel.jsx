import { useState } from 'react';
import { CALCULATORS } from '../utils/calculators';

function CalcForm({ calc }) {
  const initVals = () => {
    const v = {};
    calc.fields.forEach(f => { v[f.id] = f.type === 'boolean' ? false : ''; });
    return v;
  };
  const [vals, setVals] = useState(initVals);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const set = (id, value) => setVals(prev => ({ ...prev, [id]: value }));

  const compute = () => {
    setError(null);
    const parsed = {};
    for (const f of calc.fields) {
      if (f.type === 'boolean') {
        parsed[f.id] = vals[f.id];
      } else {
        const n = parseFloat(vals[f.id]);
        if (vals[f.id] === '' && f.optional) { parsed[f.id] = null; continue; }
        if (isNaN(n) && !f.optional) { setError(`${f.label} is required.`); return; }
        parsed[f.id] = isNaN(n) ? null : n;
      }
    }
    try {
      setResult(calc.calculate(parsed));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs font-mono text-blue-800">{calc.formula}</p>
        <p className="text-xs text-blue-600 mt-1">Normal: {calc.normalRange}</p>
      </div>

      {calc.fields.map(f => (
        <div key={f.id} className="flex items-center gap-3">
          <label className="text-sm text-gray-600 w-48 shrink-0">
            {f.label}
            {f.optional && <span className="text-gray-400 ml-1">(opt)</span>}
          </label>
          {f.type === 'boolean' ? (
            <input
              type="checkbox"
              checked={vals[f.id]}
              onChange={e => set(f.id, e.target.checked)}
              className="w-4 h-4"
            />
          ) : (
            <div className="flex items-center gap-1 flex-1">
              <input
                type="number"
                step="any"
                value={vals[f.id]}
                onChange={e => set(f.id, e.target.value)}
                placeholder={f.placeholder}
                className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              {f.unit && <span className="text-xs text-gray-400 w-16">{f.unit}</span>}
            </div>
          )}
        </div>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={compute}
        className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-medium text-sm transition"
      >
        Calculate
      </button>

      {result && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-3">
          {result.split('\n').map((line, i) => (
            <p key={i} className={`text-sm ${i === 0 ? 'font-bold text-green-800' : 'text-green-700'}`}>{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CalculatorPanel({ onClose }) {
  const [activeCalc, setActiveCalc] = useState(CALCULATORS[0].id);
  const calc = CALCULATORS.find(c => c.id === activeCalc);

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-[500px] max-w-full h-full bg-white flex flex-col shadow-2xl">
        <div className="bg-blue-900 text-white px-4 py-3 flex items-center justify-between">
          <h2 className="font-bold text-lg">Calculators</h2>
          <button onClick={onClose} className="text-blue-200 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="flex overflow-x-auto bg-gray-50 border-b border-gray-200">
          {CALCULATORS.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCalc(c.id)}
              className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition ${
                activeCalc === c.id ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="font-semibold text-gray-800 mb-3">{calc.name}</h3>
          <CalcForm key={activeCalc} calc={calc} />
        </div>
      </div>
    </div>
  );
}
