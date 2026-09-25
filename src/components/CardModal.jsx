import { VARIANT_LABELS } from '../lib/variants'

export default function CardModal({ card, owned, onToggleOwned, onClose, onViewArtist }) {
  if (!card) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          &times;
        </button>

        <div
          className={`modal-image-wrap ${card.variant === 'reverseHolo' ? 'variant-reverse-holo' : ''}`}
        >
          <img src={card.image_url} alt={card.name} className="modal-image" />
        </div>

        <div className="modal-info">
          <h2>{card.name}</h2>
          <p className="modal-number">
            #{card.number} &middot; {card.supertype}
          </p>

          <div className="badge-row">
            {card.rarity && <span className="badge badge-rarity">{card.rarity}</span>}
            {card.variant && card.variant !== 'normal' && (
              <span className="badge badge-variant">&#10024; {VARIANT_LABELS[card.variant]}</span>
            )}
            {(card.types || []).map((t) => (
              <span key={t} className={`badge badge-type badge-type-${t.toLowerCase()}`}>
                {t}
              </span>
            ))}
          </div>

          {card.description && <p className="modal-description">{card.description}</p>}

          {card.artist ? (
            <button className="artist-link" onClick={() => onViewArtist(card.artist)}>
              &#127912; Illustrated by {card.artist} &mdash; see more of their work
            </button>
          ) : (
            <p className="artist-unavailable">
              &#127912; Illustrator not listed for this card yet.
            </p>
          )}

          <button
            className={`owned-toggle ${owned ? 'owned' : ''}`}
            onClick={() => onToggleOwned(card.id)}
          >
            {owned ? '✓ Owned' : 'Mark as owned'}
          </button>

          <div className="price-box">
            {typeof card.market_price === 'number' ? (
              <p className="market-price">
                <span className="market-price-amount">${card.market_price.toFixed(2)}</span>
                <span className="market-price-label">TCGplayer market price</span>
              </p>
            ) : (
              <p className="price-unavailable">
                Not priced yet &mdash; TCGplayer hasn't published sales data for this card.
              </p>
            )}

            {card.tcgplayer_url && (
              <a
                className="price-link"
                href={card.tcgplayer_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on TCGplayer &#8599;
              </a>
            )}
            <p className="price-disclaimer">
              Pricing comes from TCGplayer, a third party, and isn't a valuation. TCGplayer
              doesn't allow its pages to be embedded, so this opens their site in a new tab.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
