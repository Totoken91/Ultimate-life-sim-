import type {
  Character,
  ChronicleKind,
  EntityId,
  FlagValue,
  HiddenId,
  Relation,
  RelationType,
  SocialClass,
  StatId,
} from '../model/types.js';
import type { World, WorldMode } from '../world/world.js';
import type { Rng } from '../rng/rng.js';
import type { Ruleset } from '../content/ruleset.js';

/** Désigne un acteur de l'événement : le sujet, ou un rôle nommé. */
export type Ref = 'subject' | (string & {});

/** Contexte de *sélection* : disponible avant que les rôles soient tirés. */
export interface SelectCtx {
  readonly world: World;
  readonly ruleset: Ruleset;
  readonly subject: Character;
  readonly age: number;
  readonly rng: Rng;
}

/** Contexte de *jeu* : les rôles sont tirés, l'événement se joue. */
export interface EventCtx extends SelectCtx {
  readonly roles: Readonly<Record<string, Character>>;
  /** Rôle obligatoire — lève si absent (erreur de contenu, pas de partie). */
  role(name: string): Character;
  /** Rôle optionnel. */
  maybe(name: string): Character | undefined;
  /** Relation du sujet vers un rôle. */
  rel(name: string): Relation | undefined;
}

/**
 * Vocabulaire d'effets fermé (ADR-009). Tout est une donnée sérialisable :
 * le contenu ne peut pas créer de couplage sauvage avec le moteur, et un
 * moddeur n'a jamais besoin de toucher au coeur.
 */
export type Effect =
  | { k: 'stat'; stat: StatId; d: number; who?: Ref }
  | { k: 'hidden'; id: HiddenId; d: number; who?: Ref }
  | { k: 'trait'; add?: string; remove?: string; who?: Ref }
  | { k: 'wealth'; d: number; who?: Ref }
  | { k: 'health'; d: number; who?: Ref }
  | { k: 'mood'; d: number; who?: Ref }
  | { k: 'skill'; id: string; d: number; who?: Ref }
  | {
      k: 'injure';
      label: string;
      permanent?: boolean;
      stat?: StatId;
      penalty?: number;
      who?: Ref;
    }
  | {
      k: 'rel';
      to: Ref;
      from?: Ref;
      type?: RelationType;
      label?: string;
      affection?: number;
      trust?: number;
      respect?: number;
      fear?: number;
      /** Applique aussi l'arête inverse avec les mêmes deltas. */
      mutual?: boolean;
    }
  | {
      k: 'flag';
      name: string;
      value: FlagValue;
      scope?: 'character' | 'world';
      who?: Ref;
    }
  | {
      k: 'memory';
      text: string;
      salience: number;
      tags?: string[];
      actors?: Ref[];
      who?: Ref;
    }
  | {
      k: 'seed';
      eventId: string;
      min: number;
      max: number;
      actors?: Ref[];
      note?: string;
      needsActorsAlive?: boolean;
    }
  | { k: 'kill'; who: Ref; cause: string }
  | { k: 'job'; id: string | null; who?: Ref }
  | { k: 'class'; to: SocialClass; who?: Ref }
  | {
      k: 'chronicle';
      kind: ChronicleKind;
      importance: 1 | 2 | 3 | 4 | 5;
      data?: Record<string, string | number | boolean>;
      actors?: Ref[];
    }
  | { k: 'marry'; who: Ref }
  | { k: 'child'; withRole?: Ref }
  | { k: 'foundHouse'; name?: string; motto?: string }
  | { k: 'title'; add?: string; remove?: string; who?: Ref }
  | { k: 'path'; unlock: string; who?: Ref }
  | { k: 'move'; settlement: string; who?: Ref }
  | { k: 'log'; text: string };

export type EffectList = Effect[] | ((c: EventCtx) => Effect[]);

export interface Outcome {
  /** Poids relatif. Le choix du joueur n'est pas le résultat (doc 04 §1.1). */
  weight: number | ((c: EventCtx) => number);
  text: (c: EventCtx) => string;
  effects: EffectList;
}

export type OptionHint = 'risqué' | 'coûteux' | 'cruel' | 'irréversible' | 'lâche' | 'lent';

export interface EventOption {
  id: string;
  label: string | ((c: EventCtx) => string);
  hint?: OptionHint;
  /** Si faux, l'option est verrouillée (affichée avec sa raison). */
  requires?: (c: EventCtx) => boolean;
  lockedReason?: string;
  /** Verrouillée = cachée au lieu d'être grisée. */
  hideWhenLocked?: boolean;
  outcomes: Outcome[];
}

/**
 * Un rôle va chercher quelqu'un qui existe *déjà* dans la vie du joueur.
 * C'est toute la différence entre « un vieil homme » et « Perrin le forgeron,
 * que vous avez volé à neuf ans » (doc 04 §1.2).
 *
 * Retourne null si personne ne convient : l'événement est alors inéligible.
 */
export type RolePicker = (c: SelectCtx) => Character | null;

export interface EventDef {
  id: string;
  tags: string[];
  /** Modes de monde où l'événement existe. Défaut : tous. */
  modes?: WorldMode[];
  minAge?: number;
  maxAge?: number;
  requires?: (c: SelectCtx) => boolean;
  weight: number | ((c: SelectCtx) => number);
  cooldown?: { years: number; scope: 'character' | 'dynasty' | 'world' };
  once?: 'life' | 'dynasty';
  roles?: Record<string, RolePicker>;
  text: (c: EventCtx) => string;
  options: EventOption[];
  /** Marque les événements déclenchés par une graine : jamais tirés au hasard. */
  seedOnly?: boolean;
}

/** Événement prêt à afficher. Sérialisable : survit à une sauvegarde en plein choix. */
export interface PendingEvent {
  defId: string;
  text: string;
  roleIds: Record<string, EntityId>;
  subjectId: EntityId;
  /** Salt de résolution : garantit que rejouer le même choix donne le même résultat. */
  salt: number;
  options: PendingOption[];
}

export interface PendingOption {
  id: string;
  label: string;
  hint?: OptionHint;
  locked: boolean;
  lockedReason?: string;
}

/** Ce que l'UI reçoit après un choix. */
export interface EventResolution {
  text: string;
  log: string[];
}
