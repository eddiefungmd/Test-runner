const TOPIC_MAP = [
  [/\b(heart|cardiac|myocard|coronary|arrhythmia|atrial|ventricular|ejection fraction|ECG|EKG|ST[\s-]|angina|infarct|aortic|mitral|tricuspid|pericarditis|endocarditis)\b/i, 'Cardiology'],
  [/\b(kidney|renal|creatinine|GFR|nephro|glomerul|dialysis|uremia|BUN|proteinuria|hematuria|nephrotic|nephritic|FSGS|IgA nephropathy)\b/i, 'Renal'],
  [/\b(lung|pulmon|respira|asthma|COPD|pneumon|bronch|PO2|PCO2|oxygen|wheez|dyspnea|pleural|pneumothorax|hemoptysis|TB|tubercul|sarcoid)\b/i, 'Pulmonology'],
  [/\b(liver|hepat|cirrhosis|jaundice|bilirubin|ALT|AST|portal|ascites|pancreat|gallbladder|cholecystitis|Crohn|colitis|bowel|peptic ulcer|GERD|Barrett)\b/i, 'GI/Hepatology'],
  [/\b(brain|neuro|stroke|seizure|headache|dement|parkinson|multiple sclerosis|\bMS\b|cranial nerve|neuropath|meningitis|encephalitis|Alzheimer|tremor|ataxia)\b/i, 'Neurology'],
  [/\b(infect|bacteria|virus|antibiotic|fever|sepsis|HIV|AIDS|fungal|Candida|Aspergillus|CMV|EBV|herpes|influenza|malaria|Lyme|syphilis|gonorrhea|chlamydia)\b/i, 'Infectious Disease'],
  [/\b(endocrin|diabetes|thyroid|cortisol|insulin|glucose|HbA1c|adrenal|pituitary|hypothyroid|hyperthyroid|Cushing|Addison|SIADH|DI|calcium|parathyroid)\b/i, 'Endocrinology'],
  [/\b(blood|anemia|hemoglobin|platelet|WBC|RBC|leuk|lymph|coagul|clot|DVT|PE|thrombocytopenia|sickle|thalassemia|hemolysis|DIC|aplastic)\b/i, 'Hematology'],
  [/\b(cancer|tumor|malignan|oncol|chemotherapy|metastas|biopsy|carcinoma|lymphoma|leukemia|melanoma|sarcoma)\b/i, 'Oncology'],
  [/\b(pregnan|obstet|gynecol|menstrual|ovari|uterus|cervix|vagina|fetus|neonatal|eclampsia|preeclampsia|labor|placenta|ectopic|abortion)\b/i, 'OB/GYN'],
  [/\b(child|pediatr|infant|newborn|congenital|develop|vaccination|growth|puberty)\b/i, 'Pediatrics'],
  [/\b(psych|depress|anxiety|bipolar|schizo|mental|suicide|hallucin|delusion|PTSD|OCD|ADHD|autism|substance|alcohol|opioid)\b/i, 'Psychiatry'],
  [/\b(skin|dermat|rash|eczema|psoriasis|melanoma|lesion|pruritus|urticaria|acne|cellulitis|impetigo)\b/i, 'Dermatology'],
  [/\b(bone|joint|arthritis|musculoskel|fracture|osteo|rheumat|lupus|gout|fibromyalgia|tendon|ligament|spinal)\b/i, 'Rheumatology/MSK'],
  [/\b(surgery|wound|trauma|abdomen|appendix|gallbladder|hernia|bowel obstruction|perforation|anastomosis)\b/i, 'Surgery'],
  [/\b(pharma|drug|medication|dose|receptor|mechanism|antagonist|agonist|half.life|toxicity|overdose|side effect)\b/i, 'Pharmacology'],
  [/\b(eye|vision|ophthalm|retina|glaucoma|cataract|papilledema|diplopia)\b/i, 'Ophthalmology'],
  [/\b(ear|hearing|auditory|tinnitus|vertigo|Meniere|otitis|cochlea)\b/i, 'ENT'],
  [/\b(urology|prostate|bladder|ureter|kidney stone|PSA|erectile|urinary incontinence|BPH)\b/i, 'Urology'],
  [/\b(biostat|sensitivity|specificity|positive predictive|negative predictive|incidence|prevalence|odds ratio|relative risk|NNT|confidence interval|p.value|study design|cohort|case.control|RCT)\b/i, 'Biostatistics/Epidemiology'],
];

export function guessTopic(stem) {
  for (const [re, topic] of TOPIC_MAP) {
    if (re.test(stem)) return topic;
  }
  return null;
}
