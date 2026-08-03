import { describe, it, expect } from 'vitest';
import { loadRuleset } from '@ed/content';
import {
  GOOD_BASE_PRICE,
  Rng,
  Simulation,
  createLife,
  defaultGovernment,
  describeGovernment,
  hunger,
  outputFactor,
  priceOf,
  reform,
  regimeName,
  restore,
  snapshot,
  tickMood,
  upheaval,
  worldHash,
  type Domain,
} from '@ed/engine';

const ruleset = loadRuleset();

function world(seed: number, population = 70) {
  const sim = new Simulation(ruleset, { seed, startYear: 1000, mode: 'chronique', population });
  createLife(sim.world, ruleset, new Rng(seed));
  return sim;
}

function run(sim: ReturnType<typeof world>, years: number): void {
  for (let i = 0; i < years; i++) {
    const opening = sim.openYear();
    for (const pending of opening.events) {
      const first = pending.options.find((o) => !o.locked);
      if (first) sim.resolveEvent(pending, first.id);
    }
    sim.closeYear();
  }
}

describe('les prix sont locaux', () => {
  it('montent avec la rareté et descendent avec l\'abondance', () => {
    const rare = priceOf('vivres', 100, 10, 1);
    const juste = priceOf('vivres', 50, 50, 1);
    const abondant = priceOf('vivres', 10, 100, 1);
    expect(rare).toBeGreaterThan(juste);
    expect(juste).toBeGreaterThan(abondant);
    expect(juste).toBeCloseTo(GOOD_BASE_PRICE.vivres, 0);
  });

  it('réagissent plus fort sur ce qu\'on ne peut pas remplacer', () => {
    // Le pain double, le luxe hausse à peine : c'est l'élasticité.
    const pain = priceOf('vivres', 3, 1, 1) / GOOD_BASE_PRICE.vivres;
    const luxe = priceOf('luxe', 3, 1, 1) / GOOD_BASE_PRICE.luxe;
    expect(pain).toBeGreaterThan(luxe);
  });

  it('restent bornés : jamais gratuits, jamais infinis', () => {
    expect(priceOf('vivres', 0.01, 9999, 1)).toBeGreaterThan(0);
    expect(priceOf('vivres', 9999, 0.01, 1.3)).toBeLessThan(GOOD_BASE_PRICE.vivres * 15);
  });

  it('la campagne nourrit moins cher que la cité', () => {
    const sim = world(4242);
    run(sim, 60);
    const orin = sim.world.domainAt('orin');
    const vardhen = sim.world.domainAt('vardhen');
    expect(orin).toBeDefined();
    expect(vardhen).toBeDefined();
    expect(orin!.prices['vivres']).toBeLessThan(vardhen!.prices['vivres'] ?? 0);
  });
});

describe('les domaines', () => {
  it('forment un arbre : monde → régions → implantations', () => {
    const sim = world(1, 0);
    const monde = sim.world.domains.get('dom_monde');
    expect(monde).toBeDefined();
    expect(monde!.scale).toBe('monde');
    expect(monde!.children.length).toBeGreaterThan(0);
    for (const regionId of monde!.children) {
      const region = sim.world.domains.get(regionId);
      expect(region?.scale).toBe('region');
      expect(region?.parent).toBe('dom_monde');
      for (const enfantId of region!.children) {
        const enfant = sim.world.domains.get(enfantId);
        expect(enfant?.scale).toBe('implantation');
        expect(enfant?.settlement).not.toBeNull();
      }
    }
  });

  it('le domaine qui englobe additionne ceux qu\'il contient', () => {
    const sim = world(7);
    run(sim, 12);
    const monde = sim.world.domains.get('dom_monde')!;
    let somme = 0;
    for (const d of sim.world.domainList()) {
      if (d.settlement !== null) somme += d.population;
    }
    expect(monde.population).toBe(somme);
  });

  it('produisent et consomment à partir des gens, pas d\'une table', () => {
    const sim = world(11);
    run(sim, 10);
    const kaleth = sim.world.domainAt('kaleth')!;
    expect(kaleth.population).toBeGreaterThan(0);
    expect(kaleth.consumption['vivres']).toBeGreaterThan(0);
    expect(kaleth.production['vivres']).toBeGreaterThan(0);
  });

  it('ne laissent pas la faim disparaître ni tout emporter', () => {
    const sim = world(4242);
    run(sim, 150);
    for (const d of sim.world.domainList()) {
      if (d.settlement === null) continue;
      expect(hunger(d)).toBeGreaterThanOrEqual(0);
      expect(hunger(d)).toBeLessThanOrEqual(1);
    }
  });

  it('gardent des trésors qui veulent dire quelque chose', () => {
    const sim = world(4242);
    run(sim, 200);
    for (const d of sim.world.domainList()) {
      expect(d.treasury).toBeGreaterThanOrEqual(0);
      // Un impôt sur la fortune faisait monter ça à douze millions.
      expect(d.treasury).toBeLessThan(3_000_000);
    }
  });
});

describe('les gouvernements', () => {
  it('se nomment d\'eux-mêmes depuis leurs sept axes', () => {
    expect(regimeName(defaultGovernment('hameau'))).toBe('personne ne commande');
    expect(regimeName(defaultGovernment('village'))).toBe('chefferie');
    expect(regimeName(defaultGovernment('cité'))).toBe('féodalité');
    expect(
      regimeName({
        ...defaultGovernment('bourg'),
        power: 'beaucoup',
        access: 'election',
      }),
    ).toBe('république');
  });

  it('se lisent en une phrase, sans faute d\'accord', () => {
    const texte = describeGovernment({
      ...defaultGovernment('bourg'),
      power: 'beaucoup',
      access: 'election',
      mandate: 'populaire',
    });
    expect(texte).toContain('décident');
    expect(texte).toContain('du peuple');
    expect(texte).not.toContain('de le ');
  });

  it('chaque forme de propriété a un prix payé ailleurs', () => {
    expect(outputFactor({ ...defaultGovernment('village'), property: 'commune' })).toBeLessThan(1);
    expect(outputFactor({ ...defaultGovernment('village'), property: 'privee' })).toBeGreaterThan(1);
  });

  it('une réforme coûte de la légitimité et froisse', () => {
    const sim = world(3, 0);
    const dom = sim.world.domainAt('vardhen')!;
    const leg = dom.legitimacy;
    const un = dom.unrest;
    expect(reform(dom, 'taxation', 'progressive')).toBe(true);
    expect(dom.government.taxation).toBe('progressive');
    expect(dom.legitimacy).toBeLessThan(leg);
    expect(dom.unrest).toBeGreaterThan(un);
    // Réformer vers ce qui est déjà en place ne coûte rien.
    expect(reform(dom, 'taxation', 'progressive')).toBe(false);
  });

  it('toucher au fondement coûte plus cher que toucher à l\'intendance', () => {
    const sim = world(4, 0);
    const a = sim.world.domainAt('vardhen')!;
    const b = sim.world.domainAt('kaleth')!;
    const legA = a.legitimacy;
    const legB = b.legitimacy;
    reform(a, 'taxation', 'progressive');
    reform(b, 'mandate', 'populaire');
    expect(legB - b.legitimacy).toBeGreaterThan(legA - a.legitimacy);
  });

  it('rien ne casse tant que la légitimité tient', () => {
    const sim = world(5, 0);
    const dom = sim.world.domainAt('vardhen')!;
    dom.legitimacy = 80;
    dom.unrest = 20;
    expect(upheaval(sim.world, dom, null, new Rng(1))).toBeNull();
  });

  it('et quand ça casse, ça casse selon le régime', () => {
    const sim = world(6, 0);
    const monarchie = sim.world.domainAt('vardhen')!;
    monarchie.legitimacy = 10;
    monarchie.unrest = 90;
    monarchie.lastUpheaval = -999;
    const bris = upheaval(sim.world, monarchie, null, new Rng(2));
    expect(bris).not.toBeNull();
    expect(bris!.kind).toBe('revolution');

    const hameau = sim.world.domainAt('marches')!;
    hameau.legitimacy = 5;
    hameau.unrest = 60;
    hameau.lastUpheaval = -999;
    // On ne renverse pas l'absence de pouvoir : on s'en va.
    expect(upheaval(sim.world, hameau, null, new Rng(3))!.kind).toBe('effondrement');
  });

  it('un pouvoir contesté s\'use — les deux nombres ne saturent pas ensemble', () => {
    const sim = world(8, 0);
    const dom = sim.world.domainAt('vardhen')!;
    dom.legitimacy = 100;
    dom.unrest = 95;
    for (let i = 0; i < 15; i++) tickMood(dom, null, 1000 + i);
    expect(dom.legitimacy).toBeLessThan(100);
  });

  it('un groupe qui tient la place finit par prendre le pouvoir', () => {
    const sim = world(9, 0);
    const dom = sim.world.domainAt('vardhen')!;
    dom.legitimacy = 10;
    dom.unrest = 90;
    dom.lastUpheaval = -999;
    const bande = {
      id: 'fac_test',
      name: 'la bande à Test',
      leaderId: sim.world.player.id,
      grip: { vardhen: 80 },
    } as unknown as Parameters<typeof upheaval>[2];
    const bris = upheaval(sim.world, dom, bande, new Rng(4));
    expect(bris!.kind).toBe('coup');
    expect(dom.government.access).toBe('conquete');
    expect(dom.rulerId).toBe(sim.world.player.id);
  });
});

describe('le monde qui tourne', () => {
  it('produit des régimes variés sans qu\'on les ait écrits', () => {
    const sim = world(4242);
    run(sim, 200);
    const noms = new Set<string>();
    for (const d of sim.world.domainList()) {
      if (d.settlement !== null) noms.add(regimeName(d.government));
    }
    expect(noms.size).toBeGreaterThan(1);
    expect(sim.world.tally.upheavals).toBeGreaterThan(0);
  });

  it('l\'élagage ne laisse jamais un domaine gouverné par un mort effacé', () => {
    const sim = world(2026, 60);
    run(sim, 200);
    for (const d of sim.world.domainList()) {
      if (d.rulerId === null) continue;
      expect(sim.world.get(d.rulerId)).toBeDefined();
    }
  });

  it('survit à un aller-retour par la sauvegarde, au bit près', () => {
    const a = world(31337, 50);
    run(a, 60);
    const snap: { domains: Domain[] } & Record<string, unknown> = JSON.parse(
      JSON.stringify(snapshot(a.world)),
    );
    expect(snap.domains.length).toBeGreaterThan(0);
    const b = new Simulation(ruleset, restore(snap as never));
    for (let i = 0; i < 10; i++) {
      a.openYear();
      a.closeYear();
      b.openYear();
      b.closeYear();
    }
    expect(worldHash(b.world)).toBe(worldHash(a.world));
  });
});
