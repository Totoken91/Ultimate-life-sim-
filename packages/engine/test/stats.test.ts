import { describe, expect, it } from 'vitest';
import {
  Rng,
  Simulation,
  countTree,
  createLife,
  descendantsOf,
  dynastyStats,
  familyTree,
  heirsOf,
  renderTree,
  spawnChild,
  updateRecords,
  worldStats,
  type Character,
} from '@ed/engine';
import { loadRuleset } from '@ed/content';

const ruleset = loadRuleset();

function world(seed = 900, years = 30) {
  const sim = new Simulation(ruleset, { seed, startYear: 400, mode: 'legende' });
  createLife(sim.world, ruleset, new Rng(seed).fork('newlife'));
  for (let i = 0; i < years; i++) {
    sim.openYear();
    sim.closeYear();
  }
  return sim;
}

/** Fabrique une famille contrôlée : trois enfants d'âges connus. */
function family(): { sim: ReturnType<typeof world>; parent: Character; kids: Character[] } {
  const sim = new Simulation(ruleset, { seed: 7, startYear: 400, mode: 'legende' });
  const { player } = createLife(sim.world, ruleset, new Rng(7).fork('newlife'));
  const rng = new Rng(7).fork('kids');
  const kids: Character[] = [];
  for (const offset of [30, 25, 20]) {
    sim.world.year = 400 + (30 - offset);
    kids.push(spawnChild(sim.world, ruleset, rng.fork('k', offset), player, null, 'm'));
  }
  sim.world.year = 440;
  return { sim, parent: player, kids };
}

describe('statistiques du monde', () => {
  it('compte la population, les morts et les naissances', () => {
    const sim = world();
    const st = worldStats(sim.world, ruleset);
    expect(st.population).toBeGreaterThan(0);
    expect(st.everLived).toBeGreaterThanOrEqual(st.population);
    expect(st.deaths).toBe(sim.world.tally.deaths);
    expect(st.year).toBe(sim.world.year);
  });

  it('ventile les causes de mort et les additionne à 100 %', () => {
    const sim = world(901, 80);
    const st = worldStats(sim.world, ruleset);
    if (st.causes.length === 0) return;
    const total = Object.values(sim.world.tally.deathsByCause).reduce((a, b) => a + b, 0);
    expect(total).toBe(sim.world.tally.deaths);
    for (const cause of st.causes) {
      expect(cause.share).toBeGreaterThan(0);
      expect(cause.share).toBeLessThanOrEqual(1);
    }
  });

  it('classe les plus riches par ordre décroissant', () => {
    const st = worldStats(world(902, 60).world, ruleset, 5);
    for (let i = 1; i < st.richest.length; i++) {
      expect(st.richest[i]!.value).toBeLessThanOrEqual(st.richest[i - 1]!.value);
    }
  });

  it('mesure la concentration de la richesse', () => {
    const st = worldStats(world(903, 60).world, ruleset);
    expect(st.topOneShare).toBeGreaterThanOrEqual(0);
    expect(st.topOneShare).toBeLessThanOrEqual(1);
    expect(st.classes.reduce((a, r) => a + r.share, 0)).toBeCloseTo(1, 5);
  });
});

describe('livre des records', () => {
  it('ne retient qu\'un record battu', () => {
    const sim = world(904, 20);
    updateRecords(sim.world);
    const before = sim.world.records.fortune;
    expect(before).toBeDefined();

    sim.world.player.wealth = (before?.value ?? 0) + 100000;
    updateRecords(sim.world);
    expect(sim.world.records.fortune?.value).toBe((before?.value ?? 0) + 100000);

    const peak = sim.world.records.fortune?.value ?? 0;
    sim.world.player.wealth = 1;
    updateRecords(sim.world);
    // Le record tient même quand la fortune s'effondre : c'est un record.
    expect(sim.world.records.fortune?.value).toBe(peak);
  });

  it('sait qu\'un record est tenu par un mort', () => {
    const sim = world(905, 20);
    updateRecords(sim.world);
    const holderId = sim.world.records.longevite?.holderId;
    expect(holderId).not.toBeNull();
    const holder = sim.world.get(holderId!);
    if (holder) {
      holder.alive = false;
      holder.deathYear = sim.world.year;
    }
    updateRecords(sim.world);
    expect(sim.world.records.longevite?.alive).toBe(false);
  });
});

describe('arbre généalogique', () => {
  it('descend jusqu\'aux enfants et compte les branches repliées', () => {
    const { sim, parent } = family();
    const node = familyTree(sim.world, parent.id, { maxDepth: 3, maxChildren: 2 });
    expect(node).not.toBeNull();
    expect(node!.children.length).toBe(2);
    expect(node!.hiddenChildren).toBe(1);
    const counts = countTree(node!);
    expect(counts.nodes).toBe(3);
    expect(counts.hidden).toBe(1);
  });

  it('se rend en lignes lisibles', () => {
    const { sim, parent } = family();
    const lines = renderTree(familyTree(sim.world, parent.id)!);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0]).toContain('◆');
    expect(lines.slice(1).some((l) => l.includes('└─') || l.includes('├─'))).toBe(true);
  });

  it('remonte aux ancêtres quand on le demande', () => {
    const sim = world(906, 20);
    const withAncestors = familyTree(sim.world, sim.world.playerId, { ancestors: 2 });
    expect(withAncestors).not.toBeNull();
  });

  it('compte la descendance et les générations', () => {
    const { sim, parent } = family();
    const d = descendantsOf(sim.world, parent.id);
    expect(d.all.length).toBe(3);
    expect(d.generations).toBe(1);
  });
});

describe('succession', () => {
  it('la primogéniture donne l\'aîné', () => {
    const { sim, parent, kids } = family();
    const heirs = heirsOf(sim.world, parent);
    expect(heirs[0]!.id).toBe(kids[0]!.id);
    expect(heirs[0]!.claim).toBe(1);
  });

  it('l\'ultimogéniture inverse l\'ordre', () => {
    const { sim, parent, kids } = family();
    sim.world.houses.set('h', {
      id: 'h',
      name: 'Essai',
      foundedYear: 400,
      founderId: parent.id,
      headId: parent.id,
      prestige: 10,
      memberIds: [parent.id, ...kids.map((k) => k.id)],
      traditions: [],
      rank: 'maison',
      motto: '',
      law: 'ultimogeniture',
      headHistory: [parent.id],
      cadetIds: [],
    });
    parent.houseId = 'h';
    const heirs = heirsOf(sim.world, parent);
    expect(heirs[0]!.id).toBe(kids[2]!.id);
  });

  it('la désignation passe devant l\'âge', () => {
    const { sim, parent, kids } = family();
    sim.world.houses.set('h', {
      id: 'h',
      name: 'Essai',
      foundedYear: 400,
      founderId: parent.id,
      headId: parent.id,
      prestige: 10,
      memberIds: [parent.id],
      traditions: [],
      rank: 'maison',
      motto: '',
      law: 'designation',
      headHistory: [parent.id],
      cadetIds: [],
    });
    parent.houseId = 'h';
    kids[2]!.flags['heritier_designe'] = true;
    const heirs = heirsOf(sim.world, parent);
    expect(heirs[0]!.id).toBe(kids[2]!.id);
    expect(heirs[0]!.note).toContain('désigné');
  });

  it('sans enfant, la fratrie hérite plutôt que rien', () => {
    const sim = new Simulation(ruleset, { seed: 12, startYear: 400, mode: 'legende' });
    const { player } = createLife(sim.world, ruleset, new Rng(12).fork('newlife'));
    const rng = new Rng(12).fork('sib');
    const father = spawnChild(sim.world, ruleset, rng, player, null, 'm');
    // on fabrique une fratrie : même père que le joueur
    sim.world.year = 430;
    const parentChar = sim.world.get(player.fatherId) ?? father;
    parentChar.alive = true;
    const sibling = spawnChild(sim.world, ruleset, rng.fork('s2'), parentChar, null, 'f');
    sibling.birthYear = 405;
    player.fatherId = parentChar.id;
    if (!parentChar.childrenIds.includes(player.id)) parentChar.childrenIds.push(player.id);

    const heirs = heirsOf(sim.world, player);
    expect(heirs.some((h) => h.id === sibling.id)).toBe(true);
  });

  it('n\'inclut jamais le mort lui-même', () => {
    const sim = world(907, 40);
    const heirs = heirsOf(sim.world, sim.world.player);
    expect(heirs.every((h) => h.id !== sim.world.playerId)).toBe(true);
  });
});

describe('maison', () => {
  it('le prestige et le rang montent avec les actes', () => {
    const sim = world(908, 5);
    const player = sim.world.player;
    sim.world.houses.set('h', {
      id: 'h',
      name: 'Montante',
      foundedYear: 400,
      founderId: player.id,
      headId: player.id,
      prestige: 0,
      memberIds: [player.id],
      traditions: [],
      rank: 'maison',
      motto: '',
      law: 'primogeniture',
      headHistory: [player.id],
      cadetIds: [],
    });
    player.houseId = 'h';
    player.titles.push('a', 'b', 'c');
    player.wealth = 500000;
    for (let i = 0; i < 60; i++) {
      sim.openYear();
      sim.closeYear();
      if (!player.alive) break;
    }
    const house = sim.world.houses.get('h')!;
    expect(house.prestige).toBeGreaterThan(0);
    const stats = dynastyStats(sim.world);
    expect(stats.prestige).toBeGreaterThanOrEqual(0);
  });

  it('une maison sans vivant perd son prestige', () => {
    const sim = world(909, 5);
    sim.world.houses.set('mort', {
      id: 'mort',
      name: 'Éteinte',
      foundedYear: 300,
      founderId: sim.world.playerId,
      headId: sim.world.playerId,
      prestige: 500,
      memberIds: [],
      traditions: [],
      rank: 'grande maison',
      motto: '',
      law: 'primogeniture',
      headHistory: [],
      cadetIds: [],
    });
    for (let i = 0; i < 20; i++) {
      sim.openYear();
      sim.closeYear();
    }
    expect(sim.world.houses.get('mort')!.prestige).toBeLessThan(500);
  });
});

describe('élagage des morts', () => {
  it('borne le nombre de fiches sur la durée', async () => {
    const { pruneDead } = await import('@ed/engine');
    const sim = new Simulation(ruleset, { seed: 950, startYear: 400, mode: 'legende' });
    createLife(sim.world, ruleset, new Rng(950).fork('newlife'));
    for (let i = 0; i < 250; i++) {
      sim.openYear();
      sim.closeYear();
    }
    const after250 = sim.world.characters.size;
    for (let i = 0; i < 250; i++) {
      sim.openYear();
      sim.closeYear();
    }
    // Sans élagage, le nombre de fiches croîtrait indéfiniment.
    expect(sim.world.characters.size).toBeLessThan(after250 * 1.6);
    expect(pruneDead(sim.world, { keepRecentYears: 0 })).toBeGreaterThanOrEqual(0);
  });

  it('ne retire jamais un vivant, le joueur, ni un parent de vivant', async () => {
    const { pruneDead } = await import('@ed/engine');
    const sim = world(951, 120);
    const livingBefore = sim.world.living().map((c) => c.id);
    const parents = new Set<number>();
    for (const c of sim.world.living()) {
      if (c.fatherId !== null) parents.add(c.fatherId);
      if (c.motherId !== null) parents.add(c.motherId);
    }
    pruneDead(sim.world, { keepRecentYears: 0 });

    for (const id of livingBefore) expect(sim.world.get(id)).toBeDefined();
    for (const id of parents) expect(sim.world.get(id as never)).toBeDefined();
    expect(sim.world.get(sim.world.playerId)).toBeDefined();
  });

  it('conserve les détenteurs de records et les acteurs des grands moments', async () => {
    const { pruneDead } = await import('@ed/engine');
    const sim = world(952, 150);
    updateRecords(sim.world);
    const holders = Object.values(sim.world.records)
      .map((e) => e?.holderId)
      .filter((id): id is NonNullable<typeof id> => id !== null && id !== undefined);
    const majorActors = sim.world.chronicle
      .filter((e) => e.importance >= 4)
      .flatMap((e) => e.actors.map((a) => a.id));

    pruneDead(sim.world, { keepRecentYears: 0 });
    for (const id of holders) expect(sim.world.get(id), `record ${id}`).toBeDefined();
    for (const id of majorActors) expect(sim.world.get(id), `acteur ${id}`).toBeDefined();
  });

  it('ne laisse aucune référence pendante', async () => {
    const { pruneDead } = await import('@ed/engine');
    const sim = world(953, 150);
    pruneDead(sim.world, { keepRecentYears: 0 });
    for (const c of sim.world.characters.values()) {
      if (c.fatherId !== null) expect(sim.world.get(c.fatherId)).toBeDefined();
      if (c.motherId !== null) expect(sim.world.get(c.motherId)).toBeDefined();
      if (c.spouseId !== null) expect(sim.world.get(c.spouseId)).toBeDefined();
      for (const kid of c.childrenIds) expect(sim.world.get(kid)).toBeDefined();
    }
    for (const rel of sim.world.relations.all()) {
      expect(sim.world.get(rel.from)).toBeDefined();
      expect(sim.world.get(rel.to)).toBeDefined();
    }
  });
});

describe('monde peuplé', () => {
  it('démarre avec une population répartie sur toutes les implantations', () => {
    const sim = new Simulation(ruleset, { seed: 960, startYear: 400, mode: 'legende' });
    const st = worldStats(sim.world, ruleset);
    expect(st.population).toBeGreaterThan(200);
    for (const place of st.settlements) expect(place.population).toBeGreaterThan(0);
  });

  it('la population ne s\'effondre ni n\'explose sur trois siècles', () => {
    const sim = new Simulation(ruleset, { seed: 961, startYear: 400, mode: 'legende' });
    createLife(sim.world, ruleset, new Rng(961).fork('newlife'));
    const start = sim.world.living().length;
    for (let i = 0; i < 300; i++) {
      sim.openYear();
      sim.closeYear();
    }
    const end = sim.world.living().length;
    expect(end).toBeGreaterThan(start * 0.2);
    expect(end).toBeLessThan(start * 3);
  });

  it('peut créer un monde vide pour les tests', () => {
    const sim = new Simulation(ruleset, {
      seed: 962,
      startYear: 400,
      mode: 'legende',
      population: 0,
    });
    expect(sim.world.characters.size).toBe(0);
  });
});

describe('le corps', () => {
  it('la santé est le résumé du corps, pas une valeur libre', async () => {
    const { summarizeHealth, newBody } = await import('@ed/engine');
    const body = newBody(60);
    const full = summarizeHealth(body);
    expect(full).toBeGreaterThan(80);

    // Le maillon le plus faible pèse la moitié : un cœur ruiné tue, même
    // quand tout le reste est intact.
    body.organs.coeur = 10;
    expect(summarizeHealth(body)).toBeLessThan(full - 25);
  });

  it('un choc de santé se paie en organes, en douleur et en fièvre', async () => {
    const { newBody, applyHealthDelta, Rng } = await import('@ed/engine');
    const body = newBody(50);
    const before = Object.values(body.organs).reduce((a, b) => a + b, 0);
    applyHealthDelta(body, -30, new Rng(1));
    expect(Object.values(body.organs).reduce((a, b) => a + b, 0)).toBeLessThan(before);
    expect(body.douleur).toBeGreaterThan(0);
    expect(body.infection).toBeGreaterThan(0);
  });

  it('les maux apparaissent, évoluent et peuvent disparaître', async () => {
    const { newBody, buildRegistry, tickConditions, Rng, addCondition } = await import(
      '@ed/engine'
    );
    const sim = new Simulation(ruleset, {
      seed: 3,
      startYear: 400,
      mode: 'legende',
      population: 0,
    });
    createLife(sim.world, ruleset, new Rng(3).fork('n'));
    const reg = buildRegistry(ruleset.conditions);
    const body = newBody(50);
    const def = ruleset.conditions.find((d) => d.id === 'flux_ventre')!;

    addCondition(body, def, 400, 30);
    expect(body.conditions).toHaveLength(1);

    let resolved = false;
    for (let i = 0; i < 40 && !resolved; i++) {
      sim.world.year = 400 + i;
      const out = tickConditions(
        {
          world: sim.world,
          subject: sim.world.player,
          body,
          age: 30,
          rng: new Rng(100 + i),
          onsetScale: 0,
        },
        reg,
      );
      if (out.resolved.length > 0) resolved = true;
    }
    // un mal aigu finit par se régler dans un sens ou dans l'autre
    expect(resolved || body.conditions[0]!.severity >= 60).toBe(true);
  });

  it('un mal ne peut nommer la mort que s\'il peut tuer', () => {
    for (const def of ruleset.conditions) {
      if (!def.lethal) continue;
      expect(def.lethal.above).toBeGreaterThanOrEqual(0);
      expect(def.lethal.above).toBeLessThanOrEqual(100);
      expect(def.lethal.chance).toBeGreaterThan(0);
    }
    // La cataracte et la surdité ne tuent personne.
    for (const id of ['vue_qui_part', 'oreille_fermee', 'goutte']) {
      expect(ruleset.conditions.find((d) => d.id === id)?.lethal).toBeUndefined();
    }
  });

  it('contracte correctement l\'article de la cause de mort', async () => {
    const { causeOf } = await import('@ed/engine');
    expect(causeOf('le mal du sucre')).toBe('du mal du sucre');
    expect(causeOf('la toux noire')).toBe('de la toux noire');
    expect(causeOf('l\'hydropisie')).toBe('de l\'hydropisie');
    expect(causeOf('les jambes torses')).toBe('des jambes torses');
    expect(causeOf('une plaie qui a tourné')).toBe('d\'une plaie qui a tourné');
  });

  it('le monde reste peuplé malgré les maladies', () => {
    const sim = new Simulation(ruleset, { seed: 970, startYear: 400, mode: 'legende' });
    createLife(sim.world, ruleset, new Rng(970).fork('n'));
    const start = sim.world.living().length;
    for (let i = 0; i < 200; i++) {
      sim.openYear();
      sim.closeYear();
    }
    const end = sim.world.living().length;
    expect(end).toBeGreaterThan(start * 0.5);
    expect(end).toBeLessThan(start * 3);
  });

  it('une part notable des adultes porte un mal, sans que tous soient malades', () => {
    const sim = new Simulation(ruleset, { seed: 971, startYear: 400, mode: 'legende' });
    createLife(sim.world, ruleset, new Rng(971).fork('n'));
    for (let i = 0; i < 150; i++) {
      sim.openYear();
      sim.closeYear();
    }
    const adults = sim.world.living().filter((c) => sim.world.year - c.birthYear > 25);
    const ill = adults.filter((c) => c.body.conditions.length > 0);
    const share = ill.length / Math.max(1, adults.length);
    expect(share).toBeGreaterThan(0.05);
    expect(share).toBeLessThan(0.6);
  });
});
