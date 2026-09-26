export default function CardModal({ card, owned, onToggleOwned, onClose, onViewArtist }) {
  if (!card) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          &times;
        </button>

        <div className="modal-image-wrap">
          <img src={card.image_url} alt={card.name} className="modal-image" />
        </div>

        <div className="modal-info">
          <h2>{card.name}</h2>
          <p className="modal-number">
            #{card.number} &middot; {card.supertype}
          </p>

          <div className="badge-row">
            {card.rarity && <span className="badge badge-rarity">{card.rarity}</span>}
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
            {card.tcgplayer_url ? (
              <a
                className="price-link"
                href={card.tcgplayer_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View current price on TCGplayer &#8599;
              </a>
            ) : (
              <p className="price-unavailable">No TCGplayer listing for this card yet.</p>
            )}
            <p className="price-disclaimer">
              We don't display a price ourselves, this opens TCGplayer's own listing in a new
              tab so you can see their current, live price. If your browser blocks it, it's
              redirecting through TCGplayer's own affiliate link chain, which some ad/tracker
              blockers flag, try allowing this site or opening the link in a new tab manually.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
