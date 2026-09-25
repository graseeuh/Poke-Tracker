// Standard modern Pokemon TCG print-run convention: Common/Uncommon cards
// are printed in both a "normal" and a "reverse holo" finish, so a binder
// can hold either or both. Rare-and-up cards are already inherently foil
// for their rarity — there's no separate plain printing to split out.
export const VARIANT_LABELS = { normal: 'Normal', reverseHolo: 'Reverse Holo' }

export function variantsFor(card) {
  if (card.rarity === 'Common' || card.rarity === 'Uncommon') {
    return ['normal', 'reverseHolo']
  }
  return ['normal']
}

export function instanceKey(cardId, variant) {
  return `${cardId}::${variant}`
}
