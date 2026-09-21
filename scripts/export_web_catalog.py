"""Export public input definitions and synthetic examples, never model weights/data."""
import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from dashboard.inference import load_manifest, load_model, template, predict
from dashboard.schema import MAPPINGS, FEATURE_GROUPS, VARIABLE_DESCRIPTIONS

manifest = load_manifest()
catalog = {}
for stage, info in manifest['models'].items():
    fields = []
    for name in info['features']:
        spec = info['schema'][name]
        fields.append({**spec, 'name': name,
                       'description': VARIABLE_DESCRIPTIONS.get(name, 'Completed-semester academic record.'),
                       'group': next(g for g, cols in FEATURE_GROUPS.items() if name in cols),
                       'labels': {str(v): MAPPINGS.get(name, {}).get(v, str(v)) for v in spec.get('options', [])}})
    catalog[stage] = {'label': info['label'], 'features': fields,
                      'version': info['sha256'], 'estimator': info['estimator'],
                      'accuracy': info['test_metrics']['accuracy'], 'macroF1': info['test_metrics']['macro_f1']}
output = ROOT / 'web/src/lib'
(output / 'model-catalog.json').write_text(json.dumps(catalog, indent=2) + '\n')
info = manifest['models']['semester2']
model = load_model('semester2', manifest)
examples = []
for label, grades, approved in [('Steady progress', 14.5, 6), ('Mixed progress', 11.0, 3), ('Limited progress', 0.0, 0)]:
    frame = template(info)
    for semester in ('1st', '2nd'):
        frame[f'Curricular units {semester} sem (enrolled)'] = 6
        frame[f'Curricular units {semester} sem (approved)'] = approved
        frame[f'Curricular units {semester} sem (grade)'] = grades
        frame[f'Curricular units {semester} sem (without evaluations)'] = 0
    out, _ = predict(frame, model, info)
    row = out.iloc[0]
    examples.append({'label': label, 'grade': grades, 'approved': approved,
                     'outcome': row['Predicted outcome'],
                     'probabilities': {c: float(row[f'P({c})']) for c in info['classes']}})
(output / 'demo-results.json').write_text(json.dumps(examples, indent=2) + '\n')
print('Exported input catalog and three explicitly synthetic examples.')
