// One source of truth for the four recipes: the 3D labels, the forest worlds,
// the scroll copy, the shop cards and the cart all read from here.

export const FLAVOURS = [
  {
    id: 'meza-01', key: 'buckthorn', no: '01', short: 'Sea Buckthorn', name: 'Sea Buckthorn & Wildflower Honey',
    label: ['SEA BUCKTHORN', '& WILDFLOWER HONEY'], side: 'SEA BUCKTHORN', notes: 'TART · BRIGHT · HONEYED',
    latin: 'Hippophae rhamnoides', taste: 'Tart, bright, honeyed',
    // palette: page night, world light, ui tint, liquid core/edge, label ink + paper, crown
    bg: '#120a05', glow: '#b8601a', accent: '#f2b36b', liquid: '#e86400', liquidEdge: '#ffa030', lop: 0.93,
    ink: '#6b2f0b', paper: '#f2e7d3', cap: '#9a5420',
    kcal: '19', sugar: '4.1', row3: ['Fruit juice', '18%'],
    ingr: 'Spring water, sea buckthorn juice (18%), wildflower honey, carbon dioxide, lemon juice.',
    price: 16.8, pack: '6 × 330 ml',
    world: 'Golden hour at the dune forest, Gulf of Riga',
  },
  {
    id: 'meza-02', key: 'currant', no: '02', short: 'Blackcurrant Leaf', name: 'Blackcurrant Leaf & Lime',
    label: ['BLACKCURRANT LEAF', '& LIME'], side: 'CURRANT LEAF', notes: 'GREEN · PEPPERY · COOL',
    latin: 'Ribes nigrum', taste: 'Green, peppery, cool',
    bg: '#06110b', glow: '#3a7346', accent: '#a9d39b', liquid: '#98c450', liquidEdge: '#d6ee8c', lop: 0.84,
    ink: '#1d4528', paper: '#e9eedf', cap: '#355a3e',
    kcal: '14', sugar: '3.2', row3: ['Leaf steep', '9 h'],
    ingr: 'Spring water, blackcurrant leaf infusion, lime juice (3%), birch syrup, carbon dioxide.',
    price: 16.8, pack: '6 × 330 ml',
    world: 'Birch wood after rain, early June',
  },
  {
    id: 'meza-03', key: 'juniper', no: '03', short: 'Juniper', name: 'Juniper & Bog Myrtle',
    label: ['JUNIPER', '& BOG MYRTLE'], side: 'JUNIPER TONIC', notes: 'RESINOUS · DRY · BITTER',
    latin: 'Juniperus communis', taste: 'Resinous, dry, bitter',
    bg: '#040c14', glow: '#2c6690', accent: '#9fc8e6', liquid: '#8cc4e4', liquidEdge: '#e8f6ff', lop: 0.62,
    ink: '#163853', paper: '#e5ecf0', cap: '#2f5272',
    kcal: '12', sugar: '2.8', row3: ['Bitterness', 'Mid'],
    ingr: 'Spring water, juniper berry infusion, bog myrtle extract, cane sugar, lemon peel, carbon dioxide.',
    price: 16.8, pack: '6 × 330 ml',
    world: 'Blue hour on the raised bog',
  },
  {
    id: 'meza-04', key: 'rhubarb', no: '04', short: 'Rhubarb', name: 'Rhubarb & Wild Rose',
    label: ['RHUBARB', '& WILD ROSE'], side: 'RHUBARB & ROSE', notes: 'SHARP · FLORAL · SOFT',
    latin: 'Rheum × hybridum · Rosa rugosa', taste: 'Sharp, floral, soft',
    bg: '#16070b', glow: '#a8414f', accent: '#f0a4ad', liquid: '#e2485f', liquidEdge: '#ff9aa6', lop: 0.9,
    ink: '#6a1a28', paper: '#f4e4e2', cap: '#7c3040',
    kcal: '21', sugar: '4.6', row3: ['Rhubarb juice', '22%'],
    ingr: 'Spring water, rhubarb juice (22%), rose hip infusion, wildflower honey, carbon dioxide.',
    price: 16.8, pack: '6 × 330 ml',
    world: 'Dusk at the garden edge',
  },
];

// World 4 is not a flavour: the Gauja valley spring, used for the range and the origin story.
export const SPRING = { bg: '#07090a', glow: '#6a5a40', accent: '#e8dcc0' };

export const MIXED_CASE = {
  id: 'meza-mix', no: '01–04', short: 'Mixed case', name: 'The mixed case',
  taste: 'Three bottles of each recipe', price: 32.0, pack: '12 × 330 ml', mixed: true,
};

export const CATALOG = [...FLAVOURS, MIXED_CASE];
export const byId = id => CATALOG.find(p => p.id === id);

export const SHIPPING = {
  freeFrom: 40,
  methods: [
    { id: 'locker', name: 'Omniva parcel locker', detail: '1–2 working days, Latvia', price: 2.9 },
    { id: 'courier', name: 'Courier', detail: 'Next day in Rīga, 2 days elsewhere in Latvia', price: 5.9 },
  ],
  lockers: ['Rīga — Centrs, Stacijas laukums', 'Rīga — Teika, Brīvības gatve', 'Rīga — Āgenskalns, Nometņu iela', 'Sigulda — Stacija', 'Cēsis — Vienības laukums'],
};
export const VAT_RATE = 0.21; // Latvia, standard rate, prices include VAT

export const money = n => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(n);
